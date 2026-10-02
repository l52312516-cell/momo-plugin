import fs from 'node:fs'
import path from 'node:path'
import { getConfig } from '../model/config.js'
import { pluginResources } from "../model/path.js"

/** 戳一戳图片目录（相对插件目录，跟着插件搬家，不用改路径） */
const pokeDir = `${pluginResources}/poke`
/** 允许的图片扩展名 */
const imageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
/** #poke列表 一次最多列这么多张，太多了会刷屏 */
const listMax = 50

export class momopoke extends plugin {
    constructor() {
        super({
            name: 'momo戳一戳',
            dsc: '被戳一戳时随机发送本地图片，支持 #poke上传 / #poke列表 / #poke删除',
            // 同时接收消息与通知事件，具体由每条 rule 的 event 精确限定
            event: '*',
            priority: 5,
            rule: [
                {
                    // 上传图片
                    reg: '^#poke上传$',
                    fnc: 'pokeUpload',
                    event: 'message',
                    permission: 'master',
                },
                {
                    // 查看已有图片
                    reg: '^#poke列表$',
                    fnc: 'pokeList',
                    event: 'message',
                    permission: 'master',
                },
                {
                    // 删除某张图片：#poke删除 序号 / #poke删除 文件名
                    reg: '^#poke删除\\s*\\S*$',
                    fnc: 'pokeDelete',
                    event: 'message',
                    permission: 'master',
                },
                {
                    // 群戳一戳
                    reg: '',
                    fnc: 'pokeReply',
                    event: 'notice.group.poke',
                },
                {
                    // 私聊戳一戳
                    reg: '',
                    fnc: 'pokeReply',
                    event: 'notice.friend.poke',
                },
            ],
        })
    }

    /** 列出本地已有的戳一戳图片 */
    listPokeImages() {
        try {
            if (!fs.existsSync(pokeDir)) return []
            return fs.readdirSync(pokeDir).filter(file =>
                imageExt.includes(path.extname(file).toLowerCase())
            )
        } catch (err) {
            logger.error(`[momo戳一戳] 读取图片目录失败：${logger.red(pokeDir)}`, err)
            return []
        }
    }

    /** 把字节数变成好读的大小 */
    formatSize(size) {
        if (size < 1024) return `${size}B`
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
        return `${(size / 1024 / 1024).toFixed(2)}MB`
    }

    /** 读一张图的大小，读不到就返回空字符串 */
    fileSize(file) {
        try {
            return this.formatSize(fs.statSync(file).size)
        } catch {
            return ''
        }
    }

    /**
     * 冷却判断：还在冷却里返回 true
     * 键按「会话 + 人」分开，群里每人各自算自己的 7 秒
     * redis 出错时不阻断功能，本次当作没冷却
     */
    async inCooldown(e) {
        const cooldown = getConfig().cooldown.poke
        if (cooldown === 0) return false
        const key = `Yunzai:momopoke:cd:${e.group_id || 'private'}:${e.user_id}`
        try {
            return (await redis.set(key, '1', { NX: true, EX: cooldown })) !== 'OK'
        } catch (err) {
            logger.error('[momo戳一戳] 冷却检查失败，本次不设冷却', err)
        }
        return false
    }

    /**
     * 被戳一戳：随机发一张本地图片
     * 通知事件没有 e.msg，所以 reg 留空（空正则命中一切），
     * 真正拦住它的是 rule 上的 event 和下面的 target_id 判断
     */
    async pokeReply(e) {
        // 只回应「戳到机器人自己」的那些，别人之间的互戳不接
        if (String(e.target_id) !== String(e.self_id)) return false

        // 还在冷却里就安静跳过，不再回复，免得连戳刷屏
        if (await this.inCooldown(e)) return true

        const files = this.listPokeImages()
        if (!files.length) {
            await e.reply(
                `momo还没上传过戳一戳图片喵~\n把图片和「#poke上传」一起发出来就能添加啦`,
                true
            )
            return true
        }

        const file = files[Math.floor(Math.random() * files.length)]
        await e.reply(segment.image(`${pokeDir}/${file}`))
        return true
    }

    /** 上传戳一戳图片：#poke上传 + 一张图片 */
    async pokeUpload(e) {
        const url = e.img?.[0]
        if (!url) {
            await e.reply(`请把图片和「#poke上传」一起发送喵~`, true)
            return true
        }

        try {
            fs.mkdirSync(pokeDir, { recursive: true })
            // Bot.download 会自己探测文件类型，按 时间戳.哈希.扩展名 落盘
            const { file } = await Bot.download(url, pokeDir)

            const ext = path.extname(file).toLowerCase()
            if (!imageExt.includes(ext)) {
                fs.rmSync(file, { force: true })
                await e.reply(
                    `这不是人家认识的图片格式喵~（支持 ${imageExt.join(' / ')}）`,
                    true
                )
                return true
            }

            const total = this.listPokeImages().length
            await e.reply(
                `收到啦，戳一戳图片 +1♪\n当前共 ${total} 张\n文件名：${path.basename(file)}`,
                true
            )
        } catch (err) {
            logger.error('[momo戳一戳] 图片保存失败', err)
            await e.reply(`图片保存失败了喵~，请稍后再试`, true)
        }

        return true
    }

    /** 查看戳一戳图片列表：#poke列表 */
    async pokeList(e) {
        const files = this.listPokeImages()
        if (!files.length) {
            await e.reply(
                `还没有戳一戳图片喵~\n把图片和「#poke上传」一起发出来就能添加啦`,
                true
            )
            return true
        }

        const lines = files.slice(0, listMax).map((file, i) => {
            const size = this.fileSize(`${pokeDir}/${file}`)
            return `${i + 1}. ${file}${size ? `（${size}）` : ''}`
        })

        let text = `戳一戳图片共 ${files.length} 张：\n${lines.join('\n')}`
        if (files.length > listMax) text += `\n……还有 ${files.length - listMax} 张没有列出`
        text += `\n\n删除某张：#poke删除 序号`

        await e.reply(text, true)
        return true
    }

    /** 删除戳一戳图片：#poke删除 序号 / #poke删除 文件名 */
    async pokeDelete(e) {
        const arg = e.msg.replace(/^#poke删除/, '').trim()
        const files = this.listPokeImages()

        if (!files.length) {
            await e.reply(`还没有戳一戳图片喵~，没东西可以删`, true)
            return true
        }

        if (!arg) {
            await e.reply(
                `想删哪一张呀？先发「#poke列表」看看序号，再发「#poke删除 序号」`,
                true
            )
            return true
        }

        // 序号或文件名两种方式都可以
        let target
        if (/^\d+$/.test(arg)) {
            const index = Number(arg)
            if (index < 1 || index > files.length) {
                await e.reply(`序号超出范围啦，现在只有 1 ~ ${files.length} 张`, true)
                return true
            }
            target = files[index - 1]
        } else {
            // 只取文件名部分，防止有人构造出目录外的路径
            const name = path.basename(arg).toLowerCase()
            target = files.find(file => file.toLowerCase() === name)
            if (!target) {
                await e.reply(
                    `没找到叫「${path.basename(arg)}」的图片，发「#poke列表」看看现有的吧`,
                    true
                )
                return true
            }
        }

        try {
            const size = fs.statSync(`${pokeDir}/${target}`).size
            fs.rmSync(`${pokeDir}/${target}`, { force: true })
            await e.reply(
                `删掉啦：${target}（${this.formatSize(size)}）\n还剩 ${this.listPokeImages().length} 张`,
                true
            )
        } catch (err) {
            logger.error('[momo戳一戳] 图片删除失败', err)
            await e.reply(`删除失败了喵~，请稍后再试`, true)
        }

        return true
    }
}

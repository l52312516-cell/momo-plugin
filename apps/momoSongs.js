import YAML from "yaml"
import fs from 'node:fs'
import { getConfig } from '../model/config.js'
import { pluginResources } from "../model/path.js"

export class momoSongs extends plugin {
    constructor() {
        super({
            name: 'momo歌曲',
            dsc: '歌曲推荐',
            event: 'message',
            priority: 2026,
            rule: [
                {
                    reg: "momo歌曲推荐$",
                    fnc: 'momoSongsRec',
                },
                {
                    reg: "momo歌曲列表$",
                    fnc: 'momoSongsList',
                },
                {
                    reg: /^momo歌曲(搜索|查找)(.+)$/,
                    fnc: 'momoSongsSearch',
                }
            ]
        })
    }

    async momoSongsRec(e) {
        const cooldown = getConfig().cooldown.songsRecommend
        let nowtime = new Date()
        let LastRectime = await redis.get(`Yunzai:momoSongs:${e.user_id}_rec`)
        if (LastRectime) {
            LastRectime = JSON.parse(LastRectime)
            // 5分钟冷却
            if ((nowtime - new Date(LastRectime) < 1000 * 60 * cooldown) && !e.isMaster) {
                // ✅ 修复：计算剩余时间
                let timeleft = Math.floor((new Date(LastRectime).getTime() + 1000 * 60 * cooldown - nowtime) / 1000)
                await e.reply(`杂鱼大笨蛋，歌曲推荐冷却还有${timeleft}秒哦！`, true)
                return true
            }
        }

        let songdic
        try {
            songdic = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/songs.yaml`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let songtitle = Object.keys(songdic)
        let songrec = songtitle[Math.floor(Math.random() * songtitle.length)]
        let songurl = songdic[songrec]
        let msg = [segment.at(e.user_id), `\n推荐歌曲：「${songrec}」\n收听地址：${songurl}\n如果你也喜欢记得夸我是聪明机器人哦~~`]

        await e.reply(msg)
        await redis.set(`Yunzai:momoSongs:${e.user_id}_rec`, JSON.stringify(nowtime))
        
        return true
    }

    async momoSongsList(e) {
        let songdic
        try {
            songdic = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/songs.yaml`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let songtitle = Object.keys(songdic)
        let msgs = ["歌曲列表如下"]
        if (songtitle.length === 0) {
            msgs.push("主人还没添加任何歌曲喵~")
        }
        while (songtitle.length > 25) {
            msgs.push(songtitle.slice(0,25).join("，"))
            songtitle = songtitle.slice(25)
        }

        if (songtitle.length > 0) {
            msgs.push(songtitle.join("，"))
        }

        await e.reply(Bot.makeForwardArray([...msgs]))
        return true
    }

    async momoSongsSearch(e) {
        const cooldown = getConfig().cooldown.songsSearch
        let nowtime = new Date()
        let LastSearchtime = await redis.get(`Yunzai:momoSongs:${e.user_id}_search`)
        if (LastSearchtime) {
            LastSearchtime = JSON.parse(LastSearchtime)
            // 6分钟冷却
            if ((nowtime - new Date(LastSearchtime) < 1000 * 60 * cooldown) && !e.isMaster) {
                let timeleft = Math.floor((new Date(LastSearchtime).getTime() + 1000 * 60 * cooldown - nowtime) / 1000)
                await e.reply(`杂鱼大笨蛋，歌曲查找冷却还有${timeleft}秒哦！`, true)
                return true
            }
        }
        
        let match = e.msg.match(/^momo歌曲(搜索|查找)(.+)$/)
        if (!match || !match[2]) {
            await e.reply("笨蛋小杂鱼，你的关键词不完整喵~", true)
            return true
        }
        
        // 保留原始输入（用于显示），同时做首尾去空格
        let rawInput = match[2].replace(/^\s+|\s+$/g, '')
        let searchKey = rawInput.toLowerCase()  // 转为小写用于匹配

        let songdic
        try {
            songdic = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/songs.yaml`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let songtitle = Object.keys(songdic)
        if (songtitle.length === 0) {
            await e.reply("主人还没添加任何歌曲喵~", true)
            return true
        }

        // 🔍 模糊大小写匹配：找到第一个大小写不敏感匹配的歌名
        let matchedSong = null
        for (let title of songtitle) {
            if (title.toLowerCase() === searchKey) {
                matchedSong = title  // 保留原始大小写的歌名
                break
            }
        }

        if (!matchedSong) {
            await e.reply("momo还未上传过该歌曲的信息喵~", true)
            return true
        }

        let songurl = songdic[matchedSong]
        let msg = [segment.at(e.user_id), `\n铛铛，Bot已为你找到歌曲《${matchedSong}》喵~\n收听地址：${songurl}`]

        await e.reply(msg)
        await redis.set(`Yunzai:momoSongs:${e.user_id}_search`, JSON.stringify(nowtime))

        return true
    }
}
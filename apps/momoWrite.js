import YAML from "yaml"
import fs from 'node:fs'
import path from 'node:path'
import { pluginResources } from "../model/path.js"

export class momoWrite extends plugin {
    constructor() {
        super({
            name: 'momo写作',
            dsc: '套模板的典故',
            event: 'message',
            priority: 3207,
            rule: [
                {
                    reg: /^momo写作(.+)$/,
                    fnc: 'momoWrite',
                },
                {
                    reg: /^momo的写作帮助$/,
                    fnc: "WriteMod",
                }
            ]
        })
        
        
    }

    async momoWrite(e) {
        let match = e.msg.match(/^momo写作(.+)$/)

        if (!match || !match[1]) {
            await e.reply("小杂鱼，你的关键词不完整喵~", true)
            return true
        }

        let targets = match[1].trim().split(/\s+/).filter(t => t.length > 0)

        if (targets.length < 2) {
            await e.reply("小杂鱼，你的关键词不完整喵~", true)
            return true
        } else if (targets.length > 2) {
            await e.reply("笨蛋，你的关键词太多了！", true)
            return true
        }

        let [key, write] = targets

        if (write.toLowerCase().includes('momo')) {
            let banlist = [
                "不许添加主人名字喵", "这是不符合规定的！", "网络错误，请您NaN秒后再尝试",
                "momo最可爱了，不许欺负", "杂鱼又想干坏事是吧！", "系统错误，请通知主人处理喵~",
                "检测到你是杂鱼，自动拒绝生成文本"
            ]
            let ban = banlist[Math.floor(Math.random() * banlist.length)]
            await e.reply(ban, true)
            return true
        }

        let identities
        try {
            identities = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/writeMod.yaml`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let keyword = Object.keys(identities)

        if (!keyword.includes(key)) {
            await e.reply("笨蛋，该关键词不存在！", true)
            return true
        }

        let msg = identities[key]
        if (msg.includes('${write}')) {
            msg = msg.replace(/\$\{write\}/g, write)
        }

        await e.reply(msg, true)
        return true
    }

    async WriteMod(e) {
        let identities
        try {
            identities = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/writeMod.yaml`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let keyword = Object.keys(identities)

        let moban = "momo写作发送示例：“momo写作测试 杂鱼”"
        let botre = "Bot回复“这是一条测试消息：杂鱼是笨蛋！”"
        let mention = "可用的写作关键词如下"

        let msg = [moban, botre, mention, keyword.join('，')]
        
        await e.reply(Bot.makeForwardArray([...msg]))

        return true
    }
}
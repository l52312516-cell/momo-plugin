import YAML from "yaml"
import fs from 'node:fs'
import { getConfig } from "../model/config.js"
import { pluginResources } from "../model/path.js"

export class momoReborn extends plugin {
    constructor() {
        super({
            name: 'momo转生',
            dsc: '文字版转生',
            event: 'message',
            priority: 6,
            rule: [
                {
                    reg: "momo转生$",
                    fnc: 'momoReborn',
                }, 
                {
                    reg: "momo转生记录$",
                    fnc: "RebornHistory"
                }
            ]
        })
        
    }

    settings(e) {
        const config = getConfig()
        const special = e.group_id != null && String(e.group_id) === config.reborn.privateGroup
        return {
            config,
            file: special ? 'reborn.yaml' : 'preborn.yaml',
            prefix: special ? 'momo' : 'pmomo',
            scope: special ? `${e.user_id}` : `${e.group_id}:${e.user_id}`,
        }
    }

    async momoReborn(e) {
        const { config, file, prefix, scope } = this.settings(e)
        let RebornDic

        try {
            RebornDic = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/${file}`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let nowtime = new Date()
        
        // 获取上次转生时间
        let moreb_time = await redis.get(`Yunzai:${prefix}Rebornti:${scope}`)
        if (moreb_time) {
            moreb_time = JSON.parse(moreb_time)
            // 75分钟冷却
            if ((nowtime - new Date(moreb_time) < 1000 * 60 * config.cooldown.reborn) && !e.isMaster) {
                await e.reply(`杂鱼大笨蛋，每${config.cooldown.reborn}分钟只能转生一次哦！`, true)
                return true
            }
        }

        // 获取所有角色名（keys）
        let characters = Object.keys(RebornDic)
        // 随机选择一个角色
        let rchar = characters[Math.floor(Math.random() * characters.length)]
        // 获取对应的身份描述
        let rintro = RebornDic[rchar]

        // ===== 新增：记录转生次数 =====
        let countKey = `Yunzai:${prefix}RebornCount:${scope}`
        let charCountKey = `Yunzai:${prefix}RebornChar:${scope}:${rchar}`
        
        // 获取总转生次数
        let totalCount = await redis.get(countKey)
        totalCount = totalCount ? parseInt(totalCount) : 0
        totalCount++
        
        // 获取该角色的转生次数
        let charCount = await redis.get(charCountKey)
        charCount = charCount ? parseInt(charCount) : 0
        charCount++
        
        // 保存到redis
        await redis.set(countKey, totalCount.toString())
        await redis.set(charCountKey, charCount.toString())
        // ==============================

        await e.reply(
            `恭喜你转生成了\n` +
            `${rchar}\n` +
            `身份：${rintro}\n` +
            `━━━━━━━━━━━━\n` +
            `你已转生「${rchar}」${charCount} 次`,
            true
        )
        
        // 记录本次转生时间
        await redis.set(`Yunzai:${prefix}Rebornti:${scope}`, JSON.stringify(nowtime))
        
        return true
    }

    async RebornHistory(e) {
        const { config, file, prefix, scope } = this.settings(e)
        let nowtime = new Date()

        let moreb_time = await redis.get(`Yunzai:${prefix}Rebornti:${scope}_history`)
        if (moreb_time) {
            moreb_time = JSON.parse(moreb_time)
            // 5分钟冷却
            if ((nowtime - new Date(moreb_time) < 1000 * 60 * config.cooldown.rebornHistory) && !e.isMaster) {
                await e.reply(`杂鱼大笨蛋，每${config.cooldown.rebornHistory}分钟只能查询转生记录一次哦！`, true)
                return true
            }
        }

        let RebornDic

        try {
            RebornDic = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/${file}`, 'utf-8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let countKey = `Yunzai:${prefix}RebornCount:${scope}`
        let totalCount = await redis.get(countKey)
        totalCount = totalCount ? parseInt(totalCount) : 0
        let msg = [`你到目前为止共转生${totalCount}次`,"其中"]

        let charnames = Object.keys(RebornDic)
        let charlist = []
        for (let char of charnames) {
            let charCountKey = `Yunzai:${prefix}RebornChar:${scope}:${char}`
            let charCount = await redis.get(charCountKey)
            charCount = charCount ? parseInt(charCount) : 0
            charlist.push(`${char}：${charCount}次`)
        }

        while (charlist.length > 15) {
            msg.push(charlist.slice(0,15).join("\n"))
            charlist = charlist.slice(15)
        }

        if (charlist.length > 0) {
            msg.push(charlist.join("\n"))
        }

        await e.reply(Bot.makeForwardArray([...msg]))
        await redis.set(`Yunzai:${prefix}Rebornti:${scope}_history`, JSON.stringify(nowtime))

        return true
    }
}
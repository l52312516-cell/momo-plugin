import { pluginResources, pluginResourcesUrl } from "../model/path.js"
import { getConfig } from "../model/config.js"
import path from "node:path"
import puppeteer from '../../../lib/puppeteer/puppeteer.js'

const uname = e => e.sender?.card || e.sender?.nickname || String(e.user_id)

export class momoBattle extends plugin {
    constructor() {
        super({
            name: 'momo决斗',
            dsc: '群友娱乐决斗插件',
            event: 'message',
            priority: 1613,
            rule: [
                {
                    reg: /^momo决斗\s*$/,
                    fnc: 'momoBattle',
                }
            ]
        })
    }

    async momoBattle(e) {
        const config = getConfig()
        const ats = (e.message || []).filter(m => m.type === 'at' &&
            String(m.qq || m.id) !== String(e.self_id) &&
            String(m.qq || m.id) !== String(e.user_id))

        let oppId, oppName, isPvE = false

        if (ats.length) {
            // PvP：有 @ 对手
            oppId = String(ats[0].qq || ats[0].id)
            oppName = await this.memberName(e, oppId, ats[0])
        } else {
            // PvE：没 @ 人，和机器人决斗
            isPvE = true
            oppId = String(e.self_id)
            oppName = "笨蛋机器人" || e.bot?.nickname || Bot?.nickname
            await e.reply('没有指定对手，那就和我决斗吧！')
        }

        // 防沉迷检查
        const lastbattletime = await redis.get(`Yunzai:momoBattle:${e.user_id}_battletime`)
        let currenttime = new Date()
        if (lastbattletime && (currenttime - new Date(lastbattletime) < 1000 * config.cooldown.battle) && !e.isMaster) {
            await e.reply(`您已被健康系统和防沉迷系统禁止发起battle ${config.cooldown.battle}秒，请注意身体健康！`)
            return true
        }
        await redis.set(`Yunzai:momoBattle:${e.user_id}_battletime`, currenttime.toISOString())
        await e.reply('对决中，请稍后')

        const me = { id: String(e.user_id), name: uname(e) }
        const opp = { id: oppId, name: oppName }

        // 决出胜者
        let winner, loser
        let num1 = Math.random()
        if (num1 >= 0.5) {
            winner = me
            loser = opp
        } else {
            winner = opp
            loser = me
        }

        // 决出比分
        let winframe = config.battle.winframe
        let loseframe = Math.floor(Math.random() * winframe)
        if (loseframe === winframe) {
            loseframe = loseframe - 1
        }
        winner['score'] = winframe
        loser['score'] = loseframe

        // 挑选裁判（排除双方）
        let randomReferee
        let refereeName = "神秘裁判"
        try {
            let mmap = await e.group.getMemberMap()
            let arrMember = Array.from(mmap.values())
            let safety = 0
            while (safety < 50) {
                randomReferee = arrMember[Math.floor(Math.random() * arrMember.length)]
                let refId = String(randomReferee.user_id)
                if (refId !== me.id && refId !== opp.id) {
                    refereeName = randomReferee.card || randomReferee.nickname || "天意"
                    break
                }
                safety++
            }
        } catch (err) {
            console.error("获取裁判失败:", err)
        }

        // 记录场次
        let winnertcount = await redis.get(`Yunzai:momoBattle:${winner.id}_battletcount`)
        winnertcount = winnertcount ? parseInt(winnertcount) : 0
        winnertcount++

        let winnerwcount = await redis.get(`Yunzai:momoBattle:${winner.id}_battlewcount`)
        winnerwcount = winnerwcount ? parseInt(winnerwcount) : 0
        winnerwcount++

        let losertcount = await redis.get(`Yunzai:momoBattle:${loser.id}_battletcount`)
        losertcount = losertcount ? parseInt(losertcount) : 0
        losertcount++

        let loserwcount = await redis.get(`Yunzai:momoBattle:${loser.id}_battlewcount`)
        loserwcount = loserwcount ? parseInt(loserwcount) : 0  // 修复：之前用了 losertcount

        await redis.set(`Yunzai:momoBattle:${winner.id}_battletcount`, String(winnertcount))
        await redis.set(`Yunzai:momoBattle:${winner.id}_battlewcount`, String(winnerwcount))
        await redis.set(`Yunzai:momoBattle:${loser.id}_battletcount`, String(losertcount))
        await redis.set(`Yunzai:momoBattle:${loser.id}_battlewcount`, String(loserwcount))

        winner["winrate"] = (winnerwcount / winnertcount * 100).toFixed(2)
        loser["winrate"] = (loserwcount / losertcount * 100).toFixed(2)
        winner["totalmatch"] = winnertcount
        loser["totalmatch"] = losertcount
        
        try {
            let data = {
                tplFile: path.join(pluginResources, 'html', 'momoBattle.html'),
                pluResPath: pluginResourcesUrl,
                winnerid: `${winner.id}`,
                winnername: `${winner.name}`,
                winnerscore: `${winner.score}`,
                winnerwinrate: `${winner.winrate}`,
                winnertotalmatch: `${winner.totalmatch}`,
                loserid: `${loser.id}`,
                losername: `${loser.name}`,
                loserscore: `${loser.score}`,
                loserwinrate: `${loser.winrate}`,
                losertotalmatch: `${loser.totalmatch}`,
                refereeName: `${refereeName}`,
            }

            let img = await puppeteer.screenshot("momoBattle", data)
            if (!img) throw new Error("截图未返回图片")
            await e.reply(img)
            return true
        } catch (err)
        {
            console.error("生成图片失败:", err)
            // 回退到文本回复
            await e.reply([
                `⚔️ momo决斗结果 ${isPvE ? '(人机对战)' : ''} ⚔️\n`,
                `👑 胜者: ${winner.name} ${winner.score} : ${loser.score} ${loser.name}\n`,
                `📊 ${winner.name} 胜率: ${winner.winrate}% (总${winner.totalmatch}场)\n`,
                `📊 ${loser.name} 胜率: ${loser.winrate}% (总${losertcount}场)\n`,
                `👨‍⚖️ 裁判: ${refereeName}`
            ])
        }

        return true
    }

    // 获取成员名称
    async memberName(e, userId, atMsg) {
        try {
            const member = await e.group.pickMember(userId)
            return member.card || member.nickname || atMsg?.name || `用户${userId}`
        } catch {
            return atMsg?.name || `用户${userId}`
        }
    }
}
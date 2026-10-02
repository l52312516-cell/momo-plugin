import { pluginResources } from "../model/path.js"
import path from "node:path"
import fs from 'node:fs'
import YAML from "yaml"

export class momoWish extends plugin {
    constructor() {
        super({
            name: 'momo抽签',
            dsc: '抽签',
            event: 'message',
            priority: 469,
            rule: [
                {
                    reg: "momo抽签$",
                    fnc: 'momoWish',
                }
            ]
        })
    }

    async momoWish(e) {
        let poems
        try {
            poems = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/wish.yaml`, 'utf8'))
        } catch (err) {
            console.error("YAML 读取失败:", err)
            await e.reply("模板文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        const fortunes = ["大吉", "中吉", "吉", "末吉", "凶", "大凶"]
        const luckyItems = [
            "蒲公英", "甜甜花", "店长", "落落莓", "团雀", "努昂诺塔", "杂鱼", "清心", "蜥蜴尾巴","海露花","黑背鲈",
            "风车菊","帕蒂沙兰","数学作业","限定店长绳匠", "空羽蛾", "纠缠之缘", "纳西妲", "鸣草", "哈气的店长",
            "露米", "世界树"
        ]
        
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // 检查今天是否已抽签 - 修复键名一致性问题
        const lastWishDate = await redis.get(`Yunzai:momoWish:${e.user_id}`)
        if (lastWishDate === dateStr) {
            await e.reply([
                segment.at(e.user_id),
                "\n杂鱼，今天已经抽过签了！"
            ])
            return true
        }

        let xuhao = Object.keys(poems)
        let rnum = Math.floor(Math.random() * xuhao.length)
        
        const rPoem = poems[`${rnum}`]
        const rFortune = fortunes[Math.floor(Math.random() * fortunes.length)]
        const rLuckyItem = luckyItems[Math.floor(Math.random() * luckyItems.length)]
        
        const msg = [
            segment.at(e.user_id),
            `\n今日运势：「${rFortune}」`,
            `\n今日幸运物：${rLuckyItem}`,
            `\n今日签文：\n${rPoem}`
        ]
        await e.reply(msg)
        
        // 存储日期 - 直接存字符串，不需要 JSON.stringify
        await redis.set(`Yunzai:momoWish:${e.user_id}`, dateStr)
        return true
    }
}
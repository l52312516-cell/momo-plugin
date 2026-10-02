export class momoCatRate extends plugin {
    constructor() {
        super({
            name: '猫娘指数测定',
            dsc: '测猫娘指数',
            event: 'message',
            priority: 1234,
            rule: [
                {
                    reg: "今日猫娘指数$",
                    fnc: 'CatRate',
                }
            ]
        })
    }

    async CatRate(e) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const lastRateDate = await redis.get(`Yunzai:CatRate:${e.user_id}_ratedate`)
        if (lastRateDate === dateStr) {
            await e.reply([
                segment.at(e.user_id),
                "\n笨蛋小杂鱼猫娘，今天已经测过猫娘指数了！"
            ])
            return true
        }
        
        let rnum = Math.random() * 100
        let cRate = rnum.toFixed(2)
        let cRatenum = parseFloat(cRate)
        
        const lastCatRate = await redis.get(`Yunzai:CatRate:${e.user_id}_catrate`)
        const lastRateNum = lastCatRate ? parseFloat(lastCatRate) : 0
        let induce = cRatenum - lastRateNum
        
        let msg = [segment.at(e.user_id), `\n小猫娘，你今天的猫娘指数是${cRate}%`]

        if (cRatenum <= 20) {
            msg.push("，猫娘指数这么低，不如去当一只可爱的杂鱼努昂诺塔吧！")
        } else if (cRatenum <= 40) {
            msg.push("，你的猫娘指数还不够高，好好学习如何变成猫娘吧！")
        } else if (cRatenum <= 60) {
            msg.push("，加油哦，你已经快变成一只真正的猫娘了，要多向主人撒娇哦！")
        } else if (cRatenum <= 80) {
            msg.push("，哇哦，你几乎就要成为一只真正的猫娘了，要变得可爱又杂鱼哦！")
        } else {
            msg.push("，你是一只真正的猫娘，快把可爱的杂鱼群友也变成小猫娘吧！")
        }

        if (!lastCatRate) {
            msg.push("\n这是你的首次检测，记得明天来看看你的变化哦！")
        } else if (Math.abs(induce) < 0.01) {
            msg.push("\n你的猫娘指数和上次没有变化，是不是偷懒了？")
        } else if (induce > 0) {
            msg.push(`\n你的猫娘指数比上次上升了${induce.toFixed(2)}%，请继续加油哦！`)
        } else {
            msg.push(`\n你的猫娘指数比上次下降了${Math.abs(induce).toFixed(2)}%，你是不是要变成杂鱼努昂诺塔了？`)
        }

        await e.reply(msg)

        await redis.set(`Yunzai:CatRate:${e.user_id}_ratedate`, dateStr)
        await redis.set(`Yunzai:CatRate:${e.user_id}_catrate`, String(cRatenum))

        return true
    }
}
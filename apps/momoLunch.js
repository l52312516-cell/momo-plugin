export class momoLunch extends plugin {
    constructor() {
        super({
            name: '今天吃什么',
            dsc: '今天吃什么',
            event: 'message',
            priority: 10,
            rule: [
                {
                    reg: "^(早上吃什么|中午吃什么|晚上吃什么|凌晨吃什么|宵夜吃什么|现在吃什么|今天吃什么)$",
                    fnc: 'WhatToEat',
                }
            ]
        })
    }

    async WhatToEat(e) {
        const foodlist = [
            "杂鱼妲-Nahida", "最初的猫娘——店长", "水煮肉片", "蚂蚁上树", "KFC", "乡村基",
            "麻婆豆腐", "笨蛋机器人", "氧气", "重庆小面", "派蒙","杂鱼点歌器", "蚊子",
            "酸菜鱼","甜甜花酿鸡","蜜雪冰城","致水神","青椒炒肉丝","小米粥",
            "猪肉炖粉条","瑞幸咖啡","水煮黑背鲈","枣椰蜜糖","羊肉串","花果草糖",
            "炸鱼薯条","三鲜米线","纠缠之缘","紫菜蛋花汤","肉夹馍", "浪痕百里",
            "是纳西妲厨捏", "黄焖鸡", "荠菜水饺", "桶装矿泉水", "小炒肉", "北京烤鸭",
            "氮气", "希格斯场", "凉三丝", "木耳炒肉丝", "麦当劳", "绳匠别玩了",
            "阿晴", "豆包", "月落银", "小东西", "纳西妲头上的叶子", "牛排", "夫妻肺片",
            "笨蛋点歌器", "星野酱", "绿豆汤",
        ];
        
        // Fisher-Yates 洗牌
        const shuffled = [...foodlist];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        } // ← 补上这个 }
        
        // 提取推荐食物（移到循环外部）
        let recfood = shuffled.slice(0, 6).join('，');
        
        let msg = [
            segment.at(e.user_id),
            `\n推荐菜单：${recfood}`  // ← 反引号 + 模板字符串
        ];
        
        await e.reply(msg);
        return true;  // ← 正确拼写
    }
}
import { beijingTime, claimWakeRank, nextSleepRank, readSleepTime, resetSleepRanks } from '../model/sleep.js'

export class momoSleep extends plugin {
  constructor() {
    super({
      name: 'momo每日早晚安', dsc: '记录群友睡眠情况', event: 'message.group', priority: 985,
      rule: [
        { reg: '^(晚安|睡了|睡觉|去睡了|我睡了|我要睡了)$', fnc: 'NightDream' },
        { reg: '^(早安|早|起床|醒了|我醒了|早上好)$', fnc: 'GetUp' },
      ],
    })
    this.scheduleDailyReset()
  }

  scheduleDailyReset() {
    const now = new Date()
    const nextReset = new Date()
    nextReset.setHours(13, 0, 0, 0)
    if (now.getHours() >= 13) nextReset.setDate(nextReset.getDate() + 1)

    const reset = async () => {
      await resetSleepRanks()
      await redis.set('Yunzai:DailyResetDate', new Date().toDateString())
      logger.info(`[每日早晚安] 定时重置执行：${new Date().toLocaleString()}`)
    }
    const timer = setTimeout(async () => {
      await reset()
      const interval = setInterval(reset, 24 * 60 * 60 * 1000)
      interval.unref?.()
    }, nextReset - now)
    timer.unref?.()
    logger.info(`[每日早晚安] 下次重置时间：${nextReset.toLocaleString()}`)
  }

  async NightDream(e) {
    if (!e.group_id) return false
    const now = Date.now()
    const { hour, clock, period } = beijingTime(now)
    if (hour >= 9 && hour < 17) {
      await e.reply(`现在才${String(hour).padStart(2, '0')}点，你就要睡觉了？你过的不是北京时间吧！`)
      return true
    }
    // 沿用旧个人键，升级后仍能读取入睡时间和五小时冷却。
    const suffix = `${e.group_id}:${e.user_id}`
    const previous = readSleepTime(await redis.get(`Yunzai:NightSleeptime:${suffix}`))
    if (previous !== null && now - previous >= 0 && now - previous < 5 * 60 * 60 * 1000) {
      await e.reply(`杂鱼！你在${beijingTime(previous).clock}已经发过要睡觉了，你居然还没睡？`)
      return true
    }
    const order = await nextSleepRank(e.group_id, period)
    await redis.set(`Yunzai:NightSleeptime:${suffix}`, JSON.stringify(new Date(now)))
    await redis.set(`Yunzai:NightSleepti:${suffix}`, JSON.stringify(clock))
    await e.reply(
      `晚安，伙伴！现在是北京时间${clock}，小草祝你的每一个梦境如须弥的春天般美好。\n` +
      `你是本群第 ${order} 个睡觉的~`, true,
    )
    return true
  }

  async GetUp(e) {
    if (!e.group_id) return false
    const now = Date.now()
    const { hour, period } = beijingTime(now)
    if (hour < 4) {
      await e.reply('夜色流光溢彩，现在还早，再睡会吧', true)
      return true
    }
    if (hour >= 11 && hour < 14) {
      await e.reply(`都${hour}点了你才起床，你真懒！`, true)
      return true
    }
    if (hour >= 14) {
      await e.reply('你是熬了夜才起床吧，小草要你多注意身体健康啊！', true)
      return true
    }
    const [order, fresh] = await claimWakeRank(e.group_id, e.user_id, period)
    if (!fresh) {
      await e.reply(`杂鱼，你本轮已经说过早安啦！你是本群第 ${order} 个起床的~`, true)
      return true
    }
    const suffix = `${e.group_id}:${e.user_id}`
    const slept = readSleepTime(await redis.get(`Yunzai:NightSleeptime:${suffix}`))
    let msg = `早上好啊，伙伴！\n你是本群第 ${order} 个起床的~`
    if (slept !== null) {
      const duration = now - slept
      if (duration >= 0 && duration < 16 * 60 * 60 * 1000) {
        const hours = Math.floor(duration / 3600000)
        const minutes = Math.floor(duration % 3600000 / 60000)
        const seconds = Math.floor(duration % 60000 / 1000)
        msg += `\n你的睡眠时间是${hours}小时${minutes}分${seconds}秒，我就知道你会睡得很好的！`
      }
    }
    await e.reply(msg, true)
    // 和旧逻辑一致，完成起床后清除已消费的个人睡眠记录。
    await redis.del(`Yunzai:NightSleeptime:${suffix}`)
    await redis.del(`Yunzai:NightSleepti:${suffix}`)
    await redis.del(`Yunzai:NightSleepOrder:${suffix}`)
    return true
  }
}

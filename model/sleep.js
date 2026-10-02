const TTL = 7 * 24 * 60 * 60
const HOUR = 60 * 60 * 1000

export function beijingTime(now = Date.now()) {
  const date = new Date(Number(now) + 8 * HOUR)
  return {
    hour: date.getUTCHours(),
    clock: date.toISOString().slice(11, 19),
    // 北京时间 13:00 是周期边界；无需定时器或扫描旧排名。
    period: new Date(Number(now) + (8 - 13) * HOUR).toISOString().slice(0, 10),
  }
}

// 原子分配起床排名；重复/并发消息及重启均沿用同一排名。
export const wakeRankScript = `
local previous = redis.call('GET', KEYS[2])
if previous then return {tonumber(previous), 0} end
local rank = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], tostring(rank), 'EX', ARGV[1])
return {rank, 1}
`

export async function claimWakeRank(groupId, userId, period) {
  const key = `Yunzai:momoSleep:${groupId}:${period}:wake`
  return redis.eval(wakeRankScript, {
    keys: [key, `${key}:${userId}`], arguments: [String(TTL)],
  })
}

export async function nextSleepRank(groupId, period) {
  const key = `Yunzai:momoSleep:${groupId}:${period}:sleep`
  const [rank] = await redis.multi().incr(key).expire(key, TTL).exec()
  return rank
}

export function readSleepTime(value) {
  if (!value) return null
  try {
    const time = new Date(JSON.parse(value)).getTime()
    return Number.isFinite(time) ? time : null
  } catch {
    return null
  }
}

import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { pluginConfig } from './path.js'

export const featureLabels = {
  battle: '决斗', poke: '戳一戳与图片管理', reborn: '转生', request: '编号点歌',
  songs: '歌曲推荐与查询', wish: '抽签', write: '写作', catRate: '猫娘指数',
  lunch: '今天吃什么', sleep: '早晚安',
}
export const numberSettings = [
  ['cooldown.battle', '决斗冷却（秒）', 120, 0, 86400],
  ['cooldown.reborn', '转生冷却（分钟）', 75, 0, 1440],
  ['cooldown.rebornHistory', '转生记录查询冷却（分钟）', 5, 0, 1440],
  ['cooldown.songsRecommend', '歌曲推荐冷却（分钟）', 5, 0, 1440],
  ['cooldown.songsSearch', '歌曲查询冷却（分钟）', 6, 0, 1440],
  ['cooldown.poke', '戳一戳冷却（秒）', 7, 0, 86400],
  ['battle.winframe', '决斗目标分数', 13, 1, 1000],
]
export const defaults = {
  enabled: Object.fromEntries(Object.keys(featureLabels).map(key => [key, true])),
  cooldown: { battle: 120, reborn: 75, rebornHistory: 5, songsRecommend: 5, songsSearch: 6, poke: 7 },
  battle: { winframe: 13 },
  reborn: { privateGroup: '1026237460' },
}
const configFile = path.join(pluginConfig, 'momo.yaml')
const legacyFile = path.join(pluginConfig, 'battle.yaml')
let lastSignature
let lastGood

export function validateConfig(value, base = defaults) {
  const result = structuredClone(base)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('配置必须是对象')
  // 只接受已登记字段，避免无效字段和原型属性写入配置。
  for (const [section, items] of Object.entries(value)) {
    if (!Object.hasOwn(defaults, section) || !items || typeof items !== 'object' || Array.isArray(items)) {
      throw new Error(`未知或无效配置分组：${section}`)
    }
    for (const [key, raw] of Object.entries(items)) {
      if (!Object.hasOwn(defaults[section], key)) throw new Error(`未知配置项：${section}.${key}`)
      if (section === 'enabled') {
        if (typeof raw !== 'boolean') throw new Error(`${key} 必须是开关值`)
        result[section][key] = raw
      } else if (section === 'reborn') {
        const group = String(raw ?? '').trim()
        if (group && !/^\d{5,20}$/.test(group)) throw new Error('转生分流群必须是 5-20 位群号，或留空')
        result[section][key] = group
      } else {
        const spec = numberSettings.find(([field]) => field === `${section}.${key}`)
        const number = Number(raw)
        if ((typeof raw !== 'number' && typeof raw !== 'string') || String(raw).trim() === '' ||
            !Number.isInteger(number) || number < spec[3] || number > spec[4]) {
          throw new Error(`${spec[1]}必须是 ${spec[3]}-${spec[4]} 的整数`)
        }
        result[section][key] = number
      }
    }
  }
  return result
}

function signature(file) {
  try {
    const info = fs.statSync(file)
    return `${info.mtimeMs}:${info.ctimeMs}:${info.size}`
  } catch (error) {
    if (error.code === 'ENOENT') return 'missing'
    throw error
  }
}

export function getConfig() {
  try {
    const current = `${signature(configFile)}|${signature(legacyFile)}`
    if (lastGood && current === lastSignature) return structuredClone(lastGood)
    const base = structuredClone(defaults)
    const input = fs.existsSync(configFile) ? YAML.parse(fs.readFileSync(configFile, 'utf8')) : {}
    // 尚未在新配置设置比分时，继续采用旧 battle.yaml。
    if (!Object.hasOwn(input?.battle || {}, 'winframe') && fs.existsSync(legacyFile)) {
      const legacy = YAML.parse(fs.readFileSync(legacyFile, 'utf8'))
      base.battle = validateConfig({ battle: { winframe: legacy?.winframe ?? 13 } }).battle
    }
    const result = validateConfig(input ?? {}, base)
    lastGood = result
    lastSignature = current
  } catch (error) {
    globalThis.logger?.error(`[momo配置] 读取失败，使用上次有效配置或默认值：${error.message}`)
  }
  return structuredClone(lastGood || defaults)
}

export function saveConfig(value) {
  const validated = validateConfig(value, getConfig())
  fs.mkdirSync(pluginConfig, { recursive: true })
  const temporary = `${configFile}.${process.pid}.tmp`
  try {
    fs.writeFileSync(temporary, YAML.stringify(validated), 'utf8')
    fs.renameSync(temporary, configFile)
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
  lastGood = validated
  lastSignature = undefined
  return getConfig()
}

export function isEnabled(name) {
  return getConfig().enabled[name] !== false
}

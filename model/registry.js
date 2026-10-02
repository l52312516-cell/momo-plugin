import { getConfig } from './config.js'

const item = (group, command, description) => ({ group, command, description })
export const modules = [
  { name: 'momoHelp', help: [] },
  { name: 'momoBattle', feature: 'battle', help: [
    item('娱乐互动', 'momo决斗 [@对手]', c => `不指定对手则与机器人对战；发起冷却 ${c.cooldown.battle} 秒`),
  ] },
  { name: 'momoReborn', feature: 'reborn', help: [
    item('娱乐互动', 'momo转生', c => `随机转生；冷却 ${c.cooldown.reborn} 分钟`),
    item('娱乐互动', 'momo转生记录', c => `查看转生记录；冷却 ${c.cooldown.rebornHistory} 分钟`),
  ] },
  { name: 'momoWish', feature: 'wish', help: [item('娱乐互动', 'momo抽签', '每日一次')] },
  { name: 'momoCatRate', feature: 'catRate', help: [item('娱乐互动', '今日猫娘指数', '每日一次')] },
  { name: 'momoRequest', feature: 'request', help: [
    item('歌曲与写作', 'momo点歌 [编号]', '按编号点歌；不填编号则随机点歌'),
    item('歌曲与写作', 'momo歌单', '查看编号歌单'),
  ] },
  { name: 'momoSongs', feature: 'songs', help: [
    item('歌曲与写作', 'momo歌曲推荐', c => `随机推荐歌曲；冷却 ${c.cooldown.songsRecommend} 分钟`),
    item('歌曲与写作', 'momo歌曲列表', '查看歌曲列表'),
    item('歌曲与写作', 'momo歌曲搜索 歌名 / momo歌曲查找 歌名', c => `完整歌名查询；冷却 ${c.cooldown.songsSearch} 分钟`),
  ] },
  { name: 'momoWrite', feature: 'write', help: [
    item('歌曲与写作', 'momo写作 模板词 内容', '套用写作模板'),
    item('歌曲与写作', 'momo的写作帮助', '查看写作模板关键词'),
  ] },
  { name: 'momoLunch', feature: 'lunch', help: [
    item('日常互动', '今天吃什么', '也支持早上、中午、晚上、凌晨、宵夜、现在吃什么'),
  ] },
  { name: 'momoSleep', feature: 'sleep', help: [
    item('日常互动', '早安 / 晚安', '仅群聊；记录作息、排名及睡眠时长'),
  ] },
  { name: 'momopoke', feature: 'poke', help: [
    item('日常互动', '戳一戳机器人', c => `随机图片；同会话同用户冷却 ${c.cooldown.poke} 秒`),
    item('图片管理', '#poke上传 + 图片', '添加戳一戳图片（仅主人）'),
    item('图片管理', '#poke列表', '查看已有图片（仅主人）'),
    item('图片管理', '#poke删除 序号或文件名', '删除戳一戳图片（仅主人）'),
  ] },
]

let loaded = new Set()
export function setLoadedModules(names) { loaded = new Set(names) }

export function getHelpMessages() {
  const config = getConfig()
  const items = modules.filter(m => loaded.has(m.name) && (!m.feature || config.enabled[m.feature]))
    .flatMap(m => m.help)
  const messages = ['momo 功能列表']
  for (const group of ['娱乐互动', '歌曲与写作', '日常互动', '图片管理']) {
    const entries = items.filter(i => i.group === group)
    if (!entries.length) continue
    const lines = [`【${group}】`]
    for (const entry of entries) {
      const description = typeof entry.description === 'function' ? entry.description(config) : entry.description
      lines.push(`• ${entry.command}：${description}`)
    }
    messages.push(lines.join('\n'))
  }
  if (!items.length) messages.push('当前没有已启用的功能。')
  messages.push('【使用说明】\n部分功能主人可跳过冷却，每日次数限制按各功能规则执行。\n图片管理指令仅主人可用。主人可在锅巴后台调整功能开关、冷却时间和角色池，保存后对后续消息生效。')
  return messages
}

export function getHelpText() {
  return getHelpMessages().join('\n\n')
}

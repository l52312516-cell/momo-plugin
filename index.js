import { loadApps } from './model/loader.js'

export const apps = await loadApps()
logger.info(`[momo-plugin] 已加载 ${Object.keys(apps).length} 个模块喵~`)
logger.info('发送 momo帮助 查看功能列表喵~')

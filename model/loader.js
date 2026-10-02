import { modules, setLoadedModules } from './registry.js'
import { isEnabled } from './config.js'

export async function loadApps(importer = name => import(`../apps/${name}.js`)) {
  const apps = {}
  for (const entry of modules) {
    try {
      const namespace = await importer(entry.name)
      const App = namespace[entry.name]
      if (typeof App !== 'function') throw new Error(`缺少导出类 ${entry.name}`)
      // 与 TRSS 一样实例化校验；加载成功与运行开关分离，以便后台即时启用。
      const instance = new App()
      for (const rule of instance.rule || []) {
        if (typeof instance[rule.fnc] !== 'function') throw new Error(`缺少指令方法 ${rule.fnc}`)
      }
      if (!entry.feature) {
        apps[entry.name] = App
        continue
      }
      class EnabledApp extends App {}
      for (const method of new Set((instance.rule || []).map(rule => rule.fnc))) {
        const handler = App.prototype[method]
        EnabledApp.prototype[method] = async function (e) {
          if (!isEnabled(entry.feature)) return false
          return handler.call(this, e)
        }
      }
      apps[entry.name] = EnabledApp
    } catch (error) {
      globalThis.logger?.error(`[momo] 模块 ${entry.name} 加载失败：`, error)
    }
  }
  setLoadedModules(Object.keys(apps))
  return apps
}

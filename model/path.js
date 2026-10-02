import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const _path = process.cwd().replace(/\\/g, '/')

// 插件名
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pluginName = path.basename(rootDirectory)
// 插件根目录
const pluginRoot = rootDirectory
// 插件资源目录
const pluginResources = path.join(pluginRoot, 'resources')
// 插件配置文件目录
const pluginConfig = path.join(pluginRoot, 'config')

const pluginResourcesUrl = pathToFileURL(pluginResources).href

export {
  pluginResourcesUrl,
  _path,
  pluginName,
  pluginRoot,
  pluginResources,
  pluginConfig, 
}

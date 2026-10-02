import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { pluginResources } from './path.js'

export function validateExtraRoles(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label}必须是角色数组`)
  const names = new Set()
  return value.map((role, index) => {
    if (!role || typeof role !== 'object' || Array.isArray(role) ||
        Object.keys(role).some(key => key !== 'name' && key !== 'intro')) {
      throw new Error(`${label}第 ${index + 1} 项必须包含角色名和身份介绍`)
    }
    if (typeof role.name !== 'string' || !role.name.trim() ||
        typeof role.intro !== 'string' || !role.intro.trim()) {
      throw new Error(`${label}第 ${index + 1} 项的角色名和身份介绍不能为空`)
    }
    const name = role.name.trim()
    if (names.has(name)) throw new Error(`${label}角色名重复：${name}`)
    names.add(name)
    return { name, intro: role.intro.trim() }
  })
}

function readBasePool(file) {
  const value = YAML.parse(fs.readFileSync(path.join(pluginResources, 'yaml', file), 'utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${file}必须是角色名到身份介绍的映射`)
  }
  return validateExtraRoles(Object.entries(value).map(([name, intro]) => ({ name, intro })), file)
}

function mergeRoles(base, extra, label) {
  const merged = new Map(base.map(role => [role.name, role.intro]))
  for (const role of extra) {
    if (merged.has(role.name)) throw new Error(`${label}角色名重复：${role.name}`)
    merged.set(role.name, role.intro)
  }
  return Object.fromEntries(merged)
}

export function getRolePool(reborn, special) {
  const file = special ? 'reborn.yaml' : 'preborn.yaml'
  const publicExtra = validateExtraRoles(reborn.publicExtra, '公共池额外角色')
  const privateExtra = special ? validateExtraRoles(reborn.privateExtra, '专用池额外角色') : []
  return mergeRoles(readBasePool(file), [...publicExtra, ...privateExtra], file)
}

// 保存时同时检查两池，避免配置专用群后才发现与基础角色重名。
export function validateRolePools(reborn) {
  if (reborn.publicExtra.length) getRolePool(reborn, false)
  if (reborn.publicExtra.length || reborn.privateExtra.length) getRolePool(reborn, true)
}

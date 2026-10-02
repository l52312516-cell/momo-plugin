import { featureLabels, numberSettings, getConfig, saveConfig } from './model/config.js'

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'momo-plugin', title: 'momo 插件', author: 'momo',
      description: '娱乐互动、歌曲、写作与作息记录', isV3: true, isV2: false,
      icon: 'mdi:cat', iconColor: '#b693ef',
    },
    configInfo: {
      schemas: [
        { component: 'SOFT_GROUP_BEGIN', label: '功能开关' },
        ...Object.entries(featureLabels).map(([key, label]) => ({
          field: `enabled.${key}`, label, component: 'Switch',
          bottomHelpMessage: '保存后立即生效；关闭后从 momo帮助 中隐藏。帮助指令始终可用。',
        })),
        { component: 'SOFT_GROUP_BEGIN', label: '冷却与决斗' },
        ...numberSettings.map(([field, label, value, min, max]) => ({
          field, label, component: 'InputNumber',
          componentProps: { min, max, precision: 0, step: 1 },
          bottomHelpMessage: `默认 ${value}；${min === 0 ? '0 表示无冷却；' : ''}保存后对后续消息生效。`,
        })),
        { component: 'SOFT_GROUP_BEGIN', label: '转生角色池' },
        {
          field: 'reborn.privateGroup', label: '专用角色池群号', component: 'Input',
          componentProps: { placeholder: '1026237460' },
          bottomHelpMessage: '该群使用 reborn.yaml，其他群及私聊使用 preborn.yaml。留空表示全部使用公开池。修改只切换后续访问的记录，不搬迁历史数据。',
        },
      ],
      getConfigData: getConfig,
      setConfigData(data, { Result }) {
        try {
          const config = getConfig()
          for (const [field, value] of Object.entries(data)) {
            if (field.includes('.')) {
              const parts = field.split('.')
              if (parts.length !== 2 || !Object.hasOwn(config, parts[0]) || !Object.hasOwn(config[parts[0]], parts[1])) {
                throw new Error(`未知配置项：${field}`)
              }
              config[parts[0]][parts[1]] = value
            } else {
              if (!Object.hasOwn(config, field) || !value || typeof value !== 'object' || Array.isArray(value)) {
                throw new Error(`未知配置项：${field}`)
              }
              config[field] = { ...config[field], ...value }
            }
          }
          saveConfig(config)
          return Result.ok({}, '保存成功，后续消息立即生效喵~')
        } catch (error) {
          return Result.error(`保存失败：${error.message}`)
        }
      },
    },
  }
}

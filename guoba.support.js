import { featureLabels, featureDescriptions, numberSettings, getConfig, saveConfig } from './model/config.js'

function extraRoleField(field, label, description) {
  return {
    field, label, component: 'GSubForm',
    bottomHelpMessage: description,
    componentProps: {
      multiple: true,
      modalProps: { title: label },
      schemas: [
        { field: 'name', label: '角色名', component: 'Input', required: true },
        { field: 'intro', label: '身份介绍', component: 'InputTextArea', required: true,
          componentProps: { autoSize: { minRows: 2, maxRows: 6 } } },
      ],
    },
  }
}

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
          bottomHelpMessage: `${featureDescriptions[key]} 保存后生效，关闭后从帮助中隐藏。`,
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
          componentProps: { placeholder: '留空默认全部使用公共池；填入一个群号启用专用池' },
          bottomHelpMessage: '默认留空。该群使用 reborn.yaml＋公共新增角色＋专用新增角色；其他群和私聊使用 preborn.yaml＋公共新增角色。修改群号不会搬迁历史记录。',
        },
        extraRoleField('reborn.publicExtra', '公共池额外角色',
          '填写角色名和身份介绍；同时加入公共池和专用池。可新增、修改和删除额外角色，不改写基础 YAML。同名角色不能重复添加，保存后生效。'),
        extraRoleField('reborn.privateExtra', '专用池额外角色',
          '仅专用群可抽到；留空群号时可先保存这些角色，设置群号后启用。专用池已包含公共新增角色，无需重复添加。保存后生效。'),
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

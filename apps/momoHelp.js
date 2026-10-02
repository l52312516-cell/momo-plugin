import { getHelpText } from '../model/registry.js'

export class momoHelp extends plugin {
  constructor() {
    super({
      name: 'momo帮助', dsc: 'momo功能列表', event: 'message', priority: 5,
      rule: [{ reg: '^#?momo帮助$', fnc: 'help' }],
    })
  }

  async help(e) {
    await e.reply(getHelpText())
    return true
  }
}

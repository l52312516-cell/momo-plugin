import { pluginResources, pluginResourcesUrl } from "../model/path.js"
import path from "node:path"
import fs from 'node:fs'
import YAML from "yaml"
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import lodash from 'lodash'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function shot(list, bgcolor, msgs) {
    if (list.length === 0) return msgs

    while (list.length > 36) {
        let batch = list.slice(0, 36)
        try {
            let data = {
                tplFile: path.join(pluginResources, 'html', 'songlist.html'),
                pluResPath: pluginResourcesUrl,
                songList: { list: batch },   //  包装成模板期望的结构
                bgcolor: `${bgcolor}`,
            }
            let img = await puppeteer.screenshot("momoSongList", data)
            if (!img) throw new Error("截图未返回图片")
            msgs.push(img)
        } catch(err) {
            console.error("生成图片失败:", err)
            msgs.push(batch.map(item => `${item.title} - ${item.desc}`).join("\n"))
        }
        list = list.slice(36)
    }

    if (list.length > 0) {
        try {
            let data = {
                tplFile: path.join(pluginResources, 'html', 'songlist.html'),
                pluResPath: pluginResourcesUrl,
                songList: { list: list },     //  包装成模板期望的结构
                bgcolor: `${bgcolor}`,
            }
            let img = await puppeteer.screenshot("momoSongList", data)
            if (!img) throw new Error("截图未返回图片")
            msgs.push(img)
        } catch(err) {
            console.error("生成图片失败:", err)
            msgs.push(list.map(item => `${item.title} - ${item.desc}`).join("\n"))
        }
    }

    return msgs
}

export class momoRequest extends plugin {
    constructor() {
        super({
            name: 'momo点歌',
            dsc: '群友点歌用插件',
            event: 'message',
            priority: 2093,
            rule: [
                {
                    reg: /^momo点歌(.*)$/,
                    fnc: 'momoRequest',
                }, 
                {
                    reg: "momo歌单$",
                    fnc: "momoSongList",
                }
            ]
        })
    }

    async momoRequest(e) {
        let songs, urls
        try {
            songs = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/requestnum.yaml`, 'utf-8'))
        } catch (err) {
            console.error("歌曲列表读取失败:", err)
            await e.reply("歌曲列表文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        try {
            urls = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/requesturl.yaml`, 'utf-8'))
        } catch (err) {
            console.error("URL列表读取失败:", err)
            await e.reply("歌曲URL文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let keys = Object.keys(songs)
        if (keys.length === 0) {
            await e.reply("歌曲列表为空喵~", true)
            return true
        }

        let match = e.msg.match(/^momo点歌(.*)$/)
        if (!match || !match[1].trim()) {
            await e.reply("未选择歌曲，随机点歌", true)
            let rnum = Math.floor(Math.random() * keys.length)
            let songKey = keys[rnum]
            let songname = songs[songKey]
            let songurl = urls[songKey]
            await sleep(lodash.random(500, 2000))
            await e.reply(`已随机歌曲《${songname}》：\nwww.bilibili.com/video/${songurl}`)
            return true
        }

        let Input = match[1].trim()
        let songname = songs[Input]
        if (!songname) {
            await e.reply("主人还未上传过该编号的歌曲喵~", true)
            return true
        }

        let songurl = urls[Input]
        await e.reply(`已找到歌曲${Input}《${songname}》：\nwww.bilibili.com/video/${songurl}`)
        return true
    }

    async momoSongList(e) {
        let songs
        try {
            songs = YAML.parse(fs.readFileSync(`${pluginResources}/yaml/requestnum.yaml`, 'utf-8'))
        } catch (err) {
            console.error("歌曲列表读取失败:", err)
            await e.reply("歌曲列表文件读取失败，请联系主人检查配置喵~", true)
            return true
        }

        let keys = Object.keys(songs)
        let nahida = []
        let furina = []
        let citlali = []
        let others = []

        for (let keynum of keys) {
            if (/^[12]\d{2}$/.test(keynum)) {
                nahida.push({ title: keynum, desc: songs[keynum] })
            } else if (/^[3]\d{2}$/.test(keynum)) {
                furina.push({ title: keynum, desc: songs[keynum] })
            } else if (/^[4]\d{2}$/.test(keynum)) {
                citlali.push({ title: keynum, desc: songs[keynum] })
            } else {
                others.push({ title: keynum, desc: songs[keynum] })
            }
        }

        let msgs = []

        msgs = await shot(nahida, "#9cff19", msgs)
        msgs = await shot(furina, "#3a91e9", msgs)
        msgs = await shot(citlali, "#ff95d6", msgs)
        msgs = await shot(others, "#ff9500", msgs)

        await e.reply(Bot.makeForwardArray([...msgs]))
        return true
    }
}
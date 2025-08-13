// fetch-event-source 提供了对服务器端的事件源(Server-Sent Events)进行订阅和处理,是基于 Server-Sent Events(SSE)技术和 Fetch API 的封装,用于实现实时通信和接收服务器端推送的数据的
import { fetchEventSource } from '@microsoft/fetch-event-source'
import qs from 'qs'
class FatalError extends Error {}

/**
 * ai 搜索
 * 使用sse: server-sent events
 * @param {chat_message: string} params
 * @param {() => void} doneCb
 * @param {() => void} msgCb
 * @param {() => void} bizCb
 * @param {() => void} errorCb
 * @returns
 */
const jsonParse = (str) => {
  let result = undefined
  try {
    result = JSON.parse(str)
  } catch (e) {}
  return result
}

export const BIZ_ID = '7'

export const BIZ_LABEL_MAP = {
  sys_intro: {
    name: '应用',
    color: '#f50',
  },
  sys_news: {
    name: '新闻',
    color: '#108ee9',
  },
  sys_faq: {
    name: 'FAQ',
    color: '#87d068',
  },
  sys_kb: {
    name: '百科',
    color: '#2db7f5',
  },
}

export function aiSearchApi(params = {}, { doneCb, msgCb, bizCb, errorCb }) {
  let param = qs.stringify(params)
  const url = `https://janus.offlinesass.com/search/api/v1/chat_stream?${param}`
  const ctrl = new AbortController()
  fetchEventSource(url, {
    signal: ctrl.signal,
    openWhenHidden: true,
    async onopen(response) {
      if (response.ok) {
        const arr = jsonParse(response.headers.get('Biz_data') || '')
        const bizData = arr.map((item) => {
          const itemStr = item.replace(/\\"/g, '"')
          return jsonParse(itemStr)
        })
        console.log('bizData', bizData)
        bizCb && bizCb(bizData)
        // everything's good
        return
      } else if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        // client-side errors are usually non-retriable:
        throw new FatalError()
      } else {
        console.log(response)
        // throw new RetriableError();
      }
    },
    onmessage(event) {
      const data = jsonParse(event.data) || {}
      // 传输完毕
      if (data.event === 'all_done') {
        ctrl.abort()
        doneCb()
      } else {
        if (data.text) {
          msgCb(data.text, data.id === 1 ? true : false)
        }
      }
    },
    onclose() {
      console.log('eventsource service closed')
    },
    onerror(err) {
      errorCb()
      throw err
    },
  })
  return ctrl
}

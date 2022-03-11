/* 封装ajax函数
 * @param {string}opt.type http连接的方式，包括POST和GET两种方式
 * @param {string}opt.url 发送请求的url
 * @param {string}opt.method 请求方式
 * @param {boolean}opt.async 是否为异步请求，true为异步的，false为同步的
 * @param {object}opt.data 发送的参数，格式为对象类型
 * @param {boolean}opt.withCredentials
 * @param {string}opt.contentType  默认 'application/x-www-form-urlencoded'
 * @param {string}opt.baseURL
 * @param {number}opt.timeout ms
 * @param {string}opt.responseType 可选: ArrayBuffer、Blob、Document，或 DOMString
 * @param {object}opt.headers  包含 contentType
 * https://xhr.spec.whatwg.org/#the-setrequestheader()-method
 */

ajax.baseUrl = ''
function ajax(opt) {
  return new Promise(function (resolve, reject) {
    opt = opt || {}
    opt.method = opt.method.toUpperCase() || 'POST'
    opt.url = ajax.baseUrl + opt.url || ''
    opt.async = opt.async || true
    opt.responseType = opt.responseType || 'json'
    opt.withCredentials = opt.withCredentials || false
    opt.headers = opt.headers || {}
    opt.data = opt.data || null
    opt.contentType = opt.contentType || 'application/x-www-form-urlencoded'
    var xhr = null
    if (XMLHttpRequest) {
      xhr = new XMLHttpRequest()
    } else {
      xhr = new ActiveXObject('Microsoft.XMLHTTP')
    }
    xhr.timeout = opt.timeout || 0
    var params = []
    for (var key in opt.data) {
      params.push(key + '=' + opt.data[key])
    }
    if (opt.method.toUpperCase() === 'POST') {
      xhr.open(opt.method, opt.url, opt.async)
      xhr.setRequestHeader('Content-Type', opt.contentType)
      for (const key in opt.headers) {
        xhr.setRequestHeader(key, opt.headers[key])
      }
      xhr.send(opt.data);
    } else if (opt.method.toUpperCase() === 'GET') {
      xhr.open(opt.method, opt.url + '?' + params.join('&'), opt.async)
      xhr.setRequestHeader('Content-Type', opt.contentType)
      for (const key in opt.headers) {
        xhr.setRequestHeader(key, opt.headers[key])
      }
      xhr.send(null)
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        console.log(xhr)
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
          resolve(xhr.responseText)
        } else {
          reject(xhr.responseText)
        }
      }
    }
    xhr.ontimeout = function (e) {
      console.log('Timeout!!')
      reject(e)
    }
  })
}

// var opt = {
//   method: 'POST',
//   url: '/get_api_post_data/',
//   contentType: 'application/json',
//   data: {
//     name1: 'value1',
//     name2: 'value2'
//   }
// }
// Promise.all(ajax(opt)).then(
//   function (data) {
//     console.log(data)
//   },
//   function (error) {
//     console.log(error)
//   }
// )

/**
 * Created by Alex on 2017/9/23.
 */
/**
 * 浏览器端数据存储的工具模块
 * sessionStorage存储
 * localStorage存储
 * 形式: key=value
 *
 */

class Storage {
  constructor() {}
  setLocal(key, value) {
    //必须转换为json放在localStorage存储里，不然不方便读取
    if (typeof value === 'object') {
      value = JSON.stringify(value)
    }
    localStorage.setItem(key, value)
  }
  getLocal(key) {
    var value = localStorage.getItem(key)
    //将json对象，数组进行处理
    if (value !== null && (value.indexOf('{') === 0 || value.indexOf('[') === 0)) {
      value = JSON.parse(value)
    }
    return value
  }
  removeLocal(key) {
    localStorage.removeItem(key)
  }
  setSession(key, value) {
    //必须转换为json放在localStorage存储里，不然不方便读取
    if (typeof value === 'object') {
      var value = JSON.stringify(value)
    }
    sessionStorage.setItem(key, value)
  }
  getSession(key) {
    var value = sessionStorage.getItem(key)
    //将json对象，数组进行处理
    if (value !== null && (value.indexOf('{') === 0 || value.indexOf('[') === 0)) {
      value = JSON.parse(value)
    }
    return value
  }
  removeSession(key) {
    sessionStorage.removeItem(key)
  }
}

function Storage2() {}

Storage2.prototype = {
  setLocal: function set(key, value) {
    //必须转换为json放在localStorage存储里，不然不方便读取
    if (typeof value === 'object') {
      value = JSON.stringify(value)
    }
    localStorage.setItem(key, value)
  },
  getLocal: function get(key) {
    var value = localStorage.getItem(key)
    //将json对象，数组进行处理
    if (value !== null && (value.indexOf('{') === 0 || value.indexOf('[') === 0)) {
      value = JSON.parse(value)
    }
    return value
  },
  removeLocal: function remove(key) {
    localStorage.removeItem(key)
  },
  setSession: function set(key, value) {
    //必须转换为json放在localStorage存储里，不然不方便读取
    if (typeof value === 'object') {
      var value = JSON.stringify(value)
    }
    sessionStorage.setItem(key, value)
  },
  getSession: function get(key) {
    var value = sessionStorage.getItem(key)
    //将json对象，数组进行处理
    if (value !== null && (value.indexOf('{') === 0 || value.indexOf('[') === 0)) {
      value = JSON.parse(value)
    }
    return value
  },
  removeSession: function remove(key) {
    sessionStorage.removeItem(key)
  }
}

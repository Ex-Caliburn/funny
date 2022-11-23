class Draft {
    constructor() {}
    set(key, draft) {
      // 删除之前的key
      this.delete(key)
      try {
        localStorage.setItem(`${key}_${Date.now()}`, JSON.stringify(draft))
      } catch (error) {
        this.clear()
        console.log(error)
      }
    }
    read(realKey) {
      try {
        let content = localStorage.getItem(realKey)
        if (/^\[.*\]$|^{.*}$/gi.test(content)) {
          return JSON.parse(localStorage.getItem(realKey))
        } else {
          return content
        }
      } catch (err) {
        console.log(err)
      }
    }
    mount(key, cb) {
      let realKey = this.findRealKey(key)
      let local = this.read(realKey)
      if (!local) return
      MessageBox.confirm('是否恢复本地草稿？', '确认信息', {
        distinguishCancelAndClose: true,
        confirmButtonText: '恢复',
        cancelButtonText: '放弃',
        showClose: false,
        closeOnClickModal: false,
        closeOnPressEscape: false
      })
        .then(() => {
          cb && cb(local)
          this.delete(key)
        })
        .catch(() => {
          this.delete(key)
        })
    }
    delete(key) {
      localStorage.removeItem(this.findRealKey(key))
    }
    findRealKey(key) {
      for (let item in localStorage) {
        if (item.indexOf(key) > -1) {
          return item
        }
      }
    }
    clear(interval = 7) {
      let time
      const day = 24 * 60 * 60 * 1000
      for (let item in localStorage) {
        time = item.match(/_([0-9]+)$/i)[1]
        if (time && time < Date.now() - interval * day) {
          localStorage.removeItem(item)
        }
      }
    }
  }
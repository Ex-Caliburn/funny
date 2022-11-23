/**
 * 禁止连点指令 【html 中用】
 * if (event.target.disabled) { return } // 点击太频繁了 【js 中用】
 */
 let preventReClick = {
  inserted(el, binding) {
    el.addEventListener('click', () => {
      if (!el.disabled) {
        el.disabled = true
        setTimeout(() => {
          el.disabled = false
        }, binding.value || 1000)
      }
    })
    el.addEventListener('keydown', ev => {
      if (ev.keyCode === 13) {
        if (!el.disabled) {
          el.disabled = true
          setTimeout(() => {
            el.disabled = false
          }, 1000)
        }
      }
    })
  }
}
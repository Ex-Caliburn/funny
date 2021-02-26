// 手动实现复制 Safari不支持  navigator.clipboard.write 
//  document.execCommand('copy') chrome 复制图片 就没成功过

this.checkSupportCopy()

async function checkSupportCopy() {
  this.isSupportCopy = await this.isSupportClipboardWrite()
  console.log(this.isSupportCopy)
}
/*
 * @description: https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
 */
async function isSupportClipboardWrite() {
  try {
    const permission = await navigator.permissions.query({
      name: 'clipboard-write',
      allowWithoutGesture: false
    })
    return ['prompt', 'granted'].includes(permission.state)
  } catch (error) {
    return false
  }
}

if (isCopy) {
  if (this.isSupportCopy) {
    let img = document.createElement('img')
    img.src = canvas.toDataURL()
    // img.style.display = 'none'
    img.id = 'copy-img'
    img.onload = () => {
      document.body.appendChild(img)
      let selection = window.getSelection()
      let range = document.createRange()
      range.selectNode(document.getElementById('copy-img'))
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('copy')
    }
    this.$message.error('不支持复制')
    return
  }
  let selection = window.getSelection()
  let range = document.createRange()
  range.selectNode(document.getElementById('student-invite-card'))
  selection.removeAllRanges()
  selection.addRange(range)
  const data = [
    new window.ClipboardItem({
      'image/png': base64ToBlob(canvas.toDataURL())
    })
  ]
  navigator.clipboard.write(data).then(
    () => {
      this.$message.success('复制成功')
    },
    (err) => {
      this.$message.error(`复制失败:${err}`)
      console.log('err', err)
    }
  )
}

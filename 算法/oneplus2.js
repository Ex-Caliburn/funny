var domArr = document.querySelectorAll('.photo_item')
var idArr = []
for (let value of domArr) {
  idArr.push(value.getAttribute('data-id'))
}
idArr
var script = document.createElement('script')
script.type = 'text/javascript'
script.src = 'https://code.jquery.com/jquery-3.2.1.min.js'
document.getElementsByTagName('head')[0].appendChild(script)
let res = []
var textarea = document.createElement('textarea')
textarea.classList.add('greek')
document.body.appendChild(textarea)

$.ajax({
  type: 'POST',
  data: {
    // ids: JSON.stringify(idArr.slice(0, 100))
    // ids: JSON.stringify(idArr.slice(100, 200))
    // ids: JSON.stringify(idArr.slice(200, 300))
    // ids: JSON.stringify(idArr.slice(300, 400))
    // ids: JSON.stringify(idArr.slice(400, 500))
  },
  url: 'https://cloud.h2os.com/gallery/pc/getRealPhotoUrls',
  contentType: 'application/x-www-form-urlencoded;charset=utf-8',
  success: function (data) {
    for (var key in data) {
      console.log(data[key])
      res.push(data[key])
      textarea.value += data[key] + '\n'
    }
  }
})


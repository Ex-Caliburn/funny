// cd dao 当前目录再允许node ，不要找不到文件， 404

const express = require('express')

const app = express()

// app.use(express.static('./public'));

app.use(
  express.static('./public', {
    setHeaders(res) {
      res.set('access-control-allow-origin', '*')
      //   res.set('access-control-allow-credentials', 'true');
    }
  })
)
app.use(function (req, res, next) {
  console.log('err')
})

app.listen(3000)
app.listen(4000)


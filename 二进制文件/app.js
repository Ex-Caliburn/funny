// cd dao 当前目录再允许node ，不要找不到文件， 404

const express = require('express')

const app = express()

// app.use(express.static('./public'));

app.use('/', function (req, res, next) {
  console.log('all', req.method, req.url, req.path, req.get('Content-type'))
  next()
})

app.use(
  express.static('./public', {
    setHeaders(res) {
      res.set('access-control-allow-origin', '*')
      //   res.set('access-control-allow-credentials', 'true');
    }
  })
)

app.listen(3000, () => console.log(`Example app listening at http://localhost:${3000}`))
app.listen(4000, () => console.log(`Example app listening at http://localhost:${4000}`))


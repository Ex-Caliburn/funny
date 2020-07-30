// cd dao 当前目录再允许node ，不要找不到文件， 404

const express = require('express')
var bodyParser = require('body-parser');
const multer = require('multer') // v1.0.5
const upload = multer() // for parsing multipart/form-data



const app = express()

app.use(bodyParser.text());  // 解析  text/plain
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended:true})); // for parsing application/x-www-form-urlencoded

// app.use(express.static('./public'));

app.use(
  express.static('./public', {
    setHeaders(res) {
      res.set('access-control-allow-origin', '*')
      //   res.set('access-control-allow-credentials', 'true');
    }
  })
)

app.use('/', function (req, res, next) {
  console.log('all', req.method, req.url, req.path, req.get('Content-type'))
  next()
})



app.get('/err/1.img', (req, res) => {
  console.log('get')
  // res.set('access-control-allow-origin', '*')
  console.log(req.query);   //post
  console.log('/err/1.img')
  res.sendStatus(204)
})

app.post('/err/1.img', upload.array(), (req, res) => {
  console.log('post')
  // res.set('access-control-allow-origin', '*')
  console.log(req.query);   
  console.log(req.body, req.body.id);   
  try {
    console.log(JSON.parse(req.body).id);   
  } catch (error) {
    // console.log(error)
  }
  console.log(req.params)
  console.log('/err/1.img')
  res.sendStatus(204)
})

// app.use(function (req, res, next) {
//   res.set('access-control-allow-origin', '*')
//   console.log('all', req.method, req.url, req.path, req.get('Content-type'))
// })



app.listen(3000, () => console.log(`Example app listening at http://localhost:${3000}`))
app.listen(4000, () => console.log(`Example app listening at http://localhost:${4000}`))


const express = require('express')
const app = express()
const port = 5000

app.use('/', (req, res, next) => {
  // res.header("Access-Control-Allow-Origin", "*");
  // console.log(req, res)
  console.log('222222')
  res.send('Hello World!')
  next()
})

app.get('/cors', (req, res) => {
  console.log('cors!')
  res.send('cors!')
})

app.use(function (req, res, next) {
  console.log('err')
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

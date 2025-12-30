const express = require('express')
const app = express()
const port = 5000


app.use('/', (req, res, next) => {
  // res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:3000')
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  //   res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Headers', 'x-custom-header')
  res.header('Access-Control-Allow-Methods', ' DELETE')
  //   res.header("Access-Control-Allow-Methods", " OPTIONS");
  res.header('Access-Control-Max-Age', '10')

  res.cookie('test', '1111', { path: '/' })

  console.log('222222')
  res.send('Hello World!')
  // res.json('Hello World!')
  next()
})



app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

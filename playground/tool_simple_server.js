const express = require('express')
const app = express()
const port = 3000

// app.use('/', (req, res, next) => {
//   console.log(111)
//   // res.header("Access-Control-Allow-Origin", "*");
//   res.send('Hello World!')
//   next()
// })

app.use('/get_api_post_data', (req, res) => {
  console.log(2222)
  res.header('Access-Control-Allow-Origin', '*')
  res.header("Access-Control-Allow-Headers", "content-type");
//   res.send('Hello World!')
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

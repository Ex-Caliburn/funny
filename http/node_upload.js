const express = require('express')
const app = express()
const port = 5000
var fs = require('fs')
var path = require('path')
const multiparty = require('multiparty')

// app.use('/image/', express.static('./public'));

app.use('/image/:name', (req, res, next) => {
  console.log(req.params)
  res.sendFile(path.join(__dirname, '/public/' + req.params.name))
})

app.use('/', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:3000')
  res.header('Access-Control-Allow-Credentials', 'true')
  //   res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Headers', 'x-custom-header,Content-Type')
  res.header('Access-Control-Allow-Methods', ' DELETE POST')
  //   res.header("Access-Control-Allow-Methods", " OPTIONS");
  res.header('Access-Control-Max-Age', '10')

  res.cookie('test', '1111', { path: '/' })

  let form = new multiparty.Form();
  /* 设置编辑 */
  form.encoding = 'utf-8';
  //设置文件存储路劲
  form.uploadDir = './public';
  //设置文件大小限制
  form.maxFilesSize = 1 * 1024 * 1024;
  form.parse(req, function (err, fields, files) {
    // console.log(err, fields, files)
    console.log(err, fields, files)
    // res.sendFile(files[0])
    try {
      let inputFile = files.file[0];
      let uploadedPath = inputFile.path;
      let newPath = form.uploadDir + "/" + inputFile.originalFilename;
      //同步重命名文件名 fs.renameSync(oldPath, newPath)
      fs.renameSync(inputFile.path, newPath);
      res.send({ data: "上传成功！", url: "/image/" + inputFile.originalFilename});
      //读取数据后 删除文件
      // fs.unlink(newPath, function () {
      //   console.log("删除上传文件");
      // })
    } catch (err) {
      console.log(err);
      res.send({ err: "上传失败！" });
    };
  })

  // console.log(req, req.body, req.query, req.params)
  // res.send('Hello World!')
  // res.json('Hello World!')
  // next()
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

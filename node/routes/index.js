var express = require('express');
var router = express.Router();


/* GET home page. */
router.all('/', function(req, res, next) {
  res.send('1111')
  res.header("Access-Control-Allow-Origin", "*");
next();
});
router.all('/', function(req, res, next) {
  res.send('1111')
});


router.post('/upload', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    if (req.file) {
        res.send({code:1,msg:"文件上传成功",resp:[]})
        console.log(req.file);
    }else{
        res.send({code:0,msg:"文件上传失败",resp:[]})
    }
});

const [a,b,c] = 'hello';
console.log(a,b,c);




module.exports = router;

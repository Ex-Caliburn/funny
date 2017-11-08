var express = require('express');
var router = express.Router();
var fs = require('fs');
var cryptoBrowserify = require('crypto-browserify');

let crypto;
try {
    crypto = require('crypto');
} catch (err) {
    console.log('不支持 crypto!');
}


 // var privatePem = fs.readFileSync('./rsa/server.pem');
 // var publicPem = fs.readFileSync('./rsa/cert.pem');
 var key = fs.readFileSync('./rsa/server.pem');
 var pubkey = fs.readFileSync('./rsa/cert.pem');
 // var key = privatePem.toString();
 // var pubkey = publicPem.toString();

 var data = "lijiye"
  
 var sign = crypto.createSign('RSA-SHA256');
 sign.update(data);
 var sig = sign.sign(key, 'hex');



 function verify(data) {
     var verify = crypto.createVerify('RSA-SHA256');
     verify.update(data);
     return verify.verify(pubkey, sig, 'hex');
 }


// const sign = crypto.createSign('SHA256');
//
// sign.update('some data to sign');
//
// const privateKey = getPrivateKeySomehow();
// console.log(sign.sign(privateKey, 'hex'));




/* GET home page. */
router.all('/', function(req, res, next) {
    res.status(200)
    res.set({
        'Content-Type': 'text/html; charset=utf8',
        'Access-Control-Allow-Origin': '*',
        'Accept-Language': 'zh-CN'
    })
  next();
});

router.all('/get_api_post_data/', function(req, res, next) {
    console.log(req.body);   //post
    console.log(req.params);  //get
    var str = '';
    switch (req.body.cmd || req.params.cmd){
        case "send_verify_code":
            str = {"code":0,"msg":"","resp":["您的验证码已发送成功"],"popup_info":null,"ad":"文案待定"}
            break;
        case "user_web_login":
            str ={"code":0,"msg":"","resp":[{"login_token":{"token":"kx/pAXoP7xZsfUfcN980p4tNwzc="},"user_info":{"user_id":"31500990202181791417","mobile":"17710352664","nick_name":"Excaibulr","head_img_url":"http://7xov8j.com2.z0.glb.qiniucdn.com/w5T5ahA-jZHUMYuPnXGdIMJq_v4_ceNgsDx7CKF10Wk","change_nick_name_times":1,"change_head_img_times":1,"social_nick_name":null,"qq_id":null,"wx_id":null,"email":null,"real_name":"李霁野","card_code":"430204199307063215","card_image_url_front":null,"card_image_url_back":null,"blocked":null,"recognize_status":null,"has_pwd":true,"has_pay_pwd":true,"free_pay_pwd_quota":2000,"free_pay_pwd_status":1}}],"popup_info":null,"ad":"文案待定"}
            break;
        default:
    }
    res.send(str);
});

module.exports = router;

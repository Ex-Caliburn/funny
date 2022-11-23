// cd dao 当前目录再允许node ，不要找不到文件， 404

const express = require('express')
const axios = require('axios')

const app = express()

// app.use(express.static('./public'));

axios
  .post('https://relx.fastgrowth.app/auth/product/verify', {
    'g-recaptcha-response':
      '03AGdBq24L9HZ2gtudTUFc2B6lUqsaLmlEHrJJyxOffuptVPX915GWKayefxNOWttczBTO020DoHQgtefHSN6VEPS_DnL3_qHCXCL-Q8GbJeEhJ7lWoHuOGA-DOhnTeJBNiUZvyjTPyKPeAEMeJqtHymCI9it-yMtNDK8rnHG9eBrgmuFDDU7h0bcNDPLzcG49MWbVH8heqNMDlEAkLMtR7sdjVRpSzXDUlUIYP3z_YYyMYcAUyw33pIj4h8PaavFg6GQ52kZta5DyEGzr1Y_m-qiXki8NEN8OvjSlsmyQsh78gBHhX7GJDF4QETJ4SZoPFGdkW84dMvcN_e9g72V_9F7FjvjTwWWfBJOeSbAGY8Y8YVRIHR2bFnNIEdF9C2AVzKLy20RQkIsttYq9dCoK9txk8f7JXHKO7rJBZwCndrT02QEyNhpDgnvDQg-CLrxduC_M-LApFHR4eECyNDAKCcymwdowT51aTA',
    code: 12345123451234
  }, {
    contentType: 'application/x-www-form-urlencoded',
  })
  .then(function (response) {
    // handle success
    console.log(response)
  })
  .catch(function (error) {
    // handle error
    console.log(error)
  })

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

app.listen(3000, () => console.log(`Example app listening at http://localhost:${3000}`))

const express = require('express')
const app = express()

var Multipassify = require('multipassify')

// Construct the Multipassify encoder
var multipassify = new Multipassify('b1e759c5b2170b0a0eca5845420073aa')

app.use(function (req, res, next) {
  var customerData = {
    email: 'jiye.li@relxintl.com',
    // multipass_identifier: 104040,
    return_to: 'https://relx-test2.myshopify.com'
  }

  // Encode a Multipass token
  var token = multipassify.encode(customerData)

  // Generate a Shopify multipass URL to your shop
  var url = multipassify.generateUrl(customerData, 'relx-test2.myshopify.com')

  res.send(url)
})

app.listen(3000, () => console.log(`Example app listening at http://localhost:${3000}`))

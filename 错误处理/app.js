const express = require('express');

const app = express();

// app.use(express.static('./public'));


app.use(express.static('./public', {
    setHeaders(res) {
      res.set('access-control-allow-origin', '*');
    //   res.set('access-control-allow-credentials', 'true');
    }
  }));


app.listen(3000);
app.listen(4000);
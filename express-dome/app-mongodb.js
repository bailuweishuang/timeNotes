const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;
const routerMongodb = require('./router-mongodb');

app.engine('.html', require('express-art-template'));

app.use('/public/', express.static('./public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(routerMongodb);

app.listen(port, () => {
  console.log('runging...');
});

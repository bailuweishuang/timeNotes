const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const router = require('./router');

const app = express();
const port = 5000;

app.engine('.html', require('express-art-template'));

app.use('/public/', express.static(path.join(__dirname, './public')));

// 配置post请求 获取请求内容
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(router);

app.listen(port, () => {
  console.log('runing...');
});

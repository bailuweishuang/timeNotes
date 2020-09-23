const express = require('express');
const bodyParser = require('body-parser');
const router = require('./router');

const app = express();

const port = 3000;

// express使用art-tempalte
app.engine('.html', require('express-art-template'));

// 开放公共资源
// 访问路径要以 /public/ 开头， 再去 ./public/的目录去找 对应的资源 访问路径：http://www.baidu.com/public/css/main.css
app.use('/public/', express.static('./public/'));

// 这里的a相当于public的别名
//app.use('/a/', express.static('./public/'));

// 省略开头访问路径 表示直接访问对的 ./public/ 的资源 访问路径：http://www.baidu.com/css/main.css
//  app.use(express.static('./public/'));

// express默认的页面视图都放在views里面 如果要更改目录
// express.set('views', 目录名)

// 配置post请求 获取请求内容
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 配置路由
app.use(router);

app.listen(port, () => {
  console.log('runing...');
});

const http = require('http');
const fs = require('fs');
const template = require('art-template');
const url = require('url');

let list = [
  {
    name: '小李',
    message: '要要一套巧克力',
    time: new Date(),
  },
  {
    name: '小李',
    message: '要要一套巧克力',
    time: new Date(),
  },
  {
    name: '小李',
    message: '要要一套巧克力',
    time: new Date(),
  },
  {
    name: '小李',
    message: '要要一套巧克力',
    time: new Date(),
  },
];
http
  .createServer((req, res) => {
    // 解析请求路径中的查询字符串
    const urlObject = url.parse(req.url, true);
    const { pathname } = urlObject;
    let index = '/views/index.html'; 
    const getFeile = (dir) => {
      const result = new Promise((resolve, reject) => {
        fs.readFile(`.${dir}`, (err, data) => {
          if (err) {
            reject('404 Not Found');
          } else {
            resolve(data);
          }
        });
      });
      return result;
    };

    if (pathname !== '/') {
      index = pathname;
    }
    if (pathname === '/') {
      getFeile(index).then((obj) => {
        const htmlStr = template.render(obj.toString(), {
          list,
        });
        res.end(htmlStr);
      });
    } else if (pathname === '/postmessage') {
      const { query } = urlObject;
      let newQuery = { ...query };
      newQuery.time = '2020-09-12';
      list.unshift(newQuery);
      // 设置状态码 301:永久重定向 浏览器会记住；302:临时重定向 浏览器不记忆
      res.statusCode = '302';
      // 设置路径 重定向
      res.setHeader('location', '/');
      res.end();
    } else if (pathname.indexOf('/public') === 0) {
      getFeile(index).then((obj) => {
        res.end(obj);
      });
    } else if (pathname === '/post') {
      getFeile('/views/post.html').then((obj) => {
        res.end(obj);
      });
    } else {
      getFeile('/views/error.html').then((obj) => {
        res.end(obj);
      });
    }
  })
  .listen('3000', () => {
    console.log('runing...');
  });

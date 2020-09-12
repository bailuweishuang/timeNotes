const http = require('http');

const fs = require('fs');

const artTemplate = require('art-template');

const server = http.createServer();

const dir = 'G:/fujian/';

server.on('request', (req, res) => {
  fs.readFile('./index.html', (err, data) => {
    if (err) {
      return res.end('404 Not Found.');
    }
    fs.readdir(dir, (err, files) => {
      if (err) {
        return res.end('没有找到文件！');
      }
      let content = artTemplate.render(data.toString(), {
        file: files,
      });

      res.end(content);
    });
  });
});

server.listen('3000', () => {
  console.log('链接成功...');
});

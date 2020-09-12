const http = require('http');

// 创建实例
const server = http.createServer();

// 发送请求 response响应请求
server.on('request', (request, response) => {
  // request.socket.remotePort (客户端端口号  )
  console.log('进入');
  // 服务器默认发送数据，是utf8编码的内容，浏览器响应解析是按当前的操作系统默认的编码解析的
  // 需要告诉浏览器解析的编码方式

  // response.write('hellow');
  // // 响应结束
  // response.end();
  const { url } = request;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.write('欢迎来到德莱联盟');
  response.end(url);
});

// 监听服务
server.listen('3000', () => {
  console.log('启动成功');
});

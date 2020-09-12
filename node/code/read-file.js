// fs  file-system的简写  提供文件操作的API
const fs = require('fs');

// 第一个参数是读取地址，第二个是回调函数

fs.readFile('./http.js', (error, data) => {
  // <Buffer 23 20 74 69 6d 65 4e 6f 74 65 73 0d 0a e5 90 84 e7 a7 8d e6 9d a5 e6 ba
  // 90 e7 9a 84 e7 ac 94 e8 ae b0 0d 0a>
  // 文件储存是二进制 这里转成16进制
  console.log(data.toString());
});

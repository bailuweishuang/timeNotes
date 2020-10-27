// 创建对象
let xmlhttp;
if (window.XMLHttpRequest) {
  // IE7+, Firefox, Chrome, Opera, Safari 浏览器执行代码
  xmlhttp = new XMLHttpRequest();
} else {
  // IE6, IE5 浏览器执行代码
  xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
}
xmlhttp.onreadystatechange = () => {
  // readyState: XMLHttpRequest的状态
  // 0: 请求初始化；1：服务器连接建立；2：请求接受；3请求处理中；4：请求完成，响应已就绪
  if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
    document.getElementById('txtHint').innerHTML = xmlhttp.responseText;
  }
};

// xmltttp.open(请求类型，url，是否异步)
// get请求会有缓存（是不可控的），解决办法：
// 给URL添加唯一ID，
// xmlhttp.open("GET","/try/ajax/demo_get.php?t=" + Math.random(),true);
xmlhttp.open('GET', '/try/ajax/gethint.php', true);
xmlhttp.send();

// xmlhttp.open("POST","/try/ajax/demo_post2.php",true);
// xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
// xmlhttp.send('fname=Henry&lname=Ford');

// get post的一些区别：

// get： 从服务器获取东西 传递给服务器信息的方式一般采用：问号传参。传递信息少，
// URL有长度限制，IE浏览器限制是2KB，谷歌是4KB~8KB,超出长度自动截取，
// 容易被别截取和修改传递信息。

// post：想服务器推送东西 传递给服务器的方式一般采用：设置请求主题，理论上没有大小的限制，项目中
// 可能会自我限制
// 不容易被劫持

// 设置ajax的等待时间，超过就算ajax延迟
xhr.timeout = 10;



function newAJAX (url, type = 'get', async = true) {
  const p = new Promise((resolve, reject) => {
    let xml;

    if(window.XMLHttpRequest) {
      xml = new XMLHttpRequest()
    }else {
      xml = new ActiveXObject('Microsoft.XMLHTTP')
    }

    xml.open(type, url, async);

    xml.onreadystatechange = function () {
      if(xml.readyState === 4) {
        if(xml.status === 200) {
          resolve(xml.responseText)
        }else if(XMLHttpRequestUpload.status === 404) {
          reject(new Error('404'))
        }
      }
    };

    xml.send(null)
  })

  return p
}
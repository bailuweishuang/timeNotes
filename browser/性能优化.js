// 原则：多使用内存、缓存或其他方法 减少CPU计算量，减少网络加载耗时 （空间换时间）

// 入手：让加载更快 渲染更快

// 加载更快：

// 减少资源体积：压缩代码
// 减少访问次数：合并代码，SSR服务端渲染，缓存

// 使用更快的网络：CDN

// 防抖

function debounce(fn, delay = 500) {
  let timer = null;
  const _debounce = function () {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, arguments);
      timer = null;
    }, delay);
  };
  return _debounce;
}

// 节流

function throttle(fn, delay = 100) {
  let timer = null;

  const _throttle = function () {
    if (timer) return;

    timer = setTimeOut(function () {
      fn.apply(this, arguments);
      timer = null;
    }, delay);
  };

  return _throttle;
}



/* 减少http的请求和大小 资源的合并和压缩 图片懒加载 音视频走流文件*/
/**
 * 如何避免dom回流：
 *  放弃操作dom
 *  分离读写操作
 *  样式集中改变
 *  css3硬件加速 规避回流
*/
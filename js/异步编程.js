// 浏览器的执行 是单线程 耗时长
// 异步解决

// 1 回调函数 异步编程的最基本的方法
fn1();
fn2();
// fn2要在fn1执行完后在执行  但是fn1执行时间比较久 就可以考虑改写fn1
function fn1(callback) {
  setTimeout(() => {
    // fn1的执行代码
    callback();
  }, 1000);
}

fn1(fn2);

// 2 事件监听 事件驱动模式， 代码的执行不取决于顺序，而取决于某件事情是否发生
// 采用jQuery写法
f1.on('done', f2);

function f1() {
  setTimeout(() => {
    // f1的执行代码
    f1.trigger('done');
  }, 1000);
} 


// 发布订阅  promise
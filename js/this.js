// this的指向 this永远指向最后调用它的那个对象

// this的四种指向
// 1
function test() {
  console.log(this);
}
test(); // 严格模式下是undefined，普通调用指向window

// 2
const obj = {
  name: '123',
  fn: function() {
    console.log(this);
  },
};
obj.fn(); // 指向当前调用的对obj

// 3 call，apply， bind 改变this的指向

function a(a, b, c) {
  console.log(this.name, a, b, c);
}
const b = {
  name: '小吴',
};

a.call(b, 1, 2, 3);
a.apply(b, [1, 2, 3]);
a.bind(b, 1, 2, 3); // 重新生成返回的是一个函数，这个函数的this指向第一个参数
const c = a.bind(b, 1, 2, 3);
c();

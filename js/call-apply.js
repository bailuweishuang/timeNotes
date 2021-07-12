// call apply 都能够改变this的指向，唯一的区别是他们的参数不同

const a = {
  name: 'Xiaozhang',
};
function b(arg1, arg2) {
  console.log(this.name, arg1, arg2);
}
b.call(a, 1, 2);
b.apply(a, [1, 2]);

// 在开发中会遇到的场景

// 1 检验数据类型

function type(obj) {
  const regexp = /\s(\w+)\]/;
  const result = regexp.exec(Object.prototype.toString.call(obj))[1];
  return result;
}

// 这里提到 Object.prototype.toString.call() 做一个拓展，用它实现一个函数(其中一种方式)可以对JavaScript中的5种主要的数据类型（包括Number、String、Object、Array、Boolean）进行值复制,

function clone(o) {
  const s = type(o);
  let result = '';
  switch (s) {
    case 'Number':
      result = o - 0;
      break;
    case 'String':
      result = `${o}`;
      break;
    case 'Null':
      result = null;
      break;
    case 'Undefined':
      result = 'Undefined';
      break;
    case 'Array':
      result = [];
      o.foeEach((item, index) => {
        result[index] = item;
      });
      break;
    case 'Object':
      result = {};
      for (const i in o) {
        result[i] = o[i];
      }
      break;
    default:
      result = o;
      break;
  }
  return result;
}

// 求数组的最大、最小值

const arr = [1, 2, 3, 4, 5, 6];

const max = Math.max.call(null, ...arr) || Math.max.apply(null, arr) || Math.max(...arr);

const min = Math.min.call(null, ...arr) || Math.min.apply(null, arr) || Math.min(...arr);

// 函数arguments类数组操作
function arguments() {
  const arr = Array.prototype.slice.call(arguments);
  console.log(arr);
}

// 实现自己的call
Function.prototype.call_ = function(obj) {
  // 判断是否为null或者undefined,同时考虑传参不是对象的问题
  obj = obj ? Object(obj) : window;
  // 改变this的指向
  const fn = Symbol('临时属性'); // 临时属性
  obj[fn] = this; // 此时this就是函数fn
  const args = [...arguments].slice(1); // 利用拓展运算符直接将arguments转为数组，第一位参数是需要让我们指向的对象，所以从下标1开始才是真正的函数参数
  const result = obj[fn](...args); // 执行fn
  delete obj[fn]; //删除fn
  return result;
};

// 实现自己的apply
Function.prototype.apply_ = function(obj, arr) {
  obj = obj ? Object(obj) : window;
  const fn = Symbol('临时属性');
  obj[fn] = this;
  let result;
  if (arr) {
    result = obj[fn](...arr);
  } else {
    obj[fn]();
  }
  delete obj[fn];
  return result;
};

Function.prototype.bind_ = function() {
  const args = [...arguments];

  const t = args.shift();

  const self = this;

  return function() {
    return self.apply_(t, args);
  };
};

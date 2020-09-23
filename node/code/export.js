module.exports = {
  a: 1,
  b: 2,
};

// 没有用的 因为在node中最后导出的是 module.exports, 虽然 node中 module.exports = exports, 但是这里写exports = '1';
// 相当于重新赋值 export就不指向 module.exports 的指针了 这样module.exports 就没有对应值了
exports = 1;

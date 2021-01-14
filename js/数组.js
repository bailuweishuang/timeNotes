// 判断是否是数组的方法
const a = [];
// 1
a instanceof []
// 2
Array.isArray([])
// 3
Object.prototype.toString.call([]) === "[object Array]"
//4
Object.getPrototypeOf([]) === Array.prototype
//5
a.constructor === Array
// 6
Array.prototype.isPrototypeOf([])
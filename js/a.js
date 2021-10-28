class Enum {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  init(name, age) {
    return `${name}: ${age}`;
  }
}

const Enum1 = new Enum();

module.exports = Enum1;

// 计算时间段里的星期一和星期二天数
function time(start, end) {
  let startT = new Date(start).getTime();
  const endT = new Date(end).getTime();
  const time = 24 * 60 * 60 * 1000;
  const day = (endT - startT) / time;
  let number = 0;
  for (let i = 0; i <= day; i++) {
    const T = new Date(startT).getDay();
    if (T !== 0 || T !== 6) {
      number++
    }
    startT = startT + time
  }
  return number
}
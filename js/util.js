const util = {
  // 判断是空字符串和空格
  isNull(str) {
    if (str == "") return true;
    var regu = "^[ ]+$";
    var re = new RegExp(regu);
    return re.test(str);
  },
  listToTree(data) {
    const result = [];
    const obj = {};
    data.forEach((item) => {
      obj[item.id] = item
    })
    data.forEach((item) => {
      const parentL = obj[item.parent]
      if (parentL) {
        (parentL.children || (parentL.children = [])).push(item)
      } else {
        result.push(item)
      }
    })
    return result
  }
};

export default util;

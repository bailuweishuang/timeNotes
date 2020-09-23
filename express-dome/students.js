const fs = require('fs');

const studentPath = './json/students.json';

const getFile = (studentPath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(studentPath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data).students);
      }
    });
  });
};

// 查找所有
exports.find = (callback) => {
  getFile(studentPath)
    .then((res) => {
      return callback(null, res);
    })
    .catch((e) => {
      return callback(e);
    });
  // fs.readFile(studentPath, 'utf8', (err, data) => {
  //   if (err) {
  //     return callback(err);
  //   }
  //   return callback(null, JSON.parse(data).students);
  // });
};

//  根据ID查找
exports.findById = (id) => {
  return new Promise((resolve, reject) => {
    getFile(studentPath)
      .then((res) => {
        let newRes = [...res];
        const stu = newRes.find((item) => Number(item.id) === Number(id));
        resolve(stu);
      })
      .catch((e) => reject(e));
  });
};

// 保存数据
exports.save = (obj) => {
  return new Promise((resolve, reject) => {
    getFile(studentPath)
      .then((res) => {
        let newRes = [...res];
        obj.id = Number(res[res.length - 1].id) + 1;
        newRes.unshift(obj);
        const result = JSON.stringify({
          students: newRes,
        });
        fs.writeFile(studentPath, result, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      })
      .catch((e) => {
        reject(e);
      });
  });
};

// 更新数据
exports.update = (data) => {
  return new Promise((resolve, reject) => {
    getFile(studentPath)
      .then((res) => {
        let newRes = [...res];
        const stu = newRes.find((item) => Number(item.id) === Number(data.id));
        for (let key in stu) {
          stu[key] = data[key];
        }
        const result = JSON.stringify({
          students: newRes,
        });
        fs.writeFile(studentPath, result, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      })
      .catch((e) => {
        reject(e);
      });
  });
};

// 删除数据
exports.delete = (id) => {
  return new Promise((resolve, reject) => {
    getFile(studentPath)
      .then((res) => {
        let newRes = [...res];
        const result = JSON.stringify({
          students: newRes.filter((item) => Number(item.id) !== Number(id)),
        });
        fs.writeFile(studentPath, result, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(null);
          }
        });
      })
      .catch((e) => reject(e));
  });
};

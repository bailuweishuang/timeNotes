var mongoose = require('mongoose');

// 链接数据库
mongoose.connect('mongodb://localhost/test');

// 链接的状态
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

var kittySchema = mongoose.Schema({
  name: String,
});

var Kitten = mongoose.model('Kitten', kittySchema);

var felyne = new Kitten({ name: 'Felyne' });

// // 保存数据
// felyne.save(function(err) {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log('success');
//   }
// });

// 更新数据
// Kitten.findByIdAndUpdate('5f6ae9235fc5ee2f9cbd2565', { name: '小李' }, (err) => {
//   if (err) {
//     console.log('失败');
//   } else {
//     console.log('成功');
//   }
// });

// 删除数据
Kitten.remove({ name: '小李' }, (err) => {
  if (err) {
    console.log(err);
  }
});

// 查询数据
Kitten.find((err, data) => {
  if (err) {
    console.log(err);
  } else {
    console.log(data);
  }
});

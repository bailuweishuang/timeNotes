const express = require('express');
const students = require('./students');
const url = require('url');

const router = express.Router();

// 首页
router.get('/', (req, res) => {
  students.find((err, data) => {
    if (err) {
      return res.status(500).send('Error!');
    }
    res.render('index.html', {
      list: data,
    });
  });
  // fs.readFile('./json/students.json', 'utf8', (err, data) => {
  //   if (err) {
  //     return res.status(500).send('Error');
  //   }
  //   const result = JSON.parse(data).students;
  //   res.render('index.html', {
  //     list: result,
  //   });
  // });
});

// 发表
router.get('/post', (req, res) => {
  res.render('post.html');
});

// 发表提交
router.post('/post', (req, res) => {
  let result = req.body;
  students
    .save(result)
    .then(() => {
      res.redirect('/');
    })
    .catch(() => {
      res.status(500).send('Error!');
    });
  // result.time = new Date();
  // list.unshift(result);
  // res.redirect('/');
});

// 删除
router.get('/delete', (req, res) => {
  let result = url.parse(req.url, true);
  students
    .delete(result.query.id)
    .then(() => res.redirect('/'))
    .catch((e) => res.status(500).send('error'));
});

// 更新页面
router.get('/update', (req, res) => {
  students
    .findById(req.query.id)
    .then((e) => {
      res.render('edit.html', {
        students: e,
      });
    })
    .catch(() => {
      res.status(500).send('Error!');
    });
});

// 更新提交
router.post('/update', (req, res) => {
  students
    .update(req.body)
    .then(() => {
      res.redirect('/');
    })
    .catch((e) => {
      console.log(e);
      res.status(500).send('Error!');
    });
});
module.exports = router;

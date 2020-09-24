const express = require('express');
const studentsMongedb = require('./students-mongodb');

const router = express.Router();

// 首页
router.get('/', (req, res) => {
  studentsMongedb.find((err, data) => {
    if (err) {
      return res.status(500).send('Error!');
    }
    res.render('index.html', {
      list: data,
    });
  });
});

// 发表
router.get('/post', (req, res) => {
  res.render('post.html');
});

// 发表提交
router.post('/post', (req, res) => {
  let result = req.body;
  new studentsMongedb(result).save((err) => {
    if (err) {
      return res.status(500).send('Error!');
    }
    res.redirect('/');
  });
});

// 更新页面
router.get('/update', (req, res) => {
  studentsMongedb.findById(req.query.id, (err, data) => {
    if (err) {
      return res.status(500).send('Error!');
    }
    res.render('edit.html', {
      students: data,
    });
  });
});

// 更新提交
router.post('/update', (req, res) => {
  studentsMongedb.findByIdAndUpdate(req.body.id, req.body, (err) => {
    if (err) {
      return res.status(500).send('Error!');
    }
    res.redirect('/');
  });
});

// 删除
router.get('/delete', (req, res) => {
  studentsMongedb.findByIdAndRemove(req.query.id).then(
    () => {
      res.redirect('/');
    },
    () => {
      return res.status(500).send('Error!');
    },
  );
});

module.exports = router;

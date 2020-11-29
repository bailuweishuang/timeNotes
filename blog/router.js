const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index.html', {
      name: 1213,
    });
  });


module.exports = router;
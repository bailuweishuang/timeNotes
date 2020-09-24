const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/student');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

const schema = mongoose.Schema;

const studentSchema = new schema({
  name: {
    type: String,
    required: true,
  },
  message: {
    type: String,
  },
  time: {
    type: String,
  },
});

module.exports = mongoose.model('StudentMongodb', studentSchema);

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/user');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

const schema = mongoose.Schema;

const userSchema = new schema({

});

module.exports = mongoose.model('UserSchemaMongodb',userSchema);
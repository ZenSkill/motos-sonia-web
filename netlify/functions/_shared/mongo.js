const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI environment variable for Netlify function');
}

async function connect() {
  if (global._mongo && global._mongo.conn) {
    return global._mongo.conn;
  }
  if (!MONGO_URI) throw new Error('MONGO_URI not configured');
  global._mongo = global._mongo || {};
  const conn = await mongoose.connect(MONGO_URI, {});
  global._mongo.conn = conn;
  return conn;
}

module.exports = { connect, mongoose };

const mongoose = require('mongoose');

async function connectDB() {
  // MONGO_URI ya MONGODB_URI dono chalenge; galti se aaye quotes/prefix saaf kar do
  let uri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
  uri = uri.replace(/^["']|["']$/g, '').replace(/^MONGO(DB)?_URI=/, '');

  if (!uri) {
    console.error('MONGO_URI env variable set nahi hai');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;

require("dotenv").config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Conectado a MongoDB Atlas');
    const db = client.db('avi-conversations-db');
    return db;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

module.exports = { connectToDatabase };
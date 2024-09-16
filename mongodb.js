require("dotenv").config();
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_DB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,  // Asegura compatibilidad
  ssl: true,  // Activa SSL
});

async function connectToDatabase() {
  try {
    await client.connect();
    const db = client.db('avi-conversations-db');
    db.command({ping: 1});
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return db;
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

module.exports = { connectToDatabase };
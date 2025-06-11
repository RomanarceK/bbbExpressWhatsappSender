require("dotenv").config();
const { MongoClient } = require('mongodb');
let client;
let db;

async function connectToDatabase() {
  if (!client || !client.topology || !client.topology.isConnected()) {
    try {
      client = new MongoClient(process.env.MONGO_DB_URI);
      await client.connect();
      db = client.db('aira-conversations-db');
      db.command({ping:1});
      console.log("Conectado exitosamente a MongoDB");

      return db;
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      process.exit(1);
    }
  }
  return db;
}

function getCollection(collectionName) {
  if (!db) {
    throw new Error('No hay conexión a la base de datos. Llama a connectToDatabase primero.');
  }
  return db.collection(collectionName);
}

module.exports = { connectToDatabase, getCollection };
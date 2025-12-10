import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function connect() {
  await client.connect();
  // If dbName is in the URI, this selects it automatically
  db = client.db();
  console.log("Connected to MongoDB cluster");
}

function getDB() {
  if (!db) throw new Error("Database not connected");
  return db;
}

export { connect, getDB };

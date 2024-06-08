const { MongoClient } = require("mongodb");
const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is working fine !!");
});

const conn_str =
  "mongodb+srv://imran251099:imran251099@notescluster.luj719m.mongodb.net/Notes?retryWrites=true&w=majority&appName=NotesCluster";
const client = new MongoClient(conn_str);
const notesDB = client.db("sample_mflix");
const usersCollection = notesDB.collection("movies");
async function run() {
  try {
    await client.connect();
    console.log("Connected");
  } finally {
    await client.close();
  }
}
run().catch(console.error);

app.get("/users", async (req, res) => {
  // Find the first document in the collection
  const users = await usersCollection.find();
  res.send(users);
});

app.listen(process.env.PORT || 8080);

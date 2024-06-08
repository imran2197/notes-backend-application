const { MongoClient } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "*",
  })
);

app.get("/", (req, res) => {
  res.send("Server is working fine !!");
});

const conn_str =
  "mongodb+srv://imran251099:imran251099@notescluster.luj719m.mongodb.net/Notes?retryWrites=true&w=majority&appName=NotesCluster";
const client = new MongoClient(conn_str);
client.connect();
const notesDB = client.db("Notes");
const notesCollection = notesDB.collection("users");

app.get("/users", async (req, res) => {
  const first = await notesCollection.findOne();
  res.send(first);
});

app.listen(process.env.PORT || 8080);

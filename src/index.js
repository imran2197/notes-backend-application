const express = require("express");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is working fine !!");
});

const conn_str =
  "mongodb+srv://imran251099:imran251099@notescluster.luj719m.mongodb.net/Notes?retryWrites=true&w=majority&appName=NotesCluster";
mongoose.connect(conn_str);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  userName: String,
  password: String,
});

const userModel = mongoose.model("User", userSchema);

app.get("/users", async (req, res) => {
  const users = userModel.find();
  res.send(users);
});

app.listen(process.env.PORT || 9999);

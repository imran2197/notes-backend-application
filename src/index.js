const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:3000", "https://todonotess.netlify.app"],
  })
);
const session = require("express-session");
const session_secret = "notes";
app.use(
  session({
    secret: session_secret,
    cookie: { maxAge: 1 * 60 * 60 * 1000 },
  })
);

const bcrypt = require("bcrypt");
const salt = 10;

app.get("/", (req, res) => {
  res.send("Server is working fine !!");
});

const conn_str =
  "mongodb+srv://imran251099:imran251099@notescluster.luj719m.mongodb.net/Notes?retryWrites=true&w=majority&appName=NotesCluster";
const client = new MongoClient(conn_str);
client.connect();
const notesDB = client.db("Notes");
const notesCollection = notesDB.collection("notes");
const usersCollection = notesDB.collection("users");

app.get("/users", async (req, res) => {
  const users = await usersCollection.findOne();
  res.send(users);
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  userName: String,
  password: String,
});

const noteSchema = new mongoose.Schema({
  title: String,
  description: String,
  creationTime: Date,
  status: Boolean,
  userId: mongoose.Schema.Types.ObjectId,
});

const userModel = mongoose.model("User", userSchema);
const notesModel = mongoose.model("Note", noteSchema);

const isNullOrUndefined = (val) => val === null || val === undefined;

app.post("/notes/signup", async (req, res) => {
  const { name, email, userName, password } = req.body;
  const existingUser = await usersCollection.findOne({ email });
  if (isNullOrUndefined(existingUser)) {
    const hashedPassword = bcrypt.hashSync(password, salt);
    const newUser = new userModel({
      name,
      email,
      userName,
      password: hashedPassword,
    });
    await usersCollection.insertOne(newUser, (err, res) => {
      if (err) {
        res.send({
          statusCode: 400,
          message: "Failed during signup. Please try again later.",
        });
      }
    });
    req.session.userId = newUser._id; // session
    res.send({ statusCode: 201, message: "Sign up successful." });
  } else {
    res.send({
      statusCode: 400,
      message: `Email ${email} already taken. Please choose another email.`,
    });
  }
});

app.post("/notes/login", async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await usersCollection.findOne({
    email,
  });
  if (isNullOrUndefined(existingUser)) {
    res.send({
      statusCode: 400,
      message: `Email ${email} does not exist. Please signup.`,
    });
  } else {
    const hashedPassword = existingUser.password;
    if (bcrypt.compareSync(password, hashedPassword)) {
      req.session.userId = existingUser._id; // session
      res.send({
        statusCode: 200,
        message: `User ${existingUser.name} logged in successfully.`,
      });
    } else {
      res.send({ statusCode: 401, message: "Incorrect email and password" });
    }
  }
});

const AuthMiddleware = async (req, res, next) => {
  if (isNullOrUndefined(req.session) || isNullOrUndefined(req.session.userId)) {
    res.send({ statusCode: 401, message: "User is not logged In." });
  } else {
    next();
  }
};

app.get("/notes", AuthMiddleware, async (req, res) => {
  const allNotes = await notesCollection.find({ userId: req.session.userId });
  res.send({ statusCode: 200, response: allNotes });
});

app.post("/notes/create", AuthMiddleware, async (req, res) => {
  const body = req.body;
  body.creationTime = new Date();
  body.status = false;
  body.userId = req.session.userId;
  const newNote = new notesModel(body);
  await notesCollection.insertOne(newNote, (err, res) => {
    if (err) {
      res.send({
        statusCode: 400,
        message: "Failed while adding new note.",
      });
    }
  });
  res.send({ statusCode: 201, message: "New note added successfully." });
});

app.put("/notes/:id", AuthMiddleware, async (req, res) => {
  const { title, description } = req.body;
  const id = req.params.id;
  try {
    const existingNote = await notesCollection.findOne({
      _id: id,
      userId: req.session.userId,
    });
    if (isNullOrUndefined(existingNote)) {
      res.send({
        statusCode: 404,
        message: "Note does not exist.",
      });
    } else {
      existingNote.title = title;
      existingNote.description = description;
      await notesCollection.updateOne(
        { title: existingNote.title },
        { title, description },
        (err, res) => {
          if (err) {
            res.send({
              statusCode: 400,
              message: "Failed while updating a note.",
            });
          }
        }
      );
      res.send({ statusCode: 200, message: "Note updated successfully." });
    }
  } catch (err) {
    res.send({ statusCode: 400, message: "Failed while updating a note." });
  }
});

app.delete("/notes/:id", AuthMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    await notesCollection.deleteOne({
      _id: id,
      userId: req.session.userId,
    });
    res.send({ statusCode: 200, message: "Note deleted successfully." });
  } catch (err) {
    res.send({
      statusCode: 404,
      message: "Note does not exist.",
    });
  }
});

app.get("/userInfo", async (req, res) => {
  const user = await usersCollection.findOne({
    _id: new ObjectId(req.session.userId),
  });
  if (isNullOrUndefined(req.session) || isNullOrUndefined(req.session.userId)) {
    res.send({ statusCode: 400, message: "User does not exists." });
  } else {
    res.send({ statusCode: 200, response: user });
  }
});

app.get("/notes/logout", (req, res) => {
  if (!isNullOrUndefined(req.session)) {
    req.session.destroy(() => {
      res.send({ statusCode: 200, message: "User logged out successfully." });
    });
  } else {
    res.send({
      statusCode: 400,
      message: "Failed during logout.",
    });
  }
});

app.listen(process.env.PORT || 8080);

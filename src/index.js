const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: ["http://localhost:4200", "https://notess-taker.netlify.app"],
  })
);
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

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
    res.send({ statusCode: 201, message: "Sign up successful." });
  } else {
    res.send({
      statusCode: 400,
      message: `${email} already taken. Please choose another email.`,
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
      message: `${email} does not exist. Please signup.`,
    });
  } else {
    const hashedPassword = existingUser.password;
    if (bcrypt.compareSync(password, hashedPassword)) {
      const token = jwt.sign({ userId: existingUser._id }, "notes");
      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.send({
        statusCode: 200,
        name: existingUser.name,
        message: `${existingUser.name} logged in successfully.`,
      });
    } else {
      res.send({
        statusCode: 401,
        message: "Incorrect email and password",
      });
    }
  }
});

const AuthMiddleware = async (req, res, next) => {
  try {
    const cookie = req.cookies["jwt"];
    const decodedJWT = jwt.verify(cookie, "notes");
    if (!decodedJWT) {
      res.send({
        statusCode: 401,
        message: "Please login and try again.",
      });
    } else {
      res.cookie("decodedJWT", decodedJWT);
      next();
    }
  } catch (err) {
    res.send({
      statusCode: 401,
      message: "Please login and try again.",
    });
  }
};

app.get("/notes", AuthMiddleware, async (req, res) => {
  if (req.cookies.decodedJWT.userId) {
    console.log(req.cookies.decodedJWT.userId);
    const allNotes = await notesCollection
      .find({
        userId: new ObjectId(req.cookies.decodedJWT.userId),
      })
      .toArray();
    res.send({ statusCode: 200, response: allNotes });
  } else {
    res.send({ statusCode: 401, message: "Please login and try again." });
  }
});

app.post("/notes/create", AuthMiddleware, async (req, res) => {
  const body = req.body;
  body.creationTime = new Date();
  body.status = false;
  body.userId = req.cookies.decodedJWT.userId;
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
      _id: new ObjectId(id),
      userId: new ObjectId(req.cookies.decodedJWT.userId),
    });
    if (isNullOrUndefined(existingNote)) {
      res.send({
        statusCode: 404,
        message: "Note does not exist.",
      });
    } else {
      await notesCollection.updateOne(
        {
          _id: new ObjectId(id),
          userId: new ObjectId(req.cookies.decodedJWT.userId),
        },
        {
          $set: {
            title: title,
            description: description,
          },
        },
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
    res.send({
      statusCode: 400,
      message: "Failed while updating a note.",
    });
  }
});

app.delete("/notes/:id", AuthMiddleware, async (req, res) => {
  const id = req.params.id;
  try {
    await notesCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.cookies.decodedJWT.userId),
    });
    res.send({ statusCode: 200, message: "Note deleted successfully." });
  } catch (err) {
    res.send({
      statusCode: 404,
      message: "Note does not exist.",
    });
  }
});

app.get("/notes/userInfo", AuthMiddleware, async (req, res) => {
  try {
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.cookies.decodedJWT.userId),
    });
    const { password, ...data } = await user;
    res.send(data);
  } catch (err) {
    res.send({
      statusCode: 401,
      message: "Please login and try again.",
    });
  }
});

app.get("/notes/logout", (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.cookie("decodedJWT", "", { maxAge: 0 });
  res.send({ statusCode: 200, message: "User logged out successfully." });
});

app.listen(process.env.PORT || 8080);

const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is working fine !!");
});

app.listen(process.env.PORT || 9999);

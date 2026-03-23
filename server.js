const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("S&R Express API Running 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.post("/api/salla/webhooks", (req, res) => {
  console.log("Webhook:", req.body);
  res.send("Received");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const SECRET = "PUT_YOUR_SECRET_HERE";

function verify(req) {
  const signature = req.headers["x-salla-signature"];
  const body = JSON.stringify(req.body);

  const hash = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("hex");

  return hash === signature;
}

app.post("/api/salla/webhooks", (req, res) => {
  if (!verify(req)) {
    return res.status(401).send("Invalid Signature");
  }

  const event = req.headers["x-salla-event"];
  console.log("EVENT:", event);

  if (event === "app.store.authorize") {
    console.log("APP INSTALLED");
    console.log(req.body);
  }

  res.send("OK");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.listen(10000, () => {
  console.log("RUNNING...");
});

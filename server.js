import express from "express";
import admin from "firebase-admin";
import crypto from "crypto";

const app = express();
app.use(express.json());

// 🔥 Firebase init
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// 🧠 Generate IDs
function generateTracking() {
  return "SRX" + Math.floor(1000000000 + Math.random() * 9000000000);
}

function generateShipment() {
  return "SRS" + Math.floor(1000000000 + Math.random() * 9000000000);
}

// 🚀 Create shipment
app.post("/api/shipments/create-manual", async (req, res) => {
  try {
    const { receiver_name, destination_label, service_type } = req.body;

    if (!receiver_name || !destination_label || !service_type) {
      return res.status(400).json({
        success: false,
        message: "receiver_name, destination_label, service_type are required",
      });
    }

    const tracking_number = generateTracking();
    const shipment_number = generateShipment();

    const shipment = {
      shipment_number,
      tracking_number,
      receiver_name,
      destination_label,
      service_type,
      status: "created",
      created_at: new Date(),
    };

    await db.collection("shipments").doc(tracking_number).set(shipment);

    res.status(201).json({
      success: true,
      shipment,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📦 Track shipment
app.get("/api/shipments/track/:tracking", async (req, res) => {
  try {
    const doc = await db
      .collection("shipments")
      .doc(req.params.tracking)
      .get();

    if (!doc.exists) {
      return res.json({
        success: false,
        message: "Tracking number not found",
      });
    }

    res.json({
      success: true,
      data: doc.data(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Health check
app.get("/", (req, res) => {
  res.send("S&R Express API Running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running"));

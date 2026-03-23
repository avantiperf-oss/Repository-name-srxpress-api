import express from "express";
import crypto from "crypto";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 1000;

// 🔥 Firebase config (Render Environment)
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// توليد رقم تتبع
function generateTracking() {
  return "SRX" + Math.floor(1000000000 + Math.random() * 9000000000);
}

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("S&R Express API Running 🚀");
});

// ✅ إنشاء شحنة
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
    const shipment_number = "SRS" + Date.now();

    const shipmentData = {
      shipment_number,
      tracking_number,
      receiver_name,
      destination_label,
      service_type,
      status: "created",
      created_at: new Date(),
    };

    // 🔥 حفظ في Firebase
    await db.collection("shipments").doc(tracking_number).set(shipmentData);

    res.status(201).json({
      success: true,
      shipment: shipmentData,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ تتبع شحنة
app.get("/api/shipments/:tracking", async (req, res) => {
  try {
    const tracking = req.params.tracking;

    const doc = await db.collection("shipments").doc(tracking).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Tracking number not found",
      });
    }

    res.json({
      success: true,
      shipment: doc.data(),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

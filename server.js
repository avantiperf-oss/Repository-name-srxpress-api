import express from "express";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Firebase Admin init
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  });
}

const db = getFirestore();

// توليد رقم تتبع
function generateTracking() {
  return "SRX" + Math.floor(100000000 + Math.random() * 900000000);
}

// توليد رقم شحنة
function generateShipmentNumber() {
  return "SRS" + Math.floor(100000000 + Math.random() * 900000000);
}

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("S&R Express API Running 🚀");
});

// health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// إنشاء شحنة يدويًا
app.post("/api/shipments/create-manual", async (req, res) => {
  try {
    const { receiver_name, destination_label, service_type } = req.body;

    if (!receiver_name || !destination_label || !service_type) {
      return res.status(400).json({
        success: false,
        message: "receiver_name, destination_label, service_type are required"
      });
    }

    const tracking_number = generateTracking();
    const shipment_number = generateShipmentNumber();

    const shipment = {
      shipment_number,
      tracking_number,
      receiver_name,
      destination_label,
      service_type,
      status: "created",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      timeline: [
        {
          title: "Shipment Created",
          description: "Shipment has been created in S&R Express system",
          location: "Saudi Arabia",
          time: new Date().toISOString()
        }
      ]
    };

    await db.collection("shipments").doc(tracking_number).set(shipment);

    return res.status(201).json({
      success: true,
      shipment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// جلب كل الشحنات
app.get("/api/shipments", async (req, res) => {
  try {
    const snapshot = await db.collection("shipments").get();
    const shipments = snapshot.docs.map((doc) => doc.data());

    return res.json({
      success: true,
      total: shipments.length,
      shipments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// تتبع شحنة
app.get("/api/track/:trackingNumber", async (req, res) => {
  try {
    const trackingNumber = req.params.trackingNumber;
    const doc = await db.collection("shipments").doc(trackingNumber).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Tracking number not found"
      });
    }

    return res.json({
      success: true,
      shipment: doc.data()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// تحديث حالة الشحنة
app.post("/api/shipments/update-status", async (req, res) => {
  try {
    const { tracking_number, status, location, description } = req.body;

    if (!tracking_number || !status) {
      return res.status(400).json({
        success: false,
        message: "tracking_number and status are required"
      });
    }

    const ref = db.collection("shipments").doc(tracking_number);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    const timelineEvent = {
      title: status,
      description: description || "Shipment status updated",
      location: location || "Unknown",
      time: new Date().toISOString()
    };

    await ref.update({
      status,
      updated_at: new Date().toISOString(),
      timeline: FieldValue.arrayUnion(timelineEvent)
    });

    const updatedDoc = await ref.get();

    return res.json({
      success: true,
      shipment: updatedDoc.data()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Webhook سلة
app.post("/api/salla/webhooks", async (req, res) => {
  try {
    console.log("Salla Webhook Received:", req.body);
    return res.status(200).json({
      success: true,
      message: "Webhook received"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

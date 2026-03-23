import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// قاعدة بيانات مؤقتة داخل الذاكرة
const shipments = [];

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

// فحص الصحة
app.get("/health", (req, res) => {
  res.send("OK");
});

// إنشاء شحنة يدويًا
app.post("/api/shipments/create-manual", (req, res) => {
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

  shipments.push(shipment);

  return res.status(201).json({
    success: true,
    shipment
  });
});

// جلب كل الشحنات
app.get("/api/shipments", (req, res) => {
  res.json({
    success: true,
    total: shipments.length,
    shipments
  });
});

// تتبع شحنة برقم التتبع
app.get("/api/track/:trackingNumber", (req, res) => {
  const shipment = shipments.find(
    (item) => item.tracking_number === req.params.trackingNumber
  );

  if (!shipment) {
    return res.status(404).json({
      success: false,
      message: "Tracking number not found"
    });
  }

  return res.json({
    success: true,
    shipment
  });
});

// تحديث حالة الشحنة
app.post("/api/shipments/update-status", (req, res) => {
  const { tracking_number, status, location, description } = req.body;

  if (!tracking_number || !status) {
    return res.status(400).json({
      success: false,
      message: "tracking_number and status are required"
    });
  }

  const shipment = shipments.find(
    (item) => item.tracking_number === tracking_number
  );

  if (!shipment) {
    return res.status(404).json({
      success: false,
      message: "Shipment not found"
    });
  }

  shipment.status = status;
  shipment.updated_at = new Date().toISOString();
  shipment.timeline.unshift({
    title: status,
    description: description || "Shipment status updated",
    location: location || "Unknown",
    time: new Date().toISOString()
  });

  return res.json({
    success: true,
    shipment
  });
});

// Webhook سلة
app.post("/api/salla/webhooks", (req, res) => {
  console.log("Salla Webhook Received:", req.body);
  return res.status(200).json({
    success: true,
    message: "Webhook received"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

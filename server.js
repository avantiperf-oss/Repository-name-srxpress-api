import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 1000;

// توليد رقم تتبع
function generateTracking() {
  return "SRX" + Math.floor(100000000 + Math.random() * 900000000);
}

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("S&R Express API Running 🚀");
});

// health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// إنشاء شحنة (المهم)
app.post("/api/shipments/create-manual", (req, res) => {
  const { receiver_name, destination_label, service_type } = req.body;

  if (!receiver_name || !destination_label || !service_type) {
    return res.status(400).json({
      error: "Missing required fields"
    });
  }

  const tracking = generateTracking();

  res.json({
    success: true,
    tracking_number: tracking,
    receiver_name,
    destination: destination_label,
    service: service_type,
    status: "created"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

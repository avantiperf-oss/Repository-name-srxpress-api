const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const SECRET = process.env.SALLA_WEBHOOK_SECRET || "CHANGE_ME_SECRET";

const shipments = new Map();

function verifySignature(req) {
  const signature = req.headers["x-salla-signature"];
  if (!signature) return false;

  const body = JSON.stringify(req.body || {});
  const hash = crypto
    .createHmac("sha256", SECRET)
    .update(body)
    .digest("hex");

  return hash === signature;
}

function trackingNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SRA-${y}${m}${d}-${rand}`;
}

function shipmentNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SRS-${y}${m}${d}-${rand}`;
}

function addEvent(shipment, title, location_name, note) {
  shipment.events.unshift({
    title,
    location_name,
    note,
    created_at: new Date().toISOString()
  });
}

app.get("/", (req, res) => {
  res.send("S&R Express API Running 🚀");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.get("/api/track/:trackingNumber", (req, res) => {
  const tracking = req.params.trackingNumber;
  const shipment = shipments.get(tracking);

  if (!shipment) {
    return res.status(404).json({ message: "Tracking number not found" });
  }

  return res.json(shipment);
});

app.post("/api/shipments/create-manual", (req, res) => {
  const {
    receiver_name,
    destination_label,
    service_type = "air",
    order_id = null
  } = req.body || {};

  const tracking_number = trackingNumber();
  const shipment_number = shipmentNumber();

  const shipment = {
    shipment_number,
    tracking_number,
    order_id,
    service_type,
    status: "pending_review",
    origin_label: "Saudi Arabia",
    destination_label: destination_label || "Unknown Destination",
    receiver_name: receiver_name || "Customer",
    estimated_delivery: null,
    updated_at: new Date().toISOString(),
    awb_url: `https://srxpress-api.onrender.com/api/awb/${tracking_number}`,
    current_location: {
      name: "Saudi Arabia",
      lat: 24.7136,
      lng: 46.6753
    },
    events: []
  };

  addEvent(
    shipment,
    "Shipment Created",
    "Saudi Arabia",
    "Shipment has been created in S&R Express system."
  );

  shipments.set(tracking_number, shipment);

  return res.status(201).json(shipment);
});

app.post("/api/shipments/:trackingNumber/status", (req, res) => {
  const shipment = shipments.get(req.params.trackingNumber);

  if (!shipment) {
    return res.status(404).json({ message: "Shipment not found" });
  }

  const {
    status,
    title,
    location_name,
    note,
    lat,
    lng
  } = req.body || {};

  shipment.status = status || shipment.status;
  shipment.updated_at = new Date().toISOString();

  if (location_name) {
    shipment.current_location.name = location_name;
  }

  if (typeof lat === "number") {
    shipment.current_location.lat = lat;
  }

  if (typeof lng === "number") {
    shipment.current_location.lng = lng;
  }

  addEvent(
    shipment,
    title || "Status Updated",
    location_name || shipment.current_location.name || "Unknown",
    note || "Shipment status updated."
  );

  return res.json(shipment);
});

app.get("/api/awb/:trackingNumber", (req, res) => {
  const shipment = shipments.get(req.params.trackingNumber);

  if (!shipment) {
    return res.status(404).send("AWB not found");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>AWB ${shipment.tracking_number}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;background:#f7f7f7}
        .card{max-width:800px;margin:auto;background:#fff;padding:30px;border:1px solid #ddd}
        h1{margin:0 0 20px}
        .row{margin:10px 0}
        .label{font-weight:bold}
      </style>
    </head>
    <body>
      <div class="card">
        <h1>S&R Express AWB</h1>
        <div class="row"><span class="label">Shipment Number:</span> ${shipment.shipment_number}</div>
        <div class="row"><span class="label">Tracking Number:</span> ${shipment.tracking_number}</div>
        <div class="row"><span class="label">Receiver:</span> ${shipment.receiver_name}</div>
        <div class="row"><span class="label">Origin:</span> ${shipment.origin_label}</div>
        <div class="row"><span class="label">Destination:</span> ${shipment.destination_label}</div>
        <div class="row"><span class="label">Service:</span> ${shipment.service_type}</div>
        <div class="row"><span class="label">Status:</span> ${shipment.status}</div>
      </div>
    </body>
    </html>
  `);
});

app.post("/api/salla/webhooks", (req, res) => {
  const event = req.headers["x-salla-event"] || "unknown";

  if (!verifySignature(req)) {
    return res.status(401).send("Invalid signature");
  }

  console.log("SALLA EVENT:", event);
  console.log(JSON.stringify(req.body, null, 2));

  if (event === "app.store.authorize") {
    console.log("APP INSTALLED SUCCESSFULLY");
  }

  if (
    event === "shipment.creating" ||
    event === "Shipment Creating" ||
    event === "shipment.created"
  ) {
    const data = req.body?.data || req.body || {};

    const tracking_number = trackingNumber();
    const shipment_number = shipmentNumber();

    const shipment = {
      shipment_number,
      tracking_number,
      order_id: data.id || data.order_id || null,
      service_type: "air",
      status: "pending_review",
      origin_label: "Saudi Arabia",
      destination_label:
        data?.customer?.city ||
        data?.shipping_address?.city ||
        "International Destination",
      receiver_name:
        data?.customer?.name ||
        data?.shipping_address?.name ||
        "Customer",
      estimated_delivery: null,
      updated_at: new Date().toISOString(),
      awb_url: `https://srxpress-api.onrender.com/api/awb/${tracking_number}`,
      current_location: {
        name: "Saudi Arabia",
        lat: 24.7136,
        lng: 46.6753
      },
      events: []
    };

    addEvent(
      shipment,
      "Shipment Created",
      "Saudi Arabia",
      "Shipment created automatically from Salla."
    );

    shipments.set(tracking_number, shipment);

    console.log("TRACKING NUMBER:", tracking_number);
  }

  return res.status(200).send("Received");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

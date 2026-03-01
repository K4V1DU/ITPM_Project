// File location: UniSewana/sms-api/api/bank-sms.js

const { MongoClient } = require("mongodb");

const MONGODB_URI  = process.env.MONGODB_URI;
const DATABASE     = process.env.DB_NAME    || "testing2";
const COLLECTION   = process.env.COLLECTION || "banksms";
const EXPECTED_KEY = process.env.SMS_API_KEY || "unisewana_sms_key_2026";

let client = null;

const getClient = async () => {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client;
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ success: false, message: "Method not allowed" });

  const apiKey = req.headers["x-api-key"];
  if (apiKey !== EXPECTED_KEY) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const { sender, body, timestamp, amount, referenceCode, transactionType, balance, deviceId } = req.body;

    if (!body) {
      return res.status(400).json({ success: false, message: "SMS body is required" });
    }

    const db         = (await getClient()).db(DATABASE);
    const collection = db.collection(COLLECTION);

    const parsedAmount = amount        ?? extractAmount(body);
    const parsedRef    = referenceCode ?? extractRef(body);
    const parsedType   = transactionType ?? detectType(body);

    const doc = {
      sender:          sender    || "Unknown",
      body:            body.trim(),
      timestamp:       timestamp ? new Date(timestamp) : new Date(),
      amount:          parsedAmount,
      referenceCode:   parsedRef,
      transactionType: parsedType,
      balance:         balance  || null,
      deviceId:        deviceId || null,
      processed:       false,
      createdAt:       new Date(),
    };

    const result = await collection.insertOne(doc);

    return res.status(201).json({
      success:    true,
      message:    "SMS stored successfully",
      insertedId: result.insertedId,
    });

  } catch (err) {
    console.error("bank-sms error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

function extractAmount(text) {
  const matches = text.match(/[\d,]+\.\d{2}/g) || text.match(/LKR\s*[\d,]+/gi) || [];
  const numbers = matches
    .map(s => parseFloat(s.replace(/[^\d.]/g, "")))
    .filter(n => n > 10 && n < 10000000);
  return numbers.length > 0 ? Math.max(...numbers) : null;
}

function extractRef(text) {
  const match = text.match(/REF\s*\d{4,8}/i);
  return match ? match[0].replace(/\s/g, "").toUpperCase() : null;
}

function detectType(text) {
  const lower = text.toLowerCase();
  if (lower.includes("debit") || lower.includes("debited") || lower.includes("withdrawal")) return "debit";
  if (lower.includes("credit") || lower.includes("credited") || lower.includes("deposit"))  return "credit";
  return "unknown";
}
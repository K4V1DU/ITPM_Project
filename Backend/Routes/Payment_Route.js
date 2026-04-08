const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const {
  getPlans,
  createPayment,
  getMyPayments,
  getPaymentById,
  getReceiptImage,
  uploadReceipt,
  requestManualReview,
  cancelPayment,
} = require("../Controllers/Payment_Controller");

const upload = multer({ storage: multer.memoryStorage() });

// ── Plan Routes ───────────────────────────────────────────────────────────────
router.get("/plans", getPlans);

// ── Payment CRUD ──────────────────────────────────────────────────────────────
router.post  ("/create",        createPayment);          // Create payment + REF code
router.get   ("/my",            getMyPayments);          // All payments for host  (?hostId=)
router.get   ("/:id",           getPaymentById);         // Single payment         (?hostId=)
router.patch ("/:id/cancel",    cancelPayment);          // Cancel (created only)

// ── Receipt & Verification ────────────────────────────────────────────────────
router.get   ("/:id/receipt-image",   getReceiptImage);                           // Serve stored receipt image
router.post  ("/:id/upload-receipt",  upload.single("receipt"), uploadReceipt);   // Upload + OCR verify
router.patch ("/:id/manual-request",  requestManualReview);                       // Request manual review

module.exports = router;
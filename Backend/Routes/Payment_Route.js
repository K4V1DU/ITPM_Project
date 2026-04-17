const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const {
  getPlans,
  createPayment,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  getReceiptImage,
  uploadReceipt,
  requestManualReview,
  cancelPayment,
  approveManualPayment, // Added
  rejectManualPayment,  // Added
} = require("../Controllers/Payment_Controller");

const upload = multer({ storage: multer.memoryStorage() });

// ── Plan Routes ───────────────────────────────────────────────────────────────
router.get("/plans", getPlans);

// ── Payment CRUD ──────────────────────────────────────────────────────────────
router.post  ("/create",        createPayment);          // Create payment + REF code
router.get   ("/all",           getAllPayments);         // All payments (admin)
router.get   ("/my",            getMyPayments);          // All payments for host  (?hostId=)
router.get   ("/:id",           getPaymentById);         // Single payment         (?hostId=)
router.patch ("/:id/cancel",    cancelPayment);          // Cancel (created only)

// ── Receipt & Verification ────────────────────────────────────────────────────
router.get   ("/:id/receipt-image",   getReceiptImage);                           // Serve stored receipt image
router.post  ("/:id/upload-receipt",  upload.single("receipt"), uploadReceipt);   // Upload + OCR verify
router.patch ("/:id/manual-request",  requestManualReview);                       // Request manual review

// ── Admin Actions (Manual Review) ──────────────────────────────────────────────
router.patch ("/:id/approve-manual",  approveManualPayment);                      // Approve and activate listing
router.patch ("/:id/reject-manual",   rejectManualPayment);                       // Reject payment with reason

module.exports = router;
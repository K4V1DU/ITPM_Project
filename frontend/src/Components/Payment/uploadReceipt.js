// middleware/uploadReceipt.js
const multer = require("multer");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "application/pdf",
];

const MAX_SIZE_MB = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload a JPG, PNG, WEBP, or PDF.`));
    }
  },
});

module.exports = upload;

import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft, FaUpload, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaExclamationTriangle, FaCloudUploadAlt,
  FaShieldAlt, FaUniversity, FaReceipt, FaListAlt,
  FaCalendarAlt, FaBuilding,
} from "react-icons/fa";

const BASE_URL = "http://localhost:8000";

const C = {
  primary:    "#e67e22",
  dark:       "#d35400",
  light:      "#fef6ee",
  border:     "#fddcb5",
  success:    "#1e8449",
  successBg:  "#eafaf1",
  successBdr: "#a9dfbf",
  error:      "#c0392b",
  errorBg:    "#fdedec",
  errorBdr:   "#f1948a",
  neutral:    "#f4f6f7",
  text:       "#1a1a2e",
  textMuted:  "#7f8c8d",
  white:      "#ffffff",
  pageBg:     "#f8f9fa",
  cardBdr:    "#e5e8eb",
};

const STATUS_CONFIG = {
  created:          { label: "Awaiting Transfer", color: "#7f8c8d", bg: "#f4f6f7", bdr: "#d5d8dc" },
  pending:          { label: "Pending Review",    color: C.dark,    bg: C.light,   bdr: C.border  },
  verified:         { label: "Verified",          color: C.success, bg: C.successBg, bdr: C.successBdr },
  rejected:         { label: "Rejected",          color: C.error,   bg: C.errorBg,   bdr: C.errorBdr   },
  manual_requested: { label: "Manual Review",     color: "#2471a3", bg: "#eaf4fb",   bdr: "#aed6f1"    },
};

const PLAN_LABELS = {
  "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "12m": "12 Months",
};

// ─── OCR Step ─────────────────────────────────────────────────────────────────
function OcrStep({ step, current }) {
  const done   = current > step;
  const active = current === step;
  const labels = ["", "Reading receipt", "Extracting data", "Checking amount", "Checking reference", "Finalising"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: done || active ? 1 : 0.3, transition: "opacity 0.3s" }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: done ? C.success : active ? C.primary : C.cardBdr,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, transition: "background 0.35s",
      }}>
        {done ? <FaCheckCircle size={12} /> : step}
      </div>
      <span style={{ fontSize: 13, fontWeight: done || active ? 600 : 400, color: done ? C.success : active ? C.primary : C.textMuted }}>
        {labels[step]}
      </span>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: C.light, color: C.primary,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, flexShrink: 0,
      }}>
        <Icon />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#444", letterSpacing: 0.2 }}>{children}</span>
    </div>
  );
}

export default function PaymentReceipt() {
  const location = useLocation();
  const navigate  = useNavigate();

  const {
    paymentId,
    referenceCode,
    amount,
    plan,
    daysAdded,
    newExpireDate,
    listingName   = "Your Listing",
    bankName      = "Commercial Bank",
    accountName   = "Bodima Payments",
    accountNumber = "8000123456",
    branch        = "Negombo",
  } = location.state || {};

  const [status,         setStatus]         = useState("created");
  const [file,           setFile]           = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [ocrStep,        setOcrStep]        = useState(0);
  const [ocrRunning,     setOcrRunning]     = useState(false);
  const [ocrResult,      setOcrResult]      = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [manualNote,     setManualNote]     = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSent,     setManualSent]     = useState(false);
  const [error,          setError]          = useState("");
  const [dragOver,       setDragOver]       = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (window.Tesseract) return;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) { setError("Please upload an image file (JPG, PNG, etc.)"); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
    setOcrResult(null); setError(""); setShowManualForm(false);
  };

  const handleUpload = async () => {
    if (!file)      return setError("Please select a receipt image first.");
    if (!paymentId) return setError("Payment ID missing. Please go back.");

    setOcrRunning(true); setError(""); setOcrStep(1);

    try {
      let attempts = 0;
      while (!window.Tesseract && attempts < 20) { await new Promise(r => setTimeout(r, 500)); attempts++; }
      if (!window.Tesseract) throw new Error("OCR library failed to load. Please try again.");

      setOcrStep(2);
      const { data: { text: rawOcrText } } = await window.Tesseract.recognize(file, "eng", {
        logger: (m) => { if (m.status === "recognizing text") setOcrStep(2); },
      });

      setOcrStep(3);
      const lines = rawOcrText.split("\n").map(l => l.trim()).filter(Boolean);

      const allNumbers = (rawOcrText.match(/[\d]{1,3}(?:,[\d]{3})*(?:\.[\d]{1,2})?|[\d]+(?:\.[\d]{1,2})?/g) || [])
        .map(s => parseFloat(s.replace(/,/g, "")))
        .filter(n => n >= 100 && n <= 999999);

      const exactMatch = allNumbers.find(n => n === amount);
      let keywordMatch = null;
      const amountKeywords = ["amount", "lkr", "rs", "total", "transfer", "debit", "credit"];
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (amountKeywords.some(k => lower.includes(k))) {
          const nums = (line.match(/[\d,]+(?:\.[\d]{1,2})?/g) || [])
            .map(s => parseFloat(s.replace(/,/g, ""))).filter(n => n >= 100 && n <= 999999);
          if (nums.length > 0) {
            const biggest = Math.max(...nums);
            if (biggest === amount) { keywordMatch = biggest; break; }
          }
        }
      }

      const displayAmount = exactMatch ?? keywordMatch ?? (allNumbers.length > 0 ? Math.max(...allNumbers) : 0);
      const bestAmount    = exactMatch ?? keywordMatch ?? 0;

      setOcrStep(4);
      const refMatch     = rawOcrText.match(/REF\s*\d{4,6}/i);
      const extractedRef = refMatch ? refMatch[0].replace(/\s/g, "").toUpperCase() : "";
      const dateMatch    = rawOcrText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      const extractedDate = dateMatch ? dateMatch[0] : "";
      const bankKeywords  = ["commercial", "peoples", "sampath", "hnb", "boc", "nsb", "dfcc", "cargills", "seylan", "pan asia"];
      const extractedBank = bankKeywords.find(b => rawOcrText.toLowerCase().includes(b)) || "";

      setOcrStep(5);
      await new Promise(r => setTimeout(r, 400));

      setUploading(true);
      const formData = new FormData();
      formData.append("receipt",         file);
      formData.append("extractedAmount", bestAmount);
      formData.append("displayAmount",   displayAmount);
      formData.append("extractedRef",    extractedRef);
      formData.append("extractedDate",   extractedDate);
      formData.append("extractedBank",   extractedBank);
      formData.append("rawOcrText",      rawOcrText.slice(0, 2000));

      const res = await axios.post(`${BASE_URL}/Payment/${paymentId}/upload-receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { payment: updatedPayment, verification } = res.data;
      setStatus(updatedPayment.status);
      setOcrResult({
        amountMatched: verification.amountMatched,
        refMatched:    verification.refMatched,
        newStatus:     verification.newStatus,
        extracted:     { amount: displayAmount, ref: extractedRef, date: extractedDate, bank: extractedBank },
      });

    } catch (err) {
      setError(err.response?.data?.message || err.message || "Upload failed. Please try again.");
      setOcrStep(0);
    } finally {
      setOcrRunning(false); setUploading(false); setOcrStep(0);
    }
  };

  const handleManualRequest = async () => {
    if (!paymentId) return;
    try {
      const res = await axios.patch(`${BASE_URL}/Payment/${paymentId}/manual-request`, { note: manualNote });
      setStatus(res.data.payment.status);
      setManualSent(true);
      setShowManualForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request manual review.");
    }
  };

  const statusCfg  = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  const isVerified = status === "verified";
  const isManual   = status === "manual_requested";
  const isBusy     = ocrRunning || uploading;

  // ── Verified Screen ───────────────────────────────────────────────────────────
  if (isVerified) return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}><FaArrowLeft size={13} style={{ marginRight: 6 }} />Back</button>
        <span style={s.topTitle}>Payment Verified</span>
        <div />
      </div>
      <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 24px" }}>
        <div style={s.verifiedCard}>
          <div style={s.verifiedIcon}><FaCheckCircle size={36} color={C.success} /></div>
          <h2 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 800, color: C.text }}>Payment Verified</h2>
          <p style={{ color: C.textMuted, fontSize: 14, margin: "0 0 28px", lineHeight: 1.6 }}>
            Your listing <strong>{listingName}</strong> is now active and visible for {daysAdded} days.
          </p>
          <div style={s.verifiedDetails}>
            {[
              ["Plan",       PLAN_LABELS[plan] || plan],
              ["Amount",     `LKR ${(amount || 0).toLocaleString()}`],
              ["Active for", `${daysAdded} days`],
              ["Expires",    newExpireDate ? new Date(newExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"],
            ].map(([k, v]) => (
              <div key={k} style={s.verifiedRow}>
                <span style={{ color: C.textMuted, fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{v}</span>
              </div>
            ))}
          </div>
          <button style={s.btnPrimary} onClick={() => navigate("/Listings")}>Go to My Listings</button>
        </div>
      </div>
    </div>
  );

  // ── Manual Review Sent Screen ─────────────────────────────────────────────────
  if (isManual && manualSent) return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}><FaArrowLeft size={13} style={{ marginRight: 6 }} />Back</button>
        <span style={s.topTitle}>Manual Review</span>
        <div />
      </div>
      <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 24px" }}>
        <div style={s.verifiedCard}>
          <div style={{ ...s.verifiedIcon, background: "#eaf4fb" }}><FaShieldAlt size={32} color="#2471a3" /></div>
          <h2 style={{ margin: "16px 0 8px", fontSize: 22, fontWeight: 800, color: C.text }}>Manual Review Requested</h2>
          <p style={{ color: C.textMuted, fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
            Our team will review your payment receipt within <strong>24 hours</strong> and activate your listing.
          </p>
          <div style={{ ...s.infoBox, background: "#eaf4fb", borderColor: "#aed6f1" }}>
            <span style={{ fontSize: 13, color: "#2471a3", lineHeight: 1.6 }}>
              You will receive a confirmation once your payment has been approved. No further action is required.
            </span>
          </div>
          <button style={s.btnGhost} onClick={() => navigate("/Listings")}>Back to Listings</button>
        </div>
      </div>
    </div>
  );

  // ── Main Upload Page ──────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Top bar */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft size={13} style={{ marginRight: 6 }} />Back
        </button>
        <span style={s.topTitle}>Upload Payment Receipt</span>
        <div style={{ ...s.statusChip, background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.bdr }}>
          {statusCfg.label}
        </div>
      </div>

      {!paymentId && (
        <div style={{ maxWidth: 1080, margin: "16px auto", padding: "0 24px" }}>
          <div style={{ ...s.errorBox }}>
            Payment information is missing. Please go back to your listings and click Add Payment again.
          </div>
        </div>
      )}

      <div style={s.layout}>

        {/* ══ LEFT SIDEBAR ════════════════════════════════════════════════════ */}
        <div style={s.leftCol}>

          {/* Payment Summary */}
          <div style={s.card}>
            <SectionLabel icon={FaReceipt}>Payment Summary</SectionLabel>

            <div style={s.refBox}>
              <span style={s.refLabel}>REFERENCE CODE</span>
              <span style={s.refCode}>{referenceCode || "—"}</span>
            </div>

            <div style={s.detailList}>
              {[
                ["Plan",       PLAN_LABELS[plan] || plan || "—"],
                ["Amount",     `LKR ${(amount || 0).toLocaleString()}`],
                ["Active for", `${daysAdded || 0} days`],
                ["Listing",    listingName],
                ["Expires",    newExpireDate
                  ? new Date(newExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : "—"],
              ].map(([k, v]) => (
                <div key={k} style={s.detailRow}>
                  <span style={s.detailKey}>{k}</span>
                  <span style={s.detailVal}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Details */}
          <div style={s.card}>
            <SectionLabel icon={FaUniversity}>Bank Transfer Details</SectionLabel>
            <div style={s.detailList}>
              {[
                ["Bank",         bankName],
                ["Account Name", accountName],
                ["Account No.",  accountNumber],
                ["Branch",       branch],
                ["Amount",       `LKR ${(amount || 0).toLocaleString()}`],
                ["Remark",       referenceCode],
              ].map(([k, v]) => (
                <div key={k} style={s.detailRow}>
                  <span style={s.detailKey}>{k}</span>
                  <span style={{
                    ...s.detailVal,
                    ...(k === "Remark" ? { color: C.primary, fontFamily: "monospace", fontWeight: 800, fontSize: 14 } : {}),
                    ...(k === "Amount" ? { color: C.dark, fontWeight: 800 } : {}),
                  }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Process Steps */}
          <div style={s.card}>
            <SectionLabel icon={FaListAlt}>Verification Process</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                ["Upload Receipt",   "Upload a clear photo or screenshot of your bank transfer confirmation."],
                ["Auto OCR Scan",    "The system reads the receipt text and extracts the amount and reference code."],
                ["Instant Matching", "If the amount and reference code match exactly, your listing activates immediately."],
                ["Manual Fallback",  "If auto-verification fails, request a manual review. Admin will check within 24 hours."],
              ].map(([title, desc], i, arr) => (
                <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: C.light, border: `1.5px solid ${C.border}`,
                      color: C.primary, fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{i + 1}</div>
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: C.border, margin: "4px 0", minHeight: 16 }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 4 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ RIGHT CONTENT ════════════════════════════════════════════════════ */}
        <div style={s.rightCol}>
          <h2 style={s.heading}>Upload Your Receipt</h2>
          <p style={s.subHeading}>
            Upload a clear image of your bank transfer receipt. The reference code{" "}
            <strong style={{ color: C.primary }}>{referenceCode}</strong> and amount{" "}
            <strong>LKR {(amount || 0).toLocaleString()}</strong> must be clearly visible.
          </p>

          {/* Drop Zone */}
          <div
            style={{
              ...s.dropZone,
              borderColor: dragOver ? C.primary : file ? C.success : C.cardBdr,
              background:  dragOver ? C.light   : file ? C.successBg : C.white,
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />

            {preview ? (
              <div style={{ textAlign: "center" }}>
                <img src={preview} alt="Receipt preview" style={s.previewImg} />
                <div style={{ fontSize: 13, color: C.success, marginTop: 10, fontWeight: 600 }}>
                  <FaCheckCircle style={{ marginRight: 5 }} />{file.name}
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Click to change image</div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: C.light, margin: "0 auto 14px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FaCloudUploadAlt size={26} color={C.primary} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Drop your receipt here
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  or click to browse &mdash; JPG, PNG, WEBP supported
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div style={s.tipsBox}>
            <div style={s.tipsTitle}>Receipt Requirements</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              {[
                `Reference code ${referenceCode} must be visible`,
                `Amount LKR ${(amount || 0).toLocaleString()} must be readable`,
                "Use good lighting, avoid shadows on text",
                "Full receipt in frame — not cropped",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "#555" }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: C.light, color: C.primary,
                    fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FaCheckCircle size={8} />
                  </div>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* OCR Progress */}
          {ocrStep > 0 && (
            <div style={s.ocrBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <FaSpinner style={{ color: C.primary, animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>Scanning receipt...</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3, 4, 5].map(step => <OcrStep key={step} step={step} current={ocrStep} />)}
              </div>
            </div>
          )}

          {/* OCR Result */}
          {ocrResult && !ocrRunning && (
            <div style={{
              ...s.resultCard,
              borderColor: ocrResult.amountMatched && ocrResult.refMatched ? C.successBdr : C.border,
              borderLeftColor: ocrResult.amountMatched && ocrResult.refMatched ? C.success : C.primary,
            }}>
              {/* Result header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                {ocrResult.amountMatched && ocrResult.refMatched
                  ? <FaCheckCircle size={18} color={C.success} />
                  : <FaExclamationTriangle size={18} color={C.primary} />
                }
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
                  {ocrResult.amountMatched && ocrResult.refMatched
                    ? "Receipt Verified Successfully"
                    : "Verification Incomplete"}
                </span>
              </div>

              {/* Result rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {/* Amount row */}
                <div style={s.resultRow}>
                  <span style={s.resultLabel}>Amount Extracted</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                      LKR {(ocrResult.extracted.amount || 0).toLocaleString()}
                    </span>
                    {ocrResult.amountMatched
                      ? <span style={s.matchBadge(true)}>Matched</span>
                      : <span style={s.matchBadge(false)}>Expected {(amount || 0).toLocaleString()}</span>
                    }
                  </div>
                </div>

                {/* Ref row */}
                <div style={s.resultRow}>
                  <span style={s.resultLabel}>Reference Extracted</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>
                      {ocrResult.extracted.ref || "Not found"}
                    </span>
                    {ocrResult.refMatched
                      ? <span style={s.matchBadge(true)}>Matched</span>
                      : <span style={s.matchBadge(false)}>Expected {referenceCode}</span>
                    }
                  </div>
                </div>

                {/* Date & Bank */}
                {ocrResult.extracted.date && (
                  <div style={s.resultRow}>
                    <span style={s.resultLabel}>Date</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ocrResult.extracted.date}</span>
                  </div>
                )}
                {ocrResult.extracted.bank && (
                  <div style={s.resultRow}>
                    <span style={s.resultLabel}>Bank</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: "capitalize" }}>{ocrResult.extracted.bank}</span>
                  </div>
                )}
              </div>

              {/* Manual Review Section */}
              {(!ocrResult.amountMatched || !ocrResult.refMatched) && (
                <div style={s.manualBlock}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: C.light, display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <FaShieldAlt size={14} color={C.primary} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                        Auto-verification could not be completed
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                        The system was unable to read your receipt clearly enough to verify automatically.
                        You can request a manual review and an admin will verify your payment within 24 hours.
                      </div>

                      {!showManualForm ? (
                        <button style={s.btnManual} onClick={() => setShowManualForm(true)}>
                          Request Manual Review
                        </button>
                      ) : (
                        <div>
                          <label style={s.manualLabel}>Note for admin (optional)</label>
                          <textarea
                            style={s.manualTextarea}
                            rows={3}
                            placeholder="e.g. Transfer was done on 28/02/2026, reference written in remarks field"
                            value={manualNote}
                            onChange={e => setManualNote(e.target.value)}
                          />
                          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <button style={s.btnManual} onClick={handleManualRequest}>Submit Request</button>
                            <button style={s.btnGhost}  onClick={() => setShowManualForm(false)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && <div style={s.errorBox}><FaExclamationTriangle style={{ marginRight: 8 }} />{error}</div>}

          {/* Scan Button */}
          {!ocrResult && (
            <button
              style={{ ...s.btnPrimary, opacity: isBusy || !file ? 0.45 : 1, cursor: isBusy || !file ? "not-allowed" : "pointer" }}
              disabled={isBusy || !file}
              onClick={handleUpload}
            >
              {isBusy
                ? <><FaSpinner style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />Processing...</>
                : <><FaUpload style={{ marginRight: 8 }} />Scan and Verify Receipt</>
              }
            </button>
          )}

          {/* Retry */}
          {ocrResult && (!ocrResult.amountMatched || !ocrResult.refMatched) && (
            <button
              style={{ ...s.btnGhost, width: "100%", padding: 14, marginTop: 10, justifyContent: "center" }}
              onClick={() => { setFile(null); setPreview(null); setOcrResult(null); setError(""); }}
            >
              Upload a Different Image
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: C.pageBg,
    fontFamily: "'Segoe UI', 'Plus Jakarta Sans', sans-serif",
    paddingBottom: 80,
    color: C.text,
  },

  topBar: {
    background: C.white,
    borderBottom: `1px solid ${C.cardBdr}`,
    padding: "0 32px",
    height: 56,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  backBtn: {
    display: "inline-flex", alignItems: "center",
    background: "none", border: "none",
    color: C.textMuted, cursor: "pointer",
    fontSize: 13, fontWeight: 500, fontFamily: "inherit",
    padding: "6px 10px", borderRadius: 6,
  },
  topTitle: { fontSize: 15, fontWeight: 700, color: C.text },
  statusChip: {
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
    padding: "5px 12px", borderRadius: 100,
    border: "1px solid", textTransform: "uppercase",
  },

  layout: {
    maxWidth: 1080, margin: "0 auto",
    padding: "32px 24px",
    display: "grid", gridTemplateColumns: "300px 1fr",
    gap: 28, alignItems: "start",
  },

  leftCol: { position: "sticky", top: 72 },
  rightCol: { display: "flex", flexDirection: "column" },

  card: {
    background: C.white,
    border: `1px solid ${C.cardBdr}`,
    borderRadius: 12,
    padding: "20px 18px",
    marginBottom: 14,
  },

  refBox: {
    background: C.light,
    border: `1.5px dashed ${C.border}`,
    borderRadius: 8,
    padding: "12px 14px",
    textAlign: "center",
    marginBottom: 16,
  },
  refLabel: { display: "block", fontSize: 9, letterSpacing: 3, color: C.textMuted, fontWeight: 700, marginBottom: 5 },
  refCode:  { fontSize: 20, fontWeight: 900, color: C.primary, letterSpacing: 4, fontFamily: "monospace" },

  detailList: { display: "flex", flexDirection: "column" },
  detailRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 0", borderBottom: `1px solid ${C.neutral}`, fontSize: 13,
  },
  detailKey: { color: C.textMuted, fontSize: 12 },
  detailVal: { color: C.text, fontWeight: 600, fontSize: 13, textAlign: "right" },

  heading:    { fontSize: 22, fontWeight: 800, margin: "0 0 8px", letterSpacing: -0.3, color: C.text },
  subHeading: { fontSize: 14, color: C.textMuted, margin: "0 0 24px", lineHeight: 1.6 },

  dropZone: {
    border: `2px dashed ${C.cardBdr}`,
    borderRadius: 12,
    padding: "32px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: 14,
  },
  previewImg: {
    maxWidth: "100%", maxHeight: 240,
    borderRadius: 8, objectFit: "contain",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },

  tipsBox: {
    background: C.light,
    border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "14px 16px", marginBottom: 20,
  },
  tipsTitle: { fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  ocrBox: {
    background: C.light,
    border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "16px 18px", marginBottom: 20,
  },

  resultCard: {
    background: C.white,
    border: `1px solid ${C.cardBdr}`,
    borderLeft: `4px solid ${C.primary}`,
    borderRadius: 10,
    padding: "18px 18px",
    marginBottom: 14,
  },
  resultRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 12px", background: C.neutral, borderRadius: 7,
  },
  resultLabel: { fontSize: 12, color: C.textMuted, fontWeight: 600 },
  matchBadge: (matched) => ({
    fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
    padding: "3px 8px", borderRadius: 4,
    background: matched ? C.successBg  : C.errorBg,
    color:      matched ? C.success    : C.error,
    border:     `1px solid ${matched ? C.successBdr : C.errorBdr}`,
    whiteSpace: "nowrap",
  }),

  manualBlock: {
    background: C.light,
    border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "14px 16px", marginTop: 4,
  },
  manualLabel: { fontSize: 12, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 6 },
  manualTextarea: {
    width: "100%", resize: "vertical",
    border: `1.5px solid ${C.border}`,
    borderRadius: 8, padding: "10px 12px",
    fontSize: 13, fontFamily: "inherit",
    outline: "none", color: C.text,
    background: C.white,
    boxSizing: "border-box",
  },

  errorBox: {
    background: C.errorBg, border: `1px solid ${C.errorBdr}`,
    color: C.error, borderRadius: 8,
    padding: "11px 14px", fontSize: 13, marginBottom: 14,
    display: "flex", alignItems: "center",
  },
  infoBox: {
    borderRadius: 8, padding: "12px 14px",
    border: "1px solid", marginBottom: 20,
  },

  btnPrimary: {
    width: "100%", padding: "15px",
    background: `linear-gradient(135deg, ${C.primary}, ${C.dark})`,
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: 0.3,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "opacity 0.2s",
    marginBottom: 0,
  },
  btnManual: {
    padding: "10px 20px",
    background: C.primary, color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  },
  btnGhost: {
    padding: "10px 20px",
    background: "transparent", color: C.textMuted,
    border: `1.5px solid ${C.cardBdr}`, borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    display: "inline-flex", alignItems: "center",
  },

  verifiedCard: {
    background: C.white, border: `1px solid ${C.cardBdr}`,
    borderRadius: 16, padding: "40px 36px",
    textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center",
  },
  verifiedIcon: {
    width: 72, height: 72, borderRadius: "50%",
    background: C.successBg, border: `1px solid ${C.successBdr}`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  verifiedDetails: {
    width: "100%", border: `1px solid ${C.cardBdr}`,
    borderRadius: 10, overflow: "hidden", marginBottom: 24,
  },
  verifiedRow: {
    display: "flex", justifyContent: "space-between",
    padding: "11px 16px", borderBottom: `1px solid ${C.neutral}`,
  },
};
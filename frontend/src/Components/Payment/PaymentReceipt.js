import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft, FaUpload, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaExclamationTriangle, FaCloudUploadAlt,
  FaShieldAlt, FaUniversity, FaReceipt, FaListAlt,
  FaFingerprint, FaFilePdf, FaMobileAlt, FaCamera,
} from "react-icons/fa";
import "./PaymentReceipt.css";

const BASE_URL = "http://localhost:8000";

async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${BASE_URL}/Notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

const STATUS_CONFIG = {
  created:          { label: "Awaiting Transfer",   color: "#7f8c8d", bg: "#f4f6f7", bdr: "#d5d8dc" },
  pending:          { label: "Verification Failed", color: "#d35400", bg: "#fef6ee", bdr: "#fddcb5" },
  verified:         { label: "Verified",            color: "#1e8449", bg: "#eafaf1", bdr: "#a9dfbf" },
  rejected:         { label: "Rejected",            color: "#c0392b", bg: "#fdedec", bdr: "#f1948a" },
  manual_requested: { label: "Manual Review",       color: "#2471a3", bg: "#eaf4fb", bdr: "#aed6f1" },
};

const PLAN_LABELS = { "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "12m": "12 Months" };

const SOURCE_LABELS = {
  bank_screenshot:  { icon: FaMobileAlt, text: "Bank app screenshot"   },
  camera_photo:     { icon: FaCamera,    text: "Camera photo"          },
  scanned_document: { icon: FaCamera,    text: "Scanned document"      },
  pdf_document:     { icon: FaFilePdf,   text: "PDF document"          },
};

// ─── OCR Step component ───────────────────────────────────────────────────────
function OcrStep({ step, current, isPdf }) {
  const done   = current > step;
  const active = current === step;
  const labels = isPdf
    ? ["", "Uploading file", "Extracting PDF text", "Analysing with AI", "Checking amount", "Finalising"]
    : ["", "Uploading receipt", "Scanning file metadata", "Analysing with AI", "Checking amount", "Finalising"];
  return (
    <div className="pr-ocr-step" style={{ opacity: done || active ? 1 : 0.3 }}>
      <div className={`pr-ocr-step__dot${done ? " pr-ocr-step__dot--done" : active ? " pr-ocr-step__dot--active" : " pr-ocr-step__dot--pending"}`}>
        {done ? <FaCheckCircle size={12} /> : step}
      </div>
      <span className={`pr-ocr-step__label${done ? " pr-ocr-step__label--done" : active ? " pr-ocr-step__label--active" : " pr-ocr-step__label--pending"}`}>
        {labels[step]}
      </span>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="pr-section-label">
      <div className="pr-section-label__icon"><Icon /></div>
      <span className="pr-section-label__text">{children}</span>
    </div>
  );
}

function ExtractedField({ label, extractedValue, expectedValue, matched, mono }) {
  const isEmpty = extractedValue === null || extractedValue === undefined || extractedValue === "";
  const display = isEmpty ? "Not detected" : extractedValue;
  return (
    <div className="pr-field-row">
      <span className="pr-field-row__label">{label}</span>
      <div className="pr-field-row__right">
        <span className={`pr-field-row__value${mono ? " pr-field-row__value--mono" : ""}${isEmpty ? " pr-field-row__value--muted" : ""}`}>
          {display}
        </span>
        {matched === true  && <span className="pr-badge pr-badge--ok">&#10003; Matched</span>}
        {matched === false && !isEmpty && <span className="pr-badge pr-badge--fail">&#10007; {expectedValue ? `Expected ${expectedValue}` : "No match"}</span>}
        {matched === false && isEmpty  && <span className="pr-badge pr-badge--fail">&#10007; Not found</span>}
        {matched === null  && !isEmpty && <span className="pr-badge pr-badge--neutral">Info</span>}
      </div>
    </div>
  );
}

// ─── Source type badge ────────────────────────────────────────────────────────
function SourceBadge({ receiptType }) {
  const cfg = SOURCE_LABELS[receiptType];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "#eaf4fb", color: "#2471a3", border: "1px solid #aed6f1",
      borderRadius: 6, padding: "4px 10px", fontSize: 12, marginBottom: 12,
    }}>
      <Icon size={12} />
      <span>{cfg.text} detected</span>
    </div>
  );
}

// ─── Metadata check badge ─────────────────────────────────────────────────────
function MetaCheckBadge({ metaCheck }) {
  const [expanded, setExpanded] = useState(false);
  if (!metaCheck) return null;

  const hasFlags = metaCheck.flags && metaCheck.flags.length > 0;
  const clean    = !hasFlags;

  return (
    <div
      className="pr-info-box"
      style={{
        background:   clean ? "#eafaf1" : "#fef6ee",
        borderColor:  clean ? "#a9dfbf" : "#fddcb5",
        color:        clean ? "#1e8449" : "#d35400",
        marginBottom: 12,
        cursor:       hasFlags ? "pointer" : "default",
      }}
      onClick={() => hasFlags && setExpanded((v) => !v)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <FaFingerprint size={13} style={{ flexShrink: 0 }} />
        <strong>
          {clean
            ? "File metadata scan clean — no editing software detected"
            : `Metadata warning: ${metaCheck.software ? `"${metaCheck.software}" found in file data` : "suspicious file data"}`}
        </strong>
        {hasFlags && (
          <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.75 }}>
            {expanded ? "▲ hide" : `▼ ${metaCheck.flags.length} flag${metaCheck.flags.length > 1 ? "s" : ""}`}
          </span>
        )}
      </div>
      {hasFlags && expanded && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
          {metaCheck.flags.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      {clean && (
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>
          {metaCheck.hasExif
            ? "EXIF data present — no editing tool signatures found"
            : "No EXIF data (normal for phone screenshots — not suspicious)"}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentReceipt() {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [preview,        setPreview]        = useState(null);     // null for PDFs
  const [ocrStep,        setOcrStep]        = useState(0);
  const [ocrRunning,     setOcrRunning]     = useState(false);
  const [ocrResult,      setOcrResult]      = useState(null);
  const [manualNote,     setManualNote]     = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSent,     setManualSent]     = useState(false);
  const [error,          setError]          = useState("");
  const [dragOver,       setDragOver]       = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(f.type) && !f.type.startsWith("image/")) {
      setError("Please upload an image (JPG, PNG, WEBP) or a PDF file.");
      return;
    }
    setFile(f);
    // Show image preview for images, null for PDFs (handled in dropzone)
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setOcrResult(null);
    setError("");
    setShowManualForm(false);
  };

  const isPdf = file?.type === "application/pdf";

  const handleUpload = async () => {
    if (!file)      return setError("Please select a receipt file first.");
    if (!paymentId) return setError("Payment ID missing. Please go back.");

    setOcrRunning(true);
    setError("");
    setOcrStep(1);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      setOcrStep(2); // metadata scan or PDF extract

      const res = await axios.post(
        `${BASE_URL}/Payment/${paymentId}/upload-receipt`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setOcrStep(3); await new Promise(r => setTimeout(r, 300));
      setOcrStep(4); await new Promise(r => setTimeout(r, 300));
      setOcrStep(5); await new Promise(r => setTimeout(r, 300));

      const { payment: updatedPayment, verification } = res.data;
      setStatus(updatedPayment.status);

      const hostId = localStorage.getItem("CurrentUserId");
      if (hostId) {
        if (verification.newStatus === "verified") {
          sendNotification({
            recipient: hostId, type: "payment_verified", title: "Payment Verified!",
            message:   `Your payment for ${listingName} (${referenceCode}) has been verified. Your listing is now active for ${daysAdded} days.`,
            link: "/PaymentHistory", refId: paymentId, refType: "Payment",
          });
        } else {
          sendNotification({
            recipient: hostId, type: "payment_verified", title: "Receipt Uploaded — Verification Failed",
            message:   `Your receipt for ${listingName} (${referenceCode}) could not be auto-verified. Please request a manual review.`,
            link: "/PaymentHistory", refId: paymentId, refType: "Payment",
          });
        }
      }

      setOcrResult({
        amountMatched:      verification.amountMatched,
        refMatched:         verification.refMatched,
        newStatus:          verification.newStatus,
        canRequestManualReview:  verification.canRequestManualReview, 
        isGenuineReceipt:   verification.isGenuineReceipt,
        authenticityReason: verification.authenticityReason,
        suspiciousFlags:    verification.suspiciousFlags || [],
        confidence:         verification.confidence,
        receiptType:        verification.receiptType || null,
        metaCheck:          verification.metaCheck   || null,
        extracted:          verification.extracted,
      });

    } catch (err) {
      if (err.response?.status === 400) {
        const data      = err.response.data;
        const metaFlags = data.metaCheck?.flags || data.flags || [];
        setError(
          `${data.message}${data.reason ? " " + data.reason : ""}${metaFlags.length > 0 ? " — " + metaFlags[0] : ""}`
        );
      } else {
        setError(err.response?.data?.message || err.message || "Upload failed. Please try again.");
      }
      setOcrStep(0);
    } finally {
      setOcrRunning(false);
      setOcrStep(0);
    }
  };

  const handleManualRequest = async () => {
    if (!paymentId) return;
    try {
      const res = await axios.patch(`${BASE_URL}/Payment/${paymentId}/manual-request`, { note: manualNote });
      setStatus(res.data.payment.status);
      setManualSent(true);
      setShowManualForm(false);
      const hostId = localStorage.getItem("CurrentUserId");
      if (hostId) {
        sendNotification({
          recipient: hostId, type: "payment_verified", title: "Manual Review Requested",
          message:   `Your manual review request for ${listingName} (${referenceCode}) has been submitted. Our team will verify within 24 hours.`,
          link: "/PaymentHistory", refId: paymentId, refType: "Payment",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request manual review.");
    }
  };

  const statusCfg  = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  const isVerified = status === "verified";
  const isManual   = status === "manual_requested";
  const isBusy     = ocrRunning;
  const allMatched = ocrResult?.amountMatched && ocrResult?.refMatched;

  // ── Verified screen ─────────────────────────────────────────────────────────
  if (isVerified) return (
    <div className="pr-page">
      <div className="pr-topbar">
        <button className="pr-topbar__back" onClick={() => navigate("/PaymentHistory", { state: { refresh: true } })}><FaArrowLeft size={13} /> Back</button>
        <span className="pr-topbar__title">Payment Verified</span>
        <div />
      </div>
      <div className="pr-success-wrap">
        <div className="pr-success-card">
          <div className="pr-success-icon"><FaCheckCircle size={36} color="#1e8449" /></div>
          <h2 className="pr-success-title">Payment Verified</h2>
          <p className="pr-success-desc">Your listing <strong>{listingName}</strong> is now active for {daysAdded} days.</p>
          <div className="pr-success-details">
            {[
              ["Plan",       PLAN_LABELS[plan] || plan],
              ["Amount",     `LKR ${(amount || 0).toLocaleString()}`],
              ["Active for", `${daysAdded} days`],
              ["Expires",    newExpireDate
                ? new Date(newExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"],
            ].map(([k, v]) => (
              <div key={k} className="pr-success-row">
                <span className="pr-success-row__key">{k}</span>
                <span className="pr-success-row__val">{v}</span>
              </div>
            ))}
          </div>
          <button className="pr-btn-primary" onClick={() => navigate("/Listings")}>Go to My Listings</button>
        </div>
      </div>
    </div>
  );

  // ── Manual review sent screen ───────────────────────────────────────────────
  if (isManual && manualSent) return (
    <div className="pr-page">
      <div className="pr-topbar">
        <button className="pr-topbar__back" onClick={() => navigate("/PaymentHistory", { state: { refresh: true } })}><FaArrowLeft size={13} /> Back</button>
        <span className="pr-topbar__title">Manual Review</span>
        <div />
      </div>
      <div className="pr-success-wrap">
        <div className="pr-success-card">
          <div className="pr-success-icon pr-success-icon--manual"><FaShieldAlt size={32} color="#2471a3" /></div>
          <h2 className="pr-success-title">Manual Review Requested</h2>
          <p className="pr-success-desc">Our team will review your receipt within <strong>24 hours</strong> and activate your listing.</p>
          <div className="pr-info-box" style={{ background: "#eaf4fb", borderColor: "#aed6f1", color: "#2471a3" }}>
            No further action required. You will be notified once approved.
          </div>
          <button className="pr-btn-ghost pr-btn-wide" onClick={() => navigate("/Listings")}>Back to Listings</button>
        </div>
      </div>
    </div>
  );

  // ── Main upload screen ──────────────────────────────────────────────────────
  return (
    <div className="pr-page">
      <div className="pr-topbar">
        <button className="pr-topbar__back" onClick={() => navigate("/PaymentHistory", { state: { refresh: true } })}><FaArrowLeft size={13} /> Back</button>
        <span className="pr-topbar__title">Upload Payment Receipt</span>
        <div className="pr-topbar__status" style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.bdr }}>
          {statusCfg.label}
        </div>
      </div>

      {!paymentId && (
        <div className="pr-missing-warning">
          <div className="pr-error">Payment information is missing. Please go back and try again.</div>
        </div>
      )}

      <div className="pr-layout">
        {/* ── Left column ── */}
        <div className="pr-left">
          <div className="pr-card">
            <SectionLabel icon={FaReceipt}>Payment Summary</SectionLabel>
            <div className="pr-ref-box">
              <span className="pr-ref-label">Reference Code</span>
              <span className="pr-ref-code">{referenceCode || "—"}</span>
            </div>
            <div className="pr-detail-list">
              {[
                ["Plan",       PLAN_LABELS[plan] || plan || "—"],
                ["Amount",     `LKR ${(amount || 0).toLocaleString()}`],
                ["Active for", `${daysAdded || 0} days`],
                ["Listing",    listingName],
                ["Expires",    newExpireDate
                  ? new Date(newExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : "—"],
              ].map(([k, v]) => (
                <div key={k} className="pr-detail-row">
                  <span className="pr-detail-key">{k}</span>
                  <span className="pr-detail-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pr-card">
            <SectionLabel icon={FaUniversity}>Bank Transfer Details</SectionLabel>
            <div className="pr-detail-list">
              {[
                ["Bank",         bankName],
                ["Account Name", accountName],
                ["Account No.",  accountNumber],
                ["Branch",       branch],
                ["Amount",       `LKR ${(amount || 0).toLocaleString()}`],
                ["Remark",       referenceCode],
              ].map(([k, v]) => (
                <div key={k} className="pr-detail-row">
                  <span className="pr-detail-key">{k}</span>
                  <span className={`pr-detail-val${k === "Remark" ? " pr-detail-val--remark" : k === "Amount" ? " pr-detail-val--amount" : ""}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pr-card">
            <SectionLabel icon={FaListAlt}>Verification Process</SectionLabel>
            <div className="pr-steps">
              {[
                ["Upload your receipt",   "Upload a bank app screenshot, camera photo of a printed slip, or a PDF from internet banking."],
                ["File analysis",         "For images: binary metadata is checked for editing software signatures. For PDFs: text is extracted directly."],
                ["AI verification",       "Groq analyses the receipt content and confirms it looks genuine. Metadata findings are included as context."],
                ["Instant activation",    "If the amount and reference code both match, your listing activates immediately."],
                ["Manual fallback",       "If auto-verification fails for any reason, request manual review — an admin checks within 24 hours."],
              ].map(([title, desc], i, arr) => (
                <div key={i} className="pr-step">
                  <div className="pr-step__track">
                    <div className="pr-step__num">{i + 1}</div>
                    {i < arr.length - 1 && <div className="pr-step__line" />}
                  </div>
                  <div className="pr-step__content">
                    <div className="pr-step__title">{title}</div>
                    <div className="pr-step__desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="pr-right">
          <h2 className="pr-heading">Upload Your Receipt</h2>
          <p className="pr-subheading">
            The reference code <strong style={{ color: "#e67e22" }}>{referenceCode}</strong> and amount{" "}
            <strong>LKR {(amount || 0).toLocaleString()}</strong> must be visible.
          </p>

          {/* Dropzone */}
          <div
            className={`pr-dropzone${dragOver ? " pr-dropzone--drag" : ""}${file ? " pr-dropzone--filled" : ""}${ocrResult ? " pr-dropzone--locked" : ""}`}
            onClick={() => { if (!ocrResult) inputRef.current?.click(); }}
            onDragOver={e => { if (!ocrResult) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { if (!ocrResult) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); } }}
          >
            {/* Accept images AND PDFs */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])}
            />

            {file ? (
              <div style={{ textAlign: "center" }}>
                {isPdf ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 0" }}>
                    <FaFilePdf size={40} color="#e74c3c" />
                    <div className="pr-preview-name"><FaCheckCircle /> {file.name}</div>
                    <div style={{ fontSize: 12, color: "#7f8c8d" }}>
                      {(file.size / 1024).toFixed(0)} KB · PDF document
                    </div>
                  </div>
                ) : (
                  <>
                    <img src={preview} alt="Receipt preview" className="pr-preview-img" />
                    <div className="pr-preview-name"><FaCheckCircle /> {file.name}</div>
                  </>
                )}
                {!ocrResult && <div className="pr-preview-change">Click to change file</div>}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div className="pr-dropzone__icon-wrap"><FaCloudUploadAlt size={26} color="#e67e22" /></div>
                <div className="pr-dropzone__title">Drop your receipt here</div>
                <div className="pr-dropzone__sub">Screenshot, photo, or PDF — JPG, PNG, WEBP, PDF supported</div>
              </div>
            )}
          </div>

          {/* Tips */}
          {!ocrResult && (
            <div className="pr-tips">
              <div className="pr-tips__title">Accepted receipt types</div>
              <div className="pr-tips__grid">
                {[
                  "Bank app screenshot (any phone)",
                  "Camera photo of a printed receipt",
                  "PDF from internet banking / email",
                  `Reference ${referenceCode} and amount LKR ${(amount || 0).toLocaleString()} must be visible`,
                ].map((t, i) => (
                  <div key={i} className="pr-tips__item">
                    <div className="pr-tips__dot"><FaCheckCircle size={8} /></div>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress steps */}
          {ocrStep > 0 && (
            <div className="pr-ocr-box">
              <div className="pr-ocr-box__header">
                <FaSpinner className="pr-spin" style={{ color: "#e67e22" }} />
                <span className="pr-ocr-box__title">
                  {isPdf ? "Analysing PDF receipt..." : "Analysing receipt..."}
                </span>
              </div>
              <div className="pr-ocr-steps">
                {[1, 2, 3, 4, 5].map(step => (
                  <OcrStep key={step} step={step} current={ocrStep} isPdf={isPdf} />
                ))}
              </div>
            </div>
          )}

          {/* Result card */}
          {ocrResult && !ocrRunning && (
            <div className={`pr-result-card${allMatched ? " pr-result-card--success" : ""}`}>
              <div className="pr-result-header">
                {allMatched
                  ? <FaCheckCircle size={20} color="#1e8449" style={{ flexShrink: 0 }} />
                  : <FaExclamationTriangle size={20} color="#e67e22" style={{ flexShrink: 0 }} />}
                <div>
                  <div className="pr-result-header__title">
                    {allMatched ? "Receipt Verified Successfully" : "Scan Complete — Verification Incomplete"}
                  </div>
                  <div className="pr-result-header__sub">
                    {allMatched
                      ? "Both amount and reference matched. Your listing is now active."
                      : "Your receipt was saved. See extracted details below."}
                  </div>
                </div>
              </div>

              {/* Source type badge */}
              <SourceBadge receiptType={ocrResult.receiptType} />

              {/* Metadata scan badge (images only) */}
              {ocrResult.metaCheck && <MetaCheckBadge metaCheck={ocrResult.metaCheck} />}

              {/* Groq authenticity verdict */}
              {ocrResult.isGenuineReceipt !== undefined && (
                <div className="pr-info-box" style={{
                  background:   ocrResult.isGenuineReceipt ? "#eafaf1" : "#fef6ee",
                  borderColor:  ocrResult.isGenuineReceipt ? "#a9dfbf" : "#fddcb5",
                  color:        ocrResult.isGenuineReceipt ? "#1e8449" : "#d35400",
                  marginBottom: 12,
                }}>
                  <strong>{ocrResult.isGenuineReceipt ? "✓ Genuine receipt detected" : "⚠ Receipt authenticity uncertain"}</strong>
                  {ocrResult.authenticityReason && (
                    <div style={{ marginTop: 4, fontSize: 13 }}>{ocrResult.authenticityReason}</div>
                  )}
                  {ocrResult.suspiciousFlags?.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                      Flags: {ocrResult.suspiciousFlags.join(" · ")}
                    </div>
                  )}
                </div>
              )}

              {/* Extracted fields */}
              <div className="pr-fields">
                <ExtractedField
                  label="Amount Extracted"
                  extractedValue={ocrResult.extracted?.amount ? `LKR ${Number(ocrResult.extracted.amount).toLocaleString()}` : null}
                  expectedValue={`LKR ${(amount || 0).toLocaleString()}`}
                  matched={ocrResult.amountMatched}
                />
                <ExtractedField
                  label="Reference Extracted"
                  extractedValue={ocrResult.extracted?.ref || null}
                  expectedValue={referenceCode}
                  matched={ocrResult.refMatched}
                  mono
                />
                <ExtractedField label="Transfer Date" extractedValue={ocrResult.extracted?.date || null} matched={null} />
                <ExtractedField
                  label="Bank Detected"
                  extractedValue={ocrResult.extracted?.bank
                    ? ocrResult.extracted.bank.charAt(0).toUpperCase() + ocrResult.extracted.bank.slice(1)
                    : null}
                  matched={null}
                />
              </div>

              {/* Match chips */}
              <div className="pr-chips">
                <span className={`pr-chip${ocrResult.amountMatched ? " pr-chip--ok" : " pr-chip--fail"}`}>
                  {ocrResult.amountMatched ? "✓" : "✗"} Amount {ocrResult.amountMatched ? "matched" : "mismatch"}
                </span>
                <span className={`pr-chip${ocrResult.refMatched ? " pr-chip--ok" : " pr-chip--fail"}`}>
                  {ocrResult.refMatched ? "✓" : "✗"} Reference {ocrResult.refMatched ? "matched" : "not found"}
                </span>
              </div>

              {/* Manual review */}
              {(!ocrResult.amountMatched || !ocrResult.refMatched) && ocrResult.canRequestManualReview && (
                <div className="pr-manual-block">
                  <div className="pr-manual-block__inner">
                    <div className="pr-manual-block__icon"><FaShieldAlt size={14} color="#e67e22" /></div>
                    <div style={{ flex: 1 }}>
                      <div className="pr-manual-block__title">Auto-verification could not be completed</div>
                      <div className="pr-manual-block__desc">
                        Your receipt has been saved. If the details above look correct but did not match,
                        request a manual review and an admin will verify within 24 hours.
                      </div>
                      {!showManualForm ? (
                        <button className="pr-btn-manual" onClick={() => setShowManualForm(true)}>Request Manual Review</button>
                      ) : (
                        <div>
                          <label className="pr-manual-label">Note for admin (optional)</label>
                          <textarea
                            className="pr-manual-textarea"
                            rows={3}
                            placeholder="e.g. Transfer was done on 28/02/2026, reference written in remarks field"
                            value={manualNote}
                            onChange={e => setManualNote(e.target.value)}
                          />
                          <div className="pr-manual-actions">
                            <button className="pr-btn-manual" onClick={handleManualRequest}>Submit Request</button>
                            <button className="pr-btn-ghost" onClick={() => setShowManualForm(false)}>Cancel</button>
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
          {error && (
            <div className="pr-error"><FaExclamationTriangle /> {error}</div>
          )}

          {/* Action buttons */}
          {!ocrResult && (
            <button className="pr-btn-primary" disabled={isBusy || !file} onClick={handleUpload}>
              {isBusy
                ? <><FaSpinner className="pr-spin" /> Analysing...</>
                : <><FaUpload /> Scan and Verify Receipt</>}
            </button>
          )}

          {ocrResult && !allMatched && (
            <button className="pr-btn-ghost pr-btn-wide"
              onClick={() => { setFile(null); setPreview(null); setOcrResult(null); setError(""); }}>
              Upload a Different File
            </button>
          )}

          {ocrResult && (
            <button className="pr-btn-ghost pr-btn-wide" onClick={() => navigate("/PaymentHistory", { state: { refresh: true } })}>
              View in Payment History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
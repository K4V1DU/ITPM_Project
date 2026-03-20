import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft, FaUpload, FaCheckCircle, FaTimesCircle,
  FaSpinner, FaExclamationTriangle, FaCloudUploadAlt,
  FaShieldAlt, FaUniversity, FaReceipt, FaListAlt,
} from "react-icons/fa";
import "./PaymentReceipt.css";

const BASE_URL = "http://localhost:8000";

// ─── Notification helper — fire-and-forget ────────────────────────────────────
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
  created:          { label: "Awaiting Transfer",   color: "#7f8c8d", bg: "#f4f6f7", bdr: "#d5d8dc"  },
  pending:          { label: "Verification Failed", color: "#d35400", bg: "#fef6ee", bdr: "#fddcb5"  },
  verified:         { label: "Verified",            color: "#1e8449", bg: "#eafaf1", bdr: "#a9dfbf"  },
  rejected:         { label: "Rejected",            color: "#c0392b", bg: "#fdedec", bdr: "#f1948a"  },
  manual_requested: { label: "Manual Review",       color: "#2471a3", bg: "#eaf4fb", bdr: "#aed6f1"  },
};

const PLAN_LABELS = { "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "12m": "12 Months" };

function OcrStep({ step, current }) {
  const done   = current > step;
  const active = current === step;
  const labels = ["", "Reading receipt", "Extracting data", "Checking amount", "Checking reference", "Finalising"];
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

// Always shows the extracted value + match badge regardless of whether it matched
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
    s.src   = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
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
        .map(s => parseFloat(s.replace(/,/g, ""))).filter(n => n >= 100 && n <= 999999);

      // Find the number closest to the required amount (exact or very close)
      const exactMatch = allNumbers.find(n => n === amount) ?? allNumbers.find(n => n === amount + 1);
      let keywordMatch = null;
      const amountKeywords = ["amount", "lkr", "rs", "total", "transfer", "debit", "credit"];
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (amountKeywords.some(k => lower.includes(k))) {
          const nums = (line.match(/[\d,]+(?:\.[\d]{1,2})?/g) || [])
            .map(s => parseFloat(s.replace(/,/g, ""))).filter(n => n >= 100 && n <= 999999);
          if (nums.length > 0) {
            const biggest = Math.max(...nums);
            if (biggest === amount || biggest === amount + 1) { keywordMatch = biggest; break; }
          }
        }
      }

      // displayAmount — best OCR read, stored always (even on mismatch)
      // bestAmount    — only exact/keyword match, used for verification logic
      const displayAmount = exactMatch ?? keywordMatch ?? (allNumbers.length > 0 ? Math.max(...allNumbers) : 0);
      const bestAmount    = exactMatch ?? keywordMatch ?? 0;

      setOcrStep(4);
      const refMatch      = rawOcrText.match(/REF\s*\d{4,6}/i);
      const extractedRef  = refMatch ? refMatch[0].replace(/\s/g, "").toUpperCase() : "";
      const dateMatch     = rawOcrText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      const extractedDate = dateMatch ? dateMatch[0] : "";
      const bankKeywords  = ["commercial", "peoples", "sampath", "hnb", "boc", "nsb", "dfcc", "cargills", "seylan", "pan asia"];
      const extractedBank = bankKeywords.find(b => rawOcrText.toLowerCase().includes(b)) || "";

      setOcrStep(5);
      await new Promise(r => setTimeout(r, 400));

      setUploading(true);
      const formData = new FormData();
      formData.append("receipt",         file);
      // Send displayAmount as both fields — backend applies tolerance matching
      // bestAmount was used to find an exact/+1 match; fall back to displayAmount so backend always gets a real number
      const finalBestAmount = bestAmount || displayAmount;
      formData.append("extractedAmount", finalBestAmount);  // used for backend matching
      formData.append("displayAmount",   displayAmount);    // always stored for display
      formData.append("extractedRef",    extractedRef);
      formData.append("extractedDate",   extractedDate);
      formData.append("extractedBank",   extractedBank);
      formData.append("rawOcrText",      rawOcrText.slice(0, 2000));

      const res = await axios.post(`${BASE_URL}/Payment/${paymentId}/upload-receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { payment: updatedPayment, verification } = res.data;
      setStatus(updatedPayment.status);

      // ── Notify host on auto-verification result ───────────────────────────
      const hostId = localStorage.getItem("CurrentUserId");
      if (hostId) {
        if (verification.newStatus === "verified") {
          sendNotification({
            recipient: hostId,
            type:      "payment_verified",
            title:     "Payment Verified!",
            message:   `Your payment for ${listingName} (${referenceCode}) has been verified. Your listing is now active for ${daysAdded} days.`,
            link:      "/PaymentHistory",
            refId:     paymentId,
            refType:   "Payment",
          });
        } else {
          sendNotification({
            recipient: hostId,
            type:      "payment_verified",
            title:     "Receipt Uploaded — Verification Failed",
            message:   `Your receipt for ${listingName} (${referenceCode}) could not be auto-verified. Please request a manual review.`,
            link:      "/PaymentHistory",
            refId:     paymentId,
            refType:   "Payment",
          });
        }
      }

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

      // ── Notify host: manual review requested ─────────────────────────────
      const hostIdManual = localStorage.getItem("CurrentUserId");
      if (hostIdManual) {
        sendNotification({
          recipient: hostIdManual,
          type:      "payment_verified",
          title:     "Manual Review Requested",
          message:   `Your manual review request for ${listingName} (${referenceCode}) has been submitted. Our team will verify within 24 hours.`,
          link:      "/PaymentHistory",
          refId:     paymentId,
          refType:   "Payment",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request manual review.");
    }
  };

  const statusCfg  = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  const isVerified = status === "verified";
  const isManual   = status === "manual_requested";
  const isBusy     = ocrRunning || uploading;
  const allMatched = ocrResult?.amountMatched && ocrResult?.refMatched;

  if (isVerified) return (
    <div className="pr-page">
      <div className="pr-topbar">
        <button className="pr-topbar__back" onClick={() => navigate("/PaymentHistory")}><FaArrowLeft size={13} /> Back</button>
        <span className="pr-topbar__title">Payment Verified</span>
        <div />
      </div>
      <div className="pr-success-wrap">
        <div className="pr-success-card">
          <div className="pr-success-icon"><FaCheckCircle size={36} color="#1e8449" /></div>
          <h2 className="pr-success-title">Payment Verified</h2>
          <p className="pr-success-desc">Your listing <strong>{listingName}</strong> is now active for {daysAdded} days.</p>
          <div className="pr-success-details">
            {[["Plan", PLAN_LABELS[plan] || plan], ["Amount", `LKR ${(amount||0).toLocaleString()}`],
              ["Active for", `${daysAdded} days`], ["Expires", newExpireDate ? new Date(newExpireDate).toLocaleDateString("en-GB", {day:"numeric",month:"long",year:"numeric"}) : "—"]
            ].map(([k,v]) => (
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

  if (isManual && manualSent) return (
    <div className="pr-page">
      <div className="pr-topbar">
        <button className="pr-topbar__back" onClick={() => navigate("/PaymentHistory")}><FaArrowLeft size={13} /> Back</button>
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

  return (
    <div className="pr-page">
      <div className="pr-topbar">
        <button className="pr-topbar__back" onClick={() => navigate("/PaymentHistory")}><FaArrowLeft size={13} /> Back</button>
        <span className="pr-topbar__title">Upload Payment Receipt</span>
        <div className="pr-topbar__status" style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.bdr }}>
          {statusCfg.label}
        </div>
      </div>

      {!paymentId && <div className="pr-missing-warning"><div className="pr-error">Payment information is missing. Please go back and try again.</div></div>}

      <div className="pr-layout">
        <div className="pr-left">
          <div className="pr-card">
            <SectionLabel icon={FaReceipt}>Payment Summary</SectionLabel>
            <div className="pr-ref-box">
              <span className="pr-ref-label">Reference Code</span>
              <span className="pr-ref-code">{referenceCode || "—"}</span>
            </div>
            <div className="pr-detail-list">
              {[["Plan", PLAN_LABELS[plan]||plan||"—"], ["Amount", `LKR ${(amount||0).toLocaleString()}`],
                ["Active for", `${daysAdded||0} days`], ["Listing", listingName],
                ["Expires", newExpireDate ? new Date(newExpireDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"]
              ].map(([k,v]) => (
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
              {[["Bank",bankName],["Account Name",accountName],["Account No.",accountNumber],["Branch",branch],
                ["Amount",`LKR ${(amount||0).toLocaleString()}`],["Remark",referenceCode]
              ].map(([k,v]) => (
                <div key={k} className="pr-detail-row">
                  <span className="pr-detail-key">{k}</span>
                  <span className={`pr-detail-val${k==="Remark"?" pr-detail-val--remark":k==="Amount"?" pr-detail-val--amount":""}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pr-card">
            <SectionLabel icon={FaListAlt}>Verification Process</SectionLabel>
            <div className="pr-steps">
              {[["Upload Receipt","Upload a clear photo or screenshot of your bank transfer confirmation."],
                ["Auto OCR Scan","The system reads the receipt text and extracts amount and reference."],
                ["Instant Matching","If both match exactly, your listing activates immediately."],
                ["Manual Fallback","If auto-verification fails, request manual review within 24 hours."]
              ].map(([title,desc],i,arr) => (
                <div key={i} className="pr-step">
                  <div className="pr-step__track">
                    <div className="pr-step__num">{i+1}</div>
                    {i < arr.length-1 && <div className="pr-step__line" />}
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

        <div className="pr-right">
          <h2 className="pr-heading">Upload Your Receipt</h2>
          <p className="pr-subheading">
            The reference code <strong style={{ color:"#e67e22" }}>{referenceCode}</strong> and amount{" "}
            <strong>LKR {(amount||0).toLocaleString()}</strong> must be clearly visible.
          </p>

          <div
            className={`pr-dropzone${dragOver?" pr-dropzone--drag":""}${file?" pr-dropzone--filled":""}${ocrResult?" pr-dropzone--locked":""}`}
            onClick={() => { if (!ocrResult) inputRef.current?.click(); }}
            onDragOver={e => { if (!ocrResult) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { if (!ocrResult) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); } }}
          >
            <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
            {preview ? (
              <div style={{ textAlign:"center" }}>
                <img src={preview} alt="Receipt preview" className="pr-preview-img" />
                <div className="pr-preview-name"><FaCheckCircle /> {file.name}</div>
                {!ocrResult && <div className="pr-preview-change">Click to change image</div>}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"8px 0" }}>
                <div className="pr-dropzone__icon-wrap"><FaCloudUploadAlt size={26} color="#e67e22" /></div>
                <div className="pr-dropzone__title">Drop your receipt here</div>
                <div className="pr-dropzone__sub">or click to browse — JPG, PNG, WEBP supported</div>
              </div>
            )}
          </div>

          {!ocrResult && (
            <div className="pr-tips">
              <div className="pr-tips__title">Receipt Requirements</div>
              <div className="pr-tips__grid">
                {[`Reference code ${referenceCode} must be visible`,
                  `Amount LKR ${(amount||0).toLocaleString()} must be readable`,
                  "Use good lighting, avoid shadows on text",
                  "Full receipt in frame — not cropped"
                ].map((t,i) => (
                  <div key={i} className="pr-tips__item">
                    <div className="pr-tips__dot"><FaCheckCircle size={8} /></div>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ocrStep > 0 && (
            <div className="pr-ocr-box">
              <div className="pr-ocr-box__header">
                <FaSpinner className="pr-spin" style={{ color:"#e67e22" }} />
                <span className="pr-ocr-box__title">Scanning receipt...</span>
              </div>
              <div className="pr-ocr-steps">
                {[1,2,3,4,5].map(step => <OcrStep key={step} step={step} current={ocrStep} />)}
              </div>
            </div>
          )}

          {ocrResult && !ocrRunning && (
            <div className={`pr-result-card${allMatched?" pr-result-card--success":""}`}>
              <div className="pr-result-header">
                {allMatched
                  ? <FaCheckCircle size={20} color="#1e8449" style={{ flexShrink:0 }} />
                  : <FaExclamationTriangle size={20} color="#e67e22" style={{ flexShrink:0 }} />}
                <div>
                  <div className="pr-result-header__title">
                    {allMatched ? "Receipt Verified Successfully" : "Scan Complete — Verification Incomplete"}
                  </div>
                  <div className="pr-result-header__sub">
                    {allMatched
                      ? "Both amount and reference matched. Your listing is now active."
                      : "Your receipt was saved. See all extracted details below."}
                  </div>
                </div>
              </div>

              <div className="pr-fields">
                <ExtractedField
                  label="Amount Extracted"
                  extractedValue={ocrResult.extracted.amount ? `LKR ${Number(ocrResult.extracted.amount).toLocaleString()}` : null}
                  expectedValue={`LKR ${(amount||0).toLocaleString()}`}
                  matched={ocrResult.amountMatched}
                />
                <ExtractedField
                  label="Reference Extracted"
                  extractedValue={ocrResult.extracted.ref || null}
                  expectedValue={referenceCode}
                  matched={ocrResult.refMatched}
                  mono
                />
                <ExtractedField label="Transfer Date" extractedValue={ocrResult.extracted.date || null} matched={null} />
                <ExtractedField
                  label="Bank Detected"
                  extractedValue={ocrResult.extracted.bank
                    ? ocrResult.extracted.bank.charAt(0).toUpperCase() + ocrResult.extracted.bank.slice(1)
                    : null}
                  matched={null}
                />
              </div>

              <div className="pr-chips">
                <span className={`pr-chip${ocrResult.amountMatched?" pr-chip--ok":" pr-chip--fail"}`}>
                  {ocrResult.amountMatched ? "✓" : "✗"} Amount {ocrResult.amountMatched ? "matched" : "mismatch"}
                </span>
                <span className={`pr-chip${ocrResult.refMatched?" pr-chip--ok":" pr-chip--fail"}`}>
                  {ocrResult.refMatched ? "✓" : "✗"} Reference {ocrResult.refMatched ? "matched" : "not found"}
                </span>
              </div>

              {(!ocrResult.amountMatched || !ocrResult.refMatched) && (
                <div className="pr-manual-block">
                  <div className="pr-manual-block__inner">
                    <div className="pr-manual-block__icon"><FaShieldAlt size={14} color="#e67e22" /></div>
                    <div style={{ flex:1 }}>
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

          {error && <div className="pr-error"><FaExclamationTriangle /> {error}</div>}

          {!ocrResult && (
            <button className="pr-btn-primary" disabled={isBusy || !file} onClick={handleUpload}>
              {isBusy ? <><FaSpinner className="pr-spin" /> Processing...</> : <><FaUpload /> Scan and Verify Receipt</>}
            </button>
          )}

          {ocrResult && !allMatched && (
            <button className="pr-btn-ghost pr-btn-wide"
              onClick={() => { setFile(null); setPreview(null); setOcrResult(null); setError(""); }}>
              Upload a Different Image
            </button>
          )}

          {ocrResult && (
            <button className="pr-btn-ghost pr-btn-wide" onClick={() => navigate("/PaymentHistory")}>
              View in Payment History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
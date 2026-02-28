import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaCheckCircle, FaRegCircle, FaArrowLeft,
  FaCreditCard, FaUniversity, FaUpload, FaShieldAlt,
} from "react-icons/fa";

const BASE_URL = "http://localhost:8000";

const PLANS = [
  { key: "1m",  label: "Starter", duration: "1 Month",   amount: 299,  daysAdded: 30,  badge: null,        color: "#6c757d" },
  { key: "3m",  label: "Growth",  duration: "3 Months",  amount: 799,  daysAdded: 90,  badge: null,        color: "#0077b6" },
  { key: "6m",  label: "Pro",     duration: "6 Months",  amount: 1499, daysAdded: 180, badge: "POPULAR",   color: "#e07b00" },
  { key: "12m", label: "Elite",   duration: "12 Months", amount: 2599, daysAdded: 365, badge: "BEST DEAL", color: "#c0392b" },
];

const STEPS = [
  {
    icon: <FaCreditCard />,
    title: "Pick a Plan",
    desc: "Choose how long you want your listing to be active and visible to guests.",
  },
  {
    icon: <FaUniversity />,
    title: "Bank Transfer",
    desc: "Transfer the exact amount to our bank account using your unique reference code as the remark.",
  },
  {
    icon: <FaUpload />,
    title: "Upload Receipt",
    desc: "Upload a photo of your payment receipt. Our system will verify it automatically.",
  },
  {
    icon: <FaShieldAlt />,
    title: "Get Verified",
    desc: "Once verified, your listing goes live immediately and stays active for your chosen period.",
  },
];

export default function Payment() {
  const location = useLocation();
  const navigate  = useNavigate();

  // ── Data passed from HostListings via navigate("/Payment", { state: {...} }) ──
  const {
    listingId,
    type:             listingType,
    listingName       = "Your Listing",
    currentExpireDate = null,
    bankName          = "Commercial Bank",
    accountName       = "Bodima Payments",
    accountNumber     = "8000123456",
    branch            = "Negombo",
  } = location.state || {};

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState("");

  const selectedPlanData = PLANS.find(p => p.key === selectedPlan);

  const handleConfirm = async () => {
    if (!selectedPlan) return setError("Please select a plan to continue.");
    if (!listingId)    return setError("Listing information is missing. Please go back and try again.");
    setError("");
    setLoading(true);
    try {
      const hostId = localStorage.getItem("CurrentUserId");
      if (!hostId) { setLoading(false); return setError("User session not found. Please log in again."); }

      const res = await axios.post(
        `${BASE_URL}/Payment/create`,
        { hostId, listingId, listingType, plan: selectedPlan },
      );
      setResult(res.data.payment);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Success Screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div style={s.page}>
        <div style={s.successWrap}>
          {/* Big tick */}
          <div style={s.successTick}>✓</div>
          <h2 style={s.successTitle}>Payment Record Created!</h2>
          <p style={s.successSub}>
            Transfer the amount below to our bank account using your reference code as the transfer remark.
          </p>

          {/* Reference Code */}
          <div style={s.refCard}>
            <span style={s.refLabel}>YOUR REFERENCE CODE</span>
            <span style={s.refCode}>{result.referenceCode}</span>
            <span style={s.refNote}>Use this as the bank transfer remark / description</span>
          </div>

          {/* Bank Details */}
          <div style={s.bankCard}>
            <h4 style={s.bankTitle}>Transfer To</h4>
            <div style={s.bankGrid}>
              <div style={s.bankRow}><span style={s.bankKey}>Bank</span><span style={s.bankVal}>{bankName}</span></div>
              <div style={s.bankRow}><span style={s.bankKey}>Account Name</span><span style={s.bankVal}>{accountName}</span></div>
              <div style={s.bankRow}><span style={s.bankKey}>Account No.</span><span style={s.bankVal}>{accountNumber}</span></div>
              <div style={s.bankRow}><span style={s.bankKey}>Branch</span><span style={s.bankVal}>{branch}</span></div>
              <div style={s.bankRow}>
                <span style={s.bankKey}>Amount</span>
                <span style={{ ...s.bankVal, color: "#e07b00", fontWeight: 800 }}>
                  LKR {result.amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={s.summarySuccess}>
            <div style={s.summarySuccessRow}>
              <span style={s.bankKey}>Plan</span>
              <span style={s.bankVal}>{PLANS.find(p => p.key === result.plan)?.label} · {PLANS.find(p => p.key === result.plan)?.duration}</span>
            </div>
            <div style={s.summarySuccessRow}>
              <span style={s.bankKey}>Active Days</span>
              <span style={s.bankVal}>{result.daysAdded} days</span>
            </div>
            <div style={s.summarySuccessRow}>
              <span style={s.bankKey}>Listing Expires</span>
              <span style={s.bankVal}>
                {new Date(result.newExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Next step hint */}
          <div style={s.nextStepBox}>
            <span style={s.nextStepIcon}>ⓘ</span>
            <span>
              After transferring, go to <strong>My Payments</strong> and upload your receipt to complete verification.
            </span>
          </div>

          <div style={s.successActions}>
            <button
              style={s.btnPrimary}
              onClick={() => navigate("/PaymentReceipt", {
                state: {
                  paymentId:     result._id,
                  referenceCode: result.referenceCode,
                  amount:        result.amount,
                  plan:          result.plan,
                  daysAdded:     result.daysAdded,
                  newExpireDate: result.newExpireDate,
                  listingName,
                  bankName,
                  accountName,
                  accountNumber,
                  branch,
                }
              })}
            >
              Upload Receipt Now →
            </button>
            <button style={s.btnGhost} onClick={() => navigate("/Listings")}>
              Do It Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Plan Selection Page ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Back + Breadcrumb */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <FaArrowLeft style={{ marginRight: 6 }} /> Back to Listings
        </button>
      </div>

      <div style={s.layout}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div style={s.leftCol}>

          {/* Listing Context Banner */}
          <div style={s.contextBanner}>
            <div style={s.contextEmoji}>{listingType === "food" ? "🍽️" : "🏠"}</div>
            <div>
              <div style={s.contextLabel}>Publishing listing</div>
              <div style={s.contextName}>{listingName}</div>
              {currentExpireDate && (
                <div style={s.contextExpire}>
                  Currently expires:{" "}
                  <strong>
                    {new Date(currentExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div style={s.howSection}>
            <h3 style={s.howTitle}>How it works</h3>
            <div style={s.stepsList}>
              {STEPS.map((step, i) => (
                <div key={i} style={s.stepRow}>
                  <div style={s.stepLeft}>
                    <div style={s.stepIconWrap}>{step.icon}</div>
                    {i < STEPS.length - 1 && <div style={s.stepLine} />}
                  </div>
                  <div style={s.stepContent}>
                    <div style={s.stepNum}>Step {i + 1}</div>
                    <div style={s.stepTitle}>{step.title}</div>
                    <div style={s.stepDesc}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Info Preview */}
          <div style={s.bankPreview}>
            <div style={s.bankPreviewTitle}><FaUniversity style={{ marginRight: 8 }} />Payment goes to</div>
            <div style={s.bankPreviewRow}><span style={s.bankKey}>Bank</span><span style={s.bankVal}>{bankName}</span></div>
            <div style={s.bankPreviewRow}><span style={s.bankKey}>Account</span><span style={s.bankVal}>{accountName}</span></div>
            <div style={s.bankPreviewRow}><span style={s.bankKey}>No.</span><span style={s.bankVal}>{accountNumber}</span></div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div style={s.rightCol}>
          <h2 style={s.planHeading}>Select a Plan</h2>
          <p style={s.planSub}>
            Choose how long you want your{" "}
            <strong>{listingType === "food" ? "food service" : "accommodation"}</strong> to stay published.
          </p>

          {/* Plan Cards */}
          <div style={s.planGrid}>
            {PLANS.map(plan => {
              const isSelected = selectedPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  style={{
                    ...s.planCard,
                    borderColor:     isSelected ? plan.color : "#e8e8e8",
                    boxShadow:       isSelected ? `0 0 0 2px ${plan.color}22` : "none",
                    background:      isSelected ? `${plan.color}08` : "#fff",
                  }}
                  onClick={() => setSelectedPlan(plan.key)}
                >
                  {plan.badge && (
                    <div style={{ ...s.planBadge, background: plan.color }}>
                      {plan.badge}
                    </div>
                  )}

                  <div style={s.planTop}>
                    <div>
                      <div style={{ ...s.planLabel, color: plan.color }}>{plan.label}</div>
                      <div style={s.planDur}>{plan.duration}</div>
                    </div>
                    <div style={s.planRadio}>
                      {isSelected
                        ? <FaCheckCircle style={{ color: plan.color, fontSize: 20 }} />
                        : <FaRegCircle style={{ color: "#ccc", fontSize: 20 }} />
                      }
                    </div>
                  </div>

                  <div style={s.planPriceRow}>
                    <span style={s.planCur}>LKR</span>
                    <span style={{ ...s.planAmt, color: isSelected ? plan.color : "#1a1a1a" }}>
                      {plan.amount.toLocaleString()}
                    </span>
                  </div>

                  <div style={s.planMeta}>
                    <span style={s.planPerDay}>≈ LKR {Math.round(plan.amount / plan.daysAdded)}/day</span>
                    <span style={s.planDays}>✓ {plan.daysAdded} days</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {selectedPlanData && (
            <div style={s.summaryBar}>
              <div style={s.summaryItem}>
                <span style={s.summaryKey}>Plan</span>
                <span style={s.summaryVal}>{selectedPlanData.label} · {selectedPlanData.duration}</span>
              </div>
              <div style={s.summaryDivider} />
              <div style={s.summaryItem}>
                <span style={s.summaryKey}>Amount</span>
                <span style={{ ...s.summaryVal, color: "#e07b00", fontWeight: 800, fontSize: 18 }}>
                  LKR {selectedPlanData.amount.toLocaleString()}
                </span>
              </div>
              <div style={s.summaryDivider} />
              <div style={s.summaryItem}>
                <span style={s.summaryKey}>Active For</span>
                <span style={s.summaryVal}>{selectedPlanData.daysAdded} days</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={s.errorBox}>⚠ {error}</div>
          )}

          {/* CTA */}
          <button
            style={{
              ...s.btnConfirm,
              opacity:       loading || !selectedPlan ? 0.45 : 1,
              cursor:        loading || !selectedPlan ? "not-allowed" : "pointer",
              background:    selectedPlanData ? selectedPlanData.color : "#e07b00",
            }}
            disabled={loading || !selectedPlan}
            onClick={handleConfirm}
          >
            {loading ? "Creating..." : "Confirm Plan & Get Reference Code →"}
          </button>

          <p style={s.footNote}>
            No online payment required. You'll get a reference code to use for your bank transfer.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#f7f5f2",
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    paddingBottom: 80,
  },

  // Top bar
  topBar: {
    padding: "20px 40px",
    borderBottom: "1px solid #eee",
    background: "#fff",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    padding: 0,
    fontFamily: "inherit",
  },

  // Two-column layout
  layout: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "40px 24px",
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 40,
    alignItems: "start",
  },

  // ── LEFT ──
  leftCol: { display: "flex", flexDirection: "column", gap: 20 },

  contextBanner: {
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 14,
    padding: "20px 22px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  contextEmoji: { fontSize: 36, lineHeight: 1 },
  contextLabel: { fontSize: 11, color: "#999", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  contextName:  { fontSize: 17, fontWeight: 700, color: "#1a1a1a" },
  contextExpire:{ fontSize: 12, color: "#888", marginTop: 4 },

  howSection: {
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 14,
    padding: "24px 22px",
  },
  howTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: 20,
    margin: "0 0 20px",
  },
  stepsList: { display: "flex", flexDirection: "column" },
  stepRow: { display: "flex", gap: 16, marginBottom: 4 },
  stepLeft: { display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 },
  stepIconWrap: {
    width: 36, height: 36,
    borderRadius: "50%",
    background: "#f0f4ff",
    color: "#3b5bdb",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, flexShrink: 0,
  },
  stepLine: { width: 2, flex: 1, background: "#eee", margin: "4px 0", minHeight: 18 },
  stepContent: { paddingBottom: 20 },
  stepNum: { fontSize: 10, color: "#aaa", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  stepTitle: { fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 3 },
  stepDesc: { fontSize: 12, color: "#777", lineHeight: 1.6 },

  bankPreview: {
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 14,
    padding: "20px 22px",
  },
  bankPreviewTitle: {
    display: "flex", alignItems: "center",
    fontSize: 13, fontWeight: 700, color: "#444",
    marginBottom: 14,
  },
  bankPreviewRow: {
    display: "flex", justifyContent: "space-between",
    padding: "7px 0",
    borderBottom: "1px solid #f2f2f2",
    fontSize: 13,
  },

  // ── RIGHT ──
  rightCol: { display: "flex", flexDirection: "column" },

  planHeading: {
    fontSize: 26,
    fontWeight: 800,
    color: "#1a1a1a",
    margin: "0 0 6px",
    letterSpacing: -0.5,
  },
  planSub: {
    fontSize: 14,
    color: "#777",
    marginBottom: 24,
    lineHeight: 1.5,
  },

  planGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 14,
    marginBottom: 24,
  },
  planCard: {
    border: "1.5px solid #e8e8e8",
    borderRadius: 14,
    padding: "18px 16px",
    cursor: "pointer",
    transition: "all 0.18s",
    position: "relative",
    overflow: "hidden",
    background: "#fff",
  },
  planBadge: {
    position: "absolute", top: 12, right: 12,
    color: "#fff",
    fontSize: 9, fontWeight: 800, letterSpacing: 1,
    padding: "3px 8px", borderRadius: 4,
  },
  planTop: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 14,
  },
  planLabel: { fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 },
  planDur:   { fontSize: 16, fontWeight: 700, color: "#1a1a1a" },
  planRadio: { flexShrink: 0 },
  planPriceRow: { display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 6 },
  planCur: { fontSize: 12, color: "#888", fontWeight: 600, paddingBottom: 3 },
  planAmt: { fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: -1 },
  planMeta: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  planPerDay: { fontSize: 11, color: "#aaa" },
  planDays:   { fontSize: 11, color: "#888", fontWeight: 600 },

  // Summary bar
  summaryBar: {
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 12,
    padding: "16px 22px",
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  summaryItem: { display: "flex", flexDirection: "column", gap: 3 },
  summaryDivider: { width: 1, height: 32, background: "#eee" },
  summaryKey: { fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryVal: { fontSize: 15, fontWeight: 700, color: "#1a1a1a" },

  // Error
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fcc",
    color: "#c0392b",
    borderRadius: 8,
    padding: "11px 14px",
    fontSize: 13,
    marginBottom: 14,
  },

  // Buttons
  btnConfirm: {
    width: "100%",
    padding: "16px 24px",
    background: "#e07b00",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.2s",
    letterSpacing: 0.2,
  },

  footNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#aaa",
    marginTop: 12,
    lineHeight: 1.6,
  },

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  successWrap: {
    maxWidth: 560,
    margin: "60px auto",
    background: "#fff",
    border: "1px solid #e8e8e8",
    borderRadius: 20,
    padding: "48px 44px",
  },
  successTick: {
    width: 64, height: 64,
    background: "#e8f8ee",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 28, color: "#27ae60",
    margin: "0 auto 20px",
    fontWeight: 700,
  },
  successTitle: {
    fontSize: 26, fontWeight: 800, textAlign: "center",
    color: "#1a1a1a", margin: "0 0 8px",
  },
  successSub: {
    fontSize: 14, color: "#777", textAlign: "center",
    lineHeight: 1.6, margin: "0 0 28px",
  },

  refCard: {
    background: "#fffbf0",
    border: "2px dashed #e07b00",
    borderRadius: 14,
    padding: "20px 24px",
    textAlign: "center",
    marginBottom: 20,
    display: "flex", flexDirection: "column", gap: 6,
  },
  refLabel: { fontSize: 10, letterSpacing: 3, color: "#aaa", fontWeight: 700 },
  refCode: {
    fontSize: 38, fontWeight: 900,
    color: "#e07b00", letterSpacing: 4,
    fontFamily: "'Courier New', monospace",
  },
  refNote: { fontSize: 12, color: "#bbb" },

  bankCard: {
    background: "#f9f9f9",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: "18px 20px",
    marginBottom: 16,
  },
  bankTitle: {
    fontSize: 13, fontWeight: 700, color: "#555",
    margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8,
  },
  bankGrid: { display: "flex", flexDirection: "column", gap: 0 },
  bankRow: {
    display: "flex", justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f0f0f0",
    fontSize: 13,
  },
  bankKey: { color: "#aaa", fontSize: 12 },
  bankVal: { color: "#1a1a1a", fontWeight: 600, fontSize: 13 },

  summarySuccess: {
    border: "1px solid #eee",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  summarySuccessRow: {
    display: "flex", justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "1px solid #f5f5f5",
    fontSize: 13,
  },

  nextStepBox: {
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "#f0f4ff",
    border: "1px solid #d0dbff",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13, color: "#3b5bdb",
    lineHeight: 1.6, marginBottom: 24,
  },
  nextStepIcon: { fontSize: 16, flexShrink: 0, marginTop: 1 },

  successActions: { display: "flex", gap: 12 },
  btnPrimary: {
    flex: 1, padding: "13px",
    background: "#1a1a1a", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  },
  btnGhost: {
    flex: 1, padding: "13px",
    background: "transparent", color: "#555",
    border: "1.5px solid #ddd", borderRadius: 10,
    fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
};
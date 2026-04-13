import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaCheckCircle,
  FaRegCircle,
  FaArrowLeft,
  FaCreditCard,
  FaUniversity,
  FaUpload,
  FaShieldAlt,
  FaUtensils,
  FaHome,
  FaSpinner,
} from "react-icons/fa";
import "./Payment.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${BASE_URL}/Notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

const PLANS = [
  { key: "1m",  label: "Starter", duration: "1 Month",   amount: 299,  daysAdded: 30,  badge: null,        color: "#00b345" },
  { key: "3m",  label: "Growth",  duration: "3 Months",  amount: 799,  daysAdded: 90,  badge: null,        color: "#0077b6" },
  { key: "6m",  label: "Pro",     duration: "6 Months",  amount: 1499, daysAdded: 180, badge: "POPULAR",   color: "#e07b00" },
  { key: "12m", label: "Elite",   duration: "12 Months", amount: 2599, daysAdded: 365, badge: "BEST DEAL", color: "#c0392b" },
];

const STEPS = [
  { icon: <FaCreditCard />, title: "Pick a Plan",    desc: "Choose how long you want your listing to be active and visible to guests." },
  { icon: <FaUniversity />, title: "Bank Transfer",  desc: "Transfer the exact amount to our bank account using your unique reference code as the remark." },
  { icon: <FaUpload />,     title: "Upload Receipt", desc: "Upload a photo of your payment receipt. Our system will verify it automatically." },
  { icon: <FaShieldAlt />,  title: "Get Verified",   desc: "Once verified, your listing goes live immediately and stays active for your chosen period." },
];

// ── Listing Icon — fetches from API, falls back to icon ──────────────────────
function ListingIcon({ listingId, listingType, size = 44 }) {
  const [src,     setSrc]     = useState(null);
  const [failed,  setFailed]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId || !listingType) { setLoading(false); return; }
    const endpoint = listingType === "food"
      ? `${BASE_URL}/FoodService/${listingId}`
      : `${BASE_URL}/Accommodation/${listingId}`;
    fetch(endpoint)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        const doc    = raw?.data ?? raw?.result ?? raw;
        const iconId = doc?.iconImage ?? doc?.images?.[0] ?? null;
        if (iconId) setSrc(`${BASE_URL}/Photo/${String(iconId)}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId, listingType]);

  const boxStyle = {
    width: size, height: size,
    borderRadius: 10,
    overflow: "hidden",
    background: "#f3f4f6",
    border: "1px solid #e8e8e8",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  if (loading) return (
    <div style={boxStyle}>
      <FaSpinner style={{ fontSize: size * 0.38, color: "#ccc", animation: "pmSpin 0.8s linear infinite" }} />
    </div>
  );

  if (src && !failed) return (
    <div style={boxStyle}>
      <img
        src={src} alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setFailed(true)}
      />
    </div>
  );

  return (
    <div style={{ ...boxStyle, background: listingType === "food" ? "#fff7ed" : "#eff6ff" }}>
      {listingType === "food"
        ? <FaUtensils style={{ fontSize: size * 0.44, color: "#e07b00" }} />
        : <FaHome     style={{ fontSize: size * 0.44, color: "#0077b6" }} />}
    </div>
  );
}

export default function Payment() {
  const location = useNavigate ? useLocation() : {};
  const navigate = useNavigate();

  const {
    listingId,
    type: listingType,
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
      const res = await axios.post(`${BASE_URL}/Payment/create`, { hostId, listingId, listingType, plan: selectedPlan });
      setResult(res.data.payment);
      if (hostId) {
        sendNotification({
          recipient: hostId,
          type: "payment_verified",
          title: "Payment Record Created",
          message: `Your payment record for ${listingName} has been created. Please complete the bank transfer and upload your receipt.`,
          link: "/PaymentHistory",
          refId: res.data.payment._id,
          refType: "Payment",
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Success Screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="pm-page">
        <div className="pm-success-wrap">
          <div className="pm-success-tick">✓</div>
          <h2 className="pm-success-title">Payment Record Created!</h2>
          <p className="pm-success-sub">
            Transfer the amount below to our bank account using your reference code as the transfer remark.
          </p>

          {/* Reference Code */}
          <div className="pm-ref-card">
            <span className="pm-ref-label">YOUR REFERENCE CODE</span>
            <span className="pm-ref-code">{result.referenceCode}</span>
            <span className="pm-ref-note">Use this as the bank transfer remark / description</span>
          </div>

          {/* Bank Details */}
          <div className="pm-bank-card">
            <h4 className="pm-bank-title"><FaUniversity /> Transfer To</h4>
            <div className="pm-bank-grid">
              {[
                { k: "Bank",         v: bankName                                },
                { k: "Account Name", v: accountName                             },
                { k: "Account No.",  v: accountNumber                           },
                { k: "Branch",       v: branch                                  },
                { k: "Amount",       v: `LKR ${result.amount.toLocaleString()}`, highlight: true },
              ].map(({ k, v, highlight }) => (
                <div key={k} className="pm-bank-row">
                  <span className="pm-bank-key">{k}</span>
                  <span className={`pm-bank-val${highlight ? " pm-bank-val--highlight" : ""}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="pm-summary-success">
            <div className="pm-summary-success-row">
              <span className="pm-bank-key">Plan</span>
              <span className="pm-bank-val">
                {PLANS.find(p => p.key === result.plan)?.label} · {PLANS.find(p => p.key === result.plan)?.duration}
              </span>
            </div>
            <div className="pm-summary-success-row">
              <span className="pm-bank-key">Active Days</span>
              <span className="pm-bank-val">{result.daysAdded} days</span>
            </div>
            <div className="pm-summary-success-row">
              <span className="pm-bank-key">Listing Expires</span>
              <span className="pm-bank-val">
                {new Date(result.newExpireDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Next step hint */}
          <div className="pm-next-step-box">
            <span className="pm-next-step-icon">ⓘ</span>
            <span>After transferring, go to <strong>My Payments</strong> and upload your receipt to complete verification.</span>
          </div>

          <div className="pm-success-actions">
            <button
              className="pm-btn-primary"
              onClick={() => navigate("/PaymentReceipt", {
                state: {
                  paymentId: result._id, referenceCode: result.referenceCode,
                  amount: result.amount, plan: result.plan, daysAdded: result.daysAdded,
                  newExpireDate: result.newExpireDate, listingName, bankName, accountName, accountNumber, branch,
                },
              })}
            >
              Upload Receipt Now →
            </button>
            <button className="pm-btn-ghost" onClick={() => navigate("/Listings")}>
              Do It Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Plan Selection Page ─────────────────────────────────────────────────────
  return (
    <div className="pm-page">
      {/* Top bar */}
      <div className="pm-top-bar">
        <button className="pm-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back to Listings
        </button>
      </div>

      <div className="pm-layout">

        {/* ── LEFT COLUMN ── */}
        <div className="pm-left-col">

          {/* Listing Context Banner */}
          <div className="pm-context-banner">
            <ListingIcon listingId={listingId} listingType={listingType} size={48} />
            <div className="pm-context-info">
              <div className="pm-context-label">Publishing listing</div>
              <div className="pm-context-name">{listingName}</div>
              {currentExpireDate && (
                <div className="pm-context-expire">
                  Currently expires:{" "}
                  <strong>
                    {new Date(currentExpireDate).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="pm-how-section">
            <h3 className="pm-how-title">How it works</h3>
            <div className="pm-steps-list">
              {STEPS.map((step, i) => (
                <div key={i} className="pm-step-row">
                  <div className="pm-step-left">
                    <div className="pm-step-icon-wrap">{step.icon}</div>
                    {i < STEPS.length - 1 && <div className="pm-step-line" />}
                  </div>
                  <div className="pm-step-content">
                    <div className="pm-step-num">Step {i + 1}</div>
                    <div className="pm-step-title">{step.title}</div>
                    <div className="pm-step-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Info Preview */}
          <div className="pm-bank-preview">
            <div className="pm-bank-preview-title">
              <FaUniversity /> Payment goes to
            </div>
            {[
              { k: "Bank",    v: bankName     },
              { k: "Account", v: accountName  },
              { k: "No.",     v: accountNumber },
            ].map(({ k, v }) => (
              <div key={k} className="pm-bank-preview-row">
                <span className="pm-bank-key">{k}</span>
                <span className="pm-bank-val">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="pm-right-col">
          <h2 className="pm-plan-heading">Select a Plan</h2>
          <p className="pm-plan-sub">
            Choose how long you want your{" "}
            <strong>{listingType === "food" ? "food service" : "accommodation"}</strong>{" "}
            to stay published.
          </p>

          {/* Plan Cards */}
          <div className="pm-plan-grid">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.key;
              return (
                <div
                  key={plan.key}
                  className={`pm-plan-card${isSelected ? " pm-plan-card--selected" : ""}`}
                  style={{
                    borderColor: isSelected ? plan.color : "#e8e8e8",
                    boxShadow:   isSelected ? `0 0 0 2px ${plan.color}22` : "none",
                    background:  isSelected ? `${plan.color}08` : "#fff",
                  }}
                  onClick={() => setSelectedPlan(plan.key)}
                >
                  {plan.badge && (
                    <div className="pm-plan-badge" style={{ background: plan.color }}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="pm-plan-top">
                    <div>
                      <div className="pm-plan-label" style={{ color: plan.color }}>{plan.label}</div>
                      <div className="pm-plan-dur">{plan.duration}</div>
                    </div>
                    <div className="pm-plan-radio">
                      {isSelected
                        ? <FaCheckCircle style={{ color: plan.color, fontSize: 20 }} />
                        : <FaRegCircle   style={{ color: "#ccc",      fontSize: 20 }} />}
                    </div>
                  </div>
                  <div className="pm-plan-price-row">
                    <span className="pm-plan-cur">LKR</span>
                    <span className="pm-plan-amt" style={{ color: isSelected ? plan.color : "#1a1a1a" }}>
                      {plan.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="pm-plan-meta">
                    <span className="pm-plan-per-day">≈ LKR {Math.round(plan.amount / plan.daysAdded)}/day</span>
                    <span className="pm-plan-days">✓ {plan.daysAdded} days</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && <div className="pm-error-box">⚠ {error}</div>}

          {/* CTA */}
          <button
            className="pm-btn-confirm"
            style={{
              opacity:    loading || !selectedPlan ? 0.45 : 1,
              cursor:     loading || !selectedPlan ? "not-allowed" : "pointer",
              background: selectedPlanData ? selectedPlanData.color : "#e07b00",
            }}
            disabled={loading || !selectedPlan}
            onClick={handleConfirm}
          >
            {loading ? <><FaSpinner className="pm-spin" /> Creating…</> : "Confirm Plan & Get Reference Code →"}
          </button>

          <p className="pm-foot-note">
            No online payment required. You'll get a reference code to use for your bank transfer.
          </p>
        </div>
      </div>
    </div>
  );
}
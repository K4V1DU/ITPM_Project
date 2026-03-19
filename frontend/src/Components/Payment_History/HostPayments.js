import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaReceipt, FaCheckCircle, FaTimesCircle, FaClock,
  FaExclamationTriangle, FaSearch, FaSyncAlt, FaBoxOpen,
  FaMotorcycle, FaHome, FaCalendarAlt, FaTag, FaCoins,
  FaFileUpload, FaBan,
  FaSpinner, FaInfoCircle,
} from "react-icons/fa";
import "./HostPayments.css";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";

const API_BASE    = "http://localhost:8000";
const PAYMENT_API = `${API_BASE}/Payment`;
const FONT        = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const ORANGE      = "#FF6B2B";

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS = {
  created:          { bg: "#fff7ed", text: "#c2410c", dot: ORANGE,    border: "#fcd9c4", label: "Awaiting Payment",  icon: <FaClock /> },
  pending:          { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Verification Failed", icon: <FaTimesCircle /> },
  verified:         { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", border: "#bbf7d0", label: "Verified",          icon: <FaCheckCircle /> },
  manual_requested: { bg: "#f0f9ff", text: "#0369a1", dot: "#0ea5e9", border: "#bae6fd", label: "Manual Review",     icon: <FaInfoCircle /> },
};

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.created;
  return (
    <span className="hp-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className="hp-badge__dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="hp-skeleton-row">
      <div className="hp-skeleton hp-skeleton--icon" />
      <div style={{ flex: 1 }}>
        <div className="hp-skeleton hp-skeleton--line" style={{ width: "45%", marginBottom: 8 }} />
        <div className="hp-skeleton hp-skeleton--line" style={{ width: "70%" }} />
      </div>
      <div className="hp-skeleton hp-skeleton--line" style={{ width: 80 }} />
    </div>
  );
}

// ── Payment Row ────────────────────────────────────────────────────────────
function PaymentRow({ payment, selected, onClick }) {
  const s = STATUS[payment.status] ?? STATUS.created;
  const isFood = payment.listingType === "food";
  return (
    <div
      className={`hp-row${selected ? " hp-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      <div className="hp-row__icon">
        {isFood ? <FaMotorcycle /> : <FaHome />}
      </div>
      <div className="hp-row__body">
        <div className="hp-row__top">
          <span className="hp-row__ref">{payment.referenceCode}</span>
          <StatusBadge status={payment.status} />
        </div>
        <div className="hp-row__meta">
          <span className="hp-row__amount">LKR {payment.amount?.toLocaleString()}</span>
          <span className="hp-sep">·</span>
          <span className="hp-row__plan">{payment.plan?.toUpperCase()}</span>
          <span className="hp-sep">·</span>
          <span className="hp-row__time"><FaClock style={{ fontSize: 9 }} /> {timeAgo(payment.createdAt)}</span>
        </div>
        <div className="hp-row__type">
          {isFood ? <><FaMotorcycle style={{ fontSize: 10 }} /> Food Service</> : <><FaHome style={{ fontSize: 10 }} /> Accommodation</>}
        </div>
      </div>
    </div>
  );
}


// ── Payment Detail ─────────────────────────────────────────────────────────
function PaymentDetail({ payment, onCancel, onUpload }) {
  if (!payment) {
    return (
      <div className="hp-detail hp-detail--empty">
        <FaReceipt className="hp-detail__empty-icon" />
        <p className="hp-detail__empty-text">Select a payment to view details</p>
      </div>
    );
  }

  const isFood    = payment.listingType === "food";
  const canCancel = payment.status === "created";
  const canUpload = !["verified"].includes(payment.status);

  const PLAN_LABELS = { "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "12m": "12 Months" };

  return (
    <div className="hp-detail">

      {/* Payment ID strip */}
      <div className="hp-detail__id-strip">
        <span className="hp-detail__id-text">Ref&nbsp;&nbsp;{payment.referenceCode}</span>
      </div>

      {/* Header */}
      <div className="hp-detail__header">
        <div className="hp-detail__header-row">
          <div className="hp-detail__listing">
            <div className="hp-detail__listing-icon">
              {isFood ? <FaMotorcycle style={{ fontSize: 18, color: ORANGE }} /> : <FaHome style={{ fontSize: 18, color: "#0369a1" }} />}
            </div>
            <div className="hp-detail__listing-info">
              <div className="hp-detail__listing-type">{isFood ? "Food Service" : "Accommodation"}</div>
              <div className="hp-detail__listing-id">{payment.listing ?? "—"}</div>
            </div>
          </div>
          <StatusBadge status={payment.status} />
        </div>

        <div className="hp-detail__header-divider" />

        <div className="hp-detail__header-meta">
          <span className="hp-meta__item"><FaClock style={{ fontSize: 10 }} /> {timeAgo(payment.createdAt)}</span>
          <span className="hp-sep">·</span>
          <span className="hp-meta__item"><FaTag style={{ fontSize: 10 }} /> {PLAN_LABELS[payment.plan] ?? payment.plan}</span>
          <span className="hp-sep">·</span>
          <span className="hp-meta__item"><FaCoins style={{ fontSize: 10 }} /> LKR {payment.amount?.toLocaleString()}</span>
        </div>
      </div>

      {/* Detail body */}
      <div className="hp-detail__body">

        {/* Payment info grid */}
        <div className="hp-detail__section">
          <div className="hp-detail__section-label">Payment Details</div>
          <div className="hp-detail__info-grid">
            {[
              { label: "Reference Code",  value: payment.referenceCode,                         mono: true  },
              { label: "Plan",            value: PLAN_LABELS[payment.plan] ?? payment.plan                  },
              { label: "Amount",          value: `LKR ${payment.amount?.toLocaleString()}`                  },
              { label: "Days Added",      value: `${payment.daysAdded} days`                               },
              { label: "Created",         value: formatDate(payment.createdAt)                              },
              { label: "New Expiry",      value: formatDate(payment.newExpireDate),              highlight: true },
            ].map(({ label, value, mono, highlight }) => (
              <div key={label} className="hp-info-row">
                <span className="hp-info-row__label">{label}</span>
                <span className={`hp-info-row__value${mono ? " hp-info-row__value--mono" : ""}${highlight ? " hp-info-row__value--highlight" : ""}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Receipt uploaded indicator + verification results ── */}
        {payment.receiptUploadedAt && (
          <div className="hp-detail__section">
            <div className="hp-detail__section-label">Receipt</div>
            <div className="hp-receipt-uploaded-row">
              <div className="hp-receipt-uploaded-icon">
                <FaFileUpload style={{ fontSize: 13, color: "#0369a1" }} />
              </div>
              <div>
                <div className="hp-receipt-uploaded-label">Receipt uploaded</div>
                <div className="hp-receipt-uploaded-date">{formatDate(payment.receiptUploadedAt)}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                {payment.amountMatched && payment.refMatched
                  ? <span className="hp-receipt-match hp-receipt-match--ok"><FaCheckCircle style={{ fontSize: 10 }} /> Auto-verified</span>
                  : <span className="hp-receipt-match hp-receipt-match--fail"><FaTimesCircle style={{ fontSize: 10 }} /> Needs review</span>}
              </div>
            </div>

            {(payment.extractedAmount !== undefined && payment.extractedAmount !== null) && (
              <div className="hp-detail__verify-grid" style={{ marginTop: 12 }}>
                <div className={`hp-verify-item${payment.amountMatched ? " hp-verify-item--ok" : " hp-verify-item--fail"}`}>
                  {payment.amountMatched ? <FaCheckCircle /> : <FaTimesCircle />}
                  <div>
                    <div className="hp-verify-item__label">Amount Read</div>
                    <div className="hp-verify-item__value">LKR {Number(payment.extractedAmount)?.toLocaleString()}</div>
                  </div>
                </div>
                <div className={`hp-verify-item${payment.refMatched ? " hp-verify-item--ok" : " hp-verify-item--fail"}`}>
                  {payment.refMatched ? <FaCheckCircle /> : <FaTimesCircle />}
                  <div>
                    <div className="hp-verify-item__label">Reference Read</div>
                    <div className="hp-verify-item__value">{payment.extractedRef || "Not detected"}</div>
                  </div>
                </div>
                {payment.extractedBank && (
                  <div className="hp-verify-item hp-verify-item--neutral">
                    <FaInfoCircle />
                    <div>
                      <div className="hp-verify-item__label">Bank</div>
                      <div className="hp-verify-item__value" style={{ textTransform: "capitalize" }}>{payment.extractedBank}</div>
                    </div>
                  </div>
                )}
                {payment.extractedDate && (
                  <div className="hp-verify-item hp-verify-item--neutral">
                    <FaCalendarAlt />
                    <div>
                      <div className="hp-verify-item__label">Transfer Date</div>
                      <div className="hp-verify-item__value">{payment.extractedDate}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {(canCancel || canUpload) && (
          <div className="hp-detail__section hp-detail__section--actions">
            <div className="hp-detail__section-label">Actions</div>
            <div className="hp-detail__action-btns">
              {canUpload && (
                <button className="hp-action-btn hp-action-btn--primary" onClick={() => onUpload(payment)}>
                  <FaFileUpload style={{ fontSize: 12 }} /> Upload Receipt
                </button>
              )}

              {canCancel && (
                <button className="hp-action-btn hp-action-btn--danger" onClick={() => onCancel(payment)}>
                  <FaBan style={{ fontSize: 12 }} /> Cancel Payment
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Cancel Modal ───────────────────────────────────────────────────────────
function CancelModal({ payment, onConfirm, onClose, loading }) {
  return (
    <div className="hp-overlay" onClick={!loading ? onClose : undefined}>
      <div className="hp-modal" onClick={e => e.stopPropagation()}>
        <div className="hp-modal__icon hp-modal__icon--danger"><FaBan /></div>
        <h3 className="hp-modal__title">Cancel Payment?</h3>
        <p className="hp-modal__desc">
          This will permanently remove the payment record for <strong>{payment?.referenceCode}</strong>. This cannot be undone.
        </p>
        <div className="hp-modal__btns">
          <button className="hp-modal__btn hp-modal__btn--ghost" onClick={onClose} disabled={loading}>Keep It</button>
          <button className="hp-modal__btn hp-modal__btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><FaSpinner className="hp-spin" /> Cancelling…</> : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function HostPayments() {
  const navigate = useNavigate();
  const hostId   = localStorage.getItem("CurrentUserId");

  const [payments,       setPayments]       = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [lastRefresh,    setLastRefresh]    = useState(Date.now());
  const [toast,          setToast]          = useState({ show: false, msg: "" });

  const [cancelModal,    setCancelModal]    = useState(null);
  const [cancelLoading,  setCancelLoading]  = useState(false);

  const toastRef = useRef(null);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => { if (!hostId) navigate("/Login"); }, []);

  // Fetch payments
  useEffect(() => {
    if (!hostId) return;
    setLoading(true);
    setError(null);
    fetch(`${PAYMENT_API}/my?hostId=${hostId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(raw => {
        const list   = raw?.payments ?? unwrap(raw);
        const arr    = Array.isArray(list) ? list : [];
        const sorted = arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setPayments(sorted);
        setSelectedPayment(prev =>
          prev ? sorted.find(p => p._id === prev._id) ?? sorted[0] : sorted[0]
        );
      })
      .catch(err => {
        if (err === 404) { setPayments([]); return; }
        setError("Failed to load payments. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [hostId, lastRefresh]);

  const handleCancelConfirm = async () => {
    if (!cancelModal) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${PAYMENT_API}/${cancelModal._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      });
      if (!res.ok) throw new Error();
      setPayments(prev => prev.filter(p => p._id !== cancelModal._id));
      setSelectedPayment(prev => prev?._id === cancelModal._id ? null : prev);
      showToast("Payment cancelled.");
      setCancelModal(null);
    } catch {
      showToast("Failed to cancel. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };



  const TABS = ["all", "created", "pending", "verified", "manual_requested"];

  const filteredPayments = payments.filter(p => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || p.referenceCode?.toLowerCase().includes(q)
      || p.plan?.toLowerCase().includes(q)
      || p.listingType?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const TAB_LABELS = {
    all: "All", created: "Awaiting", pending: "Verification Failed",
    verified: "Verified", manual_requested: "Manual Review",
  };

  return (
    <div className="hp-page" style={{ fontFamily: FONT }}>

      <StudentNavbar activeTab="" />

      <div className="hp-wrapper">

        {/* Title bar */}
        <div className="hp-titlebar">
          <div className="hp-titlebar__left">
            <h1 className="hp-titlebar__title">Payment History</h1>
            <span className="hp-titlebar__count">{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
          </div>
          <button className="hp-btn-refresh" onClick={() => setLastRefresh(Date.now())}>
            <FaSyncAlt /> Refresh
          </button>
        </div>

        {/* Status tabs */}
        <div className="hp-tabs">
          {TABS.map(s => (
            <button
              key={s}
              className={`hp-tab${statusFilter === s ? " hp-tab--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {TAB_LABELS[s]}
              <span className="hp-tab__count">
                {s === "all" ? payments.length : payments.filter(p => p.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* Split panel */}
        <div className="hp-split">

          {/* LEFT */}
          <div className="hp-split__left">

            {/* Search */}
            <div className="hp-search-wrap">
              <FaSearch className="hp-search-wrap__icon" />
              <input
                className="hp-search"
                placeholder="Search by reference, plan, type…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="hp-error">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="hp-skeleton-list">
                {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredPayments.length === 0 && (
              <div className="hp-empty">
                <FaBoxOpen className="hp-empty__icon" />
                <div className="hp-empty__title">
                  {searchQuery || statusFilter !== "all" ? "No matching payments" : "No payments yet"}
                </div>
                <div className="hp-empty__sub">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Your payment history will appear here"}
                </div>
                {(searchQuery || statusFilter !== "all") && (
                  <button className="hp-empty__clear"
                    onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* List */}
            {!loading && filteredPayments.map(payment => (
              <PaymentRow
                key={payment._id}
                payment={payment}
                selected={selectedPayment?._id === payment._id}
                onClick={() => setSelectedPayment(payment)}
              />
            ))}
          </div>

          {/* RIGHT */}
          <div className="hp-split__right">
            <PaymentDetail
              payment={selectedPayment}
              onCancel={p => setCancelModal(p)}
              onUpload={p => navigate("/PaymentReceipt", {
            state: {
              paymentId:     p._id,
              referenceCode: p.referenceCode,
              amount:        p.amount,
              plan:          p.plan,
              daysAdded:     p.daysAdded,
              newExpireDate: p.newExpireDate,
              listingName:   p.listingType === "food" ? "Food Service" : "Accommodation",
            },
          })}
            />
          </div>

        </div>
      </div>

      <Footer />

      {/* Toast */}
      <div className={`hp-toast${toast.show ? " hp-toast--visible" : ""}`}>{toast.msg}</div>

      {/* Cancel Modal */}
      {cancelModal && (
        <CancelModal
          payment={cancelModal}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelModal(null)}
          loading={cancelLoading}
        />
      )}


    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaReceipt, FaCheckCircle, FaTimesCircle, FaClock,
  FaExclamationTriangle, FaSearch, FaBoxOpen,
  FaUtensils, FaHome, FaCalendarAlt, FaTag, FaCoins,
  FaFileUpload, FaBan, FaFilter, FaChevronDown, FaArrowLeft,
  FaSpinner, FaInfoCircle,
} from "react-icons/fa";
import "./HostPayments.css";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";

const API_BASE    = process.env.REACT_APP_API_BASE_URL;
const PAYMENT_API = `${API_BASE}/Payment`;
const FONT        = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const ORANGE      = "#FF6B2B";

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${API_BASE}/Notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

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
  created:          { bg: "#fff7ed", text: "#c2410c", dot: ORANGE,    border: "#fcd9c4", label: "Awaiting Payment"    },
  pending:          { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Verification Failed" },
  verified:         { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", border: "#bbf7d0", label: "Verified"            },
  manual_requested: { bg: "#f0f9ff", text: "#0369a1", dot: "#0ea5e9", border: "#bae6fd", label: "Manual Review"       },
  rejected:         { bg: "#fef2f2", text: "#991b1b", dot: "#dc2626", border: "#fecaca", label: "Rejected"            },
};

const FILTER_OPTIONS = [
  { value: "all",              label: "All Payments"        },
  { value: "created",          label: "Awaiting Payment"    },
  { value: "pending",          label: "Verification Failed" },
  { value: "verified",         label: "Verified"            },
  { value: "manual_requested", label: "Manual Review"       },
  { value: "rejected",         label: "Rejected"            },
];

// ── Status Badge ───────────────────────────────────────────────────────────
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
function PaymentRow({ payment, listing, selected, onClick }) {
  const s = STATUS[payment.status] ?? STATUS.created;
  const isFood = payment.listingType === "food";
  return (
    <div
      className={`hp-row${selected ? " hp-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      <div className="hp-row__icon">
        {listing?.iconUrl
          ? <img src={listing.iconUrl} alt="" className="hp-row__icon-img" onError={e => { e.currentTarget.style.display = "none"; }} />
          : isFood ? <FaUtensils /> : <FaHome />}
      </div>
      <div className="hp-row__body">
        <div className="hp-row__top">
          <span className="hp-row__ref">{listing?.name ?? payment.referenceCode}</span>
          <StatusBadge status={payment.status} />
        </div>
        <div className="hp-row__meta">
          <span className="hp-row__amount">LKR {payment.amount?.toLocaleString()}</span>
          <span className="hp-sep">·</span>
          <span className="hp-row__plan">{payment.plan?.toUpperCase()}</span>
          <span className="hp-sep">·</span>
          <span className="hp-row__time"><FaClock style={{ fontSize: 9 }} /> {timeAgo(payment.createdAt)}</span>
        </div>
        <div className="hp-row__ref-sub">
          <span className="hp-row__type">
            {isFood
              ? <><FaUtensils style={{ fontSize: 10 }} /> Food Service</>
              : <><FaHome style={{ fontSize: 10 }} /> Accommodation</>}
          </span>
          <span className="hp-sep">·</span>
          <span className="hp-row__ref-code">{payment.referenceCode}</span>
        </div>
      </div>
    </div>
  );
}

// ── Receipt Section ────────────────────────────────────────────────────────
function ReceiptSection({ payment, receiptImage, onExpand }) {
  const [open, setOpen] = useState(false);
  const prevIdRef = useRef(null);
  if (prevIdRef.current !== payment._id) {
    prevIdRef.current = payment._id;
    if (open) setOpen(false);
  }

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !receiptImage) onExpand(payment._id, payment.receiptUploadedAt);
  };

  const receiptStatusChip = (() => {
    const byStatus = {
      verified: {
        cls: "hp-receipt-match--ok",
        icon: <FaCheckCircle style={{ fontSize: 10 }} />,
        text: "Verified",
      },
      manual_requested: {
        cls: "hp-receipt-match--fail",
        icon: <FaExclamationTriangle style={{ fontSize: 10 }} />,
        text: "Manual Review",
      },
      rejected: {
        cls: "hp-receipt-match--fail",
        icon: <FaTimesCircle style={{ fontSize: 10 }} />,
        text: "Rejected",
      },
      pending: {
        cls: "hp-receipt-match--fail",
        icon: <FaTimesCircle style={{ fontSize: 10 }} />,
        text: "Verification Failed",
      },
      created: {
        cls: "hp-receipt-match--fail",
        icon: <FaClock style={{ fontSize: 10 }} />,
        text: "Awaiting Verification",
      },
    };

    if (byStatus[payment.status]) return byStatus[payment.status];
    return payment.amountMatched && payment.refMatched
      ? { cls: "hp-receipt-match--ok",   icon: <FaCheckCircle style={{ fontSize: 10 }} />,       text: "Auto-verified" }
      : { cls: "hp-receipt-match--fail", icon: <FaExclamationTriangle style={{ fontSize: 10 }} />, text: "Needs review" };
  })();

  return (
    <div className="hp-detail__section">
      <div className="hp-detail__section-label">Receipt</div>
      <div
        className={`hp-receipt-uploaded-row hp-receipt-uploaded-row--clickable${open ? " hp-receipt-uploaded-row--open" : ""}`}
        onClick={handleToggle}
      >
        <div className="hp-receipt-uploaded-icon">
          <FaFileUpload style={{ fontSize: 13, color: "#0369a1" }} />
        </div>
        <div>
          <div className="hp-receipt-uploaded-label">Receipt uploaded</div>
          <div className="hp-receipt-uploaded-date">{formatDate(payment.receiptUploadedAt)}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`hp-receipt-match ${receiptStatusChip.cls}`}>
            {receiptStatusChip.icon} {receiptStatusChip.text}
          </span>
          <span className={`hp-receipt-chevron${open ? " hp-receipt-chevron--open" : ""}`}>▾</span>
        </div>
      </div>

      {open && (
        <div className="hp-receipt-expanded">
          {receiptImage
            ? <div className="hp-receipt-img-wrap">
                <img src={receiptImage} alt="Payment receipt" className="hp-receipt-img" />
              </div>
            : <div className="hp-receipt-img-placeholder">
                <FaSpinner className="hp-spin" style={{ fontSize: 18, color: "#aaa" }} />
                <span>Loading receipt…</span>
              </div>}

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
    </div>
  );
}

// ── Payment Detail ─────────────────────────────────────────────────────────
function PaymentDetail({ payment, listing, receiptImage, onExpandReceipt, onCancel, onUpload, isMobile, onBack }) {
  if (!payment) {
    return (
      <div className="hp-detail hp-detail--empty">
        <FaReceipt className="hp-detail__empty-icon" />
        <p className="hp-detail__empty-text">Select a payment to view details</p>
      </div>
    );
  }

  const isFood    = payment.listingType === "food";
  const canCancel = ["created", "pending"].includes(payment.status);
  const canUpload = !["verified", "manual_requested"].includes(payment.status);
  const PLAN_LABELS = { "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "12m": "12 Months" };

  return (
    <div className="hp-detail">

      {/* ── Mobile back button ── */}
      {isMobile && (
        <button className="hp-detail__back-btn" onClick={onBack}>
          <FaArrowLeft style={{ fontSize: 13 }} />
          <span>Back to Payments</span>
        </button>
      )}

      {/* Payment ID strip */}
      <div className="hp-detail__id-strip">
        <span className="hp-detail__id-text">Ref&nbsp;&nbsp;{payment.referenceCode}</span>
        <StatusBadge status={payment.status} />
      </div>

      {/* Header */}
      <div className="hp-detail__header">
        <div className="hp-detail__header-row">
          <div className="hp-detail__listing">
            <div className="hp-detail__listing-icon">
              {listing?.iconUrl
                ? <img src={listing.iconUrl} alt="listing" className="hp-detail__listing-img"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                : isFood
                  ? <FaUtensils style={{ fontSize: 18, color: ORANGE }} />
                  : <FaHome style={{ fontSize: 18, color: "#0369a1" }} />}
            </div>
            <div className="hp-detail__listing-info">
              <div className="hp-detail__listing-type">{isFood ? "Food Service" : "Accommodation"}</div>
              <div className="hp-detail__listing-name">{listing?.name ?? "—"}</div>
            </div>
          </div>
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

      {/* Body */}
      <div className="hp-detail__body">

        {/* Payment info grid */}
        <div className="hp-detail__section">
          <div className="hp-detail__section-label">Payment Details</div>
          <div className="hp-detail__info-grid">
            {[
              { label: "Reference Code", value: payment.referenceCode,              mono: true      },
              { label: "Plan",           value: PLAN_LABELS[payment.plan] ?? payment.plan           },
              { label: "Amount",         value: `LKR ${payment.amount?.toLocaleString()}`           },
              { label: "Days Added",     value: `${payment.daysAdded} days`                        },
              { label: "Created",        value: formatDate(payment.createdAt)                       },
              { label: "New Expiry",     value: formatDate(payment.newExpireDate), highlight: true  },
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

        {payment.status === "rejected" && payment.adminNote && (
          <div className="hp-detail__section">
            <div className="hp-detail__section-label">Rejection Reason</div>
            <div className="hp-info-row">
              <span className="hp-info-row__value">{payment.adminNote}</span>
            </div>
          </div>
        )}

        {/* Receipt */}
        {payment.receiptUploadedAt && (
          <ReceiptSection
            payment={payment}
            receiptImage={receiptImage}
            onExpand={onExpandReceipt}
          />
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

  const [payments,        setPayments]        = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [filterOpen,      setFilterOpen]      = useState(false);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [lastRefresh,     setLastRefresh]     = useState(Date.now());
  const [toast,           setToast]           = useState({ show: false, msg: "" });
  const [listingInfo,     setListingInfo]     = useState({});
  const [receiptImages,   setReceiptImages]   = useState({});
  const [cancelModal,     setCancelModal]     = useState(null);
  const [cancelLoading,   setCancelLoading]   = useState(false);

  // ── Mobile panel state ────────────────────────────────────────────────────
  const [mobilePanel, setMobilePanel] = useState("list");
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 1024);

  const toastRef  = useRef(null);
  const filterRef = useRef(null);

  // Resize listener
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => { if (!hostId) navigate("/Login"); }, []);

  // Re-fetch on tab visibility
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") setLastRefresh(Date.now()); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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

  // Fetch listing info per payment
  useEffect(() => {
    if (!payments.length) return;
    payments.forEach(async (p) => {
      if (listingInfo[p._id]) return;
      try {
        const endpoint = p.listingType === "food"
          ? `${API_BASE}/FoodService/${p.listing}`
          : `${API_BASE}/Accommodation/${p.listing}`;
        const res    = await fetch(endpoint);
        const raw    = await res.json();
        const doc    = raw?.data ?? raw?.result ?? raw;
        const name   = doc?.kitchenName ?? doc?.title ?? "—";
        const iconId = doc?.iconImage ?? doc?.images?.[0] ?? null;
        const iconUrl = iconId ? `${API_BASE}/Photo/${String(iconId)}` : null;
        setListingInfo(prev => ({ ...prev, [p._id]: { name, iconUrl } }));
      } catch { /* silent */ }
    });
  }, [payments]);

  // Fetch receipt image on expand
  const handleExpandReceipt = async (paymentId, uploadedAt) => {
    const cached = receiptImages[paymentId];
    if (cached && cached.uploadedAt === uploadedAt) return;
    try {
      const ts  = uploadedAt ? new Date(uploadedAt).getTime() : Date.now();
      const res = await fetch(`${API_BASE}/Payment/${paymentId}/receipt-image?hostId=${hostId}&t=${ts}`, { cache: "no-store" });
      if (!res.ok) return;
      const blob = await res.blob();
      if (cached?.url) URL.revokeObjectURL(cached.url);
      setReceiptImages(prev => ({ ...prev, [paymentId]: { url: URL.createObjectURL(blob), uploadedAt } }));
    } catch { /* no image yet */ }
  };

  // Payment click — switch to detail panel on mobile
  const handlePaymentClick = (payment) => {
    setSelectedPayment(payment);
    if (isMobile) setMobilePanel("detail");
  };

  const handleBack = () => setMobilePanel("list");

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
      if (hostId) {
        sendNotification({
          recipient: hostId,
          type:      "payment_verified",
          title:     "Payment Cancelled",
          message:   `Your payment record (${cancelModal.referenceCode}) has been cancelled successfully.`,
          link:      "/PaymentHistory",
          refId:     cancelModal._id,
          refType:   "Payment",
        });
      }
      setCancelModal(null);
    } catch {
      showToast("Failed to cancel. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || p.referenceCode?.toLowerCase().includes(q)
      || p.plan?.toLowerCase().includes(q)
      || p.listingType?.toLowerCase().includes(q)
      || (listingInfo[p._id]?.name ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const activeFilterLabel = FILTER_OPTIONS.find(f => f.value === statusFilter)?.label ?? "All Payments";
  const isFiltered = statusFilter !== "all" || searchQuery;

  return (
    <div className="hp-page" style={{ fontFamily: FONT }}>
      <HostNavbar />

      <div className="hp-wrapper">

        {/* ── Title bar ── */}
        <div className="hp-titlebar">
          <div className="hp-titlebar__left">
            <h1 className="hp-titlebar__title">Payment History</h1>
            <span className="hp-titlebar__count">
              {payments.length} payment{payments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── Split panel ── */}
        <div className="hp-split">

          {/* LEFT */}
          <div className={`hp-split__left${isMobile && mobilePanel === "detail" ? " hp-split__left--hidden" : ""}`}>

            {/* ── Search + Filter bar (matches HostOrders style) ── */}
            <div className="hp-searchbar">
              <div className="hp-search-wrap">
                <FaSearch className="hp-search-wrap__icon" />
                <input
                  className="hp-search"
                  placeholder="Search by reference, plan, listing…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="hp-search-clear" onClick={() => setSearchQuery("")}>
                    <FaTimesCircle />
                  </button>
                )}
              </div>

              <div className="hp-filter" ref={filterRef}>
                <button
                  className={`hp-filter__btn${statusFilter !== "all" ? " hp-filter__btn--active" : ""}`}
                  onClick={() => setFilterOpen(prev => !prev)}
                >
                  <FaFilter style={{ fontSize: 11 }} />
                  <span className="hp-filter__label">{activeFilterLabel}</span>
                  <FaChevronDown className={`hp-filter__chevron${filterOpen ? " hp-filter__chevron--open" : ""}`} />
                </button>

                {filterOpen && (
                  <div className="hp-filter__dropdown">
                    {FILTER_OPTIONS.map(opt => {
                      const count = opt.value === "all"
                        ? payments.length
                        : payments.filter(p => p.status === opt.value).length;
                      const s = STATUS[opt.value];
                      return (
                        <button
                          key={opt.value}
                          className={`hp-filter__option${statusFilter === opt.value ? " hp-filter__option--active" : ""}`}
                          onClick={() => { setStatusFilter(opt.value); setFilterOpen(false); }}
                        >
                          <span className="hp-filter__option-left">
                            {s && <span className="hp-filter__dot" style={{ background: s.dot }} />}
                            {opt.label}
                          </span>
                          <span className={`hp-filter__count${statusFilter === opt.value ? " hp-filter__count--active" : ""}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Active filter pills ── */}
            {isFiltered && (
              <div className="hp-active-filters">
                {statusFilter !== "all" && (
                  <span className="hp-filter-pill">
                    {activeFilterLabel}
                    <button className="hp-filter-pill__remove" onClick={() => setStatusFilter("all")}>
                      <FaTimesCircle />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="hp-filter-pill">
                    "{searchQuery}"
                    <button className="hp-filter-pill__remove" onClick={() => setSearchQuery("")}>
                      <FaTimesCircle />
                    </button>
                  </span>
                )}
                <button
                  className="hp-filter-clear-all"
                  onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="hp-error">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {/* ── Loading skeleton ── */}
            {loading && (
              <div className="hp-skeleton-list">
                {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
              </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && filteredPayments.length === 0 && (
              <div className="hp-empty">
                <FaBoxOpen className="hp-empty__icon" />
                <div className="hp-empty__title">
                  {isFiltered ? "No matching payments" : "No payments yet"}
                </div>
                <div className="hp-empty__sub">
                  {isFiltered
                    ? "Try adjusting your search or filter"
                    : "Your payment history will appear here"}
                </div>
                {isFiltered && (
                  <button
                    className="hp-empty__clear"
                    onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* ── Payment list ── */}
            {!loading && !error && filteredPayments.map(payment => (
              <PaymentRow
                key={payment._id}
                payment={payment}
                listing={listingInfo[payment._id]}
                selected={selectedPayment?._id === payment._id}
                onClick={() => handlePaymentClick(payment)}
              />
            ))}
          </div>

          {/* RIGHT */}
          <div className={`hp-split__right${isMobile && mobilePanel === "list" ? " hp-split__right--hidden" : ""}`}>
            <PaymentDetail
              payment={selectedPayment}
              listing={selectedPayment ? listingInfo[selectedPayment._id] : null}
              receiptImage={selectedPayment ? receiptImages[selectedPayment._id]?.url ?? null : null}
              onExpandReceipt={handleExpandReceipt}
              onCancel={p => setCancelModal(p)}
              onUpload={p => navigate("/PaymentReceipt", {
                state: {
                  paymentId:     p._id,
                  referenceCode: p.referenceCode,
                  amount:        p.amount,
                  plan:          p.plan,
                  daysAdded:     p.daysAdded,
                  newExpireDate: p.newExpireDate,
                  listingName:   listingInfo[p._id]?.name ?? (p.listingType === "food" ? "Food Service" : "Accommodation"),
                },
              })}
              isMobile={isMobile}
              onBack={handleBack}
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
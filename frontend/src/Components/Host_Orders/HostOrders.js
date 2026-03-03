import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMotorcycle, FaShoppingBag,
  FaSpinner, FaMapMarkerAlt, FaCheckCircle,
  FaUtensils, FaPhone, FaFilter,
  FaClock, FaTimesCircle, FaSearch,
  FaSyncAlt,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./HostOrders.css";

const API_BASE = "http://localhost:8000";
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_DOT = {
  pending:   "#e67e22",
  accepted:  "#0066cc",
  completed: "#008a05",
  cancelled: "#c13515",
};

// ─────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────
function ConfirmModal({ action, onConfirm, onCancel, loading }) {
  const isAccept   = action === "accepted";
  const isComplete = action === "completed";
  const isCancel   = action === "cancelled";
  const confirmBg  = isCancel ? "var(--red)" : isComplete ? "var(--green)" : "var(--dark)";

  return (
    <div className="ho-modal-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="ho-modal" onClick={e => e.stopPropagation()}>
        <h3>
          {isAccept ? "Accept Order" : isComplete ? "Mark as Completed" : "Cancel Order"}
        </h3>
        <p>
          {isAccept
            ? "Accept this order? The student will be notified that their order is being prepared."
            : isComplete
            ? "Mark this order as completed? This confirms the food has been delivered or collected."
            : "Cancel this order? This action cannot be undone and the student will be notified."}
        </p>
        <div className="ho-modal__actions">
          <button className="ho-modal__cancel" onClick={onCancel} disabled={loading}>Back</button>
          <button className="ho-modal__confirm" style={{ background: confirmBg }}
            onClick={onConfirm} disabled={loading}>
            {loading
              ? <FaSpinner className="ho-spin" style={{ fontSize: 13 }} />
              : isAccept ? "Accept" : isComplete ? "Mark Completed" : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`ho-badge ho-badge--${status}`}>
      <span className="ho-badge__dot" style={{ background: STATUS_DOT[status] }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────
function OrderCard({ order, onAction, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const student    = order.student;
  const name       = student?.name ?? "Student";
  const phone      = student?.phone ?? student?.phoneNumber ?? student?.contact ?? null;
  const isDelivery = order.orderType === "delivery";
  const busy       = actionLoading === order._id;

  return (
    <div className="ho-card">
      <div
        className="ho-card__header"
        style={{ borderLeftColor: STATUS_DOT[order.status] ?? "var(--border)" }}
        onClick={() => setExpanded(p => !p)}
      >
        <div className={`ho-card__type-icon ${isDelivery ? "ho-type-chip--delivery" : "ho-type-chip--pickup"}`}
          style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }}>
          {isDelivery
            ? <FaMotorcycle style={{ fontSize: 16 }} />
            : <FaShoppingBag style={{ fontSize: 15 }} />}
        </div>

        <div className="ho-card__info">
          <div className="ho-card__name-row">
            <span className="ho-card__name">{name}</span>
            <StatusBadge status={order.status} />
            <span className={`ho-type-chip ${isDelivery ? "ho-type-chip--delivery" : "ho-type-chip--pickup"}`}>
              {isDelivery ? "Delivery" : "Pickup"}
            </span>
          </div>
          <div className="ho-card__meta">
            <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span className="ho-card__total">LKR {order.total?.toLocaleString()}</span>
            <span>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <FaClock style={{ fontSize: 10 }} /> {timeAgo(order.createdAt)}
            </span>
          </div>
        </div>

        <span className={`ho-card__chevron${expanded ? " ho-card__chevron--open" : ""}`}>▼</span>
      </div>

      {expanded && (
        <div className="ho-card__body">
          <div className="ho-card__section">
            <div className="ho-section-title">Items Ordered</div>
            <div className="ho-items-list">
              {order.items?.map((item, i) => (
                <div key={i} className="ho-item-row">
                  <div className="ho-item-icon">
                    <FaUtensils style={{ fontSize: 16 }} />
                  </div>
                  <div className="ho-item-info">
                    <div className="ho-item-name">{item.name}</div>
                    <div className="ho-item-qty">{item.qty}x · LKR {item.price?.toLocaleString()} each</div>
                  </div>
                  <span className="ho-item-price">LKR {(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="ho-total-row">
              <span>Total</span>
              <span className="ho-total-amount">LKR {order.total?.toLocaleString()}</span>
            </div>
          </div>

          <div className="ho-info-grid">
            <div className="ho-info-cell">
              <div className="ho-section-title">Customer</div>
              <div className="ho-customer-name">{name}</div>
              {phone
                ? <a href={`tel:${phone}`} className="ho-phone-link">
                    <FaPhone style={{ fontSize: 11 }} /> {phone}
                  </a>
                : <span className="ho-no-phone">No phone number</span>}
            </div>

            {isDelivery && order.location?.coordinates && (
              <div className="ho-info-cell">
                <div className="ho-section-title">Delivery Location</div>
                <a
                  href={`https://www.google.com/maps?q=${order.location.coordinates[1]},${order.location.coordinates[0]}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ho-map-link"
                >
                  <FaMapMarkerAlt style={{ fontSize: 12 }} /> Open in Google Maps
                </a>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="ho-notes-bar">
              <div className="ho-section-title" style={{ marginBottom: 4 }}>Special Instructions</div>
              <div className="ho-notes-text">"{order.notes}"</div>
            </div>
          )}

          {(order.status === "pending" || order.status === "accepted") && (
            <div className="ho-actions">
              {order.status === "pending" && (
                <>
                  <button className="ho-action-btn ho-action-btn--accept"
                    onClick={() => onAction(order, "accepted")} disabled={busy}>
                    {busy ? <FaSpinner className="ho-spin" style={{ fontSize: 13 }} /> : <FaCheckCircle style={{ fontSize: 13 }} />}
                    Accept Order
                  </button>
                  <button className="ho-action-btn ho-action-btn--cancel"
                    onClick={() => onAction(order, "cancelled")} disabled={busy}>
                    <FaTimesCircle style={{ fontSize: 13 }} /> Cancel
                  </button>
                </>
              )}
              {order.status === "accepted" && (
                <>
                  <button className="ho-action-btn ho-action-btn--complete"
                    onClick={() => onAction(order, "completed")} disabled={busy}>
                    {busy ? <FaSpinner className="ho-spin" style={{ fontSize: 13 }} /> : <FaCheckCircle style={{ fontSize: 13 }} />}
                    Mark Completed
                  </button>
                  <button className="ho-action-btn ho-action-btn--cancel"
                    onClick={() => onAction(order, "cancelled")} disabled={busy}>
                    <FaTimesCircle style={{ fontSize: 13 }} /> Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────
function StatsBar({ orders }) {
  const stats = [
    { label: "Pending",   value: orders.filter(o => o.status === "pending").length,   color: "var(--orange)", border: "#f5c26b" },
    { label: "Accepted",  value: orders.filter(o => o.status === "accepted").length,  color: "var(--blue)",   border: "#93c5fd" },
    { label: "Completed", value: orders.filter(o => o.status === "completed").length, color: "var(--green)",  border: "#86efac" },
    { label: "Cancelled", value: orders.filter(o => o.status === "cancelled").length, color: "var(--red)",    border: "#f5c2b8" },
  ];
  return (
    <div className="ho-stats">
      {stats.map(s => (
        <div key={s.label} className="ho-stat-card" style={{ border: `1px solid ${s.border}` }}>
          <div className="ho-stat-value" style={{ color: s.color }}>{s.value}</div>
          <div className="ho-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function HostOrders() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [foodServices,    setFoodServices]    = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [orders,          setOrders]          = useState([]);
  const [loadingOrders,   setLoadingOrders]   = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [confirmModal,    setConfirmModal]    = useState(null);
  const [actionLoading,   setActionLoading]   = useState(null);
  const [lastRefresh,     setLastRefresh]     = useState(Date.now());
  const [toast,           setToast]           = useState({ show: false, msg: "" });

  const toastRef = useRef(null);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => {
    if (!userId) { navigate("/Login"); }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingServices(true);
    fetch(`${API_BASE}/Foodservice?owner=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (!raw) return;
        const list = unwrap(raw);
        const arr  = Array.isArray(list) ? list : [list].filter(Boolean);
        setFoodServices(arr);
        if (arr.length > 0) setSelectedService(arr[0]);
      }).catch(() => {}).finally(() => setLoadingServices(false));
  }, [userId]);

  useEffect(() => {
    if (!selectedService?._id) return;
    setLoadingOrders(true);
    fetch(`${API_BASE}/foodorder/foodservice/${selectedService._id}`)
      .then(r => r.ok ? r.json() : null)
      .then(async (raw) => {
        if (!raw) return;
        const list = unwrap(raw);
        const arr  = Array.isArray(list?.data ?? list) ? (list?.data ?? list) : [];
        const enriched = await Promise.all(arr.map(async (order) => {
          const sid = order.student?._id ?? order.student;
          if (!sid || typeof order.student === "object") return order;
          try {
            const r    = await fetch(`${API_BASE}/User/${sid}`);
            const raw2 = await r.json();
            return { ...order, student: unwrap(raw2) };
          } catch { return order; }
        }));
        setOrders(enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }).catch(() => {}).finally(() => setLoadingOrders(false));
  }, [selectedService, lastRefresh]);

  const handleAction = (order, action) => setConfirmModal({ order, action });

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { order, action } = confirmModal;
    setActionLoading(order._id);
    try {
      const res = await fetch(`${API_BASE}/foodorder/${order._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: action } : o));
      showToast(
        action === "accepted"  ? "Order accepted." :
        action === "completed" ? "Order marked as completed." : "Order cancelled."
      );
    } catch {
      showToast("Failed to update order. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const q           = searchQuery.toLowerCase();
    const matchSearch = !q
      || (o.student?.name ?? "").toLowerCase().includes(q)
      || o.items?.some(i => i.name.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const TABS = ["all", "pending", "accepted", "completed", "cancelled"];

  return (
    <div className="ho-page">

      {/* ══ NAVBAR ══ */}
      <HostNavbar activeHref="/HostOrders" pendingCount={pendingCount} />

      {/* ══ PAGE HEADER ══ */}
      <div className="ho-page-header">
        <div className="ho-page-header-inner">
          <div className="ho-page-header-left">
            <h1 className="ho-page-title">Food Orders</h1>
            <span className="ho-count">{orders.length} total</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {foodServices.length > 1 && foodServices.map(svc => (
              <button key={svc._id}
                className={`ho-btn${selectedService?._id === svc._id ? "" : " ho-btn--outline"}`}
                onClick={() => setSelectedService(svc)}>
                {svc.kitchenName ?? "Kitchen"}
              </button>
            ))}
            <button className="ho-btn ho-btn--outline" onClick={() => setLastRefresh(Date.now())}>
              <FaSyncAlt style={{ fontSize: 12 }} /> Refresh
            </button>
          </div>
        </div>

        <div className="ho-tabs">
          {TABS.map(s => (
            <button key={s} className={`ho-tab${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All Orders" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ho-tab-badge">
                {s === "all" ? orders.length : orders.filter(o => o.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="ho-content">
        {loadingServices ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--mid)" }}>
            <FaSpinner className="ho-spin" style={{ fontSize: 28, display: "block", margin: "0 auto 14px" }} />
            Loading your kitchens...
          </div>
        ) : foodServices.length === 0 ? (
          <div className="ho-empty">
            <div className="ho-empty__icon"><FaUtensils /></div>
            <h3>No food services found</h3>
            <p>You don't have any food services registered yet.</p>
          </div>
        ) : (
          <>
            <StatsBar orders={orders} />

            <div className="ho-search-wrap">
              <FaSearch className="ho-search-icon" />
              <input type="text" className="ho-search"
                placeholder="Search by customer or item..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} />
            </div>

            {loadingOrders ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="ho-skeleton">
                    <div className="ho-skeleton__row">
                      <div className="ho-skeleton__circle" />
                      <div className="ho-skeleton__lines">
                        <div className="ho-skeleton__line ho-skeleton__line--medium" />
                        <div className="ho-skeleton__line ho-skeleton__line--short" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="ho-empty">
                <div className="ho-empty__icon"><FaFilter /></div>
                <h3>No orders found</h3>
                <p>
                  {statusFilter !== "all" || searchQuery
                    ? "Try changing your filter or search term."
                    : "No orders have been placed yet for this kitchen."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredOrders.map(order => (
                  <OrderCard key={order._id} order={order}
                    onAction={handleAction} actionLoading={actionLoading} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <Footer />

      {confirmModal && (
        <ConfirmModal action={confirmModal.action}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading === confirmModal.order._id} />
      )}

      <div className={`ho-toast${toast.show ? " ho-toast--visible" : ""}`}>{toast.msg}</div>
    </div>
  );
}
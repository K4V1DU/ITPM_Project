import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMotorcycle, FaShoppingBag, FaSpinner, FaMapMarkerAlt, FaExclamationTriangle,
  FaCheckCircle, FaUtensils, FaPhone, FaClock, FaTimesCircle,
  FaSearch, FaSyncAlt, FaReceipt, FaBoxOpen, FaExternalLinkAlt,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./HostOrders.css";

const API_BASE  = "http://localhost:8000";
const ORDER_API = `${API_BASE}/FoodOrder`;
const ORANGE    = "#FF6B2B";

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS = {
  pending:   { bg: "#fff7ed", text: "#c2410c", dot: ORANGE,    border: "#fcd9c4", label: "Pending"   },
  accepted:  { bg: "#f7f7f7", text: "#1b1b1b", dot: "#1b1b1b", border: "#e2e2e2", label: "Accepted"  },
  completed: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", border: "#bbf7d0", label: "Completed" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Cancelled" },
};

// ─────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────
function ConfirmModal({ action, onConfirm, onCancel, loading }) {
  const isAccept   = action === "accepted";
  const isComplete = action === "completed";
  const isCancel   = action === "cancelled";
  return (
    <div className="ho-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="ho-modal" onClick={e => e.stopPropagation()}>
        <div className={`ho-modal__icon-wrap ho-modal__icon-wrap--${isCancel ? "danger" : "primary"}`}>
          {isCancel ? <FaTimesCircle /> : <FaCheckCircle />}
        </div>
        <h3 className="ho-modal__title">
          {isAccept ? "Accept Order" : isComplete ? "Mark as Completed" : "Cancel Order"}
        </h3>
        <p className="ho-modal__desc">
          {isAccept
            ? "Accept this order? The student will be notified their order is being prepared."
            : isComplete
            ? "Mark this order as completed? This confirms the food has been delivered or collected."
            : "Cancel this order? This action cannot be undone and the student will be notified."}
        </p>
        <div className="ho-modal__btns">
          <button className="ho-modal__btn ho-modal__btn--ghost" onClick={onCancel} disabled={loading}>Back</button>
          <button
            className={`ho-modal__btn ho-modal__btn--${isCancel ? "danger" : isComplete ? "dark" : "primary"}`}
            onClick={onConfirm} disabled={loading}
          >
            {loading ? <FaSpinner className="ho-spin" /> : isAccept ? "Accept" : isComplete ? "Mark Completed" : "Yes, Cancel"}
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
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span className="ho-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className="ho-badge__dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────
// LEFT: ORDER ROW
// ─────────────────────────────────────────
function OrderRow({ order, selected, onClick }) {
  const isDelivery = order.orderType === "delivery";
  const name       = order.student?.name ?? "Student";
  const s          = STATUS[order.status] ?? STATUS.pending;
  return (
    <div
      className={`ho-row${selected ? " ho-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      {/* unified icon style — same bg/color for both delivery & pickup */}
      <div className="ho-row__icon">
        {isDelivery ? <FaMotorcycle /> : <FaShoppingBag />}
      </div>
      <div className="ho-row__body">
        <div className="ho-row__top">
          <span className="ho-row__name">{name}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="ho-row__meta">
          <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
          <span className="ho-sep">·</span>
          <span className="ho-row__price">LKR {order.total?.toLocaleString()}</span>
          <span className="ho-sep">·</span>
          <span className="ho-row__time"><FaClock style={{ fontSize: 9 }} /> {timeAgo(order.createdAt)}</span>
        </div>
        {order.foodService?.kitchenName && (
          <div className="ho-row__kitchen">
            <FaUtensils style={{ fontSize: 9 }} /> {order.foodService.kitchenName}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ITEM IMAGE with fallback
// ─────────────────────────────────────────
function ItemImage({ item }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  // menuItemId is set by the backend normaliser on new orders.
  // For older orders the original cart _id was stored as subdoc _id — try both.
  // menuItemId = new orders, menuItem = older orders saved before the fix
  const menuId = String(item.menuItemId ?? item.menuItem ?? item.itemId ?? "");

  useEffect(() => {
    if (!menuId) return;
    setImgSrc(null);
    setFailed(false);
    fetch(`${API_BASE}/menuitem/${menuId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        const doc = raw?.data ?? raw?.result ?? raw;
        // Schema: image is ObjectId ref to Photo
        const photoId = doc?.image ? String(doc.image) : null;
        if (photoId) setImgSrc(`${API_BASE}/Photo/${photoId}`);
      })
      .catch(() => {});
  }, [menuId]);

  if (imgSrc && !failed) {
    return (
      <div className="ho-item-thumb">
        <img src={imgSrc} alt={item.name} className="ho-item-thumb__img"
          onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="ho-item-thumb ho-item-thumb--fallback">
      <FaUtensils />
    </div>
  );
}

// ─────────────────────────────────────────
// RIGHT: ORDER DETAIL PANEL
// ─────────────────────────────────────────
function OrderDetail({ order, onAction, actionLoading }) {
  if (!order) {
    return (
      <div className="ho-detail ho-detail--empty">
        <FaReceipt className="ho-detail__empty-icon" />
        <p className="ho-detail__empty-text">Select an order to view details</p>
      </div>
    );
  }

  const isDelivery = order.orderType === "delivery";
  const student    = order.student ?? {};
  const name       = student.name  ?? "Student";
  const phone      = student.phone ?? null;
  const profileImg = student.profileImage
    ? `${API_BASE}/Photo/${student.profileImage}`
    : null;
  const busy       = actionLoading === order._id;

  // Map only for delivery orders that have coordinates (any status)
  const lat      = order.location?.coordinates?.[1];
  const lng      = order.location?.coordinates?.[0];
  const showMap  = isDelivery && lat && lng;
  const mapSrc   = showMap ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null;
  const mapsLink = showMap ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="ho-detail">

      {/* ── Header: customer + meta ── */}
      <div className="ho-detail__header">

        <div className="ho-detail__order-id">
          <span className="ho-detail__order-id__text">Order ID&nbsp;&nbsp;{order._id}</span>
        </div>

        <div className="ho-detail__header-row">
          <div className="ho-detail__customer">
            <div className="ho-detail__avatar">
              {profileImg
                ? <img src={profileImg} alt={name} className="ho-detail__avatar-img"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                : name.charAt(0).toUpperCase()}
            </div>
            <div className="ho-detail__customer-info">
              <div className="ho-detail__customer-name">{name}</div>
              {student.email && <div className="ho-detail__customer-email">{student.email}</div>}
              {phone
                ? <a href={`tel:${phone}`} className="ho-detail__phone">
                    <FaPhone style={{ fontSize: 10 }} /> {phone}
                  </a>
                : <span className="ho-detail__no-phone">No phone number</span>}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="ho-detail__header-divider" />

        <div className="ho-detail__header-meta">
          <span className="ho-header-meta__item">
            <FaUtensils style={{ fontSize: 11 }} />
            {order.foodService?.kitchenName ?? "Kitchen"}
          </span>
          <span className="ho-sep">·</span>
          <span className="ho-header-meta__item">
            <FaClock style={{ fontSize: 10 }} />
            {timeAgo(order.createdAt)}
          </span>
          <span className="ho-sep">·</span>
          <span className={`ho-header-meta__item ho-header-meta__item--${isDelivery ? "delivery" : "pickup"}`}>
            {isDelivery ? <FaMotorcycle style={{ fontSize: 11 }} /> : <FaShoppingBag style={{ fontSize: 11 }} />}
            {isDelivery ? "Delivery" : "Pickup"}
          </span>
          <span className="ho-sep">·</span>
          <span className="ho-header-meta__item">
            {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="ho-detail__body">

        {/* ITEMS — professional card layout with item images */}
        <div className="ho-detail__section">
          <div className="ho-detail__section-label">Items Ordered</div>
          <div className="ho-detail__items">
            {order.items?.map((item, i) => (
              <div key={i} className="ho-detail__item">
                <ItemImage item={item} />
                <span className="ho-detail__item-name">{item.name}</span>
                <span className="ho-detail__item-qty-badge">x{item.qty}</span>
                <span className="ho-detail__item-price">
                  LKR {(item.price * item.qty).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Order summary — receipt style */}
          <div className="ho-detail__totals">
            <div className="ho-detail__total-row">
              <span>Subtotal</span>
              <span>LKR {(order.subtotal ?? order.total)?.toLocaleString()}</span>
            </div>
            {order.orderType === "delivery" && order.deliveryFee > 0
              ? <div className="ho-detail__total-row">
                  <span>Delivery fee</span>
                  <span>LKR {order.deliveryFee?.toLocaleString()}</span>
                </div>
              : <div className="ho-detail__total-row ho-detail__total-row--free">
                  <span className="ho-detail__total-free-label">Delivery fee</span>
                  <span className="ho-detail__total-free-val">Free</span>
                </div>}
            <div className="ho-detail__total-row ho-detail__total-row--grand">
              <span>Total</span>
              <span className="ho-detail__grand-price">LKR {order.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* NOTES */}
        {order.notes && (
          <div className="ho-detail__section">
            <div className="ho-detail__section-label ho-detail__section-label--warn">
              <FaExclamationTriangle className="ho-warn-icon" /> Special Instructions
            </div>
            <div className="ho-detail__notes">{order.notes}</div>
          </div>
        )}

        {/* ACTIONS */}
        {(order.status === "pending" || order.status === "accepted") && (
          <div className="ho-detail__actions">
            {order.status === "pending" && (
              <>
                <button className="ho-action ho-action--primary"
                  onClick={() => onAction(order, "accepted")} disabled={busy}>
                  {busy ? <FaSpinner className="ho-spin" /> : <FaCheckCircle />} Accept Order
                </button>
                <button className="ho-action ho-action--ghost"
                  onClick={() => onAction(order, "cancelled")} disabled={busy}>
                  <FaTimesCircle /> Cancel
                </button>
              </>
            )}
            {order.status === "accepted" && (
              <>
                <button className="ho-action ho-action--primary"
                  onClick={() => onAction(order, "completed")} disabled={busy}>
                  {busy ? <FaSpinner className="ho-spin" /> : <FaCheckCircle />} Mark Completed
                </button>
                <button className="ho-action ho-action--ghost"
                  onClick={() => onAction(order, "cancelled")} disabled={busy}>
                  <FaTimesCircle /> Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* MAP — delivery orders with coordinates, always at the bottom */}
        {showMap && mapSrc && (
          <div className="ho-detail__section ho-detail__section--map">
            <div className="ho-detail__section-label">Delivery Location</div>
            <div className="ho-map-wrap">
              <iframe
                className="ho-map-iframe"
                src={mapSrc}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Delivery location"
              />
              <div className="ho-map-card">
                <FaMapMarkerAlt style={{ color: ORANGE, fontSize: 16 }} />
                <div>
                  <div className="ho-map-card__name">{name}</div>
                  <div className="ho-map-card__sub">Delivery address</div>
                </div>
              </div>
            </div>
            {mapsLink && (
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="ho-map-link">
                <FaExternalLinkAlt style={{ fontSize: 11 }} /> Open in Google Maps
              </a>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function HostOrders() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [orders,        setOrders]        = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [lastRefresh,   setLastRefresh]   = useState(Date.now());
  const [toast,         setToast]         = useState({ show: false, msg: "" });
  const [error,         setError]         = useState(null);
  const toastRef = useRef(null);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => { if (!userId) navigate("/Login"); }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingOrders(true);
    setError(null);
    fetch(`${ORDER_API}/owner/${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(raw => {
        const list   = unwrap(raw);
        const arr    = Array.isArray(list?.data ?? list) ? (list?.data ?? list) : [];
        const sorted = arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sorted);
        setSelectedOrder(prev => prev ? sorted.find(o => o._id === prev._id) ?? sorted[0] : sorted[0]);
      })
      .catch(err => {
        if (err === 404) { setOrders([]); return; }
        setError("Failed to load orders. Please try again.");
      })
      .finally(() => setLoadingOrders(false));
  }, [userId, lastRefresh]);

  const handleAction = (order, action) => setConfirmModal({ order, action });

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { order, action } = confirmModal;
    setActionLoading(order._id);
    try {
      const res = await fetch(`${ORDER_API}/${order._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: action } : o));
      setSelectedOrder(prev => prev?._id === order._id ? { ...prev, status: action } : prev);
      showToast(
        action === "accepted"  ? "Order accepted."  :
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
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (o.student?.name ?? "").toLowerCase().includes(q)
      || o.items?.some(i => i.name.toLowerCase().includes(q))
      || (o.foodService?.kitchenName ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const TABS = ["all", "pending", "accepted", "completed", "cancelled"];

  return (
    <div className="ho-page">
      <HostNavbar activeHref="/HostOrders" pendingCount={pendingCount} />

      <div className="ho-wrapper">
        {/* ── Title ── */}
        <div className="ho-titlebar">
          <div className="ho-titlebar__left">
            <h1 className="ho-titlebar__title">Food Orders</h1>
            <span className="ho-titlebar__count">{orders.length} orders</span>
          </div>
          <button className="ho-btn-refresh" onClick={() => setLastRefresh(Date.now())}>
            <FaSyncAlt /> Refresh
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="ho-tabs">
          {TABS.map(s => (
            <button
              key={s}
              className={`ho-tab${statusFilter === s ? " ho-tab--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All Orders" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ho-tab__count">
                {s === "all" ? orders.length : orders.filter(o => o.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Split ── */}
        <div className="ho-split">

          {/* LEFT */}
          <div className="ho-split__left">
            <div className="ho-search-wrap">
              <FaSearch className="ho-search-icon" />
              <input
                className="ho-search" type="text"
                placeholder="Search customer, item or kitchen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {error ? (
              <div className="ho-empty">
                <FaTimesCircle className="ho-empty__icon" style={{ color: "#dc2626" }} />
                <p>{error}</p>
                <button className="ho-btn-refresh" onClick={() => setLastRefresh(Date.now())}>
                  <FaSyncAlt /> Retry
                </button>
              </div>
            ) : loadingOrders ? (
              <div className="ho-skeletons">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="ho-skeleton">
                    <div className="ho-skeleton__circle" />
                    <div className="ho-skeleton__lines">
                      <div className="ho-skeleton__line ho-skeleton__line--med" />
                      <div className="ho-skeleton__line ho-skeleton__line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="ho-empty">
                <FaBoxOpen className="ho-empty__icon" />
                <p>
                  {searchQuery ? "No orders match your search."
                    : orders.length === 0 ? "No orders placed yet."
                    : "No orders for this filter."}
                </p>
              </div>
            ) : (
              <div className="ho-list">
                {filteredOrders.map(order => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    selected={selectedOrder?._id === order._id}
                    onClick={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="ho-split__right">
            <OrderDetail
              order={selectedOrder}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          </div>
        </div>
      </div>

      <Footer />

      {confirmModal && (
        <ConfirmModal
          action={confirmModal.action}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading === confirmModal.order._id}
        />
      )}

      <div className={`ho-toast${toast.show ? " ho-toast--visible" : ""}`}>{toast.msg}</div>
    </div>
  );
}
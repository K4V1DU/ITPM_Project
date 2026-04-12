import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMotorcycle,
  FaShoppingBag,
  FaSpinner,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUtensils,
  FaPhone,
  FaClock,
  FaTimesCircle,
  FaSearch,
  FaReceipt,
  FaBoxOpen,
  FaExternalLinkAlt,
  FaFilter,
  FaChevronDown,
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaTag,
  FaStore,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./HostOrders.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const ORDER_API = `${API_BASE}/FoodOrder`;
const ORANGE = "#FF6B2B";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Notification helper — fire-and-forget ────────────────────────────────────
async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${API_BASE}/Notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS = {
  pending:   { bg: "#fff7ed", text: "#c2410c", dot: ORANGE,    border: "#fcd9c4", label: "Pending"   },
  accepted:  { bg: "#f7f7f7", text: "#1b1b1b", dot: "#1b1b1b", border: "#e2e2e2", label: "Accepted"  },
  completed: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", border: "#bbf7d0", label: "Completed" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Cancelled" },
};

const FILTER_OPTIONS = [
  { value: "all",       label: "All Orders" },
  { value: "pending",   label: "Pending"    },
  { value: "accepted",  label: "Accepted"   },
  { value: "completed", label: "Completed"  },
  { value: "cancelled", label: "Cancelled"  },
];

// ─────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────
function ConfirmModal({ action, onConfirm, onCancel, loading }) {
  const isAccept   = action === "accepted";
  const isComplete = action === "completed";
  const isCancel   = action === "cancelled";
  return (
    <div className="ho-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="ho-modal" onClick={(e) => e.stopPropagation()}>
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
            onClick={onConfirm}
            disabled={loading}
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
// STUDENT ICON (for order row — replaces KitchenIcon)
// ─────────────────────────────────────────
function StudentIcon({ order, selected }) {
  const [failed, setFailed] = useState(false);
  const photoId = order.student?.profileImage ?? null;
  const src     = photoId ? `${API_BASE}/Photo/${photoId}` : null;

  const pip = (
    <span className={`ho-row__icon-type${selected ? " ho-row__icon-type--active" : ""}`}>
      {order.orderType === "delivery" ? <FaMotorcycle /> : <FaShoppingBag />}
    </span>
  );

  if (src && !failed) {
    return (
      <div className="ho-row__icon ho-row__icon--img">
        <img
          src={src}
          alt={order.student?.name ?? "Student"}
          className="ho-row__icon-img"
          onError={() => setFailed(true)}
        />
        {pip}
      </div>
    );
  }

  const letter = order.student?.name?.charAt(0)?.toUpperCase();
  return (
    <div className={`ho-row__icon ho-row__icon--letter${selected ? " ho-row__icon--letter-active" : ""}`}>
      {letter ? <span className="ho-row__icon-letter">{letter}</span> : <FaUser />}
      {pip}
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER ROW
// ─────────────────────────────────────────
function OrderRow({ order, selected, onClick }) {
  const name = order.student?.name ?? "Student";
  const s = STATUS[order.status] ?? STATUS.pending;
  return (
    <div
      className={`ho-row${selected ? " ho-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      <StudentIcon order={order} selected={selected} />
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
  const menuId = String(item.menuItemId ?? item.menuItem ?? item.itemId ?? "");

  useEffect(() => {
    if (!menuId) return;
    setImgSrc(null);
    setFailed(false);
    fetch(`${API_BASE}/menuitem/${menuId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        const doc = raw?.data ?? raw?.result ?? raw;
        const photoId = doc?.image ? String(doc.image) : null;
        if (photoId) setImgSrc(`${API_BASE}/Photo/${photoId}`);
      })
      .catch(() => {});
  }, [menuId]);

  if (imgSrc && !failed) {
    return (
      <div className="ho-item-thumb">
        <img src={imgSrc} alt={item.name} className="ho-item-thumb__img" onError={() => setFailed(true)} />
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
// FOOD SERVICE CARD (mirrors AccommodationCard)
// ─────────────────────────────────────────
function FoodServiceCard({ foodService }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!foodService) return null;

  const iconId = foodService.iconImage ?? null;
  const src    = iconId ? `${API_BASE}/Photo/${iconId}` : null;

  return (
    <div className="ho-fs-card">
      <div className="ho-fs-card__img-wrap">
        {src && !imgFailed ? (
          <img
            src={src}
            alt={foodService.kitchenName}
            className="ho-fs-card__img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="ho-fs-card__img-fallback">
            <FaUtensils />
          </div>
        )}
      </div>

      <div className="ho-fs-card__info">
        <div className="ho-fs-card__name">{foodService.kitchenName ?? "—"}</div>
        <div className="ho-fs-card__meta">
          {foodService.cuisineType && (
            <span className="ho-fs-card__tag">
              <FaStore style={{ fontSize: 9 }} /> {foodService.cuisineType}
            </span>
          )}
          {foodService.deliveryFee != null && (
            <span className="ho-fs-card__tag ho-fs-card__tag--price">
              <FaTag style={{ fontSize: 9 }} />
              {foodService.deliveryFee > 0
                ? `LKR ${Number(foodService.deliveryFee).toLocaleString()} delivery`
                : "Free delivery"}
            </span>
          )}
          {foodService.minOrderAmount && (
            <span className="ho-fs-card__tag">
              Min LKR {Number(foodService.minOrderAmount).toLocaleString()}
            </span>
          )}
        </div>
        {foodService.address && (
          <div className="ho-fs-card__address">
            <FaMapMarkerAlt style={{ fontSize: 9, color: ORANGE, flexShrink: 0, marginTop: 1 }} />
            {foodService.address}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER DETAIL PANEL
// ─────────────────────────────────────────
function OrderDetail({ order, onAction, actionLoading, onBack, isMobile, currentUserId, navigate }) {
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError,   setMsgError]   = useState(null);

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
  const name       = student.name ?? "Student";
  const phone      = student.phone ?? null;
  const profileImg = student.profileImage ? `${API_BASE}/Photo/${student.profileImage}` : null;
  const busy       = actionLoading === order._id;

  const lat      = order.location?.coordinates?.[1];
  const lng      = order.location?.coordinates?.[0];
  const showMap  = isDelivery && lat && lng;
  const mapSrc   = showMap ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null;
  const mapsLink = showMap ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  // ── Message student — mirrors HostBooking pattern ──
  const handleMessageStudent = async () => {
    const studentId = student._id ?? (typeof order.student === "string" ? order.student : null);
    if (!studentId || !currentUserId) {
      setMsgError("Cannot open chat — student info missing.");
      return;
    }
    setMsgLoading(true);
    setMsgError(null);
    try {
      const res = await fetch(`${API_BASE}/message/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUserId, receiverId: studentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw  = await res.json();
      const conv = unwrap(raw);
      if (!conv?._id) throw new Error("No conversation ID returned");
      navigate("/Messages", { state: { openConversationId: conv._id } });
    } catch (err) {
      setMsgError("Failed to open chat. Please try again.");
      console.error("[HostOrders] message open failed:", err);
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div className="ho-detail">

      {/* ── Mobile back button ── */}
      {isMobile && (
        <button className="ho-detail__back-btn" onClick={onBack}>
          <FaArrowLeft style={{ fontSize: 13 }} />
          <span>Back to Orders</span>
        </button>
      )}

      {/* ── Order ID bar with status badge ── */}
      <div className="ho-detail__order-id">
        <span className="ho-detail__order-id__text">Order ID&nbsp;&nbsp;{order._id}</span>
        <StatusBadge status={order.status} />
      </div>

      {/* ── Header ── */}
      <div className="ho-detail__header">

        {/* Student info + Message pill on far right */}
        <div className="ho-detail__header-row">
          <div className="ho-detail__customer">
            <div className="ho-detail__avatar">
              {profileImg ? (
                <img src={profileImg} alt={name} className="ho-detail__avatar-img"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="ho-detail__customer-info">
              <div className="ho-detail__customer-name">{name}</div>
              {student.email && (
                <a href={`mailto:${student.email}`} className="ho-detail__email">
                  <FaEnvelope style={{ fontSize: 10 }} /> {student.email}
                </a>
              )}
              {phone ? (
                <a href={`tel:${phone}`} className="ho-detail__phone">
                  <FaPhone style={{ fontSize: 10 }} /> {phone}
                </a>
              ) : (
                <span className="ho-detail__no-phone">No phone number</span>
              )}
            </div>
          </div>

          {/* "Contact host"-style pill button */}
          <button
            className="ho-contact-btn"
            onClick={handleMessageStudent}
            disabled={msgLoading}
            title="Open chat with this student"
          >
            {msgLoading
              ? <FaSpinner className="ho-spin" style={{ fontSize: 13 }} />
              : <FaEnvelope style={{ fontSize: 13 }} />}
            <span>{msgLoading ? "Opening…" : "Message Student"}</span>
          </button>
        </div>

        {/* Inline error if API call fails */}
        {msgError && (
          <div style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            fontSize: 12,
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <FaExclamationTriangle style={{ fontSize: 11, flexShrink: 0 }} />
            {msgError}
          </div>
        )}

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

      <div className="ho-detail__body">

        {/* ── Food Service Details ── */}
        {order.foodService && (
          <div className="ho-detail__section">
            <div className="ho-detail__section-label">Food Service</div>
            <FoodServiceCard foodService={order.foodService} />
          </div>
        )}

        {/* ── Items Ordered ── */}
        <div className="ho-detail__section">
          <div className="ho-detail__section-label">Items Ordered</div>
          <div className="ho-detail__items">
            {order.items?.map((item, i) => (
              <div key={i} className="ho-detail__item">
                <ItemImage item={item} />
                <span className="ho-detail__item-name">{item.name}</span>
                <span className="ho-detail__item-qty-badge">x{item.qty}</span>
                <span className="ho-detail__item-price">LKR {(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="ho-detail__totals">
            <div className="ho-detail__total-row">
              <span>Subtotal</span>
              <span>LKR {(order.subtotal ?? order.total)?.toLocaleString()}</span>
            </div>
            {order.orderType === "delivery" && order.deliveryFee > 0 ? (
              <div className="ho-detail__total-row">
                <span>Delivery fee</span>
                <span>LKR {order.deliveryFee?.toLocaleString()}</span>
              </div>
            ) : (
              <div className="ho-detail__total-row ho-detail__total-row--free">
                <span className="ho-detail__total-free-label">Delivery fee</span>
                <span className="ho-detail__total-free-val">Free</span>
              </div>
            )}
            <div className="ho-detail__total-row ho-detail__total-row--grand">
              <span>Total</span>
              <span className="ho-detail__grand-price">LKR {order.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ── Special Instructions ── */}
        {order.notes && (
          <div className="ho-detail__section">
            <div className="ho-detail__section-label ho-detail__section-label--warn">
              <FaExclamationTriangle className="ho-warn-icon" /> Special Instructions
            </div>
            <div className="ho-detail__notes">{order.notes}</div>
          </div>
        )}

        {/* ── Order Actions ── */}
        {(order.status === "pending" || order.status === "accepted") && (
          <div className="ho-detail__actions">
            {order.status === "pending" && (
              <>
                <button className="ho-action ho-action--primary" onClick={() => onAction(order, "accepted")} disabled={busy}>
                  {busy ? <FaSpinner className="ho-spin" /> : <FaCheckCircle />} Accept Order
                </button>
                <button className="ho-action ho-action--ghost" onClick={() => onAction(order, "cancelled")} disabled={busy}>
                  <FaTimesCircle /> Cancel
                </button>
              </>
            )}
            {order.status === "accepted" && (
              <>
                <button className="ho-action ho-action--dark" onClick={() => onAction(order, "completed")} disabled={busy}>
                  {busy ? <FaSpinner className="ho-spin" /> : <FaCheckCircle />} Mark Completed
                </button>
                <button className="ho-action ho-action--ghost" onClick={() => onAction(order, "cancelled")} disabled={busy}>
                  <FaTimesCircle /> Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Delivery Map ── */}
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
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [lastRefresh,   setLastRefresh]   = useState(Date.now());
  const [toast,         setToast]         = useState({ show: false, msg: "" });
  const [error,         setError]         = useState(null);

  const [mobilePanel, setMobilePanel] = useState("list");
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 1024);

  const toastRef  = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (!userId) navigate("/Login"); }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingOrders(true);
    setError(null);
    fetch(`${ORDER_API}/owner/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw) => {
        const list   = unwrap(raw);
        const arr    = Array.isArray(list?.data ?? list) ? (list?.data ?? list) : [];
        const sorted = arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(sorted);
        setSelectedOrder((prev) => prev ? (sorted.find((o) => o._id === prev._id) ?? sorted[0]) : sorted[0]);
      })
      .catch((err) => {
        if (err === 404) { setOrders([]); return; }
        setError("Failed to load orders. Please try again.");
      })
      .finally(() => setLoadingOrders(false));
  }, [userId, lastRefresh]);

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    if (isMobile) setMobilePanel("detail");
  };

  const handleBack   = () => setMobilePanel("list");
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
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status: action } : o)));
      setSelectedOrder((prev) => prev?._id === order._id ? { ...prev, status: action } : prev);
      showToast(
        action === "accepted"  ? "Order accepted."
        : action === "completed" ? "Order marked as completed."
        : "Order cancelled."
      );

      const studentId   = order.student?._id ?? order.student ?? null;
      const kitchenName = order.foodService?.kitchenName ?? "the kitchen";
      const notifMap = {
        accepted:  { title: "Order Accepted",  message: `Your order from ${kitchenName} has been accepted and is being prepared.` },
        completed: { title: "Order Completed", message: `Your order from ${kitchenName} has been delivered/collected. Enjoy!` },
        cancelled: { title: "Order Cancelled", message: `Your order from ${kitchenName} has been cancelled by the host.` },
      };
      const notif = notifMap[action];
      if (studentId && notif) {
        sendNotification({ recipient: studentId, type: "order_status", title: notif.title, message: notif.message, link: "/StudentOrders", refId: order._id, refType: "FoodOrder" });
      }
    } catch {
      showToast("Failed to update order. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (o.student?.name ?? "").toLowerCase().includes(q)
      || o.items?.some((i) => i.name.toLowerCase().includes(q))
      || (o.foodService?.kitchenName ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const activeFilterLabel = FILTER_OPTIONS.find((f) => f.value === statusFilter)?.label ?? "All Orders";
  const isFiltered = statusFilter !== "all" || searchQuery;

  return (
    <div className="ho-page" style={{ fontFamily: FONT }}>
      <HostNavbar activeHref="/HostOrders" />

      <div className="ho-wrapper">
        <div className="ho-titlebar">
          <div className="ho-titlebar__left">
            <h1 className="ho-titlebar__title">Food Orders</h1>
            <span className="ho-titlebar__count">
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="ho-split">

          {/* LEFT */}
          <div className={`ho-split__left${isMobile && mobilePanel === "detail" ? " ho-split__left--hidden" : ""}`}>

            <div className="ho-searchbar">
              <div className="ho-search-wrap">
                <FaSearch className="ho-search-wrap__icon" />
                <input
                  className="ho-search"
                  placeholder="Search customer, item or kitchen…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="ho-search-clear" onClick={() => setSearchQuery("")}>
                    <FaTimesCircle />
                  </button>
                )}
              </div>

              <div className="ho-filter" ref={filterRef}>
                <button
                  className={`ho-filter__btn${statusFilter !== "all" ? " ho-filter__btn--active" : ""}`}
                  onClick={() => setFilterOpen((prev) => !prev)}
                >
                  <FaFilter style={{ fontSize: 11 }} />
                  <span className="ho-filter__label">{activeFilterLabel}</span>
                  <FaChevronDown className={`ho-filter__chevron${filterOpen ? " ho-filter__chevron--open" : ""}`} />
                </button>

                {filterOpen && (
                  <div className="ho-filter__dropdown">
                    {FILTER_OPTIONS.map((opt) => {
                      const count = opt.value === "all" ? orders.length : orders.filter((o) => o.status === opt.value).length;
                      const s = STATUS[opt.value];
                      return (
                        <button
                          key={opt.value}
                          className={`ho-filter__option${statusFilter === opt.value ? " ho-filter__option--active" : ""}`}
                          onClick={() => { setStatusFilter(opt.value); setFilterOpen(false); }}
                        >
                          <span className="ho-filter__option-left">
                            {s && <span className="ho-filter__dot" style={{ background: s.dot }} />}
                            {opt.label}
                          </span>
                          <span className={`ho-filter__count${statusFilter === opt.value ? " ho-filter__count--active" : ""}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {isFiltered && (
              <div className="ho-active-filters">
                {statusFilter !== "all" && (
                  <span className="ho-filter-pill">
                    {activeFilterLabel}
                    <button className="ho-filter-pill__remove" onClick={() => setStatusFilter("all")}><FaTimesCircle /></button>
                  </span>
                )}
                {searchQuery && (
                  <span className="ho-filter-pill">
                    "{searchQuery}"
                    <button className="ho-filter-pill__remove" onClick={() => setSearchQuery("")}><FaTimesCircle /></button>
                  </span>
                )}
                <button className="ho-filter-clear-all" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
                  Clear all
                </button>
              </div>
            )}

            {error && (
              <div className="ho-error">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {loadingOrders && (
              <div className="ho-skeleton-list">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="ho-skeleton-row">
                    <div className="ho-skeleton ho-skeleton--icon" />
                    <div style={{ flex: 1 }}>
                      <div className="ho-skeleton ho-skeleton--line" style={{ width: "55%", marginBottom: 8 }} />
                      <div className="ho-skeleton ho-skeleton--line" style={{ width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingOrders && !error && filteredOrders.length === 0 && (
              <div className="ho-empty">
                <FaBoxOpen className="ho-empty__icon" />
                <div className="ho-empty__title">
                  {isFiltered ? "No matching orders" : "No orders yet"}
                </div>
                <div className="ho-empty__sub">
                  {isFiltered
                    ? "Try adjusting your search or filter"
                    : "Food orders will appear here once students place them"}
                </div>
                {isFiltered && (
                  <button className="ho-empty__clear" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!loadingOrders && !error && filteredOrders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                selected={selectedOrder?._id === order._id}
                onClick={() => handleOrderClick(order)}
              />
            ))}
          </div>

          {/* RIGHT */}
          <div className={`ho-split__right${isMobile && mobilePanel === "list" ? " ho-split__right--hidden" : ""}`}>
            <OrderDetail
              order={selectedOrder}
              onAction={handleAction}
              actionLoading={actionLoading}
              onBack={handleBack}
              isMobile={isMobile}
              currentUserId={userId}
              navigate={navigate}
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
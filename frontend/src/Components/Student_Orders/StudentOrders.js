import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMotorcycle, FaShoppingBag, FaSpinner,
  FaMapMarkerAlt, FaExclamationTriangle,
  FaCheckCircle, FaUtensils, FaClock,
  FaTimesCircle, FaSearch, FaFilter,
  FaReceipt, FaBoxOpen, FaExternalLinkAlt,
  FaPhone, FaChevronDown, FaArrowLeft,
} from "react-icons/fa";
import "./StudentOrders.css";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";

const API_BASE  = process.env.REACT_APP_API_BASE_URL;
const ORDER_API = `${API_BASE}/FoodOrder`;
const ORANGE    = "#FF6B2B";
const FONT      = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Notification helper — fire-and-forget ────────────────────────────────────
async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${API_BASE}/Notification`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS = {
  pending:   { bg: "#fff7ed", text: "#c2410c", dot: ORANGE,    border: "#fcd9c4", label: "Pending"   },
  accepted:  { bg: "#f0f9ff", text: "#0369a1", dot: "#0ea5e9", border: "#bae6fd", label: "Accepted"  },
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
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span className="so-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className="so-badge__dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────
// ITEM IMAGE
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
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        const doc = raw?.data ?? raw?.result ?? raw;
        const photoId = doc?.image ? String(doc.image) : null;
        if (photoId) setImgSrc(`${API_BASE}/Photo/${photoId}`);
      })
      .catch(() => {});
  }, [menuId]);

  if (imgSrc && !failed) {
    return (
      <div className="so-item-thumb">
        <img src={imgSrc} alt={item.name} className="so-item-thumb__img"
          onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="so-item-thumb so-item-thumb--fallback">
      <FaUtensils />
    </div>
  );
}

// ─────────────────────────────────────────
// KITCHEN ICON (for order row)
// ─────────────────────────────────────────
function KitchenIcon({ order, selected }) {
  const [failed, setFailed] = useState(false);
  const iconId = order.foodService?.iconImage;
  const src    = iconId ? `${API_BASE}/Photo/${iconId}` : null;

  if (src && !failed) {
    return (
      <div className="so-row__icon so-row__icon--img">
        <img
          src={src}
          alt={order.foodService?.kitchenName ?? "Kitchen"}
          className="so-row__icon-img"
          onError={() => setFailed(true)}
        />
        <span className={`so-row__icon-type${selected ? " so-row__icon-type--active" : ""}`}>
          {order.orderType === "delivery" ? <FaMotorcycle /> : <FaShoppingBag />}
        </span>
      </div>
    );
  }

  const letter = order.foodService?.kitchenName?.charAt(0)?.toUpperCase();
  return (
    <div className="so-row__icon so-row__icon--letter">
      {letter ? <span className="so-row__icon-letter">{letter}</span> : <FaUtensils />}
      <span className={`so-row__icon-type${selected ? " so-row__icon-type--active" : ""}`}>
        {order.orderType === "delivery" ? <FaMotorcycle /> : <FaShoppingBag />}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER ROW
// ─────────────────────────────────────────
function OrderRow({ order, selected, onClick }) {
  const kitchen = order.foodService?.kitchenName ?? "Kitchen";
  const s       = STATUS[order.status] ?? STATUS.pending;
  return (
    <div
      className={`so-row${selected ? " so-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      <KitchenIcon order={order} selected={selected} />
      <div className="so-row__body">
        <div className="so-row__top">
          <span className="so-row__name">{kitchen}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className="so-row__meta">
          <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
          <span className="so-sep">·</span>
          <span className="so-row__price">LKR {order.total?.toLocaleString()}</span>
          <span className="so-sep">·</span>
          <span className="so-row__time"><FaClock style={{ fontSize: 9 }} /> {timeAgo(order.createdAt)}</span>
        </div>
        <div className="so-row__type">
          {order.orderType === "delivery"
            ? <><FaMotorcycle style={{ fontSize: 10 }} /> Delivery</>
            : <><FaShoppingBag style={{ fontSize: 10 }} /> Pickup</>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER DETAIL
// ─────────────────────────────────────────
function OrderDetail({ order, onCancel, onBack, isMobile }) {
  if (!order) {
    return (
      <div className="so-detail so-detail--empty">
        <FaReceipt className="so-detail__empty-icon" />
        <p className="so-detail__empty-text">Select an order to view details</p>
      </div>
    );
  }

  const isDelivery  = order.orderType === "delivery";
  const kitchen     = order.foodService ?? {};
  const kitchenImg  = kitchen.iconImage ? photoSrc(kitchen.iconImage) : null;

  const delivLat    = order.location?.coordinates?.[1];
  const delivLng    = order.location?.coordinates?.[0];
  const kitchCoords = kitchen.location?.coordinates;
  const kitchLat    = kitchCoords ? kitchCoords[1] : null;
  const kitchLng    = kitchCoords ? kitchCoords[0] : null;
  const lat         = isDelivery ? delivLat : kitchLat;
  const lng         = isDelivery ? delivLng : kitchLng;
  const showMap     = !!(lat && lng);
  const mapSrc      = showMap ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null;
  const mapsLink    = showMap ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="so-detail">

      {isMobile && (
        <button className="so-detail__back-btn" onClick={onBack}>
          <FaArrowLeft style={{ fontSize: 13 }} />
          <span>Back to Orders</span>
        </button>
      )}

      <div className="so-detail__order-id">
        <span className="so-detail__order-id__text">Order ID&nbsp;&nbsp;{order._id}</span>
      </div>

      <div className="so-detail__header">
        <div className="so-detail__header-row">
          <div className="so-detail__kitchen">
            <div className="so-detail__kitchen-avatar">
              {kitchenImg
                ? <img src={kitchenImg} alt={kitchen.kitchenName} className="so-detail__kitchen-img"
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                : <FaUtensils style={{ fontSize: 18, color: "#aaa" }} />}
            </div>
            <div className="so-detail__kitchen-info">
              <div className="so-detail__kitchen-name">{kitchen.kitchenName ?? "Kitchen"}</div>
              {kitchen.address && (
                <div className="so-detail__kitchen-addr">
                  <FaMapMarkerAlt style={{ fontSize: 10 }} /> {kitchen.address}
                </div>
              )}
              {kitchen.ownerInfo?.phone && (
                <a href={`tel:${kitchen.ownerInfo.phone}`} className="so-detail__kitchen-phone">
                  <FaPhone style={{ fontSize: 9 }} /> {kitchen.ownerInfo.phone}
                </a>
              )}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="so-detail__header-divider" />

        <div className="so-detail__header-meta">
          <span className="so-header-meta__item">
            <FaClock style={{ fontSize: 10 }} />
            {timeAgo(order.createdAt)}
          </span>
          <span className="so-sep">·</span>
          <span className={`so-header-meta__item so-header-meta__item--${isDelivery ? "delivery" : "pickup"}`}>
            {isDelivery ? <FaMotorcycle style={{ fontSize: 11 }} /> : <FaShoppingBag style={{ fontSize: 11 }} />}
            {isDelivery ? "Delivery" : "Pickup"}
          </span>
          <span className="so-sep">·</span>
          <span className="so-header-meta__item">
            {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="so-detail__timeline-wrap">
        <div className="so-detail__timeline">
          {["pending","accepted","completed"].map((step, i) => {
            const isCancelled = order.status === "cancelled";
            const steps       = ["pending","accepted","completed"];
            const currentIdx  = steps.indexOf(order.status);
            const done        = isCancelled ? false : i <= currentIdx;
            const active      = !isCancelled && i === currentIdx;
            const labels      = ["Order Placed", "Being Prepared", isDelivery ? "Delivered" : "Ready for Pickup"];
            return (
              <div key={step} className="so-timeline__step">
                <div className={`so-timeline__dot${isCancelled ? " so-timeline__dot--cancelled" : done ? " so-timeline__dot--done" : ""}${active && order.status !== "completed" ? " so-timeline__dot--active" : ""}`}>
                  {isCancelled
                    ? <FaTimesCircle style={{ fontSize: 10 }} />
                    : done && <FaCheckCircle style={{ fontSize: 10 }} />}
                </div>
                {i < 2 && <div className={`so-timeline__line${isCancelled ? " so-timeline__line--cancelled" : done && i < currentIdx ? " so-timeline__line--done" : ""}`} />}
                <div className={`so-timeline__label${isCancelled ? " so-timeline__label--cancelled" : active && order.status !== "completed" ? " so-timeline__label--active" : (done && (!active || order.status === "completed")) ? " so-timeline__label--done" : ""}`}>
                  {labels[i]}
                </div>
              </div>
            );
          })}
        </div>

        {order.status !== "cancelled" && (
          <div className="so-timeline__bottom-row">
            <div className="so-timeline__status-desc">
              {order.status === "pending" && (
                <><span className="so-timeline__status-desc__dot so-timeline__status-desc__dot--pending" />
                Waiting for the kitchen to accept your order.</>
              )}
              {order.status === "accepted" && (
                <><span className="so-timeline__status-desc__dot so-timeline__status-desc__dot--accepted" />
                {isDelivery
                  ? "Your order is being prepared. The food place will contact you soon."
                  : "Come to the kitchen to collect your food — it will be ready soon!"}</>
              )}
              {order.status === "completed" && (
                <><span className="so-timeline__status-desc__dot so-timeline__status-desc__dot--completed" />
                {isDelivery ? "Your order has been delivered. Enjoy your meal!" : "You collected your food — enjoy your meal!"}</>
              )}
            </div>
            {(order.status === "pending" || order.status === "accepted") && (
              order.status === "pending" ? (
                <button className="so-cancel-btn so-cancel-btn--active" onClick={() => onCancel(order)}>
                  <FaTimesCircle style={{ fontSize: 12 }} /> Cancel Order
                </button>
              ) : (
                <button className="so-cancel-btn so-cancel-btn--disabled" onClick={() => onCancel(order)}>
                  <FaTimesCircle style={{ fontSize: 12 }} /> Cancel Order
                </button>
              )
            )}
          </div>
        )}
        {order.status === "cancelled" && (
          <div className="so-timeline__cancelled">
            <FaTimesCircle style={{ color: "#ef4444", fontSize: 13 }} /> This order was cancelled.
          </div>
        )}
      </div>

      <div className="so-detail__body">
        <div className="so-detail__section">
          <div className="so-detail__section-label">Items Ordered</div>
          <div className="so-detail__items">
            {order.items?.map((item, i) => (
              <div key={i} className="so-detail__item">
                <ItemImage item={item} />
                <span className="so-detail__item-name">{item.name}</span>
                <span className="so-detail__item-qty">x{item.qty}</span>
                <span className="so-detail__item-price">
                  LKR {(item.price * item.qty).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="so-detail__totals">
            <div className="so-detail__total-row">
              <span>Subtotal</span>
              <span>LKR {(order.subtotal ?? order.total)?.toLocaleString()}</span>
            </div>
            {order.orderType === "delivery" && order.deliveryFee > 0
              ? <div className="so-detail__total-row">
                  <span>Delivery fee</span>
                  <span>LKR {order.deliveryFee?.toLocaleString()}</span>
                </div>
              : <div className="so-detail__total-row so-detail__total-row--free">
                  <span className="so-total-free-label">Delivery fee</span>
                  <span className="so-total-free-val">Free</span>
                </div>}
            <div className="so-detail__total-row so-detail__total-row--grand">
              <span>Total</span>
              <span className="so-detail__grand-price">LKR {order.total?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="so-detail__section">
            <div className="so-detail__section-label so-detail__section-label--warn">
              <FaExclamationTriangle className="so-warn-icon" /> Special Instructions
            </div>
            <div className="so-detail__notes">{order.notes}</div>
          </div>
        )}

        {showMap && mapSrc && (
          <div className="so-detail__section so-detail__section--map">
            <div className="so-detail__section-label">
              {isDelivery ? "Your Delivery Location" : "Pickup Location"}
            </div>
            <div className="so-map-wrap">
              <iframe
                className="so-map-iframe"
                src={mapSrc}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={isDelivery ? "Delivery location" : "Pickup location"}
              />
              <div className="so-map-card">
                <FaMapMarkerAlt style={{ color: isDelivery ? ORANGE : "#0369a1", fontSize: 16 }} />
                <div>
                  {isDelivery ? (
                    <>
                      <div className="so-map-card__name">Your delivery address</div>
                      <div className="so-map-card__sub">{lat?.toFixed(5)}, {lng?.toFixed(5)}</div>
                    </>
                  ) : (
                    <>
                      <div className="so-map-card__name">{kitchen.kitchenName ?? "Kitchen"}</div>
                      <div className="so-map-card__sub">{kitchen.address ?? "Come here to collect your order"}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {mapsLink && (
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="so-map-link">
                <FaExternalLinkAlt style={{ fontSize: 11 }} />
                {isDelivery ? "Open in Google Maps" : "Get directions to kitchen"}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CANCEL MODAL
// ─────────────────────────────────────────
function CancelModal({ order, onConfirm, onClose, loading }) {
  const isPending   = order?.status === "pending";
  const kitchenName = order?.foodService?.kitchenName ?? "the kitchen";
  return (
    <div className="so-overlay" onClick={!loading ? onClose : undefined}>
      <div className="so-modal" onClick={e => e.stopPropagation()}>
        <div className={`so-modal__icon-wrap${isPending ? " so-modal__icon-wrap--danger" : " so-modal__icon-wrap--info"}`}>
          {isPending ? <FaTimesCircle /> : <FaExclamationTriangle />}
        </div>
        <h3 className="so-modal__title">
          {isPending ? "Cancel Order?" : "Can't Cancel"}
        </h3>
        <p className="so-modal__desc">
          {isPending
            ? "Are you sure you want to cancel this order? This cannot be undone."
            : `Your order is already being prepared by ${kitchenName}. To cancel, please contact the kitchen directly.`}
        </p>
        {isPending ? (
          <div className="so-modal__btns">
            <button className="so-modal__btn so-modal__btn--ghost" onClick={onClose} disabled={loading}>Keep Order</button>
            <button className="so-modal__btn so-modal__btn--danger" onClick={onConfirm} disabled={loading}>
              {loading ? <><FaSpinner className="so-spin" /> Cancelling…</> : "Yes, Cancel"}
            </button>
          </div>
        ) : (
          <div className="so-modal__btns">
            <button className="so-modal__btn so-modal__btn--ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function StudentOrders() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [orders,        setOrders]        = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [lastRefresh,   setLastRefresh]   = useState(Date.now());
  const [toast,         setToast]         = useState({ show: false, msg: "" });
  const [error,         setError]         = useState(null);
  const [cancelModal,   setCancelModal]   = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

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
    fetch(`${ORDER_API}/student/${userId}`)
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

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    if (isMobile) setMobilePanel("detail");
  };

  const handleBack = () => setMobilePanel("list");

  const handleCancelRequest = (order) => setCancelModal(order);

  const handleCancelConfirm = async () => {
    if (!cancelModal || cancelModal.status !== "pending") return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${ORDER_API}/${cancelModal._id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error();
      setOrders(prev => prev.map(o => o._id === cancelModal._id ? { ...o, status: "cancelled" } : o));
      setSelectedOrder(prev => prev?._id === cancelModal._id ? { ...prev, status: "cancelled" } : prev);
      showToast("Order cancelled.");

      const hostId      = cancelModal.foodService?.owner?._id ?? cancelModal.foodService?.owner ?? null;
      const kitchenName = cancelModal.foodService?.kitchenName ?? "your kitchen";
      if (hostId) {
        sendNotification({
          recipient: hostId, type: "order_status",
          title: "Order Cancelled by Student",
          message: `A student has cancelled their order at ${kitchenName}.`,
          link: "/HostOrders", refId: cancelModal._id, refType: "FoodOrder",
        });
      }
      if (userId) {
        sendNotification({
          recipient: userId, type: "order_status",
          title: "Order Cancelled",
          message: `Your order from ${kitchenName} has been cancelled successfully.`,
          link: "/StudentOrders", refId: cancelModal._id, refType: "FoodOrder",
        });
      }
      setCancelModal(null);
    } catch {
      showToast("Failed to cancel. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (o.foodService?.kitchenName ?? "").toLowerCase().includes(q)
      || o.items?.some(i => i.name.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const activeFilterLabel = FILTER_OPTIONS.find(f => f.value === statusFilter)?.label ?? "All Orders";
  const isFiltered = statusFilter !== "all" || searchQuery;

  return (
    <div className="so-page" style={{ fontFamily: FONT }}>

      <StudentNavbar activeTab="Orders" />

      <div className="so-wrapper">
        <div className="so-split">

          {/* LEFT — order list */}
          <div className={`so-split__left${isMobile && mobilePanel === "detail" ? " so-split__left--hidden" : ""}`}>

            <div className="so-searchbar">
              <div className="so-search-wrap">
                <FaSearch className="so-search-wrap__icon" />
                <input
                  className="so-search"
                  placeholder="Search orders…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="so-search-clear" onClick={() => setSearchQuery("")}>
                    <FaTimesCircle />
                  </button>
                )}
              </div>

              <div className="so-filter" ref={filterRef}>
                <button
                  className={`so-filter__btn${statusFilter !== "all" ? " so-filter__btn--active" : ""}`}
                  onClick={() => setFilterOpen(prev => !prev)}
                >
                  <FaFilter style={{ fontSize: 11 }} />
                  <span className="so-filter__label">{activeFilterLabel}</span>
                  <FaChevronDown className={`so-filter__chevron${filterOpen ? " so-filter__chevron--open" : ""}`} />
                </button>

                {filterOpen && (
                  <div className="so-filter__dropdown">
                    {FILTER_OPTIONS.map(opt => {
                      const count = opt.value === "all"
                        ? orders.length
                        : orders.filter(o => o.status === opt.value).length;
                      const s = STATUS[opt.value];
                      return (
                        <button
                          key={opt.value}
                          className={`so-filter__option${statusFilter === opt.value ? " so-filter__option--active" : ""}`}
                          onClick={() => { setStatusFilter(opt.value); setFilterOpen(false); }}
                        >
                          <span className="so-filter__option-left">
                            {s && <span className="so-filter__dot" style={{ background: s.dot }} />}
                            {opt.label}
                          </span>
                          <span className={`so-filter__count${statusFilter === opt.value ? " so-filter__count--active" : ""}`}>
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
              <div className="so-active-filters">
                {statusFilter !== "all" && (
                  <span className="so-filter-pill">
                    {activeFilterLabel}
                    <button className="so-filter-pill__remove" onClick={() => setStatusFilter("all")}>
                      <FaTimesCircle />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="so-filter-pill">
                    "{searchQuery}"
                    <button className="so-filter-pill__remove" onClick={() => setSearchQuery("")}>
                      <FaTimesCircle />
                    </button>
                  </span>
                )}
                <button className="so-filter-clear-all"
                  onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
                  Clear all
                </button>
              </div>
            )}

            {error && (
              <div className="so-error">
                <FaExclamationTriangle /> {error}
              </div>
            )}

            {loadingOrders && (
              <div className="so-skeleton-list">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="so-skeleton-row">
                    <div className="so-skeleton so-skeleton--icon" />
                    <div style={{ flex: 1 }}>
                      <div className="so-skeleton so-skeleton--line" style={{ width: "55%", marginBottom: 8 }} />
                      <div className="so-skeleton so-skeleton--line" style={{ width: "80%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingOrders && !error && filteredOrders.length === 0 && (
              <div className="so-empty">
                <FaBoxOpen className="so-empty__icon" />
                <div className="so-empty__title">
                  {isFiltered ? "No matching orders" : "No orders yet"}
                </div>
                <div className="so-empty__sub">
                  {isFiltered
                    ? "Try adjusting your search or filter"
                    : "Your food orders will appear here once you place one"}
                </div>
                {isFiltered && (
                  <button className="so-empty__clear"
                    onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {!loadingOrders && filteredOrders.map(order => (
              <OrderRow
                key={order._id}
                order={order}
                selected={selectedOrder?._id === order._id}
                onClick={() => handleOrderClick(order)}
              />
            ))}
          </div>

          {/* RIGHT — detail */}
          <div className={`so-split__right${isMobile && mobilePanel === "list" ? " so-split__right--hidden" : ""}`}>
            <OrderDetail
              order={selectedOrder}
              onCancel={handleCancelRequest}
              onBack={handleBack}
              isMobile={isMobile}
            />
          </div>

        </div>
      </div>

      <Footer />

      <div className={`so-toast${toast.show ? " so-toast--visible" : ""}`}>{toast.msg}</div>

      {cancelModal && (
        <CancelModal
          order={cancelModal}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelModal(null)}
          loading={cancelLoading}
        />
      )}
    </div>
  );
}
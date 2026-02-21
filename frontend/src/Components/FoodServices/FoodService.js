import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  FaAirbnb, FaBars, FaUser,
  FaFacebookF, FaTwitter, FaInstagram,
  FaCog, FaSignOutAlt, FaEnvelope,
  FaMotorcycle, FaShoppingBag, FaPen,
  FaSpinner, FaExclamationTriangle, FaTimes,
} from "react-icons/fa";
import "./FoodService.css";

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API_BASE        = "http://localhost:5000";
const CURRENT_USER_ID = "6991714fa19b70085fffefbc"; // replace with auth later

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const PINK = "#FF385C";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const BG_CYCLE = [
  "linear-gradient(135deg,#fff5f0,#fde8e8)",
  "linear-gradient(135deg,#fff8e1,#fef3c7)",
  "linear-gradient(135deg,#f0fdf4,#dcfce7)",
  "linear-gradient(135deg,#f0f9ff,#dbeafe)",
  "linear-gradient(135deg,#fdf4ff,#f3e8ff)",
  "linear-gradient(135deg,#fff7ed,#fed7aa)",
];

const CAT_EMOJI  = { Breakfast: "🍳", Lunch: "🥗", Dinner: "🍗", Snacks: "🌶", Drinks: "🥤", Dessert: "🍮" };
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];

const TAG_STYLE = {
  Spicy:         { color: "#b91c1c", background: "#fff1f2", border: "1px solid #fecaca" },
  Vegetarian:    { color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0" },
  Vegan:         { color: "#166534", background: "#dcfce7", border: "1px solid #86efac" },
  "Gluten-Free": { color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a" },
};
const TAG_ICON   = { Spicy: "🌶", Vegetarian: "🥦", Vegan: "🌱", "Gluten-Free": "🌾" };
const STAR_HINTS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const AVATAR_COLORS = ["#1a1a2e","#6a3093","#11998e","#c94b4b","#f7971e","#1d4350","#0f3460","#e94560","#533483","#2b5876"];

// Minimum comment length to show "Show more" button
const SHOW_MORE_THRESHOLD = 120;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const photoSrc = (photoId) => photoId ? `${API_BASE}/Photo/${photoId}` : null;

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Unwrap { success, data: X } → X, or return raw if already the object */
function unwrap(raw) {
  return raw?.data ?? raw?.result ?? raw;
}

/**
 * Check if current time is within a menu item's available hours.
 * AvailableHours.open / .close are strings like "08:00 AM", "09:30 PM"
 */
function isItemAvailableNow(item) {
  // If the item's own isAvailable flag is false, respect that
  if (!item.isAvailable) return false;

  const open  = item.AvailableHours?.open;
  const close = item.AvailableHours?.close;
  if (!open || !close) return item.isAvailable;

  const parseTime = (str) => {
    // "08:00 AM" → minutes since midnight
    const [time, period] = str.trim().split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const now   = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin  = parseTime(open);
  const closeMin = parseTime(close);

  // Handle overnight (e.g. 10 PM – 2 AM)
  if (openMin <= closeMin) {
    return nowMin >= openMin && nowMin < closeMin;
  } else {
    return nowMin >= openMin || nowMin < closeMin;
  }
}

// ─────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────
function Skeleton({ w = "100%", h = 18, radius = 8, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, marginBottom: mb,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "fsSkeleton 1.4s ease infinite",
    }} />
  );
}

// ─────────────────────────────────────────
// DIETARY TAG
// ─────────────────────────────────────────
function DietTag({ tag }) {
  return (
    <span className="fs-diet-tag" style={TAG_STYLE[tag]}>
      {TAG_ICON[tag]} {tag}
    </span>
  );
}

// ─────────────────────────────────────────
// STAR RATER
// ─────────────────────────────────────────
function StarRater({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="fs-star-rater">
      <div className="fs-star-rater__label">Your Rating</div>
      <div className="fs-star-rater__stars">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button"
            className={`fs-star-rater__star${display >= n ? " fs-star-rater__star--active" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            aria-label={`${n} star`}
          >⭐</button>
        ))}
      </div>
      <div className="fs-star-rater__hint">
        {display ? STAR_HINTS[display] : "Tap a star to rate"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REVIEW MODAL
// ─────────────────────────────────────────
function ReviewModal({ onClose, onSubmit, submitting }) {
  const [stars, setStars] = useState(0);
  const [text,  setText]  = useState("");
  const MAX = 400;
  const canSubmit = stars > 0 && text.trim().length >= 10 && !submitting;

  return (
    <div className="fs-review-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fs-review-modal">
        <div className="fs-review-modal__header">
          <div>
            <div className="fs-review-modal__title">Leave a Review</div>
            <div className="fs-review-modal__subtitle">Share your experience with others</div>
          </div>
          <button className="fs-review-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="fs-review-modal__body">
          <StarRater value={stars} onChange={setStars} />
          <div className="fs-review-field">
            <div className="fs-review-field__label">Your Review</div>
            <textarea
              className="fs-review-field__textarea"
              placeholder="Tell others about your experience — the food, delivery speed, flavour… (min 10 characters)"
              value={text} maxLength={MAX}
              onChange={e => setText(e.target.value)}
              style={{ fontFamily: FONT }}
            />
            <div className="fs-review-field__char-count">{text.length} / {MAX}</div>
          </div>
          <button
            className="fs-review-submit-btn"
            disabled={!canSubmit}
            onClick={() => onSubmit({ stars, text: text.trim() })}
            style={{ fontFamily: FONT }}
          >
            {submitting
              ? <><FaSpinner className="fs-spin" style={{ fontSize: 14 }} /> Submitting…</>
              : <><FaPen style={{ fontSize: 13 }} /> Submit Review</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REVIEW CARD
// ─────────────────────────────────────────
function ReviewCard({ review, index, total, expanded, onToggle }) {
  const reviewer   = review.reviewer;
  const name       = reviewer?.name ?? "Guest";
  const joined     = reviewer?.createdAt ? new Date(reviewer.createdAt).getFullYear() : null;
  const yearsOn    = joined ? new Date().getFullYear() - joined : 0;
  const color      = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const date       = review.createdAt
    ? new Date(review.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "Recent";
  const isLeft        = index % 2 === 0;
  const hasBorderBtm  = index < total - 2;
  // Only show "Show more" if comment is long enough to be clipped
  const isLong        = (review.comment?.length ?? 0) > SHOW_MORE_THRESHOLD;

  // Reviewer profile image: fetched separately and stored on reviewer object
  const avatarSrc = reviewer?._profilePhotoUrl ?? null;

  return (
    <div className={`fs-reviews__card${hasBorderBtm ? " fs-reviews__card--border-bottom" : ""}`}>
      <div className={isLeft ? "fs-reviews__card-inner-left" : "fs-reviews__card-inner-right"}>
        <div className="fs-reviews__author">
          <div className="fs-reviews__avatar" style={{ background: color }}>
            {avatarSrc
              ? <img src={avatarSrc} alt={name}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              : name[0].toUpperCase()}
          </div>
          <div>
            <div className="fs-reviews__author-name">
              {name}
              {review.isNew && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 700,
                  background: "#dcfce7", color: "#166534",
                  border: "1px solid #86efac", padding: "2px 8px", borderRadius: 20,
                }}>New</span>
              )}
            </div>
            <div className="fs-reviews__author-years">
              {yearsOn > 0 ? `${yearsOn} year${yearsOn !== 1 ? "s" : ""} on Bodima` : "New member"}
            </div>
          </div>
        </div>

        <div className="fs-reviews__stars-row">
          <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
          <span style={{ color: "#ccc" }}>·</span>
          <span className="fs-reviews__date">{date}</span>
        </div>

        <div className={`fs-reviews__text${(!expanded && isLong) ? " fs-reviews__text--clamped" : ""}`}>
          {review.comment}
        </div>
        {/* Only show toggle button if comment is long enough */}
        {isLong && (
          <button className="fs-reviews__toggle-btn" style={{ fontFamily: FONT }} onClick={onToggle}>
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ALL REVIEWS MODAL
// ─────────────────────────────────────────
function AllReviewsModal({ reviews, onClose }) {
  const [expanded, setExpanded] = useState({});

  return (
    <div className="fs-review-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 760,
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        animation: "fadeInScale 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, background: "#fff", zIndex: 10,
          padding: "22px 28px 16px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#000" }}>
              All Reviews
            </div>
            <div style={{ fontSize: 13, color: "#757575", marginTop: 2 }}>
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid #e2e2e2", background: "#fff",
            fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><FaTimes /></button>
        </div>

        {/* Reviews list — single column in modal */}
        <div style={{ padding: "0 28px 28px" }}>
          {reviews.map((r, i) => {
            const name      = r.reviewer?.name ?? "Guest";
            const joined    = r.reviewer?.createdAt ? new Date(r.reviewer.createdAt).getFullYear() : null;
            const yearsOn   = joined ? new Date().getFullYear() - joined : 0;
            const color     = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
            const date      = r.createdAt
              ? new Date(r.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" })
              : "Recent";
            const avatarSrc = r.reviewer?._profilePhotoUrl ?? null;
            const isLong    = (r.comment?.length ?? 0) > SHOW_MORE_THRESHOLD;
            const exp       = !!expanded[r._id ?? i];

            return (
              <div key={r._id ?? i} style={{
                padding: "24px 0",
                borderBottom: i < reviews.length - 1 ? "1px solid #f0f0f0" : "none",
              }}>
                <div className="fs-reviews__author">
                  <div className="fs-reviews__avatar" style={{ background: color }}>
                    {avatarSrc
                      ? <img src={avatarSrc} alt={name}
                          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                      : name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="fs-reviews__author-name">{name}</div>
                    <div className="fs-reviews__author-years">
                      {yearsOn > 0 ? `${yearsOn} year${yearsOn !== 1 ? "s" : ""} on Bodima` : "New member"}
                    </div>
                  </div>
                </div>
                <div className="fs-reviews__stars-row" style={{ marginTop: 10 }}>
                  <span>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span style={{ color: "#ccc" }}>·</span>
                  <span className="fs-reviews__date">{date}</span>
                </div>
                <div className={`fs-reviews__text${(!exp && isLong) ? " fs-reviews__text--clamped" : ""}`}
                  style={{ marginTop: 10 }}>
                  {r.comment}
                </div>
                {isLong && (
                  <button className="fs-reviews__toggle-btn" style={{ fontFamily: FONT }}
                    onClick={() => setExpanded(e => ({ ...e, [r._id ?? i]: !e[r._id ?? i] }))}>
                    {exp ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MENU ITEM ROW
// ─────────────────────────────────────────
function MenuItemRow({ item, onOpen, onAdd, isLast, bgIndex }) {
  // Check time-based availability
  const availableNow = isItemAvailableNow(item);
  const bg = BG_CYCLE[bgIndex % BG_CYCLE.length];

  const openTime  = item.AvailableHours?.open  ?? "—";
  const closeTime = item.AvailableHours?.close ?? "—";

  return (
    <div
      onClick={() => availableNow && onOpen(item)}
      className={[
        "fs-menu-item",
        isLast       ? "fs-menu-item--last"        : "",
        !availableNow ? "fs-menu-item--unavailable" : "",
      ].join(" ")}
    >
      <div className="fs-menu-item__info">
        <div className="fs-menu-item__name">
          {item.name}
          {!availableNow && (
            <span className="fs-menu-item__unavail-badge">
              {!item.isAvailable ? "○ Unavailable" : `○ Available ${openTime}`}
            </span>
          )}
        </div>
        {item.dietaryTags?.length > 0 && (
          <div className="fs-menu-item__tags">
            {item.dietaryTags.map(t => <DietTag key={t} tag={t} />)}
          </div>
        )}
        <div className="fs-menu-item__description">{item.description}</div>
        <div className="fs-menu-item__meta">
          <span className="fs-menu-item__meta-text">⏱ {item.prepTime ?? 15} min prep</span>
          <span className="fs-menu-item__meta-text">🕐 {openTime} – {closeTime}</span>
        </div>
        <div className="fs-menu-item__price-row">
          <span className="fs-menu-item__price">LKR {item.price?.toLocaleString()}.00</span>
        </div>
      </div>

      <div className="fs-menu-item__image" style={{ background: bg }}>
        {item.image
          ? <img src={photoSrc(item.image)} alt={item.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
              onError={e => { e.currentTarget.style.display = "none"; }}
            />
          : <span style={{ fontSize: 40 }}>{CAT_EMOJI[item.category] ?? "🍽"}</span>}
        {availableNow && (
          <button className="fs-menu-item__add-btn"
            onClick={e => { e.stopPropagation(); onAdd(item); }}>+</button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER TOGGLE
// ─────────────────────────────────────────
function OrderTypeToggle({ value, onChange }) {
  return (
    <div className="fs-order-toggle">
      {[
        { key: "delivery", label: "Delivery", icon: <FaMotorcycle style={{ fontSize: 13 }} /> },
        { key: "pickup",   label: "Pickup",   icon: <FaShoppingBag style={{ fontSize: 12 }} /> },
      ].map(({ key, label, icon }) => (
        <button key={key} onClick={() => onChange(key)}
          className={`fs-order-toggle__btn${value === key ? " fs-order-toggle__btn--active" : ""}`}
          style={{ fontFamily: FONT }}
        >{icon} {label}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function FoodService() {
  const { id: FOOD_SERVICE_ID } = useParams();

  // ── API state ─────────────────────────
  const [service,     setService]     = useState(null);
  const [menuItems,   setMenuItems]   = useState([]);
  const [reviews,     setReviews]     = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // ── Loading / error ───────────────────
  const [loadingService,  setLoadingService]  = useState(true);
  const [loadingMenu,     setLoadingMenu]     = useState(true);
  const [loadingReviews,  setLoadingReviews]  = useState(true);
  const [errorService,    setErrorService]    = useState(null);

  // ── UI state ──────────────────────────
  const [activeTab,        setActiveTab]        = useState("food");
  const [activeNav,        setActiveNav]        = useState(CATEGORIES[0]);
  const [cart,             setCart]             = useState({});
  const [modal,            setModal]            = useState(null);
  const [modalQty,         setModalQty]         = useState(1);
  const [toast,            setToast]            = useState({ show: false, msg: "" });
  const [expanded,         setExpanded]         = useState({});
  const [showDropdown,     setShowDropdown]     = useState(false);
  const [orderType,        setOrderType]        = useState("delivery");
  const [showReviewModal,  setShowReviewModal]  = useState(false);
  const [showAllReviews,   setShowAllReviews]   = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const sectionRefs = useRef({});
  const toastTimer  = useRef(null);
  const dropdownRef = useRef(null);

  // ─────────────────────────────────────
  // FETCH: FoodService
  // ─────────────────────────────────────
  useEffect(() => {
    if (!FOOD_SERVICE_ID) { setLoadingService(false); return; }
    setLoadingService(true);
    setErrorService(null);
    fetch(`${API_BASE}/Foodservice/${FOOD_SERVICE_ID}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(raw => {
        const data = unwrap(raw);
        setService(data);
        if (!data.deliveryAvailable && data.pickupAvailable) setOrderType("pickup");
      })
      .catch(err => setErrorService(err.message))
      .finally(() => setLoadingService(false));
  }, [FOOD_SERVICE_ID]);

  // ─────────────────────────────────────
  // FETCH: MenuItems
  // ─────────────────────────────────────
  useEffect(() => {
    if (!service?.menu?.length) { setLoadingMenu(false); return; }
    setLoadingMenu(true);
    Promise.all(
      service.menu.map(id =>
        fetch(`${API_BASE}/menuitem/${id}`)
          .then(r => r.json())
          .then(raw => unwrap(raw))
          .catch(() => null)
      )
    )
      .then(items => setMenuItems(items.filter(Boolean)))
      .finally(() => setLoadingMenu(false));
  }, [service]);

  // ─────────────────────────────────────
  // FETCH: Reviews for this food service
  // Then fetch each reviewer's profile image via /user/:id → /Photo/:photoId
  // ─────────────────────────────────────
  useEffect(() => {
    if (!service) return;
    setLoadingReviews(true);

    const loadReviews = async () => {
      let list = [];

      // Try query param first: GET /review?foodService=<id>
      try {
        const r   = await fetch(`${API_BASE}/review?foodService=${FOOD_SERVICE_ID}`);
        const raw = await r.json();
        const docs = unwrap(raw);
        list = Array.isArray(docs) ? docs : [];
      } catch (_) {
        // Fallback: GET /review/foodservice/<id>
        try {
          const r   = await fetch(`${API_BASE}/review/foodservice/${FOOD_SERVICE_ID}`);
          const raw = await r.json();
          const docs = unwrap(raw);
          list = Array.isArray(docs) ? docs : [];
        } catch (__) {
          list = [];
        }
      }

      // Filter to only reviews that belong to this food service
      // (in case the backend returns mixed results)
      list = list.filter(rv =>
        !rv.foodService ||
        rv.foodService === FOOD_SERVICE_ID ||
        rv.foodService?._id === FOOD_SERVICE_ID
      );

      // For each review, fetch the reviewer's profile photo
      const enriched = await Promise.all(
        list.map(async (rv) => {
          const reviewerId = rv.reviewer?._id ?? rv.reviewer;
          if (!reviewerId) return rv;

          try {
            const ur  = await fetch(`${API_BASE}/user/${reviewerId}`);
            const raw = await ur.json();
            const user = unwrap(raw);

            // profileImage on user schema is a String (URL or filename)
            // if it's a Photo ObjectId, build the /Photo/:id URL instead
            let photoUrl = null;
            if (user?.profileImage) {
              // If it looks like a Mongo ObjectId (24 hex chars) → use Photo endpoint
              if (/^[a-f\d]{24}$/i.test(user.profileImage)) {
                photoUrl = photoSrc(user.profileImage);
              } else {
                photoUrl = user.profileImage; // already a URL/path
              }
            }

            return {
              ...rv,
              reviewer: {
                ...(typeof rv.reviewer === "object" ? rv.reviewer : {}),
                _id:              reviewerId,
                name:             user?.name ?? "Guest",
                createdAt:        user?.createdAt,
                _profilePhotoUrl: photoUrl,
              },
            };
          } catch (_) {
            return rv;
          }
        })
      );

      setReviews(enriched);
    };

    loadReviews().finally(() => setLoadingReviews(false));
  }, [service]);

  // ─────────────────────────────────────
  // FETCH: Current User
  // ─────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/user/${CURRENT_USER_ID}`)
      .then(r => r.json())
      .then(raw => setCurrentUser(unwrap(raw)))
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────
  // CART
  // ─────────────────────────────────────
  const addToCart = (item) => {
    setCart(prev => ({ ...prev, [item._id]: { ...item, qty: (prev[item._id]?.qty || 0) + 1 } }));
    showToast(`Added "${item.name}" to cart`);
  };
  const changeQty = (id, delta) => {
    setCart(prev => {
      const qty = (prev[id]?.qty || 0) + delta;
      if (qty <= 0) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: { ...prev[id], qty } };
    });
  };
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  // ─────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────
  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ show: false, msg: "" }), 2400);
  };

  // ─────────────────────────────────────
  // ITEM MODAL
  // ─────────────────────────────────────
  const openModal  = (item) => { setModal(item); setModalQty(1); };
  const closeModal = ()     => setModal(null);
  const addFromModal = () => {
    for (let i = 0; i < modalQty; i++) addToCart(modal);
    closeModal();
  };

  // ─────────────────────────────────────
  // SCROLL SPY
  // ─────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      let cur = CATEGORIES[0];
      CATEGORIES.forEach(cat => {
        const el = sectionRefs.current[`cat-${cat}`];
        if (el && el.getBoundingClientRect().top < 140) cur = cat;
      });
      setActiveNav(cur);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ─────────────────────────────────────
  // DROPDOWN OUTSIDE CLICK
  // ─────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─────────────────────────────────────
  // SUBMIT REVIEW
  // ─────────────────────────────────────
  const handleReviewSubmit = async ({ stars, text }) => {
    setReviewSubmitting(true);
    try {
      const raw   = await apiPost("/review", {
        reviewer:    CURRENT_USER_ID,
        foodService: FOOD_SERVICE_ID,
        rating:      stars,
        comment:     text,
      });
      const saved = unwrap(raw);

      // Build reviewer with current user's photo
      let photoUrl = null;
      if (currentUser?.profileImage) {
        photoUrl = /^[a-f\d]{24}$/i.test(currentUser.profileImage)
          ? photoSrc(currentUser.profileImage)
          : currentUser.profileImage;
      }

      setReviews(prev => [{
        ...saved,
        _id:       saved._id ?? Date.now().toString(),
        reviewer:  {
          _id:              CURRENT_USER_ID,
          name:             currentUser?.name ?? "You",
          createdAt:        currentUser?.createdAt,
          _profilePhotoUrl: photoUrl,
        },
        createdAt: saved.createdAt ?? new Date().toISOString(),
        isNew:     true,
      }, ...prev]);

      setShowReviewModal(false);
      showToast("Thanks for your review! 🎉");
    } catch (err) {
      showToast("Failed to submit — please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ─────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────
  const kitchenName = service?.kitchenName   ?? "Loading…";
  const address     = service?.address       ?? "";
  const isOpen      = service?.isAvailable   ?? false;
  const closeTime   = service?.operatingHours?.close ?? "10:00 PM";
  const ratingAvg   = service?.ratingAverage ?? 0;
  const ratingCount = service?.ratingCount   ?? 0;
  const canDeliver  = service?.deliveryAvailable ?? true;
  const canPickup   = service?.pickupAvailable   ?? true;
  const coords      = service?.location?.coordinates;
  const mapLat      = coords ? coords[1] : 6.9020;
  const mapLng      = coords ? coords[0] : 79.9667;
  const mapSrc      = `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=16&output=embed`;
  const deliveryFee = orderType === "delivery" ? 150 : 0;
  const orderTotal  = cartTotal + deliveryFee;

  // Max 4 reviews shown on page; rest in modal
  const previewReviews = reviews.slice(0, 4);

  // ─────────────────────────────────────
  // GUARDS
  // ─────────────────────────────────────
  if (!FOOD_SERVICE_ID) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 16, fontFamily: FONT }}>
        <FaExclamationTriangle style={{ fontSize: 40, color: PINK }} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>No food service ID in URL</div>
        <div style={{ fontSize: 14, color: "#757575" }}>Expected: <code>/FoodService/&lt;id&gt;</code></div>
      </div>
    );
  }

  if (errorService) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 16, fontFamily: FONT }}>
        <FaExclamationTriangle style={{ fontSize: 40, color: PINK }} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Failed to load</div>
        <div style={{ fontSize: 14, color: "#757575" }}>{errorService}</div>
        <button onClick={() => window.location.reload()} style={{
          padding: "10px 24px", background: PINK, color: "#fff", border: "none",
          borderRadius: 10, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>Retry</button>
      </div>
    );
  }

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT, background: "#fff", color: "#1b1b1b", fontSize: 14, lineHeight: 1.5 }}>

      {/* ══ NAVBAR ══ */}
      <nav className="fs-nav">
        <div className="fs-nav__left">
          <a href="#" className="fs-nav__logo"><FaAirbnb /> Bodima</a>
          <div className="fs-nav__tabs">
            {[
              { key: "boardings",   label: "Boardings" },
              { key: "food",        label: "Food Services" },
              { key: "experiences", label: "Online Experiences" },
            ].map(({ key, label }) => {
              const active = activeTab === key;
              return (
                <a key={key} href="#"
                  onClick={e => { e.preventDefault(); setActiveTab(key); }}
                  className={`fs-nav__tab${active ? " fs-nav__tab--active" : ""}`}
                >
                  {label}
                  {active && <span className="fs-nav__tab-underline" />}
                </a>
              );
            })}
          </div>
        </div>
        <div className="fs-nav__right">
          <button className="fs-nav__host-btn" style={{ fontFamily: FONT }}>Become a Host</button>
          <div className="fs-nav__icon-btn" title={currentUser?.name}>
            {currentUser?._profilePhotoUrl
              ? <img src={currentUser._profilePhotoUrl} alt="me"
                  style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              : <FaUser />}
          </div>
          <div ref={dropdownRef} className="fs-dropdown">
            <div className="fs-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}>
              <FaBars />
            </div>
            {showDropdown && (
              <div className="fs-dropdown__menu">
                {[
                  { icon: <FaUser style={{ opacity: 0.75, fontSize: 15 }} />,     label: "Profile" },
                  { icon: <FaEnvelope style={{ opacity: 0.75, fontSize: 15 }} />, label: "Messages" },
                ].map(({ icon, label }) => (
                  <div key={label} className="fs-dropdown__item">{icon} {label}</div>
                ))}
                <div className="fs-dropdown__divider" />
                <div className="fs-dropdown__item">
                  <FaCog style={{ opacity: 0.75, fontSize: 15 }} /> Settings
                </div>
                <div className="fs-dropdown__item fs-dropdown__item--danger">
                  <FaSignOutAlt style={{ opacity: 0.75, fontSize: 15 }} /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div className="fs-hero">
        {service?.BackgroundImage
          ? <img src={photoSrc(service.BackgroundImage)} alt="banner"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", zIndex: 0 }} />
          : <><div className="fs-hero__dots" /><div className="fs-hero__gradient" /></>}
        <span className="fs-hero__emoji" style={{ zIndex: 1 }}>🍗</span>
      </div>

      {/* ══ WRAPPER ══ */}
      <div className="fs-wrapper">

        {/* Restaurant header */}
        <div className="fs-restaurant-header">
          <div className="fs-restaurant-header__logo">
            {service?.iconImage
              ? <img src={photoSrc(service.iconImage)} alt="icon"
                  style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }} />
              : "🍗"}
          </div>

          <div className="fs-restaurant-header__info">
            {loadingService
              ? <><Skeleton h={32} w="60%" mb={10} /><Skeleton h={16} w="80%" mb={12} /><Skeleton h={16} w="40%" /></>
              : <>
                  <h1 className="fs-restaurant-header__title">{kitchenName}</h1>
                  <div className="fs-restaurant-header__meta">
                    <span style={{ fontWeight: 600, color: "#1b1b1b" }}>⭐ {ratingAvg.toFixed(1)}</span>
                    {[`(${ratingCount} ratings)`, service?.serviceType, "$"].filter(Boolean).map(t => (
                      <span key={t} style={{ display: "contents" }}>
                        <span style={{ color: "#ccc" }}>•</span><span>{t}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                    <span className="fs-restaurant-header__badge">
                      <span className="fs-restaurant-header__status-dot"
                        style={{ background: isOpen ? "#038a3a" : "#dc2626" }} />
                      <span style={{ color: isOpen ? "#038a3a" : "#dc2626", fontWeight: 600 }}>
                        {isOpen ? "Open" : "Closed"}
                      </span>
                      <span style={{ color: "#545454" }}>· Closes {closeTime}</span>
                    </span>
                    {canDeliver && (
                      <span style={{ fontSize: 12, color: "#038a3a", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 4 }}>
                        <FaMotorcycle /> Delivery
                      </span>
                    )}
                    {canPickup && (
                      <span style={{ fontSize: 12, color: "#0369a1", fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 4 }}>
                        <FaShoppingBag /> Pickup
                      </span>
                    )}
                  </div>
                  {address && <div className="fs-restaurant-header__address">📍 {address}</div>}
                  {service?.description && (
                    <div style={{ fontSize: 13, color: "#757575", marginTop: 6 }}>{service.description}</div>
                  )}
                </>}
          </div>

          <div className="fs-restaurant-header__actions">
            <button className="fs-restaurant-header__action-btn" style={{ fontSize: 16 }}>🤍</button>
            <button className="fs-restaurant-header__action-btn" style={{ fontSize: 14, fontWeight: 700 }}>•••</button>
          </div>
        </div>

        <div className="fs-divider" />

        {/* ══ 3-COLUMN BODY ══ */}
        <div className="fs-body-grid">

          {/* Sidebar */}
          <nav className="fs-sidebar">
            {CATEGORIES.map(cat => (
              <button key={cat}
                onClick={() => scrollTo(`cat-${cat}`)}
                className={`fs-sidebar__btn${activeNav === cat ? " fs-sidebar__btn--active" : ""}`}
                style={{ fontFamily: FONT }}
              >{CAT_EMOJI[cat]} {cat}</button>
            ))}
          </nav>

          {/* Menu */}
          <main>
            {loadingMenu
              ? <div style={{ padding: "32px 0" }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ flex: 1 }}>
                        <Skeleton h={18} w="55%" mb={8} />
                        <Skeleton h={13} w="90%" mb={6} />
                        <Skeleton h={13} w="70%" mb={6} />
                        <Skeleton h={14} w="30%" />
                      </div>
                      <Skeleton w={96} h={96} radius={10} />
                    </div>
                  ))}
                </div>
              : menuItems.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 0", color: "#757575" }}>No menu items found.</div>
                : CATEGORIES.map(cat => {
                    const items = menuItems.filter(i => i.category === cat);
                    if (!items.length) return null;
                    return (
                      <section key={cat} className="fs-cat-section"
                        ref={el => sectionRefs.current[`cat-${cat}`] = el}>
                        <div className="fs-cat-section__title">{CAT_EMOJI[cat]} {cat}</div>
                        {items.map((item, idx) => (
                          <MenuItemRow
                            key={item._id} item={item}
                            isLast={idx === items.length - 1}
                            bgIndex={idx}
                            onOpen={openModal} onAdd={addToCart}
                          />
                        ))}
                      </section>
                    );
                  })}
          </main>

          {/* Cart */}
          <aside className="fs-cart">
            <div className="fs-cart__box">
              <div className="fs-cart__header">
                <div className="fs-cart__title">
                  Your order
                  {cartCount > 0 && <span className="fs-cart__count-badge">{cartCount}</span>}
                </div>
                <div className="fs-cart__subtitle">{kitchenName}</div>
                {canDeliver && canPickup
                  ? <OrderTypeToggle value={orderType} onChange={setOrderType} />
                  : <div style={{ fontSize: 13, color: "#757575", marginBottom: 12 }}>
                      {canDeliver ? "🛵 Delivery only" : "🛍 Pickup only"}
                    </div>}
                <div className="fs-cart__hint">
                  {orderType === "delivery"
                    ? <><FaMotorcycle style={{ color: PINK }} /> Estimated delivery: 30–45 min</>
                    : <><FaShoppingBag style={{ color: PINK }} /> Ready for pickup in 15–20 min</>}
                </div>
              </div>

              {cartItems.length === 0
                ? <div className="fs-cart__empty">
                    <div className="fs-cart__empty-icon">🛒</div>
                    <div className="fs-cart__empty-title">No items in your cart</div>
                    <div className="fs-cart__empty-text">Add items from the menu to get started</div>
                  </div>
                : <>
                    {cartItems.map(item => (
                      <div key={item._id} className="fs-cart__item">
                        <div className="fs-cart__item-name">{item.name}</div>
                        <div className="fs-cart__qty-controls">
                          <button className="fs-cart__qty-btn" onClick={() => changeQty(item._id, -1)}>−</button>
                          <span className="fs-cart__qty-value">{item.qty}</span>
                          <button className="fs-cart__qty-btn" onClick={() => changeQty(item._id, 1)}>+</button>
                        </div>
                        <div className="fs-cart__item-price">LKR {(item.price * item.qty).toLocaleString()}</div>
                      </div>
                    ))}
                    <div className="fs-cart__summary">
                      <div className="fs-cart__summary-row">
                        <span>Subtotal</span><span>LKR {cartTotal.toLocaleString()}</span>
                      </div>
                      {orderType === "delivery" && (
                        <div className="fs-cart__summary-row">
                          <span>Delivery fee</span>
                          <span style={{ fontWeight: 600 }}>LKR {deliveryFee.toLocaleString()}</span>
                        </div>
                      )}
                      {orderType === "pickup" && (
                        <div className="fs-cart__summary-row fs-cart__summary-row--pickup">
                          <span>🛍 Pickup discount</span><span>Free delivery</span>
                        </div>
                      )}
                      <div className="fs-cart__total-row">
                        <span>Total</span><span>LKR {orderTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </>}

              <div className="fs-cart__footer">
                <button
                  disabled={cartItems.length === 0}
                  className="fs-cart__checkout-btn"
                  style={{ fontFamily: FONT }}
                >
                  <span>{orderType === "delivery" ? "Go to checkout" : "Place pickup order"}</span>
                  {cartItems.length > 0 && (
                    <span style={{ fontSize: 14, opacity: 0.9 }}>LKR {orderTotal.toLocaleString()}</span>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ══ REVIEWS ══ */}
      <section className="fs-reviews">
        <div className="fs-wrapper">
          <div className="fs-reviews__header">What guests are saying</div>
          <div className="fs-reviews__rating-row">
            {loadingService
              ? <Skeleton h={48} w={80} radius={8} />
              : <>
                  <span className="fs-reviews__score">{ratingAvg.toFixed(1)}</span>
                  <div>
                    <div style={{ fontSize: 18 }}>
                      {"★".repeat(Math.round(ratingAvg))}{"☆".repeat(5 - Math.round(ratingAvg))}
                    </div>
                    <div style={{ fontSize: 14, color: "#757575" }}>{ratingCount} ratings</div>
                  </div>
                </>}
          </div>

          <button
            className="fs-write-review-btn"
            style={{ fontFamily: FONT }}
            onClick={() => setShowReviewModal(true)}
          ><FaPen style={{ fontSize: 13 }} /> Write a Review</button>

          {/* Reviews grid — max 4 */}
          {loadingReviews
            ? <div className="fs-reviews__grid">
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ padding: "28px 0",
                    paddingRight: i % 2 === 1 ? 40 : 0, paddingLeft: i % 2 === 0 ? 40 : 0 }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                      <Skeleton w={48} h={48} radius={24} />
                      <div style={{ flex: 1 }}>
                        <Skeleton h={16} w="50%" mb={6} />
                        <Skeleton h={13} w="70%" />
                      </div>
                    </div>
                    <Skeleton h={13} w="100%" mb={6} />
                    <Skeleton h={13} w="85%" mb={6} />
                    <Skeleton h={13} w="60%" />
                  </div>
                ))}
              </div>
            : reviews.length === 0
              ? <div style={{ textAlign: "center", padding: "40px 0", color: "#757575", fontSize: 15 }}>
                  No reviews yet — be the first to share your experience!
                </div>
              : <div className="fs-reviews__grid">
                  {previewReviews.map((r, i) => (
                    <ReviewCard
                      key={r._id ?? i}
                      review={r}
                      index={i}
                      total={previewReviews.length}
                      expanded={!!expanded[r._id ?? i]}
                      onToggle={() => setExpanded(e => ({ ...e, [r._id ?? i]: !e[r._id ?? i] }))}
                    />
                  ))}
                </div>}

          {/* Show all button — only if more than 4 */}
          {reviews.length > 0 && (
            <button
              className="fs-reviews__show-all-btn"
              style={{ fontFamily: FONT }}
              onClick={() => setShowAllReviews(true)}
            >
              Show all {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </section>

      {/* ══ MAP ══ */}
      <section className="fs-map">
        <div className="fs-wrapper">
          <div className="fs-map__title">📍 Where you'll find us</div>
          <div className="fs-map__address">{address}</div>
          <div className="fs-map__container">
            <iframe
              className="fs-map__iframe"
              src={mapSrc}
              allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={kitchenName}
            />
            <div className="fs-map__card">
              <span style={{ fontSize: 24 }}>🍗</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#000" }}>{kitchenName}</div>
                <div style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>{address}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="fs-footer">
        <div className="fs-footer__grid">
          {[
            { title: "Support",   links: ["Help Center", "Safety", "Cancellation Options", "Community Guideline"] },
            { title: "Community", links: ["Bodima Adventures", "New Features", "Tips for Hosts", "Careers"] },
            { title: "Host",      links: ["Host a home", "Host an experience", "Responsible hosting", "Community forum"] },
            { title: "About",     links: ["About Bodima", "Newsroom", "Investors", "Bodima Plus"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="fs-footer__col-title">{title}</h4>
              {links.map(l => <a key={l} href="#" className="fs-footer__link">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="fs-footer__bottom">
          <div>
            <span>© 2026 Bodima, Inc. · </span>
            <a href="#" className="fs-footer__legal-link">Privacy · Terms · Sitemap</a>
          </div>
          <div className="fs-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="fs-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══ ITEM MODAL ══ */}
      {modal && (
        <div className="fs-item-modal-overlay"
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="fs-item-modal">
            <div className="fs-item-modal__hero"
              style={{ background: BG_CYCLE[menuItems.indexOf(modal) % BG_CYCLE.length] }}>
              <button className="fs-item-modal__close" onClick={closeModal}>✕</button>
              {modal.image
                ? <img src={photoSrc(modal.image)} alt={modal.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.currentTarget.style.display = "none"; }}
                  />
                : <span style={{ fontSize: 80 }}>{CAT_EMOJI[modal.category] ?? "🍽"}</span>}
            </div>
            <div className="fs-item-modal__body">
              <div className="fs-item-modal__name">{modal.name}</div>
              {modal.dietaryTags?.length > 0 && (
                <div className="fs-item-modal__tags">
                  {modal.dietaryTags.map(t => <DietTag key={t} tag={t} />)}
                </div>
              )}
              <div className="fs-item-modal__desc">{modal.description}</div>
              <div className="fs-item-modal__details-grid">
                {[
                  { label: "⏱ Prep Time",       val: `${modal.prepTime ?? 15} min` },
                  { label: "🏷 Category",        val: modal.category },
                  { label: "🕐 Available Hours", val: `${modal.AvailableHours?.open ?? "—"} – ${modal.AvailableHours?.close ?? "—"}` },
                  { label: "✅ Status",
                    val:   isItemAvailableNow(modal) ? "● Available now" : "○ Not available now",
                    color: isItemAvailableNow(modal) ? "#038a3a" : "#999" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="fs-item-modal__detail-label">{label}</span>
                    <span className="fs-item-modal__detail-value" style={color ? { color } : {}}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="fs-item-modal__price-row">
                <span className="fs-item-modal__price">LKR {modal.price?.toLocaleString()}.00</span>
              </div>
              <div className="fs-item-modal__actions">
                <div className="fs-item-modal__qty-controls">
                  <button className="fs-item-modal__qty-btn"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}>−</button>
                  <span className="fs-item-modal__qty-value">{modalQty}</span>
                  <button className="fs-item-modal__qty-btn"
                    onClick={() => setModalQty(q => q + 1)}>+</button>
                </div>
                <button
                  disabled={!isItemAvailableNow(modal)}
                  className="fs-item-modal__add-btn"
                  onClick={addFromModal}
                  style={{ fontFamily: FONT }}
                >
                  <span>Add to order</span>
                  <span>LKR {(modal.price * modalQty).toLocaleString()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ REVIEW WRITE MODAL ══ */}
      {showReviewModal && (
        <ReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          submitting={reviewSubmitting}
        />
      )}

      {/* ══ ALL REVIEWS MODAL ══ */}
      {showAllReviews && (
        <AllReviewsModal
          reviews={reviews}
          onClose={() => setShowAllReviews(false)}
        />
      )}

      {/* ══ TOAST ══ */}
      <div className={`fs-toast${toast.show ? " fs-toast--visible" : ""}`}>
        {toast.msg}
      </div>

      <style>{`
        @keyframes fsSkeleton {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.94) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .fs-spin { animation: fsSpin 0.8s linear infinite; display: inline-block; }
        @keyframes fsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
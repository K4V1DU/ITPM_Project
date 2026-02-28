import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaAirbnb, FaBars, FaUser,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSignOutAlt, FaEnvelope,
  FaMotorcycle, FaShoppingBag, FaPen,
  FaSpinner, FaExclamationTriangle,
  FaHeart, FaRegHeart, FaEllipsisH, FaCommentAlt, FaUserCircle, FaShare, FaFlag,
  FaExclamationCircle, FaSignInAlt,
  FaEgg, FaLeaf, FaDrumstickBite, FaFire, FaGlassWhiskey, FaIceCream,
  FaAppleAlt, FaBreadSlice,
  FaSeedling, FaSun, FaMapMarkerAlt, FaShoppingCart,
  FaTag, FaClock, FaCheckCircle, FaUtensils,
  FaTrash, FaEdit,
} from "react-icons/fa";
import "./FoodService.css";

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const API_BASE = "http://localhost:8000";

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const ORANGE = "#FF6B2B";
const FONT   = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const BG_CYCLE = [
  "linear-gradient(135deg,#fff5f0,#fde8e8)",
  "linear-gradient(135deg,#fff8e1,#fef3c7)",
  "linear-gradient(135deg,#f0fdf4,#dcfce7)",
  "linear-gradient(135deg,#f0f9ff,#dbeafe)",
  "linear-gradient(135deg,#fdf4ff,#f3e8ff)",
  "linear-gradient(135deg,#fff7ed,#fed7aa)",
];

const CAT_ICON = {
  Breakfast: <FaEgg />,
  Lunch:     <FaAppleAlt />,
  Dinner:    <FaDrumstickBite />,
  Snacks:    <FaBreadSlice />,
  Drinks:    <FaGlassWhiskey />,
  Dessert:   <FaIceCream />,
};
const CATEGORIES = ["Breakfast","Lunch","Dinner","Snacks","Drinks","Dessert"];

const TAG_STYLE = {
  Spicy:         { color:"#b91c1c", background:"#fff1f2", border:"1px solid #fecaca" },
  Vegetarian:    { color:"#15803d", background:"#f0fdf4", border:"1px solid #bbf7d0" },
  Vegan:         { color:"#166534", background:"#dcfce7", border:"1px solid #86efac" },
  "Gluten-Free": { color:"#92400e", background:"#fffbeb", border:"1px solid #fde68a" },
};
const TAG_ICON = {
  Spicy:         <FaFire />,
  Vegetarian:    <FaLeaf />,
  Vegan:         <FaSeedling />,
  "Gluten-Free": <FaSun />,
};
const STAR_HINTS    = ["","Poor","Fair","Good","Very Good","Excellent"];
const AVATAR_COLORS = ["#1a1a2e","#6a3093","#11998e","#c94b4b","#f7971e","#1d4350","#0f3460","#e94560","#533483","#2b5876"];
const SHOW_MORE_THRESHOLD = 120;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method:"PUT",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method:"DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

function isItemAvailableNow(item) {
  if (!item.isAvailable) return false;
  const open  = item.AvailableHours?.open;
  const close = item.AvailableHours?.close;
  if (!open || !close) return item.isAvailable;
  const parseTime = (str) => {
    const [time, period] = str.trim().split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const now      = new Date();
  const nowMin   = now.getHours() * 60 + now.getMinutes();
  const openMin  = parseTime(open);
  const closeMin = parseTime(close);
  if (openMin <= closeMin) return nowMin >= openMin && nowMin < closeMin;
  return nowMin >= openMin || nowMin < closeMin;
}

function isServiceOpenNow(operatingHours) {
  const open  = operatingHours?.open;
  const close = operatingHours?.close;
  if (!open || !close) return false;
  const parseTime = (str) => {
    const [time, period] = str.trim().split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const now      = new Date();
  const nowMin   = now.getHours() * 60 + now.getMinutes();
  const openMin  = parseTime(open);
  const closeMin = parseTime(close);
  if (openMin <= closeMin) return nowMin >= openMin && nowMin < closeMin;
  return nowMin >= openMin || nowMin < closeMin;
}

// Recalculate average rating from a list of reviews
function calcRatingStats(reviewList) {
  if (!reviewList.length) return { avg: 0, count: 0 };
  const sum = reviewList.reduce((s, r) => s + (r.rating ?? 0), 0);
  return { avg: parseFloat((sum / reviewList.length).toFixed(1)), count: reviewList.length };
}

// ─────────────────────────────────────────
// LOGOUT CONFIRM MODAL
// ─────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fs-gen-modal-overlay" onClick={onCancel}>
      <div className="fs-gen-modal" onClick={e => e.stopPropagation()}>
        <div className="fs-gen-modal__icon fs-gen-modal__icon--logout"><FaSignOutAlt /></div>
        <h3 className="fs-gen-modal__title">Logout</h3>
        <p className="fs-gen-modal__msg">Are you sure you want to logout?</p>
        <div className="fs-gen-modal__actions">
          <button className="fs-gen-modal__btn fs-gen-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="fs-gen-modal__btn fs-gen-modal__btn--danger" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// LOGIN REQUIRED MODAL
// ─────────────────────────────────────────
function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <div className="fs-gen-modal-overlay" onClick={onClose}>
      <div className="fs-gen-modal" onClick={e => e.stopPropagation()}>
        <div className="fs-gen-modal__icon fs-gen-modal__icon--warn"><FaExclamationCircle /></div>
        <h3 className="fs-gen-modal__title">Student Login Required</h3>
        <p className="fs-gen-modal__msg">
          This feature is only available for student accounts.
          Please login as a student to continue.
        </p>
        <div className="fs-gen-modal__actions">
          <button className="fs-gen-modal__btn fs-gen-modal__btn--cancel" onClick={onClose}>Close</button>
          <button className="fs-gen-modal__btn fs-gen-modal__btn--confirm" onClick={onLogin}>
            <FaSignInAlt /> Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────
function DeleteReviewModal({ onConfirm, onCancel, deleting }) {
  return (
    <div className="fs-gen-modal-overlay" onClick={onCancel}>
      <div className="fs-gen-modal" onClick={e => e.stopPropagation()}>
        <div className="fs-gen-modal__icon fs-gen-modal__icon--logout"><FaTrash /></div>
        <h3 className="fs-gen-modal__title">Delete Review</h3>
        <p className="fs-gen-modal__msg">Are you sure you want to delete your review? This cannot be undone.</p>
        <div className="fs-gen-modal__actions">
          <button className="fs-gen-modal__btn fs-gen-modal__btn--cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className="fs-gen-modal__btn fs-gen-modal__btn--danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? <><FaSpinner className="fs-spin" style={{ fontSize:13 }} /> Deleting…</> : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────
function Skeleton({ w="100%", h=18, radius=8, mb=0 }) {
  return (
    <div style={{
      width:w, height:h, borderRadius:radius, marginBottom:mb,
      background:"linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
      backgroundSize:"200% 100%", animation:"fsSkeleton 1.4s ease infinite",
    }} />
  );
}

// ─────────────────────────────────────────
// DIETARY TAG
// ─────────────────────────────────────────
function DietTag({ tag }) {
  return (
    <span className="fs-diet-tag" style={TAG_STYLE[tag]}>
      <span className="fs-diet-tag__icon">{TAG_ICON[tag]}</span> {tag}
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
            onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)} aria-label={`${n} star`}>⭐</button>
        ))}
      </div>
      <div className="fs-star-rater__hint">{display ? STAR_HINTS[display] : "Tap a star to rate"}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// REVIEW MODAL (write / edit)
// ─────────────────────────────────────────
function ReviewModal({ onClose, onSubmit, submitting, initialStars = 0, initialText = "", isEdit = false }) {
  const [stars, setStars] = useState(initialStars);
  const [text,  setText]  = useState(initialText);
  const MAX = 400;
  const canSubmit = stars > 0 && text.trim().length >= 10 && !submitting;
  return (
    <div className="fs-review-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fs-review-modal">
        <div className="fs-review-modal__header">
          <div>
            <div className="fs-review-modal__title">{isEdit ? "Edit Your Review" : "Leave a Review"}</div>
            <div className="fs-review-modal__subtitle">
              {isEdit ? "Update your experience below" : "Share your experience with others"}
            </div>
          </div>
          <button className="fs-review-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="fs-review-modal__body">
          <StarRater value={stars} onChange={setStars} />
          <div className="fs-review-field">
            <div className="fs-review-field__label">Your Review</div>
            <textarea className="fs-review-field__textarea"
              placeholder="Tell others about your experience — the food, delivery speed, flavour… (min 10 characters)"
              value={text} maxLength={MAX}
              onChange={e => setText(e.target.value)} style={{ fontFamily:FONT }} />
            <div className="fs-review-field__char-count">{text.length} / {MAX}</div>
          </div>
          <button className="fs-review-submit-btn" disabled={!canSubmit}
            onClick={() => onSubmit({ stars, text:text.trim() })} style={{ fontFamily:FONT }}>
            {submitting
              ? <><FaSpinner className="fs-spin" style={{ fontSize:14 }} /> {isEdit ? "Saving…" : "Submitting…"}</>
              : <><FaPen style={{ fontSize:13 }} /> {isEdit ? "Save Changes" : "Submit Review"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// REVIEW CARD
// ─────────────────────────────────────────
function ReviewCard({ review, index, total, expanded, onToggle, isOwn, onEdit, onDelete }) {
  const reviewer   = review.reviewer;
  const name       = reviewer?.name ?? "Guest";
  const joined     = reviewer?.createdAt ? new Date(reviewer.createdAt).getFullYear() : null;
  const yearsOn    = joined ? new Date().getFullYear() - joined : 0;
  const color      = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const date       = review.createdAt
    ? new Date(review.createdAt).toLocaleString("en-US", { month:"long", year:"numeric" })
    : "Recent";
  const isLeft       = index % 2 === 0;
  const hasBorderBtm = index < total - 2;
  const isLong       = (review.comment?.length ?? 0) > SHOW_MORE_THRESHOLD;
  const avatarSrc    = reviewer?._profilePhotoUrl ?? null;
  return (
    <div className={`fs-reviews__card${hasBorderBtm ? " fs-reviews__card--border-bottom" : ""}`}>
      <div className={isLeft ? "fs-reviews__card-inner-left" : "fs-reviews__card-inner-right"}>
        <div className="fs-reviews__author">
          <div className="fs-reviews__avatar" style={{ background:color }}>
            {avatarSrc
              ? <img src={avatarSrc} alt={name}
                  style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover" }}
                  onError={e => { e.currentTarget.style.display="none"; }} />
              : name[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div className="fs-reviews__author-name">
              {name}
              {review.isNew && (
                <span style={{ marginLeft:8, fontSize:11, fontWeight:700,
                  background:"#dcfce7", color:"#166534",
                  border:"1px solid #86efac", padding:"2px 8px", borderRadius:20 }}>New</span>
              )}
              {isOwn && (
                <span style={{ marginLeft:8, fontSize:11, fontWeight:700,
                  background:"#dbeafe", color:"#1d4ed8",
                  border:"1px solid #bfdbfe", padding:"2px 8px", borderRadius:20 }}>You</span>
              )}
            </div>
            <div className="fs-reviews__author-years">
              {yearsOn > 0 ? `${yearsOn} year${yearsOn !== 1 ? "s" : ""} on Bodima` : "New member"}
            </div>
          </div>
          {/* Edit / Delete buttons for own reviews */}
          {isOwn && (
            <div style={{ display:"flex", gap:6, marginLeft:"auto", flexShrink:0 }}>
              <button className="fs-review-action-btn fs-review-action-btn--edit" onClick={onEdit} title="Edit review">
                <FaEdit style={{ fontSize:13 }} />
              </button>
              <button className="fs-review-action-btn fs-review-action-btn--delete" onClick={onDelete} title="Delete review">
                <FaTrash style={{ fontSize:12 }} />
              </button>
            </div>
          )}
        </div>
        <div className="fs-reviews__stars-row">
          <span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
          <span style={{ color:"#ccc" }}>·</span>
          <span className="fs-reviews__date">{date}</span>
        </div>
        <div className={`fs-reviews__text${(!expanded && isLong) ? " fs-reviews__text--clamped" : ""}`}>
          {review.comment}
        </div>
        {isLong && (
          <button className="fs-reviews__toggle-btn" style={{ fontFamily:FONT }} onClick={onToggle}>
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MENU ITEM ROW
// ─────────────────────────────────────────
function MenuItemRow({ item, onOpen, onAdd, isLast, bgIndex }) {
  const availableNow = isItemAvailableNow(item);
  const bg           = BG_CYCLE[bgIndex % BG_CYCLE.length];
  const openTime     = item.AvailableHours?.open  ?? "—";
  const closeTime    = item.AvailableHours?.close ?? "—";
  return (
    <div onClick={() => availableNow && onOpen(item)}
      className={["fs-menu-item", isLast ? "fs-menu-item--last" : "",
        !availableNow ? "fs-menu-item--unavailable" : ""].join(" ")}>
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
          <span className="fs-menu-item__meta-text"><FaClock style={{ fontSize:11 }} /> {item.prepTime ?? 15} min prep</span>
          <span className="fs-menu-item__meta-text"><FaClock style={{ fontSize:11 }} /> {openTime} – {closeTime}</span>
        </div>
        <div className="fs-menu-item__price-row">
          <span className="fs-menu-item__price">LKR {item.price?.toLocaleString()}.00</span>
        </div>
      </div>
      <div className="fs-menu-item__image" style={{ background:bg }}>
        {item.image
          ? <img src={photoSrc(item.image)} alt={item.name}
              style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:10 }}
              onError={e => { e.currentTarget.style.display="none"; }} />
          : <span className="fs-menu-item__cat-icon">{CAT_ICON[item.category] ?? <FaUtensils />}</span>}
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
        { key:"delivery", label:"Delivery", icon:<FaMotorcycle style={{ fontSize:13 }} /> },
        { key:"pickup",   label:"Pickup",   icon:<FaShoppingBag style={{ fontSize:12 }} /> },
      ].map(({ key, label, icon }) => (
        <button key={key} onClick={() => onChange(key)}
          className={`fs-order-toggle__btn${value === key ? " fs-order-toggle__btn--active" : ""}`}
          style={{ fontFamily:FONT }}>{icon} {label}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function FoodService() {
  const { id: FOOD_SERVICE_ID } = useParams();
  const navigate = useNavigate();

  // ── API state ─────────────────────────
  const [service,   setService]   = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews,   setReviews]   = useState([]);

  // ── Derived rating state (updates live) ──
  const [liveRatingAvg,   setLiveRatingAvg]   = useState(0);
  const [liveRatingCount, setLiveRatingCount] = useState(0);

  // ── Auth state ────────────────────────
  const [currentUser,       setCurrentUser]       = useState(null);
  const [userAvatarSrc,     setUserAvatarSrc]     = useState(null);
  const [showLogoutModal,   setShowLogoutModal]   = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  // ── Loading / error ───────────────────
  const [loadingService, setLoadingService] = useState(true);
  const [loadingMenu,    setLoadingMenu]    = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [errorService,   setErrorService]  = useState(null);

  // ── UI state ──────────────────────────
  const [activeTab,        setActiveTab]        = useState("food");
  const [activeNav,        setActiveNav]        = useState(CATEGORIES[0]);
  const [cart,             setCart]             = useState({});
  const [modal,            setModal]            = useState(null);
  const [modalQty,         setModalQty]         = useState(1);
  const [toast,            setToast]            = useState({ show:false, msg:"" });
  const [expanded,         setExpanded]         = useState({});
  const [showDropdown,     setShowDropdown]     = useState(false);
  const [orderType,        setOrderType]        = useState("delivery");
  const [showReviewModal,  setShowReviewModal]  = useState(false);
  const [showAllReviews,   setShowAllReviews]   = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isFavourited,     setIsFavourited]     = useState(false);
  const [showActionMenu,   setShowActionMenu]   = useState(false);

  // ── Edit / Delete review state ────────
  const [editingReview,       setEditingReview]       = useState(null);
  const [deletingReviewId,    setDeletingReviewId]    = useState(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  // ── Owner state ───────────────────────
  const [ownerUser, setOwnerUser] = useState(null);

  const sectionRefs          = useRef({});
  const toastTimer           = useRef(null);
  const dropdownRef          = useRef(null);
  const actionMenuRef        = useRef(null);
  const activeCategoriesRef  = useRef([]);

  // Derived role helpers
  const userId     = localStorage.getItem("CurrentUserId");
  const isLoggedIn = !!userId;
  const userRole   = currentUser?.role ?? null;
  const isStudent  = userRole === "student";
  const isHost     = userRole === "host";

  // ── Fetch current user ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(raw => {
        const user = unwrap(raw);
        setCurrentUser(user);
        const photoId = user?.profileImage ?? null;
        if (photoId) setUserAvatarSrc(`${API_BASE}/Photo/${photoId}`);

        // Patch already-loaded reviews that belong to this user —
        // they may have been enriched as "Guest" before user data arrived
        setReviews(prev => prev.map(r => {
          const reviewerId = r.reviewer?._id ?? r.reviewer;
          if (String(reviewerId) !== String(userId)) return r;
          let photoUrl = photoId ? `${API_BASE}/Photo/${photoId}` : r.reviewer?._profilePhotoUrl ?? null;
          return {
            ...r,
            reviewer: {
              ...(typeof r.reviewer === 'object' ? r.reviewer : {}),
              _id: userId,
              name: user?.name ?? r.reviewer?.name ?? 'Guest',
              createdAt: user?.createdAt ?? r.reviewer?.createdAt,
              _profilePhotoUrl: photoUrl,
            },
          };
        }));
      })
      .catch(() => { setCurrentUser(null); setUserAvatarSrc(null); });
  }, []);

  // ── Fetch: FoodService ────────────────────────────────────────────────
  useEffect(() => {
    if (!FOOD_SERVICE_ID) { setLoadingService(false); return; }
    setLoadingService(true);
    setErrorService(null);
    fetch(`${API_BASE}/Foodservice/${FOOD_SERVICE_ID}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(raw => {
        const data = unwrap(raw);
        setService(data);
        setLiveRatingAvg(data.ratingAverage ?? 0);
        setLiveRatingCount(data.ratingCount ?? 0);
        if (!data.deliveryAvailable && data.pickupAvailable) setOrderType("pickup");

        // Fetch the food service owner's profile
        const ownerId = data.owner?._id ?? data.owner;
        if (ownerId) {
          fetch(`${API_BASE}/User/${ownerId}`)
            .then(r => r.ok ? r.json() : null)
            .then(raw2 => { if (raw2) setOwnerUser(unwrap(raw2)); })
            .catch(() => {});
        }
      })
      .catch(err => setErrorService(err.message))
      .finally(() => setLoadingService(false));
  }, [FOOD_SERVICE_ID]);

  // ── Fetch: MenuItems ──────────────────────────────────────────────────
  useEffect(() => {
    if (!service?.menu?.length) { setLoadingMenu(false); return; }
    setLoadingMenu(true);
    Promise.all(
      service.menu.map(id =>
        fetch(`${API_BASE}/menuitem/${id}`)
          .then(r => r.json()).then(raw => unwrap(raw)).catch(() => null)
      )
    )
      .then(items => setMenuItems(items.filter(Boolean)))
      .finally(() => setLoadingMenu(false));
  }, [service]);

  // ── Fetch: Reviews ────────────────────────────────────────────────────
  useEffect(() => {
    if (!service) return;
    setLoadingReviews(true);
    const loadReviews = async () => {
      const reviewIds = service.reviews ?? [];
      if (!reviewIds.length) { setReviews([]); setLoadingReviews(false); return; }

      let list = [];
      try {
        const results = await Promise.all(
          reviewIds.map(id =>
            fetch(`${API_BASE}/review/${id}`)
              .then(r => { if (!r.ok) throw new Error(); return r.json(); })
              .then(raw => unwrap(raw))
              .catch(() => null)
          )
        );
        list = results.filter(Boolean);
      } catch (_) { list = []; }

      const enriched = await Promise.all(
        list.map(async (rv) => {
          const reviewerId = rv.reviewer?._id ?? rv.reviewer;
          if (!reviewerId) return rv;
          try {
            const ur   = await fetch(`${API_BASE}/user/${reviewerId}`);
            const raw  = await ur.json();
            const user = unwrap(raw);
            let photoUrl = null;
            if (user?.profileImage) {
              photoUrl = /^[a-f\d]{24}$/i.test(user.profileImage)
                ? photoSrc(user.profileImage) : user.profileImage;
            }
            return {
              ...rv,
              reviewer: {
                ...(typeof rv.reviewer === "object" ? rv.reviewer : {}),
                _id:reviewerId, name:user?.name ?? "Guest",
                createdAt:user?.createdAt, _profilePhotoUrl:photoUrl,
              },
            };
          } catch (_) { return rv; }
        })
      );
      const sorted = [...enriched].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
      setReviews(sorted);
      // Sync live rating from fetched reviews
      const { avg, count } = calcRatingStats(sorted);
      setLiveRatingAvg(avg);
      setLiveRatingCount(count);
    };
    loadReviews().finally(() => setLoadingReviews(false));
  }, [service]);

  // ── Cart ──────────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setCart(prev => ({ ...prev, [item._id]:{ ...item, qty:(prev[item._id]?.qty || 0) + 1 } }));
    showToast(`Added "${item.name}" to cart`);
  };
  const changeQty = (id, delta) => {
    setCart(prev => {
      const qty = (prev[id]?.qty || 0) + delta;
      if (qty <= 0) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]:{ ...prev[id], qty } };
    });
  };
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((s,i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s,i) => s + i.qty, 0);

  // ── Toast ─────────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast({ show:true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ show:false, msg:"" }), 2400);
  };

  // ── Item modal ────────────────────────────────────────────────────────
  const openModal    = (item) => { setModal(item); setModalQty(1); };
  const closeModal   = ()     => setModal(null);
  const addFromModal = ()     => { for (let i = 0; i < modalQty; i++) addToCart(modal); closeModal(); };

  // ── Scroll spy ────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const cats = activeCategoriesRef.current;
      if (!cats.length) return;
      let cur = cats[0];
      cats.forEach(cat => {
        const el = sectionRefs.current[`cat-${cat}`];
        if (el && el.getBoundingClientRect().top < 140) cur = cat;
      });
      setActiveNav(cur);
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (cat) => {
    setActiveNav(cat);
    sectionRefs.current[`cat-${cat}`]?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  // ── Outside click ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current   && !dropdownRef.current.contains(e.target))   setShowDropdown(false);
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setShowActionMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    setShowDropdown(false);
    setShowLogoutModal(false);
    navigate("/Login");
  };

  // ── Dropdown guard — non-students see login-required modal ─────────────
  const handleProtectedClick = (cb) => {
    if (!isLoggedIn || !isStudent) {
      setShowDropdown(false);
      setShowLoginRequired(true);
      return;
    }
    setShowDropdown(false);
    cb?.();
  };

  // ── Navbar action button ──────────────────────────────────────────────
  const hostBtnLabel  = !isLoggedIn ? "Login" : isHost ? "Host Page" : null;
  const hostBtnAction = () => navigate(!isLoggedIn ? "/Login" : "/Listings");

  // ── Write Review guard ────────────────────────────────────────────────
  const handleWriteReviewClick = () => {
    if (!isLoggedIn || !isStudent) {
      setShowLoginRequired(true);
      return;
    }
    setShowReviewModal(true);
  };

  // ── Submit review ─────────────────────────────────────────────────────
  const handleReviewSubmit = async ({ stars, text }) => {
    setReviewSubmitting(true);
    try {
      const raw  = await apiPost("/review", {
        reviewer:    userId,
        foodService: FOOD_SERVICE_ID,
        rating:      stars,
        comment:     text,
      });
      const saved = unwrap(raw);
      let photoUrl = null;
      if (currentUser?.profileImage) {
        photoUrl = /^[a-f\d]{24}$/i.test(currentUser.profileImage)
          ? photoSrc(currentUser.profileImage) : currentUser.profileImage;
      }
      const newReview = {
        ...saved,
        _id:      saved._id ?? Date.now().toString(),
        // Always build reviewer from currentUser — never fall back to API response
        // which may only contain an ID string
        reviewer: {
          _id:             userId,
          name:            currentUser?.name ?? "You",
          createdAt:       currentUser?.createdAt,
          _profilePhotoUrl: photoUrl,
        },
        // Preserve rating/comment explicitly in case backend response omits them
        rating:    stars,
        comment:   text,
        createdAt: saved.createdAt ?? new Date().toISOString(),
        isNew:     true,
      };
      setReviews(prev => {
        const updated = [newReview, ...prev];
        const { avg, count } = calcRatingStats(updated);
        setLiveRatingAvg(avg);
        setLiveRatingCount(count);
        return updated;
      });
      setShowReviewModal(false);
      showToast("Thanks for your review!");
    } catch (err) {
      showToast("Failed to submit — please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Edit review ───────────────────────────────────────────────────────
  const handleEditReviewSubmit = async ({ stars, text }) => {
    if (!editingReview) return;
    setReviewActionLoading(true);
    try {
      const raw    = await apiPut(`/review/${editingReview._id}`, { rating: stars, comment: text });
      const saved  = unwrap(raw);
      setReviews(prev => {
        const updated = prev.map(r =>
          r._id === editingReview._id
            // Explicitly only update rating + comment — never overwrite
            // the enriched reviewer object with the raw API response
            ? { ...r, rating: stars, comment: text }
            : r
        );
        const { avg, count } = calcRatingStats(updated);
        setLiveRatingAvg(avg);
        setLiveRatingCount(count);
        return updated;
      });
      setEditingReview(null);
      showToast("Review updated.");
    } catch {
      showToast("Failed to update — please try again.");
    } finally {
      setReviewActionLoading(false);
    }
  };

  // ── Delete review ─────────────────────────────────────────────────────
  const handleDeleteReviewConfirm = async () => {
    if (!deletingReviewId) return;
    setReviewActionLoading(true);
    try {
      await apiDelete(`/review/${deletingReviewId}`);
      setReviews(prev => {
        const updated = prev.filter(r => r._id !== deletingReviewId);
        const { avg, count } = calcRatingStats(updated);
        setLiveRatingAvg(avg);
        setLiveRatingCount(count);
        return updated;
      });
      setDeletingReviewId(null);
      showToast("Review deleted.");
    } catch {
      showToast("Failed to delete — please try again.");
    } finally {
      setReviewActionLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────
  const kitchenName      = service?.kitchenName        ?? "Loading…";
  const address          = service?.address            ?? "";
  const openTime         = service?.operatingHours?.open  ?? "08:00 AM";
  const closeTime        = service?.operatingHours?.close ?? "10:00 PM";
  const isOpen           = service ? isServiceOpenNow(service.operatingHours) : false;
  const canDeliver       = service?.deliveryAvailable  ?? true;
  const canPickup        = service?.pickupAvailable    ?? true;
  const coords           = service?.location?.coordinates;
  const mapLat           = coords ? coords[1] : 6.9020;
  const mapLng           = coords ? coords[0] : 79.9667;
  const mapSrc           = `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=16&output=embed`;
  const deliveryFee      = orderType === "delivery" ? 150 : 0;
  const orderTotal       = cartTotal + deliveryFee;
  const activeCategories = CATEGORIES.filter(cat => menuItems.some(i => i.category === cat));
  activeCategoriesRef.current = activeCategories;
  const previewReviews   = reviews.slice(0, 4);

  // ── Guards ────────────────────────────────────────────────────────────
  if (!FOOD_SERVICE_ID) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", minHeight:"60vh", gap:16, fontFamily:FONT }}>
        <FaExclamationTriangle style={{ fontSize:40, color:ORANGE }} />
        <div style={{ fontSize:18, fontWeight:700 }}>No food service ID in URL</div>
        <div style={{ fontSize:14, color:"#757575" }}>Expected: <code>/FoodService/&lt;id&gt;</code></div>
      </div>
    );
  }
  if (errorService) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", minHeight:"60vh", gap:16, fontFamily:FONT }}>
        <FaExclamationTriangle style={{ fontSize:40, color:ORANGE }} />
        <div style={{ fontSize:18, fontWeight:700 }}>Failed to load</div>
        <div style={{ fontSize:14, color:"#757575" }}>{errorService}</div>
        <button onClick={() => window.location.reload()} style={{
          padding:"10px 24px", background:ORANGE, color:"#fff", border:"none",
          borderRadius:10, fontFamily:FONT, fontSize:14, fontWeight:600, cursor:"pointer",
        }}>Retry</button>
      </div>
    );
  }

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <div style={{ fontFamily:FONT, background:"#fff", color:"#1b1b1b", fontSize:14, lineHeight:1.5 }}>

      {/* ══ NAVBAR ══ */}
      <nav className="fs-nav">
        <div className="fs-nav__left">
          <a href="/" className="fs-nav__logo"><FaAirbnb /> Bodima</a>
        </div>

        <div className="fs-nav__tabs">
          {[
            { key:"boardings",   label:"Boardings",          href:"/Boardings"    },
            { key:"food",        label:"Food Services",      href:"/FoodServices" },
            { key:"experiences", label:"Orders", href:"/Orders"             },
          ].map(({ key, label, href }) => (
            <a key={key} href={href}
              className={`fs-nav__tab${activeTab === key ? " fs-nav__tab--active" : ""}`}
              onClick={() => setActiveTab(key)}>
              {label}
              {activeTab === key && <span className="fs-nav__tab-underline" />}
            </a>
          ))}
        </div>

        <div className="fs-nav__right">
          {hostBtnLabel && (
            <button className="fs-nav__host-btn" style={{ fontFamily:FONT }} onClick={hostBtnAction}>
              {hostBtnLabel}
            </button>
          )}

          <div className="fs-nav__avatar">
            {userAvatarSrc
              ? <img src={userAvatarSrc} alt="Profile" className="fs-nav__avatar-img"
                  onError={() => setUserAvatarSrc(null)} />
              : <FaUser className="fs-nav__avatar-icon" />}
          </div>

          <div ref={dropdownRef} className="fs-dropdown">
            <div className="fs-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}>
              <FaBars />
            </div>

            {showDropdown && (
              <div className="fs-dropdown__menu">
                {isLoggedIn && currentUser && (
                  <>
                    <div className="fs-dropdown__user">
                      <span className="fs-dropdown__username">{currentUser.name ?? "User"}</span>
                      <span className="fs-dropdown__email">{currentUser.email ?? ""}</span>
                      <span className={`fs-dropdown__role fs-dropdown__role--${userRole}`}>{userRole}</span>
                    </div>
                    <div className="fs-dropdown__divider" />
                  </>
                )}

                {(isStudent || isHost) && (
                  <div className="fs-dropdown__item"
                    onClick={() => { setShowDropdown(false); navigate("/Profile"); }}>
                    <FaUser style={{ opacity:0.7 }} /> Profile
                  </div>
                )}

                {!isLoggedIn && (
                  <>
                    <div className="fs-dropdown__item" onClick={() => handleProtectedClick()}>
                      <FaUser style={{ opacity:0.7 }} /> Profile
                    </div>
                    <div className="fs-dropdown__item" onClick={() => handleProtectedClick()}>
                      <FaEnvelope style={{ opacity:0.7 }} /> Messages
                    </div>
                  </>
                )}

                {isStudent && (
                  <div className="fs-dropdown__item"
                    onClick={() => { setShowDropdown(false); navigate("/Messages"); }}>
                    <FaEnvelope style={{ opacity:0.7 }} /> Messages
                  </div>
                )}

                {isLoggedIn && (isStudent || isHost) && (
                  <>
                    <div className="fs-dropdown__divider" />
                    <div className="fs-dropdown__item fs-dropdown__item--danger"
                      onClick={() => { setShowDropdown(false); setShowLogoutModal(true); }}>
                      <FaSignOutAlt style={{ opacity:0.7 }} /> Logout
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={{ padding:"0 24px" }}>
        <div className="fs-hero">
          {service?.BackgroundImage
            ? <img src={photoSrc(service.BackgroundImage)} alt="banner"
                style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                  objectFit:"cover", zIndex:0 }} />
            : <><div className="fs-hero__dots" /><div className="fs-hero__gradient" /></>}
        </div>
      </div>

      {/* ══ WRAPPER ══ */}
      <div className="fs-wrapper">

        {/* Restaurant header */}
        <div className="fs-restaurant-header">
          <div className="fs-restaurant-header__logo">
            {service?.iconImage
              ? <img src={photoSrc(service.iconImage)} alt="icon"
                  style={{ width:"100%", height:"100%", borderRadius:10, objectFit:"cover" }} />
              : "🍗"}
          </div>

          <div className="fs-restaurant-header__info">
            {loadingService
              ? <><Skeleton h={32} w="60%" mb={10} /><Skeleton h={16} w="80%" mb={12} /><Skeleton h={16} w="40%" /></>
              : <>
                  <h1 className="fs-restaurant-header__title">{kitchenName}</h1>
                  <div className="fs-restaurant-header__meta">
                    <span style={{ fontWeight:600, color:"#1b1b1b" }}>⭐ {liveRatingAvg.toFixed(1)}</span>
                    {[`(${liveRatingCount} ratings)`, service?.serviceType].filter(Boolean).map(t => (
                      <span key={t} style={{ display:"contents" }}>
                        <span style={{ color:"#ccc" }}>•</span><span>{t}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 }}>
                    <span className="fs-restaurant-header__badge">
                      <span className="fs-restaurant-header__status-dot"
                        style={{ background:isOpen ? "#038a3a" : "#dc2626" }} />
                      <span style={{ color:isOpen ? "#038a3a" : "#dc2626", fontWeight:600 }}>
                        {isOpen ? "Open" : "Closed"}
                      </span>
                      <span style={{ color:"#545454" }}>· {openTime} – {closeTime}</span>
                    </span>
                    {canDeliver && (
                      <span style={{ fontSize:12, color:"#038a3a", fontWeight:600,
                        display:"flex", alignItems:"center", gap:4 }}>
                        <FaMotorcycle /> Delivery
                      </span>
                    )}
                    {canPickup && (
                      <span style={{ fontSize:12, color:"#0369a1", fontWeight:600,
                        display:"flex", alignItems:"center", gap:4 }}>
                        <FaShoppingBag /> Pickup
                      </span>
                    )}
                  </div>
                  {address && <div className="fs-restaurant-header__address"><FaMapMarkerAlt style={{ fontSize:12 }} /> {address}</div>}
                  {service?.description && (
                    <div style={{ fontSize:13, color:"#757575", marginTop:6 }}>{service.description}</div>
                  )}
                </>}
          </div>

          <div className="fs-restaurant-header__actions">
            <button
              className={`fs-action-btn${isFavourited ? " fs-action-btn--favourited" : ""}`}
              onClick={() => { setIsFavourited(p => !p); showToast(isFavourited ? "Removed from favourites" : "Added to favourites."); }}>
              {isFavourited
                ? <FaHeart    style={{ color:ORANGE, fontSize:16 }} />
                : <FaRegHeart style={{ color:"#444",  fontSize:16 }} />}
            </button>

            <div ref={actionMenuRef} style={{ position:"relative" }}>
              <button className="fs-action-btn" onClick={() => setShowActionMenu(p => !p)}>
                <FaEllipsisH style={{ color:"#444", fontSize:15 }} />
              </button>
              {showActionMenu && (
                <div className="fs-action-dropdown">
                  <div className="fs-action-dropdown__host">
                    <div className="fs-action-dropdown__host-avatar">
                      {ownerUser?.profileImage
                        ? <img src={/^[a-f\d]{24}$/i.test(ownerUser.profileImage)
                              ? photoSrc(ownerUser.profileImage) : ownerUser.profileImage}
                            alt="host"
                            style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover" }}
                            onError={e => { e.currentTarget.style.display="none"; }} />
                        : <FaUserCircle style={{ fontSize:36, color:"#bbb" }} />}
                    </div>
                    <div>
                      <div className="fs-action-dropdown__host-label">Hosted by</div>
                      <div className="fs-action-dropdown__host-name">
                        {ownerUser?.name ?? "Host"}
                      </div>
                      <div className="fs-action-dropdown__host-since">
                        {ownerUser?.createdAt
                          ? `Member since ${new Date(ownerUser.createdAt).getFullYear()}`
                          : "Bodima Host"}
                      </div>
                    </div>
                  </div>
                  <div className="fs-action-dropdown__divider" />
                  <button className="fs-action-dropdown__item fs-action-dropdown__item--primary"
                    onClick={() => {
                      setShowActionMenu(false);
                      if (!isLoggedIn || !isStudent) { setShowLoginRequired(true); return; }
                      showToast("Opening messages…");
                    }}>
                    <FaCommentAlt style={{ fontSize:13 }} /> Message Host
                  </button>
                  <button className="fs-action-dropdown__item"
                    onClick={() => { setShowActionMenu(false); }}>
                    <FaUserCircle style={{ fontSize:14 }} /> View Host Profile
                  </button>
                  <div className="fs-action-dropdown__divider" />
                  <button className="fs-action-dropdown__item"
                    onClick={() => { setShowActionMenu(false); navigator.clipboard?.writeText(window.location.href); showToast("Link copied!"); }}>
                    <FaShare style={{ fontSize:13 }} /> Share this kitchen
                  </button>
                  <button className="fs-action-dropdown__item fs-action-dropdown__item--danger"
                    onClick={() => {
                      setShowActionMenu(false);
                      if (!isLoggedIn) { setShowLoginRequired(true); return; }
                      showToast("Report submitted. Thank you.");
                    }}>
                    <FaFlag style={{ fontSize:13 }} /> Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="fs-divider" />

        {/* ══ 3-COLUMN BODY ══ */}
        <div className="fs-body-grid">

          {/* Sidebar */}
          <nav className="fs-sidebar">
            {activeCategories.map(cat => (
              <button key={cat} onClick={() => scrollTo(cat)}
                className={`fs-sidebar__btn${activeNav === cat ? " fs-sidebar__btn--active" : ""}`}
                style={{ fontFamily:FONT }}>
                <span className="fs-sidebar__btn-icon">{CAT_ICON[cat]}</span> {cat}
              </button>
            ))}
          </nav>

          {/* Menu */}
          <main>
            {loadingMenu
              ? <div style={{ padding:"32px 0" }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ display:"flex", gap:16, padding:"16px 0", borderBottom:"1px solid #f0f0f0" }}>
                      <div style={{ flex:1 }}>
                        <Skeleton h={18} w="55%" mb={8} /><Skeleton h={13} w="90%" mb={6} />
                        <Skeleton h={13} w="70%" mb={6} /><Skeleton h={14} w="30%" />
                      </div>
                      <Skeleton w={96} h={96} radius={10} />
                    </div>
                  ))}
                </div>
              : menuItems.length === 0
                ? <div style={{ textAlign:"center", padding:"60px 0", color:"#757575" }}>No menu items found.</div>
                : activeCategories.map(cat => {
                    const items = menuItems.filter(i => i.category === cat);
                    if (!items.length) return null;
                    return (
                      <section key={cat} className="fs-cat-section"
                        ref={el => sectionRefs.current[`cat-${cat}`] = el}>
                        <div className="fs-cat-section__title">
                          <span className="fs-cat-section__title-icon">{CAT_ICON[cat]}</span> {cat}
                        </div>
                        {items.map((item, idx) => (
                          <MenuItemRow key={item._id} item={item}
                            isLast={idx === items.length - 1} bgIndex={idx}
                            onOpen={openModal} onAdd={addToCart} />
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
                  : <div style={{ fontSize:13, color:"#757575", marginBottom:12 }}>
                      {canDeliver
                        ? <><FaMotorcycle style={{ marginRight:4 }} /> Delivery only</>
                        : <><FaShoppingBag style={{ marginRight:4 }} /> Pickup only</>}
                    </div>}
                <div className="fs-cart__hint">
                  {orderType === "delivery"
                    ? <><FaMotorcycle style={{ color:ORANGE }} /> Estimated delivery: 30–45 min</>
                    : <><FaShoppingBag style={{ color:ORANGE }} /> Ready for pickup in 15–20 min</>}
                </div>
              </div>

              {cartItems.length === 0
                ? <div className="fs-cart__empty">
                    <div className="fs-cart__empty-icon"><FaShoppingCart /></div>
                    <div className="fs-cart__empty-title">No items in your cart</div>
                    <div className="fs-cart__empty-text">Add items from the menu to get started</div>
                  </div>
                : <>
                    {cartItems.map(item => (
                      <div key={item._id} className="fs-cart__item">
                        <div className="fs-cart__item-name">{item.name}</div>
                        <div className="fs-cart__qty-controls">
                          <button className="fs-cart__qty-btn" onClick={() => changeQty(item._id,-1)}>−</button>
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
                          <span style={{ fontWeight:600 }}>LKR {deliveryFee.toLocaleString()}</span>
                        </div>
                      )}
                      {orderType === "pickup" && (
                        <div className="fs-cart__summary-row fs-cart__summary-row--pickup">
                          <span><FaShoppingBag style={{ marginRight:4, fontSize:11 }} /> Pickup discount</span><span>Free delivery</span>
                        </div>
                      )}
                      <div className="fs-cart__total-row">
                        <span>Total</span><span>LKR {orderTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </>}

              <div className="fs-cart__footer">
                <button
                  disabled={cartItems.length === 0 || !isOpen}
                  className="fs-cart__checkout-btn"
                  style={{ fontFamily:FONT }}
                  onClick={() => {
                    if (!isLoggedIn || !isStudent) {
                      setShowLoginRequired(true);
                    } else {
                      navigate(`/FoodCheckout/${FOOD_SERVICE_ID}`, {
                        state: {
                          cartItems,
                          cartTotal,
                          orderType,
                          deliveryFee,
                          orderTotal,
                          service,
                          foodServiceId: FOOD_SERVICE_ID,
                        },
                      });
                    }
                  }}
                >
                  {!isOpen
                    ? <span style={{ margin:"0 auto" }}>Kitchen is Closed</span>
                    : <>
                        <span>{orderType === "delivery" ? "Go to checkout" : "Place pickup order"}</span>
                        {cartItems.length > 0 && (
                          <span style={{ fontSize:14, opacity:0.9 }}>LKR {orderTotal.toLocaleString()}</span>
                        )}
                      </>}
                </button>
                {!isOpen && (
                  <p style={{ textAlign:"center", fontSize:12, color:"#dc2626", marginTop:8 }}>
                    Opens at {openTime}
                  </p>
                )}
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
                  <span className="fs-reviews__score">{liveRatingAvg.toFixed(1)}</span>
                  <div>
                    <div style={{ fontSize:18 }}>
                      {"★".repeat(Math.round(liveRatingAvg))}{"☆".repeat(5 - Math.round(liveRatingAvg))}
                    </div>
                    <div style={{ fontSize:14, color:"#757575" }}>{liveRatingCount} ratings</div>
                  </div>
                </>}
          </div>

          {/* Write review button — guards non-logged-in / non-student */}
          <button className="fs-write-review-btn" style={{ fontFamily:FONT }}
            onClick={handleWriteReviewClick}>
            <FaPen style={{ fontSize:13 }} /> Write a Review
          </button>



          {loadingReviews
            ? <div className="fs-reviews__grid">
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ padding:"28px 0",
                    paddingRight:i % 2 === 1 ? 40 : 0, paddingLeft:i % 2 === 0 ? 40 : 0 }}>
                    <div style={{ display:"flex", gap:12, marginBottom:12 }}>
                      <Skeleton w={48} h={48} radius={24} />
                      <div style={{ flex:1 }}>
                        <Skeleton h={16} w="50%" mb={6} /><Skeleton h={13} w="70%" />
                      </div>
                    </div>
                    <Skeleton h={13} w="100%" mb={6} />
                    <Skeleton h={13} w="85%"  mb={6} />
                    <Skeleton h={13} w="60%" />
                  </div>
                ))}
              </div>
            : reviews.length === 0
              ? <div style={{ textAlign:"center", padding:"40px 0", color:"#757575", fontSize:15 }}>
                  No reviews yet — be the first to share your experience!
                </div>
              : <div className="fs-reviews__grid">
                  {(showAllReviews ? reviews : previewReviews).map((r,i) => {
                    const reviewerId = r.reviewer?._id ?? r.reviewer;
                    const isOwn = isLoggedIn && userId === reviewerId;
                    return (
                      <ReviewCard key={r._id ?? i} review={r} index={i}
                        total={showAllReviews ? reviews.length : previewReviews.length}
                        expanded={!!expanded[r._id ?? i]}
                        onToggle={() => setExpanded(e => ({ ...e, [r._id ?? i]:!e[r._id ?? i] }))}
                        isOwn={isOwn}
                        onEdit={() => setEditingReview(r)}
                        onDelete={() => setDeletingReviewId(r._id)}
                      />
                    );
                  })}
                </div>}

          {reviews.length > 4 && (
            <button className="fs-reviews__show-all-btn" style={{ fontFamily:FONT }}
              onClick={() => setShowAllReviews(p => !p)}>
              {showAllReviews ? "Show less" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      </section>

      {/* ══ MAP ══ */}
      <section className="fs-map">
        <div className="fs-wrapper">
          <div className="fs-map__title"><FaMapMarkerAlt style={{ color:ORANGE, marginRight:6 }} /> Where you'll find us</div>
          <div className="fs-map__address">{address}</div>
          <div className="fs-map__container">
            <iframe className="fs-map__iframe" src={mapSrc}
              allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title={kitchenName} />
            <div className="fs-map__card">
              <FaUtensils style={{ fontSize:22, color:ORANGE }} />
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#000" }}>{kitchenName}</div>
                <div style={{ fontSize:12, color:"#757575", marginTop:2 }}>{address}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="fs-footer">
        <div className="fs-footer__bottom">
          <div className="fs-footer__left">
            <span>© 2026 Bodima, Inc.</span>
            <span className="fs-footer__dot">·</span>
            <a href="#" className="fs-footer__legal-link">Privacy</a>
            <span className="fs-footer__dot">·</span>
            <a href="#" className="fs-footer__legal-link">Terms</a>
            <span className="fs-footer__dot">·</span>
            <a href="#" className="fs-footer__legal-link">Sitemap</a>
          </div>
          <div className="fs-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon,i) => (
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
              style={{ background:BG_CYCLE[menuItems.indexOf(modal) % BG_CYCLE.length] }}>
              <button className="fs-item-modal__close" onClick={closeModal}>✕</button>
              {modal.image
                ? <img src={photoSrc(modal.image)} alt={modal.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={e => { e.currentTarget.style.display="none"; }} />
                : <span className="fs-item-modal__cat-icon">{CAT_ICON[modal.category] ?? <FaUtensils />}</span>}
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
                  { icon:<FaClock />,       label:"Prep Time",       val:`${modal.prepTime ?? 15} min` },
                  { icon:<FaTag />,         label:"Category",        val:modal.category },
                  { icon:<FaClock />,       label:"Available Hours", val:`${modal.AvailableHours?.open ?? "—"} – ${modal.AvailableHours?.close ?? "—"}` },
                  { icon:<FaCheckCircle />, label:"Status",
                    val:  isItemAvailableNow(modal) ? "Available now" : "Not available",
                    color:isItemAvailableNow(modal) ? "#038a3a" : "#999" },
                ].map(({ icon, label, val, color }) => (
                  <div key={label} style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    <span className="fs-item-modal__detail-label">
                      <span className="fs-item-modal__detail-icon">{icon}</span> {label}
                    </span>
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
                    onClick={() => setModalQty(q => Math.max(1, q-1))}>−</button>
                  <span className="fs-item-modal__qty-value">{modalQty}</span>
                  <button className="fs-item-modal__qty-btn"
                    onClick={() => setModalQty(q => q+1)}>+</button>
                </div>
                <button disabled={!isItemAvailableNow(modal)}
                  className="fs-item-modal__add-btn" onClick={addFromModal} style={{ fontFamily:FONT }}>
                  <span>Add to order</span>
                  <span>LKR {(modal.price * modalQty).toLocaleString()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ WRITE REVIEW MODAL ══ */}
      {showReviewModal && (
        <ReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          submitting={reviewSubmitting}
        />
      )}

      {/* ══ EDIT REVIEW MODAL ══ */}
      {editingReview && (
        <ReviewModal
          isEdit
          initialStars={editingReview.rating ?? 0}
          initialText={editingReview.comment ?? ""}
          onClose={() => setEditingReview(null)}
          onSubmit={handleEditReviewSubmit}
          submitting={reviewActionLoading}
        />
      )}

      {/* ══ DELETE REVIEW CONFIRM ══ */}
      {deletingReviewId && (
        <DeleteReviewModal
          onConfirm={handleDeleteReviewConfirm}
          onCancel={() => setDeletingReviewId(null)}
          deleting={reviewActionLoading}
        />
      )}

      {/* ══ LOGOUT CONFIRM ══ */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* ══ LOGIN REQUIRED ══ */}
      {showLoginRequired && (
        <LoginRequiredModal
          onClose={() => setShowLoginRequired(false)}
          onLogin={() => { setShowLoginRequired(false); navigate("/Login"); }}
        />
      )}

      {/* ══ TOAST ══ */}
      <div className={`fs-toast${toast.show ? " fs-toast--visible" : ""}`}>{toast.msg}</div>

      <style>{`
        @keyframes fsSkeleton {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
        .fs-spin { animation: fsSpin 0.8s linear infinite; display:inline-block; }
        @keyframes fsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
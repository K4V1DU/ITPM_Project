import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AccommodationDetails.css";
import {
  FaHeart,
  FaRegHeart,
  FaShare,
  FaUsers,
  FaBed,
  FaBath,
  FaAirbnb,
  FaUser,
  FaSignOutAlt,
  FaEnvelope,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaWifi,
  FaSnowflake,
  FaFire,
  FaUtensils,
  FaTools,
  FaTv,
  FaTint,
  FaParking,
  FaBars,
  FaMapMarkerAlt,
  FaCheck,
  FaSpinner,
  FaExclamationTriangle,
  FaCommentAlt,
  FaUserCircle,
  FaFlag,
  FaEllipsisH,
  FaSignInAlt,
  FaExclamationCircle,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaStar,
  FaRegStar,
  FaPen,
  FaTrash,
  FaEdit,
  FaKey,
  FaRulerCombined,
} from "react-icons/fa";

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const ORANGE = "#FF6B2B";
const FONT =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const AVATAR_COLORS = [
  "#1a1a2e",
  "#6a3093",
  "#11998e",
  "#c94b4b",
  "#f7971e",
  "#1d4350",
  "#0f3460",
  "#e94560",
  "#533483",
  "#2b5876",
];
const STAR_HINTS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
const SHOW_MORE_THRESHOLD = 120;

const AMENITY_ICONS = {
  wifi: FaWifi,
  "air conditioning": FaSnowflake,
  ac: FaSnowflake,
  heating: FaFire,
  kitchen: FaUtensils,
  "hair dryer": FaTools,
  iron: FaTools,
  tv: FaTv,
  washer: FaTint,
  parking: FaParking,
};

function amenityIcon(name = "") {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return FaCheck;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const photoSrc = (id) => (id ? `${API_BASE}/Photo/${id}` : null);

function resolveImageSrc(img) {
  if (!img) return null;
  if (/^[a-f\d]{24}$/i.test(img)) return photoSrc(img);
  if (img.startsWith("http")) return img;
  return `${API_BASE}/Photo/${img}`;
}

function unwrap(raw) {
  return raw?.data ?? raw?.result ?? raw;
}

function calcRatingStats(reviewList) {
  if (!reviewList.length) return { avg: 0, count: 0 };
  const sum = reviewList.reduce((s, r) => s + (r.rating ?? 0), 0);
  return {
    avg: parseFloat((sum / reviewList.length).toFixed(1)),
    count: reviewList.length,
  };
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
async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Populate owner + reviews ─────────────────────────────────────────────
async function populateAccommodation(acc) {
  // ✅ Schema uses 'owner' not 'host'
  if (acc.owner && typeof acc.owner === "string") {
    try {
      const res = await fetch(`${API_BASE}/User/${acc.owner}`);
      if (res.ok) acc.owner = unwrap(await res.json());
    } catch {
      acc.owner = null;
    }
  }
  if (Array.isArray(acc.reviews) && acc.reviews.length > 0) {
    const settled = await Promise.allSettled(
      acc.reviews.map(async (item) => {
        if (item && typeof item === "object" && item.comment) {
          if (typeof item.reviewer === "string") {
            try {
              const rRes = await fetch(`${API_BASE}/User/${item.reviewer}`);
              if (rRes.ok) item.reviewer = unwrap(await rRes.json());
            } catch {}
          }
          return item;
        }
        const reviewId = typeof item === "string" ? item : item?._id;
        if (!reviewId) return null;
        const revRes = await fetch(`${API_BASE}/Review/${reviewId}`);
        if (!revRes.ok) return null;
        const rev = unwrap(await revRes.json());
        if (rev && typeof rev.reviewer === "string") {
          try {
            const rRes = await fetch(`${API_BASE}/User/${rev.reviewer}`);
            if (rRes.ok) rev.reviewer = unwrap(await rRes.json());
          } catch {}
        }
        return rev;
      }),
    );
    acc.reviews = settled
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);
  }
  return acc;
}

// ─────────────────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="acd-gen-modal-overlay" onClick={onCancel}>
      <div className="acd-gen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acd-gen-modal__icon acd-gen-modal__icon--logout">
          <FaSignOutAlt />
        </div>
        <h3 className="acd-gen-modal__title">Logout</h3>
        <p className="acd-gen-modal__msg">Are you sure you want to logout?</p>
        <div className="acd-gen-modal__actions">
          <button
            className="acd-gen-modal__btn acd-gen-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="acd-gen-modal__btn acd-gen-modal__btn--danger"
            onClick={onConfirm}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <div className="acd-gen-modal-overlay" onClick={onClose}>
      <div className="acd-gen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acd-gen-modal__icon acd-gen-modal__icon--warn">
          <FaExclamationCircle />
        </div>
        <h3 className="acd-gen-modal__title">Student Login Required</h3>
        <p className="acd-gen-modal__msg">
          This feature is only available for student accounts. Please login as a
          student to continue.
        </p>
        <div className="acd-gen-modal__actions">
          <button
            className="acd-gen-modal__btn acd-gen-modal__btn--cancel"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="acd-gen-modal__btn acd-gen-modal__btn--confirm"
            onClick={onLogin}
          >
            <FaSignInAlt /> Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteReviewModal({ onConfirm, onCancel, deleting }) {
  return (
    <div className="acd-gen-modal-overlay" onClick={onCancel}>
      <div className="acd-gen-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acd-gen-modal__icon acd-gen-modal__icon--logout">
          <FaTrash />
        </div>
        <h3 className="acd-gen-modal__title">Delete Review</h3>
        <p className="acd-gen-modal__msg">
          Are you sure you want to delete your review? This cannot be undone.
        </p>
        <div className="acd-gen-modal__actions">
          <button
            className="acd-gen-modal__btn acd-gen-modal__btn--cancel"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="acd-gen-modal__btn acd-gen-modal__btn--danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <FaSpinner className="acd-spin" /> Deleting…
              </>
            ) : (
              "Yes, Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 18, radius = 8, mb = 0 }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        marginBottom: mb,
        background:
          "linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "acdSkeleton 1.4s ease infinite",
      }}
    />
  );
}

// ─── Star Rater ───────────────────────────────────────────────────────────
function StarRater({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div className="acd-star-rater">
      <div className="acd-star-rater__label">Your Rating</div>
      <div className="acd-star-rater__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`acd-star-rater__star${display >= n ? " acd-star-rater__star--active" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            aria-label={`${n} star`}
          >
            ⭐
          </button>
        ))}
      </div>
      <div className="acd-star-rater__hint">
        {display ? STAR_HINTS[display] : "Tap a star to rate"}
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────
function ReviewModal({
  onClose,
  onSubmit,
  submitting,
  initialStars = 0,
  initialText = "",
  isEdit = false,
}) {
  const [stars, setStars] = useState(initialStars);
  const [text, setText] = useState(initialText);
  const MAX = 400;
  const canSubmit = stars > 0 && text.trim().length >= 10 && !submitting;
  return (
    <div
      className="acd-review-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="acd-review-modal">
        <div className="acd-review-modal__header">
          <div>
            <div className="acd-review-modal__title">
              {isEdit ? "Edit Your Review" : "Leave a Review"}
            </div>
            <div className="acd-review-modal__subtitle">
              {isEdit
                ? "Update your experience below"
                : "Share your experience with others"}
            </div>
          </div>
          <button className="acd-review-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="acd-review-modal__body">
          <StarRater value={stars} onChange={setStars} />
          <div className="acd-review-field">
            <div className="acd-review-field__label">Your Review</div>
            <textarea
              className="acd-review-field__textarea"
              placeholder="Tell others about your experience — the room, host, facilities… (min 10 characters)"
              value={text}
              maxLength={MAX}
              onChange={(e) => setText(e.target.value)}
              style={{ fontFamily: FONT }}
            />
            <div className="acd-review-field__char-count">
              {text.length} / {MAX}
            </div>
          </div>
          <button
            className="acd-review-submit-btn"
            disabled={!canSubmit}
            onClick={() => onSubmit({ stars, text: text.trim() })}
            style={{ fontFamily: FONT }}
          >
            {submitting ? (
              <>
                <FaSpinner className="acd-spin" style={{ fontSize: 14 }} />{" "}
                {isEdit ? "Saving…" : "Submitting…"}
              </>
            ) : (
              <>
                <FaPen style={{ fontSize: 13 }} />{" "}
                {isEdit ? "Save Changes" : "Submit Review"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────
function ReviewCard({
  review,
  index,
  total,
  expanded,
  onToggle,
  isOwn,
  onEdit,
  onDelete,
}) {
  const reviewer = review.reviewer;
  const name =
    (typeof reviewer === "object" ? reviewer?.name : null) ?? "Guest";
  const joined =
    typeof reviewer === "object" && reviewer?.createdAt
      ? new Date(reviewer.createdAt).getFullYear()
      : null;
  const yearsOn = joined ? new Date().getFullYear() - joined : 0;
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recent";
  const isLeft = index % 2 === 0;
  const hasBorderBtm = index < total - 2;
  const isLong = (review.comment?.length ?? 0) > SHOW_MORE_THRESHOLD;

  // ✅ Resolve reviewer avatar — could be ObjectId or URL
  const revImgRaw =
    typeof reviewer === "object"
      ? (reviewer?._profilePhotoUrl ??
        reviewer?.profileImage ??
        reviewer?.avatar)
      : null;
  const avatarSrc = resolveImageSrc(revImgRaw);

  return (
    <div
      className={`acd-reviews__card${hasBorderBtm ? " acd-reviews__card--border-bottom" : ""}`}
    >
      <div
        className={
          isLeft
            ? "acd-reviews__card-inner-left"
            : "acd-reviews__card-inner-right"
        }
      >
        <div className="acd-reviews__author">
          <div className="acd-reviews__avatar" style={{ background: color }}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={name}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              name[0].toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="acd-reviews__author-name">
              {name}
              {review.isNew && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #86efac",
                    padding: "2px 8px",
                    borderRadius: 20,
                  }}
                >
                  New
                </span>
              )}
              {isOwn && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    padding: "2px 8px",
                    borderRadius: 20,
                  }}
                >
                  You
                </span>
              )}
            </div>
            <div className="acd-reviews__author-years">
              {yearsOn > 0
                ? `${yearsOn} year${yearsOn !== 1 ? "s" : ""} on Bodima`
                : "New member"}
            </div>
          </div>
          {isOwn && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginLeft: "auto",
                flexShrink: 0,
              }}
            >
              <button
                className="acd-review-action-btn acd-review-action-btn--edit"
                onClick={onEdit}
                title="Edit review"
              >
                <FaEdit style={{ fontSize: 13 }} />
              </button>
              <button
                className="acd-review-action-btn acd-review-action-btn--delete"
                onClick={onDelete}
                title="Delete review"
              >
                <FaTrash style={{ fontSize: 12 }} />
              </button>
            </div>
          )}
        </div>
        <div className="acd-reviews__stars-row">
          <span>
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </span>
          <span style={{ color: "#ccc" }}>·</span>
          <span className="acd-reviews__date">{date}</span>
        </div>
        <div
          className={`acd-reviews__text${!expanded && isLong ? " acd-reviews__text--clamped" : ""}`}
        >
          {review.comment}
        </div>
        {isLong && (
          <button
            className="acd-reviews__toggle-btn"
            style={{ fontFamily: FONT }}
            onClick={onToggle}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
const AccommodationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── API state ─────────────────────────────────────────────────────────
  const [acc, setAcc] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Derived rating (live) ─────────────────────────────────────────────
  const [liveRatingAvg, setLiveRatingAvg] = useState(0);
  const [liveRatingCount, setLiveRatingCount] = useState(0);
  const [reviews, setReviews] = useState([]);

  // ── Auth state ────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [userAvatarSrc, setUserAvatarSrc] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────
  const [isSaved, setIsSaved] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [toast, setToast] = useState({ show: false, msg: "" });
  const [activeTab, setActiveTab] = useState("boardings");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [ownerUser, setOwnerUser] = useState(null);

  // ── Edit / Delete review ──────────────────────────────────────────────
  const [editingReview, setEditingReview] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [reviewActionLoading, setReviewActionLoading] = useState(false);

  const dropdownRef = useRef(null);
  const actionMenuRef = useRef(null);
  const toastTimer = useRef(null);

  const userId = localStorage.getItem("CurrentUserId");
  const isLoggedIn = !!userId;
  const userRole = currentUser?.role ?? null;
  const isStudent = userRole === "student";
  const isHost = userRole === "host";

  // ── Fetch current user ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((raw) => {
        const user = unwrap(raw);
        setCurrentUser(user);
        // ✅ profileImage can be ObjectId → resolve via /Photo/
        const photoId = user?.profileImage ?? null;
        if (photoId) setUserAvatarSrc(resolveImageSrc(photoId));
        setReviews((prev) =>
          prev.map((r) => {
            const reviewerId = r.reviewer?._id ?? r.reviewer;
            if (String(reviewerId) !== String(userId)) return r;
            const photoUrl = photoId ? resolveImageSrc(photoId) : null;
            return {
              ...r,
              reviewer: {
                ...(typeof r.reviewer === "object" ? r.reviewer : {}),
                _id: userId,
                name: user?.name ?? "Guest",
                createdAt: user?.createdAt,
                _profilePhotoUrl: photoUrl,
              },
            };
          }),
        );
      })
      .catch(() => {
        setCurrentUser(null);
        setUserAvatarSrc(null);
      });
  }, []);

  // ── Fetch accommodation ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_BASE}/Accommodation/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(async (raw) => {
        const data = unwrap(raw);
        await populateAccommodation(data); // populates data.owner
        setAcc(data);
        setLiveRatingAvg(data.ratingAverage ?? 0);
        setLiveRatingCount(data.ratingCount ?? 0);

        const reviewList = (data.reviews ?? []).map((r) => ({
          ...r,
          reviewer: {
            ...(typeof r.reviewer === "object" ? r.reviewer : {}),
            _id: typeof r.reviewer === "object" ? r.reviewer?._id : r.reviewer,
            name: typeof r.reviewer === "object" ? r.reviewer?.name : "Guest",
            createdAt:
              typeof r.reviewer === "object" ? r.reviewer?.createdAt : null,
          },
        }));
        const sorted = [...reviewList].sort(
          (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
        );
        setReviews(sorted);
        if (sorted.length) {
          const { avg, count } = calcRatingStats(sorted);
          setLiveRatingAvg(avg);
          setLiveRatingCount(count);
        }

        // ✅ Use data.owner (schema field) — already populated by populateAccommodation
        const ownerId = data.owner?._id ?? data.owner;
        if (ownerId && typeof data.owner === "string") {
          // owner wasn't populated (still a string ID), fetch separately
          fetch(`${API_BASE}/User/${ownerId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((raw2) => {
              if (raw2) setOwnerUser(unwrap(raw2));
            })
            .catch(() => {});
        } else if (data.owner && typeof data.owner === "object") {
          setOwnerUser(data.owner);
        }

        // Load images (schema: images[] of ObjectId refs to Photo)
        const imgIds = data.images ?? [];
        const loaded = await Promise.all(
          imgIds.map(async (imgId) => {
            try {
              const res = await fetch(`${API_BASE}/Photo/${imgId}`);
              if (!res.ok) throw new Error();
              return URL.createObjectURL(await res.blob());
            } catch {
              return null;
            }
          }),
        );
        setImages(loaded.filter(Boolean));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Outside click ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target))
        setShowActionMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast({ show: false, msg: "" }),
      2400,
    );
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    setShowDropdown(false);
    setShowLogoutModal(false);
    navigate("/Login");
  };

  const handleProtectedClick = (cb) => {
    if (!isLoggedIn || !isStudent) {
      setShowDropdown(false);
      setShowLoginRequired(true);
      return;
    }
    setShowDropdown(false);
    cb?.();
  };

  // ── Gallery ───────────────────────────────────────────────────────────
  const displayImages =
    images.length > 0
      ? images
      : ["https://via.placeholder.com/800x500?text=No+Image"];
  const prevImg = () =>
    setActiveImg((p) => (p - 1 + displayImages.length) % displayImages.length);
  const nextImg = () => setActiveImg((p) => (p + 1) % displayImages.length);

  // ── Reviews ───────────────────────────────────────────────────────────
  const handleWriteReviewClick = () => {
    if (!isLoggedIn || !isStudent) {
      setShowLoginRequired(true);
      return;
    }
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async ({ stars, text }) => {
    setReviewSubmitting(true);
    try {
      const raw = await apiPost("/review", {
        reviewer: userId,
        accommodation: id,
        rating: stars,
        comment: text,
      });
      const saved = unwrap(raw);
      const photoUrl = currentUser?.profileImage
        ? resolveImageSrc(currentUser.profileImage)
        : null;
      const newReview = {
        ...saved,
        _id: saved._id ?? Date.now().toString(),
        reviewer: {
          _id: userId,
          name: currentUser?.name ?? "You",
          createdAt: currentUser?.createdAt,
          _profilePhotoUrl: photoUrl,
        },
        rating: stars,
        comment: text,
        createdAt: saved.createdAt ?? new Date().toISOString(),
        isNew: true,
      };
      setReviews((prev) => {
        const updated = [newReview, ...prev];
        const { avg, count } = calcRatingStats(updated);
        setLiveRatingAvg(avg);
        setLiveRatingCount(count);
        return updated;
      });
      setShowReviewModal(false);
      showToast("Thanks for your review!");
    } catch {
      showToast("Failed to submit — please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleEditReviewSubmit = async ({ stars, text }) => {
    if (!editingReview) return;
    setReviewActionLoading(true);
    try {
      await apiPut(`/review/${editingReview._id}`, {
        rating: stars,
        comment: text,
      });
      setReviews((prev) => {
        const updated = prev.map((r) =>
          r._id === editingReview._id
            ? { ...r, rating: stars, comment: text }
            : r,
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

  const handleDeleteReviewConfirm = async () => {
    if (!deletingReviewId) return;
    setReviewActionLoading(true);
    try {
      await apiDelete(`/review/${deletingReviewId}`);
      setReviews((prev) => {
        const updated = prev.filter((r) => r._id !== deletingReviewId);
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

  // ── Derived host object from acc.owner (schema field) ─────────────────
  const rawOwner =
    acc?.owner && typeof acc.owner === "object" ? acc.owner : ownerUser;
  const host = rawOwner
    ? {
        ...rawOwner,
        joinedYear: rawOwner.createdAt
          ? new Date(rawOwner.createdAt).getFullYear()
          : null,
        // ✅ schema: stats.hostSince, stats.hostRating, stats.totalReviews
        isSuperhost: rawOwner.stats?.hostRating >= 4.8 ?? false,
        totalReviews: rawOwner.stats?.totalReviews ?? null,
      }
    : null;

  // ✅ Resolve host avatar — profileImage can be ObjectId string
  const hostAvatarSrc = host
    ? resolveImageSrc(host.profileImage ?? host.avatar)
    : null;

  const hostBtnLabel = !isLoggedIn ? "Login" : isHost ? "Host Page" : null;
  const hostBtnAction = () => navigate(!isLoggedIn ? "/Login" : "/Listings");

  const previewReviews = reviews.slice(0, 4);

  // ── Guards ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
          fontFamily: FONT,
        }}
      >
        <FaExclamationTriangle style={{ fontSize: 40, color: ORANGE }} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Failed to load</div>
        <div style={{ fontSize: 14, color: "#757575" }}>{error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 24px",
            background: ORANGE,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: FONT,
        background: "#fff",
        color: "#1b1b1b",
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {/* ══ NAVBAR ══ */}
      <nav className="acd-nav">
        <div className="acd-nav__left">
          <a href="/" className="acd-nav__logo">
            <FaAirbnb /> Bodima
          </a>
        </div>
        <div className="acd-nav__tabs">
          {[
            { key: "boardings", label: "Boardings", href: "/Boardings" },
            { key: "food", label: "Food Services", href: "/Foods" },
            { key: "orders", label: "Orders", href: "/Orders" },
          ].map(({ key, label, href }) => (
            <a
              key={key}
              href={href}
              className={`acd-nav__tab${activeTab === key ? " acd-nav__tab--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
              {activeTab === key && <span className="acd-nav__tab-underline" />}
            </a>
          ))}
        </div>
        <div className="acd-nav__right">
          {hostBtnLabel && (
            <button
              className="acd-nav__host-btn"
              style={{ fontFamily: FONT }}
              onClick={hostBtnAction}
            >
              {hostBtnLabel}
            </button>
          )}
          <div className="acd-nav__avatar">
            {userAvatarSrc ? (
              <img
                src={userAvatarSrc}
                alt="Profile"
                className="acd-nav__avatar-img"
                onError={() => setUserAvatarSrc(null)}
              />
            ) : (
              <FaUser className="acd-nav__avatar-icon" />
            )}
          </div>
          <div ref={dropdownRef} className="acd-dropdown">
            <div
              className="acd-nav__icon-btn"
              onClick={() => setShowDropdown((p) => !p)}
            >
              <FaBars />
            </div>
            {showDropdown && (
              <div className="acd-dropdown__menu">
                {isLoggedIn && currentUser && (
                  <>
                    <div className="acd-dropdown__user">
                      <span className="acd-dropdown__username">
                        {currentUser.name ?? "User"}
                      </span>
                      <span className="acd-dropdown__email">
                        {currentUser.email ?? ""}
                      </span>
                      <span
                        className={`acd-dropdown__role acd-dropdown__role--${userRole}`}
                      >
                        {userRole}
                      </span>
                    </div>
                    <div className="acd-dropdown__divider" />
                  </>
                )}
                {(isStudent || isHost) && (
                  <div
                    className="acd-dropdown__item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/Profile");
                    }}
                  >
                    <FaUser style={{ opacity: 0.7 }} /> Profile
                  </div>
                )}
                {!isLoggedIn && (
                  <>
                    <div
                      className="acd-dropdown__item"
                      onClick={() => handleProtectedClick()}
                    >
                      <FaUser style={{ opacity: 0.7 }} /> Profile
                    </div>
                    <div
                      className="acd-dropdown__item"
                      onClick={() => handleProtectedClick()}
                    >
                      <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                    </div>
                  </>
                )}
                {isStudent && (
                  <div
                    className="acd-dropdown__item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/Messages");
                    }}
                  >
                    <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                  </div>
                )}
                {isLoggedIn && (isStudent || isHost) && (
                  <>
                    <div className="acd-dropdown__divider" />
                    <div
                      className="acd-dropdown__item acd-dropdown__item--danger"
                      onClick={() => {
                        setShowDropdown(false);
                        setShowLogoutModal(true);
                      }}
                    >
                      <FaSignOutAlt style={{ opacity: 0.7 }} /> Logout
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={{ padding: "0 24px" }}>
        <div className="acd-hero">
          {displayImages[0] &&
          displayImages[0] !==
            "https://via.placeholder.com/800x500?text=No+Image" ? (
            <img
              src={displayImages[0]}
              alt="banner"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
              }}
            />
          ) : (
            <>
              <div className="acd-hero__dots" />
              <div className="acd-hero__gradient" />
            </>
          )}
        </div>
      </div>

      {/* ══ WRAPPER ══ */}
      <div className="acd-wrapper">
        {/* ── Accommodation header ── */}
        <div className="acd-listing-header">
          <div className="acd-listing-header__logo">
            {hostAvatarSrc &&
            hostAvatarSrc !==
              "https://via.placeholder.com/800x500?text=No+Image" ? (
              <img
                src={hostAvatarSrc}
                alt="icon"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                  objectFit: "cover",
                }}
              />
            ) : (
              "🏠"
            )}
          </div>

          <div className="acd-listing-header__info">
            {loading ? (
              <>
                <Skeleton h={32} w="60%" mb={10} />
                <Skeleton h={16} w="80%" mb={12} />
                <Skeleton h={16} w="40%" />
              </>
            ) : (
              <>
                <h1 className="acd-listing-header__title">
                  {acc?.title ?? "Loading…"}
                </h1>
                <div className="acd-listing-header__meta">
                  <span style={{ fontWeight: 600, color: "#1b1b1b" }}>
                    ⭐ {liveRatingAvg.toFixed(1)}
                  </span>
                  {[
                    `(${liveRatingCount} ratings)`,
                    // schema field: accommodationType
                    acc?.accommodationType,
                  ]
                    .filter(Boolean)
                    .map((t) => (
                      <span key={t} style={{ display: "contents" }}>
                        <span style={{ color: "#ccc" }}>•</span>
                        <span>{t}</span>
                      </span>
                    ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  {/* schema field: maxGuests doesn't exist — use beds instead */}
                  {acc?.beds && (
                    <span className="acd-listing-header__badge">
                      <FaBed style={{ fontSize: 12 }} /> {acc.beds} bed
                      {acc.beds !== 1 ? "s" : ""}
                    </span>
                  )}
                  {acc?.bedrooms && (
                    <span className="acd-listing-header__badge">
                      <FaBed style={{ fontSize: 12 }} /> {acc.bedrooms} bedroom
                      {acc.bedrooms !== 1 ? "s" : ""}
                    </span>
                  )}
                  {acc?.bathrooms && (
                    <span className="acd-listing-header__badge">
                      <FaBath style={{ fontSize: 12 }} /> {acc.bathrooms} bath
                      {acc.bathrooms !== 1 ? "s" : ""}
                    </span>
                  )}
                  {/* schema field: genderPreference */}
                  {acc?.genderPreference && (
                    <span className="acd-listing-header__badge">
                      <FaUsers style={{ fontSize: 12 }} />{" "}
                      {acc.genderPreference}
                    </span>
                  )}
                  {acc?.keyMoneyDuration > 0 && (
                    <span className="acd-listing-header__badge">
                      <FaKey style={{ fontSize: 12 }} /> {acc.keyMoneyDuration}{" "}
                      month key money
                    </span>
                  )}
                  {acc?.distance &&
                    acc.distance !== "Distance not available" && (
                      <span className="acd-listing-header__badge">
                        <FaMapMarkerAlt style={{ fontSize: 12 }} />{" "}
                        {acc.distance}
                      </span>
                    )}
                </div>
                {acc?.address && (
                  <div className="acd-listing-header__address">
                    <FaMapMarkerAlt style={{ fontSize: 12 }} /> {acc.address}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div className="acd-listing-header__actions">
            <button
              className={`acd-action-btn${isSaved ? " acd-action-btn--saved" : ""}`}
              onClick={() => {
                setIsSaved((p) => !p);
                showToast(
                  isSaved ? "Removed from saved" : "Saved to wishlist!",
                );
              }}
            >
              {isSaved ? (
                <FaHeart style={{ color: ORANGE, fontSize: 16 }} />
              ) : (
                <FaRegHeart style={{ color: "#444", fontSize: 16 }} />
              )}
            </button>

            <div ref={actionMenuRef} style={{ position: "relative" }}>
              <button
                className="acd-action-btn"
                onClick={() => setShowActionMenu((p) => !p)}
              >
                <FaEllipsisH style={{ color: "#444", fontSize: 15 }} />
              </button>
              {showActionMenu && (
                <div className="acd-action-dropdown">
                  {/* Host details from acc.owner (populated) or ownerUser fallback */}
                  <div className="acd-action-dropdown__host">
                    <div className="acd-action-dropdown__host-avatar">
                      {hostAvatarSrc ? (
                        <img
                          src={hostAvatarSrc}
                          alt="host"
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <FaUserCircle style={{ fontSize: 36, color: "#bbb" }} />
                      )}
                    </div>
                    <div>
                      <div className="acd-action-dropdown__host-label">
                        Hosted by
                      </div>

                      <div className="acd-action-dropdown__host-name">
                        {host?.name ?? "Host"}
                      </div>
                      <div className="acd-action-dropdown__host-since">
                        {host?.joinedYear
                          ? `Member since ${host.joinedYear}`
                          : "Bodima Host"}
                      </div>
                    </div>
                  </div>
                  <div className="acd-action-dropdown__divider" />
                  <button
                    className="acd-action-dropdown__item acd-action-dropdown__item--primary"
                    onClick={() => {
                      setShowActionMenu(false);
                      if (!isLoggedIn || !isStudent) {
                        setShowLoginRequired(true);
                        return;
                      }
                      showToast("Opening messages…");
                    }}
                  >
                    <FaCommentAlt style={{ fontSize: 13 }} /> Message Host
                  </button>
                  <button
                    className="acd-action-dropdown__item"
                    onClick={() => {
                      setShowActionMenu(false);
                    }}
                  >
                    <FaUserCircle style={{ fontSize: 14 }} /> View Host Profile
                  </button>
                  <div className="acd-action-dropdown__divider" />
                  <button
                    className="acd-action-dropdown__item"
                    onClick={() => {
                      setShowActionMenu(false);
                      navigator.clipboard?.writeText(window.location.href);
                      showToast("Link copied!");
                    }}
                  >
                    <FaShare style={{ fontSize: 13 }} /> Share this listing
                  </button>
                  <button
                    className="acd-action-dropdown__item acd-action-dropdown__item--danger"
                    onClick={() => {
                      setShowActionMenu(false);
                      if (!isLoggedIn) {
                        setShowLoginRequired(true);
                        return;
                      }
                      showToast("Report submitted. Thank you.");
                    }}
                  >
                    <FaFlag style={{ fontSize: 13 }} /> Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="acd-divider" />

        {/* ══ 2-COLUMN BODY ══ */}
        <div className="acd-body-grid">
          {/* ── Left: Gallery + Info ── */}
          <main>
            {/* Gallery */}
            {loading ? (
              <Skeleton h={400} radius={12} mb={32} />
            ) : (
              <div className="acd-gallery">
                <div className="acd-gallery__main">
                  <img
                    src={displayImages[activeImg]}
                    alt="Accommodation"
                    className="acd-gallery__main-img"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/800x500?text=No+Image";
                    }}
                  />
                  {displayImages.length > 1 && (
                    <>
                      <button
                        className="acd-gallery__nav acd-gallery__nav--prev"
                        onClick={prevImg}
                      >
                        <FaChevronLeft />
                      </button>
                      <button
                        className="acd-gallery__nav acd-gallery__nav--next"
                        onClick={nextImg}
                      >
                        <FaChevronRight />
                      </button>
                    </>
                  )}
                  <div className="acd-gallery__counter">
                    {activeImg + 1} / {displayImages.length}
                  </div>
                </div>
                {displayImages.length > 1 && (
                  <div className="acd-gallery__thumbs">
                    {displayImages.slice(0, 5).map((src, i) => (
                      <div
                        key={i}
                        className={`acd-gallery__thumb${i === activeImg ? " acd-gallery__thumb--active" : ""}`}
                        onClick={() => setActiveImg(i)}
                      >
                        <img
                          src={src}
                          alt={`thumb ${i + 1}`}
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/200x140?text=N/A";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="acd-amenities-section__title">Description</div>
            {acc?.description && (
              <div style={{ fontSize: 13, color: "#757575", marginTop: 6 }}>
                {acc.description}
              </div>
            )}

            {/* Amenities */}
            {!loading && (acc?.amenities ?? []).length > 0 && (
              <section className="acd-amenities-section">
                <div className="acd-amenities-section__title">
                  What this place offers
                </div>
                <div className="acd-amenities-grid">
                  {(acc?.amenities ?? []).map((a, i) => {
                    const label =
                      typeof a === "string" ? a : (a.name ?? String(a));
                    const Icon = amenityIcon(label);
                    return (
                      <div key={i} className="acd-amenity-item">
                        <Icon className="acd-amenity-item__icon" />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Host profile card — uses acc.owner data */}
            {!loading && host && (
              <section className="acd-host-section">
                <div className="acd-host-section__title">Hosted by</div>
                <div className="acd-host-card">
                  <div className="acd-host-card__avatar-wrap">
                    {hostAvatarSrc ? (
                      <img
                        src={hostAvatarSrc}
                        alt={host.name ?? "Host"}
                        className="acd-host-card__avatar"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="acd-host-card__avatar-placeholder">
                        {(host.name ?? "H")[0].toUpperCase()}
                      </div>
                    )}
                    {host.isSuperhost && (
                      <span className="acd-host-card__badge">🏅</span>
                    )}
                  </div>
                  <div className="acd-host-card__info">
                    <div className="acd-host-card__name">{host.name}</div>
                    <div className="acd-host-card__sub">
                      {host.isSuperhost && (
                        <span className="acd-host-card__superhost">
                          Superhost ·{" "}
                        </span>
                      )}
                      {host.joinedYear ? `Joined ${host.joinedYear}` : ""}
                    </div>
                    {host.about && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "#545454",
                          marginTop: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {host.about}
                      </div>
                    )}
                    {/* ✅ schema: stats.totalReviews */}
                    {(host.totalReviews ?? liveRatingCount) > 0 && (
                      <div className="acd-host-card__reviews">
                        {host.totalReviews ?? liveRatingCount} reviews
                      </div>
                    )}
                    {/* ✅ schema: stats.hostRating */}
                    {host.stats?.hostRating > 0 && (
                      <div
                        style={{ fontSize: 13, color: "#545454", marginTop: 2 }}
                      >
                        ⭐ {host.stats.hostRating.toFixed(1)} host rating
                      </div>
                    )}
                    {/* ✅ show languages from User schema */}
                    {(host.languages ?? []).length > 0 && (
                      <div
                        style={{ fontSize: 13, color: "#757575", marginTop: 4 }}
                      >
                        🗣 {host.languages.join(", ")}
                      </div>
                    )}
                    {/* ✅ show phone if available */}
                    {host.phone && (
                      <div
                        style={{ fontSize: 13, color: "#757575", marginTop: 2 }}
                      >
                        📞 {host.phone}
                      </div>
                    )}
                    {/* ✅ show verified badges */}
                    {host.isVerified && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {host.isVerified.email && (
                          <span
                            style={{
                              fontSize: 11,
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontWeight: 600,
                            }}
                          >
                            ✓ Email verified
                          </span>
                        )}
                        {host.isVerified.phone && (
                          <span
                            style={{
                              fontSize: 11,
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontWeight: 600,
                            }}
                          >
                            ✓ Phone verified
                          </span>
                        )}
                        {host.isVerified.id && (
                          <span
                            style={{
                              fontSize: 11,
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontWeight: 600,
                            }}
                          >
                            ✓ ID verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className="acd-host-card__btn"
                    onClick={() => {
                      if (!isLoggedIn || !isStudent) {
                        setShowLoginRequired(true);
                        return;
                      }
                      showToast("Opening messages…");
                    }}
                  >
                    <FaEnvelope style={{ marginRight: 7, fontSize: 13 }} />{" "}
                    Contact host
                  </button>
                </div>
              </section>
            )}

            {/* Rules Section */}
            {!loading && (acc?.rules ?? []).length > 0 && (
              <section className="acd-amenities-section">
                <div className="acd-amenities-section__title">House Rules</div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {(acc.rules ?? []).map((rule, i) => (
                    <div key={i} className="acd-amenity-item">
                      <FaCheck
                        className="acd-amenity-item__icon"
                        style={{ color: ORANGE }}
                      />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Utility Bills */}
            {!loading && acc?.utilityBills && (
              <section className="acd-amenities-section">
                <div className="acd-amenities-section__title">
                  Utility Bills
                </div>
                <div className="acd-amenities-grid">
                  <div className="acd-amenity-item">
                    <FaCheck
                      className="acd-amenity-item__icon"
                      style={{
                        color: acc.utilityBills.electricityIncluded
                          ? "#16a34a"
                          : "#dc2626",
                      }}
                    />
                    <span>
                      Electricity{" "}
                      {acc.utilityBills.electricityIncluded
                        ? "Included"
                        : "Not included"}
                    </span>
                  </div>
                  <div className="acd-amenity-item">
                    <FaTint
                      className="acd-amenity-item__icon"
                      style={{
                        color: acc.utilityBills.waterIncluded
                          ? "#16a34a"
                          : "#dc2626",
                      }}
                    />
                    <span>
                      Water{" "}
                      {acc.utilityBills.waterIncluded
                        ? "Included"
                        : "Not included"}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </main>

          {/* ── Booking sidebar ── */}
          <aside className="acd-booking-sidebar">
            <div className="acd-booking-card">
              <div className="acd-booking-card__price-row">
                {acc?.pricePerMonth ? (
                  <>
                    <span className="acd-booking-card__price">
                      Rs {acc.pricePerMonth?.toLocaleString()}
                    </span>
                    <span className="acd-booking-card__per"> / month</span>
                  </>
                ) : loading ? (
                  <Skeleton h={28} w="60%" />
                ) : (
                  <span className="acd-booking-card__price-label">
                    Add dates for prices
                  </span>
                )}
              </div>

              {!loading && (
                <>
                  <div className="acd-booking-card__rating">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      ⭐ {liveRatingAvg.toFixed(1)}
                    </span>
                    <span style={{ color: "#757575", fontSize: 13 }}>
                      ({liveRatingCount} reviews)
                    </span>
                  </div>

                  <div className="acd-booking-card__dates">
                    <div className="acd-booking-card__date-field">
                      <label>
                        <FaCalendarAlt
                          style={{ marginRight: 4, fontSize: 10 }}
                        />
                        DATE
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                      />
                    </div>
                    <div className="acd-booking-card__date-field">
                      <label>
                        <FaCalendarAlt
                          style={{ marginRight: 4, fontSize: 10 }}
                        />
                        Time
                      </label>

                      <input
                        type="time"
                        // value={checkOut}
                        // onChange={(e) => setCheckTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="acd-booking-card__guests">
                    <label>Make a Note</label>
                    <div className="acd-booking-card__guests-controls">
                      <input placeholder="Ask Somrthing..."></input>
                    </div>
                  </div>

                  <button
                    className="acd-booking-card__btn"
                    style={{ fontFamily: FONT }}
                    onClick={() => {
                      if (!isLoggedIn || !isStudent) {
                        setShowLoginRequired(true);
                        return;
                      }
                      showToast("Booking flow coming soon!");
                    }}
                  >
                    <span>Book Now</span>
                  </button>
                  <p className="acd-booking-card__note">
                    You won't be charged yet
                  </p>

                  {acc?.pricePerMonth && (
                    <div className="acd-booking-card__breakdown">
                      <div className="acd-booking-card__breakdown-row">
                        <span>
                          Rs {acc.pricePerMonth?.toLocaleString()} × 1 month
                        </span>
                        <span>Rs {acc.pricePerMonth?.toLocaleString()}</span>
                      </div>
                      {acc.keyMoneyDuration > 0 && (
                        <div className="acd-booking-card__breakdown-row">
                          <span>Key money ({acc.keyMoneyDuration} months)</span>
                          <span>
                            Rs{" "}
                            {(
                              acc.pricePerMonth * acc.keyMoneyDuration
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="acd-booking-card__breakdown-row acd-booking-card__breakdown-row--total">
                        <span>Monthly Payment</span>
                        <span>Rs {acc.pricePerMonth?.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!loading && acc && (
              <div className="acd-info-card">
                {/* ✅ genderPreference (schema field) */}
                {acc.genderPreference && (
                  <div className="acd-info-card__row">
                    <FaUsers className="acd-info-card__icon" />
                    <span>
                      Gender:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {acc.genderPreference}
                      </strong>
                    </span>
                  </div>
                )}
                {/* ✅ accommodationType (schema field) */}
                {acc.accommodationType && (
                  <div className="acd-info-card__row">
                    <FaBed className="acd-info-card__icon" />
                    <span>
                      Type: <strong>{acc.accommodationType}</strong>
                    </span>
                  </div>
                )}
                {acc.beds && (
                  <div className="acd-info-card__row">
                    <FaBed className="acd-info-card__icon" />
                    <span>
                      Beds: <strong>{acc.beds}</strong>
                    </span>
                  </div>
                )}
                {acc.keyMoneyDuration > 0 && (
                  <div className="acd-info-card__row">
                    <FaKey className="acd-info-card__icon" />
                    <span>
                      Key money: <strong>{acc.keyMoneyDuration} months</strong>
                    </span>
                  </div>
                )}
                {acc.address && (
                  <div className="acd-info-card__row">
                    <FaMapMarkerAlt className="acd-info-card__icon" />
                    <span>{acc.address}</span>
                  </div>
                )}
                {/* ✅ isAvailable */}
                <div className="acd-info-card__row">
                  <FaCheck
                    className="acd-info-card__icon"
                    style={{ color: acc.isAvailable ? "#16a34a" : "#dc2626" }}
                  />
                  <span
                    style={{
                      color: acc.isAvailable ? "#16a34a" : "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    {acc.isAvailable ? "Available" : "Not Available"}
                  </span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ══ REVIEWS ══ */}
      <section className="acd-reviews-section">
        <div className="acd-wrapper">
          <div className="acd-reviews-section__header">
            What guests are saying
          </div>
          <div className="acd-reviews-section__rating-row">
            {loading ? (
              <Skeleton h={48} w={80} radius={8} />
            ) : (
              <>
                <span className="acd-reviews-section__score">
                  {liveRatingAvg.toFixed(1)}
                </span>
                <div>
                  <div style={{ fontSize: 18 }}>
                    {"★".repeat(Math.round(liveRatingAvg))}
                    {"☆".repeat(5 - Math.round(liveRatingAvg))}
                  </div>
                  <div style={{ fontSize: 14, color: "#757575" }}>
                    {liveRatingCount} ratings
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            className="acd-write-review-btn"
            style={{ fontFamily: FONT }}
            onClick={handleWriteReviewClick}
          >
            <FaPen style={{ fontSize: 13 }} /> Write a Review
          </button>

          {loading ? (
            <div className="acd-reviews-section__grid">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: "28px 0",
                    paddingRight: i % 2 === 1 ? 40 : 0,
                    paddingLeft: i % 2 === 0 ? 40 : 0,
                  }}
                >
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
          ) : reviews.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#757575",
                fontSize: 15,
              }}
            >
              No reviews yet — be the first to share your experience!
            </div>
          ) : (
            <div className="acd-reviews-section__grid">
              {(showAllReviews ? reviews : previewReviews).map((r, i) => {
                const reviewerId = r.reviewer?._id ?? r.reviewer;
                const isOwn =
                  isLoggedIn && String(userId) === String(reviewerId);
                return (
                  <ReviewCard
                    key={r._id ?? i}
                    review={r}
                    index={i}
                    total={
                      showAllReviews ? reviews.length : previewReviews.length
                    }
                    expanded={!!expanded[r._id ?? i]}
                    onToggle={() =>
                      setExpanded((e) => ({
                        ...e,
                        [r._id ?? i]: !e[r._id ?? i],
                      }))
                    }
                    isOwn={isOwn}
                    onEdit={() => setEditingReview(r)}
                    onDelete={() => setDeletingReviewId(r._id)}
                  />
                );
              })}
            </div>
          )}

          {reviews.length > 4 && (
            <button
              className="acd-reviews-section__show-all-btn"
              style={{ fontFamily: FONT }}
              onClick={() => setShowAllReviews((p) => !p)}
            >
              {showAllReviews
                ? "Show less"
                : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </div>
      </section>

      {/* ══ MAP ══ */}
      {!loading && acc?.location?.coordinates && (
        <section className="acd-map-section">
          <div className="acd-wrapper">
            <div className="acd-map-section__title">
              <FaMapMarkerAlt style={{ color: ORANGE, marginRight: 6 }} /> Where
              you'll stay
            </div>
            <div className="acd-map-section__address">{acc?.address}</div>
            {acc?.distance && acc.distance !== "Distance not available" && (
              <div style={{ fontSize: 13, color: "#757575", marginBottom: 12 }}>
                📍 {acc.distance} from university
              </div>
            )}
            <div className="acd-map-section__container">
              <iframe
                className="acd-map-section__iframe"
                src={`https://maps.google.com/maps?q=${acc.location.coordinates[1]},${acc.location.coordinates[0]}&z=16&output=embed`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={acc?.title}
              />
              <div className="acd-map-section__card">
                <FaBed style={{ fontSize: 22, color: ORANGE }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#000" }}>
                    {acc?.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>
                    {acc?.address}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══ FOOTER ══ */}
      <footer className="acd-footer">
        <div className="acd-footer__bottom">
          <div className="acd-footer__left">
            <span>© 2026 Bodima, Inc.</span>
            <span className="acd-footer__dot">·</span>
            <a href="#" className="acd-footer__legal-link">
              Privacy
            </a>
            <span className="acd-footer__dot">·</span>
            <a href="#" className="acd-footer__legal-link">
              Terms
            </a>
            <span className="acd-footer__dot">·</span>
            <a href="#" className="acd-footer__legal-link">
              Sitemap
            </a>
          </div>
          <div className="acd-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="acd-footer__social-icon">
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══ MODALS ══ */}
      {showReviewModal && (
        <ReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          submitting={reviewSubmitting}
        />
      )}
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
      {deletingReviewId && (
        <DeleteReviewModal
          onConfirm={handleDeleteReviewConfirm}
          onCancel={() => setDeletingReviewId(null)}
          deleting={reviewActionLoading}
        />
      )}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
      {showLoginRequired && (
        <LoginRequiredModal
          onClose={() => setShowLoginRequired(false)}
          onLogin={() => {
            setShowLoginRequired(false);
            navigate("/Login");
          }}
        />
      )}

      {/* ══ TOAST ══ */}
      <div className={`acd-toast${toast.show ? " acd-toast--visible" : ""}`}>
        {toast.msg}
      </div>

      <style>{`
        @keyframes acdSkeleton {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
        .acd-spin { animation: acdSpinAnim 0.8s linear infinite; display: inline-block; }
        @keyframes acdSpinAnim { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AccommodationDetails;

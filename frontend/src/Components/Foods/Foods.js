import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaMotorcycle, FaShoppingBag,
  FaHeart, FaRegHeart, FaSlidersH, FaTimes,
  FaUtensils, FaCoffee, FaBreadSlice, FaHome,
  FaTruck, FaStore,
  FaSun, FaLeaf, FaFire, FaSeedling,
  FaEgg, FaDrumstickBite, FaGlassWhiskey, FaIceCream,
  FaStar, FaExclamationCircle, FaSignInAlt,
} from "react-icons/fa";
import "./Foods.css";
import StudentNavbar from "../NavBar/Student_NavBar/StudentNavbar";
import Footer from "../NavBar/Footer/Footer";

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Constants ────────────────────────────────────────────────────────────
const SERVICE_TYPE_ICON = {
  "Home Kitchen": <FaHome />,
  Restaurant:     <FaUtensils />,
  Cafe:           <FaCoffee />,
  Bakery:         <FaBreadSlice />,
};
const SERVICE_TYPES  = ["Home Kitchen", "Restaurant", "Cafe", "Bakery"];
const ORDER_ICON     = { Delivery: <FaTruck />, Pickup: <FaStore /> };
const ORDER_OPTIONS  = ["Delivery", "Pickup"];
const CAT_ICON       = {
  Breakfast: <FaEgg />, Lunch: <FaLeaf />, Dinner: <FaDrumstickBite />,
  Snacks: <FaFire />, Drinks: <FaGlassWhiskey />, Dessert: <FaIceCream />,
};
const CATEGORIES     = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];
const DIET_ICON      = {
  Vegetarian: <FaLeaf />, Vegan: <FaSeedling />,
  Spicy: <FaFire />, "Gluten-Free": <FaSun />,
};
const DIET_TAGS      = ["Vegetarian", "Vegan", "Spicy", "Gluten-Free"];
const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

const DEFAULT_FILTERS = {
  serviceTypes: [], orderOptions: [], categories: [], dietary: [], minRating: 0,
};
const countActive = (f) =>
  f.serviceTypes.length + f.orderOptions.length + f.categories.length +
  f.dietary.length + (f.minRating > 0 ? 1 : 0);

// ─── Time helper ──────────────────────────────────────────────────────────
function isCurrentlyOpen(operatingHours) {
  try {
    const parse = (str) => {
      if (!str) return null;
      const [time, period] = str.trim().split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    const now      = new Date();
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const openMin  = parse(operatingHours?.open);
    const closeMin = parse(operatingHours?.close);
    if (openMin === null || closeMin === null) return false;
    if (closeMin <= openMin) return nowMin >= openMin || nowMin < closeMin;
    return nowMin >= openMin && nowMin < closeMin;
  } catch { return false; }
}

// ─────────────────────────────────────────
// LOGIN REQUIRED MODAL
// ─────────────────────────────────────────
function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <div className="fsl-modal-overlay" onClick={onClose}>
      <div className="fsl-modal" onClick={e => e.stopPropagation()}>
        <div className="fsl-modal__icon fsl-modal__icon--warn">
          <FaExclamationCircle />
        </div>
        <h3 className="fsl-modal__title">Student Login Required</h3>
        <p className="fsl-modal__msg">
          This feature is only available for student accounts.
          Please login as a student to continue.
        </p>
        <div className="fsl-modal__actions">
          <button className="fsl-modal__btn fsl-modal__btn--cancel" onClick={onClose}>
            Close
          </button>
          <button className="fsl-modal__btn fsl-modal__btn--confirm" onClick={onLogin}>
            <FaSignInAlt /> Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// CARD SKELETON
// ─────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="fs-card fs-card--skeleton">
      <div className="fs-card__image-wrapper fs-skeleton-box" />
      <div className="fs-card__content">
        <div className="fs-skeleton-line" style={{ width:"70%", height:14, marginBottom:6 }} />
        <div className="fs-skeleton-line" style={{ width:"50%", height:12, marginBottom:10 }} />
        <div className="fs-skeleton-line" style={{ width:"90%", height:12 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FOOD SERVICE CARD
// ─────────────────────────────────────────
function FoodServiceCard({ service, onNavigate }) {
  const [favourited, setFavourited] = useState(false);
  const [imgSrc,     setImgSrc]     = useState(null);

  useEffect(() => {
    const id = service.iconImage ?? service.BackgroundImage;
    if (id) setImgSrc(photoSrc(id));
  }, [service]);

  const rating    = service.ratingAverage ?? 0;
  const rateCount = service.ratingCount   ?? 0;
  const icon      = SERVICE_TYPE_ICON[service.serviceType] ?? <FaUtensils />;
  const open      = isCurrentlyOpen(service.operatingHours);

  return (
    <div className="fs-card" onClick={() => onNavigate(service._id)}>
      <div className="fs-card__image-wrapper">
        {imgSrc
          ? <img src={imgSrc} alt={service.kitchenName} className="fs-card__image"
              onError={() => setImgSrc(null)} />
          : <div className="fs-card__image-fallback">{icon}</div>}

        <div className={`fs-card__status ${open ? "fs-card__status--open" : "fs-card__status--closed"}`}>
          <span className="fs-card__status-dot" />
          {open ? "Open" : "Closed"}
        </div>

        <button className="fs-card__heart"
          onClick={e => { e.stopPropagation(); setFavourited(p => !p); }}>
          {favourited
            ? <FaHeart    style={{ color:"var(--orange)", fontSize:15 }} />
            : <FaRegHeart style={{ color:"#333",          fontSize:15 }} />}
        </button>

        <div className="fs-card__tags">
          {service.deliveryAvailable && (
            <span className="fs-card__tag fs-card__tag--delivery">
              <FaMotorcycle style={{ fontSize:10 }} /> Delivery
            </span>
          )}
          {service.pickupAvailable && (
            <span className="fs-card__tag fs-card__tag--pickup">
              <FaShoppingBag style={{ fontSize:10 }} /> Pickup
            </span>
          )}
        </div>
      </div>

      <div className="fs-card__content">
        <div className="fs-card__header-row">
          <h3 className="fs-card__title">{service.kitchenName}</h3>
          {rating > 0 && <span className="fs-card__rating">★ {rating.toFixed(1)}</span>}
        </div>
        <p className="fs-card__subtitle">
          <span className="fs-card__type-icon">{icon}</span>
          {service.serviceType} · {service.address}
        </p>
        <div className="fs-card__footer">
          <span className="fs-card__review-count">
            {rateCount > 0 ? `${rateCount} review${rateCount !== 1 ? "s" : ""}` : "No reviews yet"}
          </span>
          <span className="fs-card__hours">
            🕐 {service.operatingHours?.open ?? "—"} – {service.operatingHours?.close ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FILTER POPUP
// ─────────────────────────────────────────
function FilterPopup({ draft, setDraft, onApply, onClear, onClose }) {
  const toggle = (field, val) =>
    setDraft(f => ({
      ...f,
      [field]: f[field].includes(val)
        ? f[field].filter(v => v !== val)
        : [...f[field], val],
    }));

  const ChipRow = ({ field, items, iconMap }) => (
    <div className="fsl-filter-chips">
      {items.map(item => (
        <button
          key={item}
          className={`fsl-filter-chip${draft[field].includes(item) ? " fsl-filter-chip--on" : ""}`}
          onClick={() => toggle(field, item)}
        >
          <span className="fsl-filter-chip__icon">{iconMap?.[item]}</span>
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fsl-filter-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fsl-filter-popup">
        <div className="fsl-filter-popup__header">
          <button className="fsl-filter-popup__close" onClick={onClose}><FaTimes /></button>
          <span className="fsl-filter-popup__title">Filters</span>
          <button className="fsl-filter-popup__clear" onClick={onClear}>Clear all</button>
        </div>

        <div className="fsl-filter-popup__body">
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Kitchen Type</div>
            <ChipRow field="serviceTypes" items={SERVICE_TYPES} iconMap={SERVICE_TYPE_ICON} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Order Options</div>
            <ChipRow field="orderOptions" items={ORDER_OPTIONS} iconMap={ORDER_ICON} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Menu Category</div>
            <ChipRow field="categories" items={CATEGORIES} iconMap={CAT_ICON} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Dietary</div>
            <ChipRow field="dietary" items={DIET_TAGS} iconMap={DIET_ICON} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Minimum Rating</div>
            <div className="fsl-filter-chips">
              {RATING_OPTIONS.map(r => (
                <button
                  key={r}
                  className={`fsl-filter-chip${draft.minRating === r ? " fsl-filter-chip--on" : ""}`}
                  onClick={() => setDraft(f => ({ ...f, minRating: r }))}
                >
                  {r === 0 ? "Any" : <><span className="fsl-filter-chip__icon"><FaStar /></span>{r}+</>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fsl-filter-popup__footer">
          <button className="fsl-filter-apply-btn" onClick={onApply}>
            <FaSearch style={{ fontSize:13 }} /> Search
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function Foods() {
  const navigate = useNavigate();

  const [services,       setServices]       = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [searchInput,    setSearchInput]    = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showFilter,     setShowFilter]     = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters,   setDraftFilters]   = useState(DEFAULT_FILTERS);

  // ── Auth state ────────────────────────────────────────────────────────
  const [currentUser,       setCurrentUser]       = useState(null);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  const activeCount = countActive(appliedFilters);

  // Derived role helpers
  const userId     = localStorage.getItem("CurrentUserId");
  const isLoggedIn = !!userId;
  const userRole   = currentUser?.role ?? null;
  const isStudent  = userRole === "student";

  // ── Fetch current user ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(raw => { setCurrentUser(unwrap(raw)); })
      .catch(() => setCurrentUser(null));
  }, []);

  // ── Fetch food services ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/Foodservice`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(async raw => {
        const list = unwrap(raw);
        const now  = new Date();
        const arr  = (Array.isArray(list) ? list : []).filter(s => {
          if (s.isAvailable !== true) return false;
          if (!s.expireDate) return false;
          if (new Date(s.expireDate) < now) return false;
          return true;
        });
        const enriched = await Promise.all(
          arr.map(async s => {
            if (!s.menu?.length) return { ...s, _cats: [], _diet: [] };
            try {
              const items = await Promise.all(
                s.menu.map(id =>
                  fetch(`${API_BASE}/menuitem/${id}`)
                    .then(r => r.json()).then(unwrap).catch(() => null)
                )
              );
              const valid = items.filter(Boolean);
              return {
                ...s,
                _cats: [...new Set(valid.map(i => i.category).filter(Boolean))],
                _diet: [...new Set(valid.flatMap(i => i.dietaryTags ?? []))],
              };
            } catch { return { ...s, _cats: [], _diet: [] }; }
          })
        );
        setServices(enriched);
        setFiltered(enriched);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────
  const runFilter = (f, q, base) => {
    let r = base;
    if (f.serviceTypes.length)               r = r.filter(s => f.serviceTypes.includes(s.serviceType));
    if (f.orderOptions.includes("Delivery")) r = r.filter(s => s.deliveryAvailable);
    if (f.orderOptions.includes("Pickup"))   r = r.filter(s => s.pickupAvailable);
    if (f.categories.length)                 r = r.filter(s => f.categories.some(c => s._cats?.includes(c)));
    if (f.dietary.length)                    r = r.filter(s => f.dietary.every(d => s._diet?.includes(d)));
    if (f.minRating > 0)                     r = r.filter(s => (s.ratingAverage ?? 0) >= f.minRating);
    if (q.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(s =>
        s.kitchenName?.toLowerCase().includes(lq) ||
        s.address?.toLowerCase().includes(lq) ||
        s.description?.toLowerCase().includes(lq)
      );
    }
    return r;
  };

  useEffect(() => {
    if (services.length) setFiltered(runFilter(appliedFilters, searchQuery, services));
  }, [services]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSearch      = () => { setSearchQuery(searchInput); setFiltered(runFilter(appliedFilters, searchInput, services)); };
  const handleKeyDown     = e  => { if (e.key === "Enter") handleSearch(); };
  const openFilter        = () => { setDraftFilters(appliedFilters); setShowFilter(true); };
  const handleFilterApply = () => {
    setAppliedFilters(draftFilters);
    setSearchQuery(searchInput);
    setShowFilter(false);
    setFiltered(runFilter(draftFilters, searchInput, services));
  };
  const handleFilterClear = () => setDraftFilters(DEFAULT_FILTERS);
  const clearAllFilters   = () => {
    setAppliedFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setFiltered(runFilter(DEFAULT_FILTERS, searchQuery, services));
  };

  const filterSummary = () => {
    const parts = [];
    if (appliedFilters.serviceTypes.length) parts.push(appliedFilters.serviceTypes.join(", "));
    if (appliedFilters.orderOptions.length) parts.push(appliedFilters.orderOptions.join(", "));
    if (appliedFilters.categories.length)   parts.push(appliedFilters.categories.join(", "));
    if (appliedFilters.dietary.length)      parts.push(appliedFilters.dietary.join(", "));
    if (appliedFilters.minRating)           parts.push(`★ ${appliedFilters.minRating}+`);
    return parts.join(" · ");
  };

  return (
    <div className="fsl-page">

      {/* ══ NAVBAR ══ */}
      <StudentNavbar />

      {/* ══ SEARCH + FILTER BAR ══ */}
      <div className="fsl-search-container">
        <div className="fsl-search-bar">
          <input
            className="fsl-search-input"
            type="text"
            placeholder="Search for kitchens, restaurants, or cafés"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`fsl-filter-btn${activeCount > 0 ? " fsl-filter-btn--active" : ""}`}
            onClick={openFilter}
            title="Filters"
          >
            <FaSlidersH />
            {activeCount > 0 && <span className="fsl-filter-btn__badge">{activeCount}</span>}
          </button>
          <button className="fsl-search-btn" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="fsl-active-filters">
          <span className="fsl-active-filters__label">Active filters:</span>
          <span className="fsl-active-filters__summary">{filterSummary()}</span>
          <button className="fsl-active-filters__clear" onClick={clearAllFilters}>
            <FaTimes style={{ fontSize:10 }} /> Clear all
          </button>
        </div>
      )}

      {/* ══ LISTINGS ══ */}
      <section className="fsl-section">
        <div className="fsl-section__header">
          <h2 className="fsl-section__title">All Food Services</h2>
          {!loading && (
            <span className="fsl-section__count">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div className="fsl-error">
            <div className="fsl-error__icon">⚠️</div>
            <div className="fsl-error__msg">Failed to load: {error}</div>
            <button className="fsl-error__btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        <div className="fsl-grid">
          {loading
            ? Array.from({ length:8 }).map((_,i) => <CardSkeleton key={i} />)
            : filtered.length === 0
              ? <div className="fsl-empty">
                  <div className="fsl-empty__icon"><FaUtensils /></div>
                  <div className="fsl-empty__title">No food services found</div>
                  <div className="fsl-empty__sub">Try adjusting your search or filters</div>
                </div>
              : filtered.map(s => (
                  <FoodServiceCard key={s._id} service={s}
                    onNavigate={id => navigate(`/FoodService/${id}`)} />
                ))}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <Footer />

      {/* ══ FILTER POPUP ══ */}
      {showFilter && (
        <FilterPopup
          draft={draftFilters} setDraft={setDraftFilters}
          onApply={handleFilterApply} onClear={handleFilterClear}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* ══ LOGIN REQUIRED ══ */}
      {showLoginRequired && (
        <LoginRequiredModal
          onClose={() => setShowLoginRequired(false)}
          onLogin={() => { setShowLoginRequired(false); navigate("/Login"); }}
        />
      )}

    </div>
  );
}
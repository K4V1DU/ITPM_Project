import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaAirbnb, FaBars, FaUser, FaSearch,
  FaFacebookF, FaTwitter, FaInstagram,
  FaCog, FaSignOutAlt, FaEnvelope,
  FaMotorcycle, FaShoppingBag,
  FaHeart, FaRegHeart, FaSlidersH, FaTimes,
} from "react-icons/fa";
import "./Foods.css";

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000";
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Constants (match schema enums exactly) ───────────────────────────────
const SERVICE_TYPE_EMOJI = { "Home Kitchen":"🍳", Restaurant:"🍽", Cafe:"☕", Bakery:"🥐" };
const SERVICE_TYPES = ["Home Kitchen", "Restaurant", "Cafe", "Bakery"];

const ORDER_EMOJI   = { Delivery:"🛵", Pickup:"🛍" };
const ORDER_OPTIONS = ["Delivery", "Pickup"];

const CAT_EMOJI  = { Breakfast:"🍳", Lunch:"🥗", Dinner:"🍗", Snacks:"🌶", Drinks:"🥤", Dessert:"🍮" };
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];

const DIET_EMOJI  = { Vegetarian:"🥦", Vegan:"🌱", Spicy:"🌶", "Gluten-Free":"🌾" };
const DIET_TAGS   = ["Vegetarian", "Vegan", "Spicy", "Gluten-Free"];

const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

// ─── Default filter state ─────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  serviceTypes: [],
  orderOptions: [],
  categories:   [],
  dietary:      [],
  minRating:    0,
};

const countActive = (f) =>
  f.serviceTypes.length + f.orderOptions.length +
  f.categories.length + f.dietary.length +
  (f.minRating > 0 ? 1 : 0);

// ─── Time-based open/closed helper ────────────────────────────────────────
// Parses "08:00 AM" / "10:00 PM" style strings and checks if current
// local time falls between open and close.
function isCurrentlyOpen(operatingHours) {
  try {
    const parse = (str) => {
      if (!str) return null;
      const [time, period] = str.trim().split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m; // minutes since midnight
    };

    const now   = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin  = parse(operatingHours?.open);
    const closeMin = parse(operatingHours?.close);

    if (openMin === null || closeMin === null) return false;

    // Handle overnight spans (e.g. 10 PM – 02 AM)
    if (closeMin <= openMin) {
      return nowMin >= openMin || nowMin < closeMin;
    }
    return nowMin >= openMin && nowMin < closeMin;
  } catch {
    return false;
  }
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
  const emoji     = SERVICE_TYPE_EMOJI[service.serviceType] ?? "🍽";

  // Compute open/closed from actual operating hours (real-time)
  const open = isCurrentlyOpen(service.operatingHours);

  return (
    <div className="fs-card" onClick={() => onNavigate(service._id)}>
      <div className="fs-card__image-wrapper">
        {imgSrc
          ? <img src={imgSrc} alt={service.kitchenName} className="fs-card__image"
              onError={() => setImgSrc(null)} />
          : <div className="fs-card__image-fallback">{emoji}</div>}

        <div className={`fs-card__status ${open ? "fs-card__status--open" : "fs-card__status--closed"}`}>
          <span className="fs-card__status-dot" />
          {open ? "Open" : "Closed"}
        </div>

        <button className="fs-card__heart"
          onClick={e => { e.stopPropagation(); setFavourited(p => !p); }}>
          {favourited
            ? <FaHeart    style={{ color:"#FF385C", fontSize:15 }} />
            : <FaRegHeart style={{ color:"#333",    fontSize:15 }} />}
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
        <p className="fs-card__subtitle">{emoji} {service.serviceType} · {service.address}</p>
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

  const ChipRow = ({ field, items, emojiMap }) => (
    <div className="fsl-filter-chips">
      {items.map(item => (
        <button
          key={item}
          className={`fsl-filter-chip${draft[field].includes(item) ? " fsl-filter-chip--on" : ""}`}
          onClick={() => toggle(field, item)}
        >
          {emojiMap?.[item] ?? ""} {item}
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
            <ChipRow field="serviceTypes" items={SERVICE_TYPES} emojiMap={SERVICE_TYPE_EMOJI} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Order Options</div>
            <ChipRow field="orderOptions" items={ORDER_OPTIONS} emojiMap={ORDER_EMOJI} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Menu Category</div>
            <ChipRow field="categories" items={CATEGORIES} emojiMap={CAT_EMOJI} />
          </div>
          <div className="fsl-filter-divider" />
          <div className="fsl-filter-section">
            <div className="fsl-filter-section__title">Dietary</div>
            <ChipRow field="dietary" items={DIET_TAGS} emojiMap={DIET_EMOJI} />
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
                  {r === 0 ? "Any" : `★ ${r}+`}
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
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [activeTab,      setActiveTab]      = useState("food");

  const dropdownRef = useRef(null);
  const activeCount = countActive(appliedFilters);

  // ── Fetch — only services where isAvailable === true ──────────────────
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/Foodservice`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(async raw => {
        const list = unwrap(raw);

        // ✅ Filter out any service where isAvailable is not true
        const arr = (Array.isArray(list) ? list : []).filter(s => s.isAvailable === true);

        // Enrich with menu metadata (categories + dietary tags)
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
            } catch {
              return { ...s, _cats: [], _diet: [] };
            }
          })
        );

        setServices(enriched);
        setFiltered(enriched);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Core filter + search logic ─────────────────────────────────────────
  const runFilter = (f, q, base) => {
    let r = base;
    if (f.serviceTypes.length)
      r = r.filter(s => f.serviceTypes.includes(s.serviceType));
    if (f.orderOptions.includes("Delivery"))
      r = r.filter(s => s.deliveryAvailable);
    if (f.orderOptions.includes("Pickup"))
      r = r.filter(s => s.pickupAvailable);
    if (f.categories.length)
      r = r.filter(s => f.categories.some(c => s._cats?.includes(c)));
    if (f.dietary.length)
      r = r.filter(s => f.dietary.every(d => s._diet?.includes(d)));
    if (f.minRating > 0)
      r = r.filter(s => (s.ratingAverage ?? 0) >= f.minRating);
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

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setFiltered(runFilter(appliedFilters, searchInput, services));
  };
  const handleKeyDown     = (e) => { if (e.key === "Enter") handleSearch(); };
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

  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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
      <nav className="fsl-nav">
        <div className="fsl-nav__left">
          <a href="/" className="fsl-nav__logo"><FaAirbnb /> Bodima</a>
          <div className="fsl-nav__tabs">
            {[
              { key:"boardings",   label:"Boardings",          href:"/Boardings" },
              { key:"food",        label:"Food Services",      href:"/FoodServices" },
              { key:"experiences", label:"Online Experiences", href:"#" },
            ].map(({ key, label, href }) => (
              <a key={key} href={href}
                className={`fsl-nav__tab${activeTab === key ? " fsl-nav__tab--active" : ""}`}
                onClick={() => setActiveTab(key)}>
                {label}
                {activeTab === key && <span className="fsl-nav__tab-underline" />}
              </a>
            ))}
          </div>
        </div>
        <div className="fsl-nav__right">
          <button className="fsl-nav__host-btn">Become a Host</button>
          <div className="fsl-nav__icon-btn"><FaUser /></div>
          <div ref={dropdownRef} className="fsl-dropdown">
            <div className="fsl-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}>
              <FaBars />
            </div>
            {showDropdown && (
              <div className="fsl-dropdown__menu">
                <div className="fsl-dropdown__item"><FaUser style={{ opacity:0.7 }} /> Profile</div>
                <div className="fsl-dropdown__item"><FaEnvelope style={{ opacity:0.7 }} /> Messages</div>
                <div className="fsl-dropdown__divider" />
                <div className="fsl-dropdown__item"><FaCog style={{ opacity:0.7 }} /> Settings</div>
                <div className="fsl-dropdown__item fsl-dropdown__item--danger">
                  <FaSignOutAlt style={{ opacity:0.7 }} /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

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
                  <div className="fsl-empty__icon">🍽</div>
                  <div className="fsl-empty__title">No food services found</div>
                  <div className="fsl-empty__sub">Try adjusting your search or filters</div>
                </div>
              : filtered.map(s => (
                  <FoodServiceCard key={s._id} service={s} onNavigate={id => navigate(`/FoodService/${id}`)} />
                ))}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="fsl-footer">
        <div className="fsl-footer__grid">
          {[
            { title:"Support",   links:["Help Center","Safety","Cancellation Options","Community Guideline"] },
            { title:"Community", links:["Bodima Adventures","New Features","Tips for Hosts","Careers"] },
            { title:"Host",      links:["Host a home","Host an experience","Responsible hosting","Community forum"] },
            { title:"About",     links:["About Bodima","Newsroom","Investors","Bodima Plus"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="fsl-footer__col-title">{title}</h4>
              {links.map(l => <a key={l} href="#" className="fsl-footer__link">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="fsl-footer__bottom">
          <span>© 2026 Bodima, Inc. · <a href="#" className="fsl-footer__legal">Privacy · Terms · Sitemap</a></span>
          <div className="fsl-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon,i) => (
              <a key={i} href="#" className="fsl-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══ FILTER POPUP ══ */}
      {showFilter && (
        <FilterPopup
          draft={draftFilters}
          setDraft={setDraftFilters}
          onApply={handleFilterApply}
          onClear={handleFilterClear}
          onClose={() => setShowFilter(false)}
        />
      )}

    </div>
  );
}
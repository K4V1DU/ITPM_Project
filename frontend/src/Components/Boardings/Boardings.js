import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Boardings.css";
import {
  FaAirbnb, FaBars, FaUser, FaSearch,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSignOutAlt, FaEnvelope,
  FaHeart, FaRegHeart, FaSlidersH, FaTimes,
  FaBed, FaWifi, FaSnowflake, FaParking, FaUtensils,
  FaShower, FaMale, FaFemale, FaUsers,
  FaStar, FaExclamationCircle, FaSignInAlt,
} from "react-icons/fa";
import axios from "axios";

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Constants ────────────────────────────────────────────────────────────
const ROOM_TYPES     = ["Single", "Double", "Triple", "Shared"];
const AMENITIES      = ["WiFi", "AC", "Attached Bath", "Parking", "Meals Included"];
const GENDER_OPTIONS = ["Male", "Female", "Mixed"];
const RATING_OPTIONS = [0, 3, 3.5, 4, 4.5];

const ROOM_ICON = {
  Single: <FaBed />, Double: <FaBed />, Triple: <FaBed />, Shared: <FaUsers />,
};
const AMENITY_ICON = {
  WiFi: <FaWifi />, AC: <FaSnowflake />, "Attached Bath": <FaShower />,
  Parking: <FaParking />, "Meals Included": <FaUtensils />,
};
const GENDER_ICON = { Male: <FaMale />, Female: <FaFemale />, Mixed: <FaUsers /> };

const DEFAULT_FILTERS = {
  roomTypes: [], amenities: [], gender: [], minRating: 0, maxPrice: 0,
};
const countActive = (f) =>
  f.roomTypes.length + f.amenities.length + f.gender.length +
  (f.minRating > 0 ? 1 : 0) + (f.maxPrice > 0 ? 1 : 0);

// ─────────────────────────────────────────
// LOGOUT CONFIRM MODAL
// ─────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="bd-modal-overlay" onClick={onCancel}>
      <div className="bd-modal" onClick={e => e.stopPropagation()}>
        <div className="bd-modal__icon bd-modal__icon--logout"><FaSignOutAlt /></div>
        <h3 className="bd-modal__title">Logout</h3>
        <p className="bd-modal__msg">Are you sure you want to logout?</p>
        <div className="bd-modal__actions">
          <button className="bd-modal__btn bd-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="bd-modal__btn bd-modal__btn--danger" onClick={onConfirm}>Yes, Logout</button>
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
    <div className="bd-modal-overlay" onClick={onClose}>
      <div className="bd-modal" onClick={e => e.stopPropagation()}>
        <div className="bd-modal__icon bd-modal__icon--warn"><FaExclamationCircle /></div>
        <h3 className="bd-modal__title">Student Login Required</h3>
        <p className="bd-modal__msg">
          This feature is only available for student accounts.
          Please login as a student to continue.
        </p>
        <div className="bd-modal__actions">
          <button className="bd-modal__btn bd-modal__btn--cancel" onClick={onClose}>Close</button>
          <button className="bd-modal__btn bd-modal__btn--confirm" onClick={onLogin}>
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
    <div className="bd-card bd-card--skeleton">
      <div className="bd-card__image-wrapper bd-skeleton-box" />
      <div className="bd-card__content">
        <div className="bd-skeleton-line" style={{ width: "70%", height: 14, marginBottom: 6 }} />
        <div className="bd-skeleton-line" style={{ width: "50%", height: 12, marginBottom: 10 }} />
        <div className="bd-skeleton-line" style={{ width: "90%", height: 12 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// BOARDING CARD
// ─────────────────────────────────────────
function BoardingCard({ acc, imageUrl, onNavigate }) {
  const [favourited, setFavourited] = useState(false);

  return (
    <div className="bd-card" onClick={() => onNavigate(acc._id)}>
      <div className="bd-card__image-wrapper">
        <img
          src={imageUrl || "https://via.placeholder.com/400x300"}
          alt={acc.title}
          className="bd-card__image"
          onError={e => { e.target.src = "https://via.placeholder.com/400x300"; }}
        />
        <button
          className="bd-card__heart"
          onClick={e => { e.stopPropagation(); setFavourited(p => !p); }}
        >
          {favourited
            ? <FaHeart    style={{ color: "var(--orange)", fontSize: 15 }} />
            : <FaRegHeart style={{ color: "#333",          fontSize: 15 }} />}
        </button>
        {acc.bedrooms && (
          <div className="bd-card__badge">{acc.bedrooms} Bed{acc.bedrooms > 1 ? "s" : ""}</div>
        )}
      </div>
      <div className="bd-card__content">
        <div className="bd-card__header-row">
          <h3 className="bd-card__title">{acc.title}</h3>
          {acc.ratingAverage > 0 && (
            <span className="bd-card__rating">★ {acc.ratingAverage.toFixed(1)}</span>
          )}
        </div>
        <p className="bd-card__subtitle">📍 {acc.address}</p>
        <div className="bd-card__footer">
          <span className="bd-card__review-count">
            {acc.ratingCount > 0
              ? `${acc.ratingCount} review${acc.ratingCount !== 1 ? "s" : ""}`
              : "No reviews yet"}
          </span>
          <span className="bd-card__price">
            Rs {acc.pricePerMonth?.toLocaleString()}
            <span className="bd-card__price-label">/month</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FILTER POPUP — icons instead of emojis
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
    <div className="bd-filter-chips">
      {items.map(item => (
        <button
          key={item}
          className={`bd-filter-chip${draft[field].includes(item) ? " bd-filter-chip--on" : ""}`}
          onClick={() => toggle(field, item)}
        >
          <span className="bd-filter-chip__icon">{iconMap?.[item]}</span>
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="bd-filter-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bd-filter-popup">
        <div className="bd-filter-popup__header">
          <button className="bd-filter-popup__close" onClick={onClose}><FaTimes /></button>
          <span className="bd-filter-popup__title">Filters</span>
          <button className="bd-filter-popup__clear" onClick={onClear}>Clear all</button>
        </div>

        <div className="bd-filter-popup__body">
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Room Type</div>
            <ChipRow field="roomTypes" items={ROOM_TYPES} iconMap={ROOM_ICON} />
          </div>
          <div className="bd-filter-divider" />
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Amenities</div>
            <ChipRow field="amenities" items={AMENITIES} iconMap={AMENITY_ICON} />
          </div>
          <div className="bd-filter-divider" />
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Gender Policy</div>
            <ChipRow field="gender" items={GENDER_OPTIONS} iconMap={GENDER_ICON} />
          </div>
          <div className="bd-filter-divider" />
          <div className="bd-filter-section">
            <div className="bd-filter-section__title">Minimum Rating</div>
            <div className="bd-filter-chips">
              {RATING_OPTIONS.map(r => (
                <button
                  key={r}
                  className={`bd-filter-chip${draft.minRating === r ? " bd-filter-chip--on" : ""}`}
                  onClick={() => setDraft(f => ({ ...f, minRating: r }))}
                >
                  {r === 0 ? "Any" : <><span className="bd-filter-chip__icon"><FaStar /></span>{r}+</>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bd-filter-popup__footer">
          <button className="bd-filter-apply-btn" onClick={onApply}>
            <FaSearch style={{ fontSize: 13 }} /> Search
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
const Boarding = () => {
  const navigate = useNavigate();

  const [accommodations, setAccommodations] = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [imageUrls,      setImageUrls]      = useState({});
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [searchInput,    setSearchInput]    = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showFilter,     setShowFilter]     = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [draftFilters,   setDraftFilters]   = useState(DEFAULT_FILTERS);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [activeTab,      setActiveTab]      = useState("boardings");

  // ── Auth state ────────────────────────────────────────────────────────
  const [currentUser,       setCurrentUser]       = useState(null);
  const [userAvatarSrc,     setUserAvatarSrc]     = useState(null);
  const [showLogoutModal,   setShowLogoutModal]   = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  const dropdownRef = useRef(null);
  const activeCount = countActive(appliedFilters);

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
      })
      .catch(() => { setCurrentUser(null); setUserAvatarSrc(null); });
  }, []);

  // ── Fetch accommodations ──────────────────────────────────────────────
  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/accommodation`);
        if (res.data.success) {
          const now     = new Date();
          const accData = res.data.data.filter(acc => {
            if (acc.isAvailable !== true) return false;
            if (!acc.expireDate) return false;
            if (new Date(acc.expireDate) < now) return false;
            return true;
          });
          setAccommodations(accData);
          setFiltered(accData);

          const urls = {};
          await Promise.all(
            accData.map(async acc => {
              if (acc.images?.length > 0) {
                try {
                  const imageRes = await axios.get(`${API_BASE}/Photo/${acc.images[0]}`, {
                    responseType: "blob",
                  });
                  urls[acc._id] = URL.createObjectURL(imageRes.data);
                } catch {
                  urls[acc._id] = "https://via.placeholder.com/400x300";
                }
              } else {
                urls[acc._id] = "https://via.placeholder.com/400x300";
              }
            })
          );
          setImageUrls(urls);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAccommodations();
  }, []);

  // ── Filter logic ──────────────────────────────────────────────────────
  const runFilter = (f, q, base) => {
    let r = base;
    if (f.roomTypes.length)  r = r.filter(a => f.roomTypes.includes(a.roomType));
    if (f.amenities.length)  r = r.filter(a => f.amenities.every(am => a.amenities?.includes(am)));
    if (f.gender.length)     r = r.filter(a => f.gender.includes(a.genderPolicy));
    if (f.minRating > 0)     r = r.filter(a => (a.ratingAverage ?? 0) >= f.minRating);
    if (q.trim()) {
      const lq = q.toLowerCase();
      r = r.filter(a =>
        a.title?.toLowerCase().includes(lq) ||
        a.address?.toLowerCase().includes(lq) ||
        a.description?.toLowerCase().includes(lq)
      );
    }
    return r;
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSearch      = () => { setSearchQuery(searchInput); setFiltered(runFilter(appliedFilters, searchInput, accommodations)); };
  const handleKeyDown     = e  => { if (e.key === "Enter") handleSearch(); };
  const openFilter        = () => { setDraftFilters(appliedFilters); setShowFilter(true); };
  const handleFilterApply = () => {
    setAppliedFilters(draftFilters);
    setSearchQuery(searchInput);
    setShowFilter(false);
    setFiltered(runFilter(draftFilters, searchInput, accommodations));
  };
  const handleFilterClear = () => setDraftFilters(DEFAULT_FILTERS);
  const clearAllFilters   = () => {
    setAppliedFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setFiltered(runFilter(DEFAULT_FILTERS, searchQuery, accommodations));
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    setShowDropdown(false);
    setShowLogoutModal(false);
    navigate("/Login");
  };

  // ── Dropdown guard — non-students see login-required modal ────────────
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
  // No user → "Login", Student → hidden, Host → "Host Page" → /Listings
  const hostBtnLabel  = !isLoggedIn ? "Login" : isHost ? "Host Page" : null;
  const hostBtnAction = () => navigate(!isLoggedIn ? "/Login" : "/Listings");

  // ── Close dropdown on outside click ──────────────────────────────────
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
    if (appliedFilters.roomTypes.length)  parts.push(appliedFilters.roomTypes.join(", "));
    if (appliedFilters.amenities.length)  parts.push(appliedFilters.amenities.join(", "));
    if (appliedFilters.gender.length)     parts.push(appliedFilters.gender.join(", "));
    if (appliedFilters.minRating)         parts.push(`★ ${appliedFilters.minRating}+`);
    return parts.join(" · ");
  };

  // ── Avatar ────────────────────────────────────────────────────────────
  const UserAvatar = () => (
    <div className="bd-nav__avatar">
      {userAvatarSrc
        ? <img src={userAvatarSrc} alt="Profile" className="bd-nav__avatar-img"
            onError={() => setUserAvatarSrc(null)} />
        : <FaUser className="bd-nav__avatar-icon" />}
    </div>
  );

  return (
    <div className="bd-page">

      {/* ══ NAVBAR ══ */}
      <nav className="bd-nav">
        <div className="bd-nav__left">
          <a href="/" className="bd-nav__logo"><FaAirbnb /> Bodima</a>
        </div>

        {/* Centered tabs */}
        <div className="bd-nav__tabs">
          {[
            { key: "boardings",   label: "Boardings",          href: "/Boardings"    },
            { key: "food",        label: "Food Services",       href: "/Foods" },
            { key: "experiences", label: "Orders",  href: "#"             },
          ].map(({ key, label, href }) => (
            <a key={key} href={href}
              className={`bd-nav__tab${activeTab === key ? " bd-nav__tab--active" : ""}`}
              onClick={() => setActiveTab(key)}>
              {label}
              {activeTab === key && <span className="bd-nav__tab-underline" />}
            </a>
          ))}
        </div>

        <div className="bd-nav__right">
          {/* Login / Host Page — hidden for students */}
          {hostBtnLabel && (
            <button className="bd-nav__host-btn" onClick={hostBtnAction}>
              {hostBtnLabel}
            </button>
          )}

          <UserAvatar />

          <div ref={dropdownRef} className="bd-dropdown">
            <div className="bd-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}>
              <FaBars />
            </div>

            {showDropdown && (
              <div className="bd-dropdown__menu">
                {/* User info — only when logged in */}
                {isLoggedIn && currentUser && (
                  <>
                    <div className="bd-dropdown__user">
                      <span className="bd-dropdown__username">{currentUser.name ?? "User"}</span>
                      <span className="bd-dropdown__email">{currentUser.email ?? ""}</span>
                      <span className={`bd-dropdown__role bd-dropdown__role--${userRole}`}>
                        {userRole}
                      </span>
                    </div>
                    <div className="bd-dropdown__divider" />
                  </>
                )}

                {/* Profile — students and hosts */}
                {(isStudent || isHost) && (
                  <div className="bd-dropdown__item"
                    onClick={() => { setShowDropdown(false); navigate("/Profile"); }}>
                    <FaUser style={{ opacity: 0.7 }} /> Profile
                  </div>
                )}

                {/* Not logged in — show login-required modal */}
                {!isLoggedIn && (
                  <>
                    <div className="bd-dropdown__item" onClick={() => handleProtectedClick()}>
                      <FaUser style={{ opacity: 0.7 }} /> Profile
                    </div>
                    <div className="bd-dropdown__item" onClick={() => handleProtectedClick()}>
                      <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                    </div>
                  </>
                )}

                {/* Messages — students only */}
                {isStudent && (
                  <div className="bd-dropdown__item"
                    onClick={() => { setShowDropdown(false); navigate("/Messages"); }}>
                    <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                  </div>
                )}

                {/* Logout — students and hosts */}
                {isLoggedIn && (isStudent || isHost) && (
                  <>
                    <div className="bd-dropdown__divider" />
                    <div className="bd-dropdown__item bd-dropdown__item--danger"
                      onClick={() => { setShowDropdown(false); setShowLogoutModal(true); }}>
                      <FaSignOutAlt style={{ opacity: 0.7 }} /> Logout
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ SEARCH + FILTER BAR ══ */}
      <div className="bd-search-container">
        <div className="bd-search-bar">
          <input
            className="bd-search-input"
            type="text"
            placeholder="Search for hostels, rooms, or apartments"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={`bd-filter-btn${activeCount > 0 ? " bd-filter-btn--active" : ""}`}
            onClick={openFilter}
            title="Filters"
          >
            <FaSlidersH />
            {activeCount > 0 && <span className="bd-filter-btn__badge">{activeCount}</span>}
          </button>
          <button className="bd-search-btn" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="bd-active-filters">
          <span className="bd-active-filters__label">Active filters:</span>
          <span className="bd-active-filters__summary">{filterSummary()}</span>
          <button className="bd-active-filters__clear" onClick={clearAllFilters}>
            <FaTimes style={{ fontSize: 10 }} /> Clear all
          </button>
        </div>
      )}

      {/* ══ LISTINGS ══ */}
      <section className="bd-section">
        <div className="bd-section__header">
          <h2 className="bd-section__title">Nearest on your Campus</h2>
          {!loading && (
            <span className="bd-section__count">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && (
          <div className="bd-error">
            <div className="bd-error__icon">⚠️</div>
            <div className="bd-error__msg">Failed to load: {error}</div>
            <button className="bd-error__btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        <div className="bd-grid">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
            : filtered.length === 0
              ? (
                <div className="bd-empty">
                  <div className="bd-empty__icon">🏠</div>
                  <div className="bd-empty__title">No boardings found</div>
                  <div className="bd-empty__sub">Try adjusting your search or filters</div>
                </div>
              )
              : filtered.map(acc => (
                  <BoardingCard
                    key={acc._id} acc={acc} imageUrl={imageUrls[acc._id]}
                    onNavigate={id => navigate(`/details-Accommodation/${id}`)}
                  />
                ))}
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="bd-footer">
        <div className="bd-footer__bottom">
          <span>© 2026 Bodima, Inc. · <a href="#" className="bd-footer__legal">Privacy · Terms · Sitemap</a></span>
          <div className="bd-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="bd-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══ FILTER POPUP ══ */}
      {showFilter && (
        <FilterPopup
          draft={draftFilters} setDraft={setDraftFilters}
          onApply={handleFilterApply} onClear={handleFilterClear}
          onClose={() => setShowFilter(false)}
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

    </div>
  );
};

export default Boarding;
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AccommodationDetails.css';
import {
  FaHeart, FaRegHeart, FaShare,
  FaUsers, FaBed, FaBath, FaChevronDown,
  FaAirbnb, FaPlane, FaComments, FaUser,
  FaCog, FaGlobe, FaQuestionCircle, FaSignOutAlt,
  FaUserFriends, FaUsers as FaCoHost, FaGift,
  FaFacebookF, FaTwitter, FaInstagram,
  FaWifi, FaSnowflake, FaFire, FaUtensils,
  FaTools, FaTv, FaTint, FaParking,
  FaBars, FaEnvelope, FaMapMarkerAlt, FaCheck,
} from 'react-icons/fa';

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Amenity icon map ─────────────────────────────────────────────────────
const AMENITY_ICONS = {
  wifi:               FaWifi,
  'air conditioning': FaSnowflake,
  ac:                 FaSnowflake,
  heating:            FaFire,
  kitchen:            FaUtensils,
  'hair dryer':       FaTools,
  iron:               FaTools,
  tv:                 FaTv,
  washer:             FaTint,
  parking:            FaParking,
};
function amenityIcon(name = '') {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return FaCheck;
}

// ─── Stars ────────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = 13 }) {
  return (
    <span className="acd-stars" style={{ fontSize: size }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= Math.round(rating) ? '#FF385C' : '#ddd' }}>★</span>
      ))}
    </span>
  );
}

// ─── Page skeleton ────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="acd-skeleton-page">
      <div className="acd-skeleton-hero" />
      <div className="acd-skeleton-body">
        <div className="acd-skeleton-line" style={{ width: '60%', height: 28, marginBottom: 12 }} />
        <div className="acd-skeleton-line" style={{ width: '40%', height: 16, marginBottom: 24 }} />
        <div className="acd-skeleton-line" style={{ width: '100%', height: 14, marginBottom: 8 }} />
        <div className="acd-skeleton-line" style={{ width: '90%', height: 14, marginBottom: 8 }} />
        <div className="acd-skeleton-line" style={{ width: '80%', height: 14 }} />
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────
function NavBar({ navigate, showDropdown, setShowDropdown, dropdownRef }) {
  return (
    <nav className="acd-nav">
      <div className="acd-nav__left">
        <a href="/" className="acd-nav__logo"><FaAirbnb /> Bodima</a>
        <div className="acd-nav__tabs">
          <a href="/Boardings"    className="acd-nav__tab">Boardings</a>
          <a href="/FoodServices" className="acd-nav__tab">Food Services</a>
          <a href="#"             className="acd-nav__tab">Online Experiences</a>
        </div>
      </div>

      <div className="acd-nav__right">
        <button className="acd-nav__host-btn">Become a Host</button>

        <div ref={dropdownRef} className="acd-dropdown">
          <button
            className="acd-nav__menu-btn"
            onClick={() => setShowDropdown(p => !p)}
            aria-label="Menu"
          >
            <FaBars />
          </button>

          {showDropdown && (
            <div className="acd-dropdown__menu">
              <div className="acd-dropdown__section">
                <a href="#" className="acd-dropdown__item"><FaPlane className="acd-dropdown__icon" /><span>Trips</span></a>
                <a href="#" className="acd-dropdown__item"><FaComments className="acd-dropdown__icon" /><span>Messages</span></a>
                <a href="#" className="acd-dropdown__item"><FaUser className="acd-dropdown__icon" /><span>Profile</span></a>
              </div>
              <div className="acd-dropdown__section">
                <a href="#" className="acd-dropdown__item"><FaCog className="acd-dropdown__icon" /><span>Account settings</span></a>
                <a href="#" className="acd-dropdown__item"><FaGlobe className="acd-dropdown__icon" /><span>Languages &amp; currency</span></a>
                <a href="#" className="acd-dropdown__item"><FaQuestionCircle className="acd-dropdown__icon" /><span>Help Center</span></a>
              </div>
              <div className="acd-dropdown__section">
                <a href="#" className="acd-dropdown__item"><FaUserFriends className="acd-dropdown__icon" /><span>Refer a Host</span></a>
                <a href="#" className="acd-dropdown__item"><FaCoHost className="acd-dropdown__icon" /><span>Find a co-host</span></a>
                <a href="#" className="acd-dropdown__item"><FaGift className="acd-dropdown__icon" /><span>Gift cards</span></a>
              </div>
              <div className="acd-dropdown__section acd-dropdown__section--last">
                <a href="#" className="acd-dropdown__item acd-dropdown__item--logout">
                  <FaSignOutAlt className="acd-dropdown__icon" /><span>Log out</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="acd-nav__icon-btn"><FaUser /></div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// FIX: Populate host + reviews from separate API calls
// ─────────────────────────────────────────────────────────────────────────
async function populateAccommodation(acc) {
  // ── Populate host ──────────────────────────────────────────────────────
  // acc.host is a raw ObjectId string — fetch the full User document
  if (acc.host && typeof acc.host === 'string') {
    try {
      const res = await fetch(`${API_BASE}/User/${acc.host}`);
      if (res.ok) acc.host = unwrap(await res.json());
    } catch {
      acc.host = null;
    }
  }

  // ── Populate reviews ───────────────────────────────────────────────────
  // acc.reviews is an array of raw ObjectId strings — fetch each Review,
  // then fetch the reviewer User nested inside each review.
  if (Array.isArray(acc.reviews) && acc.reviews.length > 0) {
    const settled = await Promise.allSettled(
      acc.reviews.map(async (item) => {
        // Already a full object (backend pre-populated it)
        if (item && typeof item === 'object' && item.comment) {
          // Still need to populate reviewer if it's an ID
          if (typeof item.reviewer === 'string') {
            try {
              const rRes = await fetch(`${API_BASE}/User/${item.reviewer}`);
              if (rRes.ok) item.reviewer = unwrap(await rRes.json());
            } catch { /* leave as-is */ }
          }
          return item;
        }

        // It's a plain ID — fetch the full Review document
        const reviewId = typeof item === 'string' ? item : item?._id;
        if (!reviewId) return null;

        const revRes = await fetch(`${API_BASE}/Review/${reviewId}`);
        if (!revRes.ok) return null;
        const rev = unwrap(await revRes.json());

        // Populate reviewer inside the review
        if (rev && typeof rev.reviewer === 'string') {
          try {
            const rRes = await fetch(`${API_BASE}/User/${rev.reviewer}`);
            if (rRes.ok) rev.reviewer = unwrap(await rRes.json());
          } catch { /* leave as-is */ }
        }
        return rev;
      })
    );
    acc.reviews = settled
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
  }

  return acc;
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
const AccommodationDetails = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [acc,          setAcc]          = useState(null);
  const [images,       setImages]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [isSaved,      setIsSaved]      = useState(false);
  const [activeImg,    setActiveImg]    = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [checkIn,      setCheckIn]      = useState('');
  const [checkOut,     setCheckOut]     = useState('');
  const [guests,       setGuests]       = useState(1);
  const [expandedRev,  setExpandedRev]  = useState({});

  const dropdownRef = useRef(null);

  // ── Fetch + populate ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/Accommodation/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(async raw => {
        const data = unwrap(raw);

        // FIX: populate host + reviews before setting state
        await populateAccommodation(data);

        setAcc(data);

        // Load image blobs
        const imgIds = data.images ?? [];
        const loaded = await Promise.all(
          imgIds.map(async imgId => {
            try {
              const res = await fetch(`${API_BASE}/Photo/${imgId}`);
              if (!res.ok) throw new Error();
              return URL.createObjectURL(await res.blob());
            } catch { return null; }
          })
        );
        setImages(loaded.filter(Boolean));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Close dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Gallery helpers ───────────────────────────────────────────────────
  const displayImages = images.length > 0
    ? images
    : ['https://via.placeholder.com/800x500?text=No+Image'];

  const prevImg = () => setActiveImg(p => (p - 1 + displayImages.length) % displayImages.length);
  const nextImg = () => setActiveImg(p => (p + 1) % displayImages.length);

  // ── Host avatar src ───────────────────────────────────────────────────
  // FIX: User model uses `profileImage`, not `avatar`
  const hostAvatar = (host) => {
    if (!host) return null;
    const img = host.profileImage ?? host.avatar; // profileImage is the correct field
    if (img) return img.startsWith('http') ? img : photoSrc(img);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(host.name ?? 'Host')}&background=FF385C&color=fff&size=128`;
  };

  // ── Loading / error guards ────────────────────────────────────────────
  if (loading) return (
    <div className="acd-page">
      <NavBar navigate={navigate} showDropdown={showDropdown}
        setShowDropdown={setShowDropdown} dropdownRef={dropdownRef} />
      <PageSkeleton />
    </div>
  );

  if (error || !acc) return (
    <div className="acd-page">
      <NavBar navigate={navigate} showDropdown={showDropdown}
        setShowDropdown={setShowDropdown} dropdownRef={dropdownRef} />
      <div className="acd-error-block">
        <div className="acd-error-icon">⚠️</div>
        <p className="acd-error-msg">{error || 'Accommodation not found.'}</p>
        <button className="acd-error-btn" onClick={() => navigate('/Boardings')}>
          ← Back to Boardings
        </button>
      </div>
    </div>
  );

  // ── Derived ───────────────────────────────────────────────────────────
  const rating    = acc.ratingAverage   ?? 0;
  const rateCount = acc.ratingCount     ?? 0;
  const amenities = acc.amenities       ?? [];
  const reviews   = acc.reviews         ?? [];
  const rbd       = acc.ratingBreakdown ?? {};

  // ── Host derived fields ───────────────────────────────────────────────
  // FIX: map populated User fields to what the template expects
  const host = acc.host
    ? {
        ...acc.host,
        // `joinedYear` doesn't exist on User — derive it from `createdAt`
        joinedYear:    acc.host.createdAt ? new Date(acc.host.createdAt).getFullYear() : null,
        // `isSuperhost` doesn't exist on User — derive from `stats` or `role`
        isSuperhost:   acc.host.stats?.isSuperhost ?? (acc.host.role === 'superhost') ?? false,
        // `totalReviews` lives under `stats` on the User model
        totalReviews:  acc.host.stats?.totalReviews ?? null,
      }
    : null;

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="acd-page">

      <NavBar navigate={navigate} showDropdown={showDropdown}
        setShowDropdown={setShowDropdown} dropdownRef={dropdownRef} />

      <main className="acd-main">

        {/* ── Title row ── */}
        <div className="acd-title-row">
          <h1 className="acd-title">{acc.title}</h1>
          <div className="acd-title-actions">
            <button className="acd-action-btn"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <FaShare size={14} /> Share
            </button>
            <button
              className={`acd-action-btn${isSaved ? ' acd-action-btn--saved' : ''}`}
              onClick={() => setIsSaved(p => !p)}>
              {isSaved ? <FaHeart size={14} /> : <FaRegHeart size={14} />} Save
            </button>
          </div>
        </div>

        {/* ── Gallery ── */}
        <div className="acd-gallery">
          <div className="acd-gallery__main">
            <img src={displayImages[activeImg]} alt="Accommodation"
              className="acd-gallery__main-img"
              onError={e => { e.target.src = 'https://via.placeholder.com/800x500?text=No+Image'; }} />
            {displayImages.length > 1 && <>
              <button className="acd-gallery__nav acd-gallery__nav--prev" onClick={prevImg}>‹</button>
              <button className="acd-gallery__nav acd-gallery__nav--next" onClick={nextImg}>›</button>
            </>}
            <div className="acd-gallery__counter">
              {activeImg + 1} / {displayImages.length}
            </div>
          </div>
          {displayImages.length > 1 && (
            <div className="acd-gallery__thumbs">
              {displayImages.slice(0, 4).map((src, i) => (
                <div key={i}
                  className={`acd-gallery__thumb${i === activeImg ? ' acd-gallery__thumb--active' : ''}`}
                  onClick={() => setActiveImg(i)}>
                  <img src={src} alt={`thumb ${i + 1}`}
                    onError={e => { e.target.src = 'https://via.placeholder.com/200x140?text=N/A'; }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Content grid ── */}
        <div className="acd-content-grid">

          {/* ════ LEFT COLUMN ════ */}
          <div className="acd-left">

            {/* Room info */}
            <section className="acd-section acd-section--room">
              <h2 className="acd-section__title">
                {acc.type ?? acc.roomType ?? 'Room'} · {acc.address}
              </h2>
              <div className="acd-specs">
                {acc.maxGuests && <><span><FaUsers /> {acc.maxGuests} guest{acc.maxGuests !== 1 ? 's' : ''}</span><span className="acd-dot">·</span></>}
                {acc.bedrooms  && <><span><FaBed />   {acc.bedrooms}  bedroom{acc.bedrooms !== 1 ? 's' : ''}</span><span className="acd-dot">·</span></>}
                {acc.beds      && <><span><FaBed />   {acc.beds}      bed{acc.beds !== 1 ? 's' : ''}</span><span className="acd-dot">·</span></>}
                {acc.bathrooms && <span><FaBath />    {acc.bathrooms} bath{acc.bathrooms !== 1 ? 's' : ''}</span>}
              </div>
            </section>

            {/* Rating banner */}
            {rating > 0 && (
              <section className="acd-section acd-rating-banner">
                <div className="acd-rating-banner__left">
                  <span className="acd-rating-banner__crown">👑</span>
                  <div>
                    <strong>Guest favourite</strong>
                    <p>One of the most loved homes on Bodima</p>
                  </div>
                </div>
                <div className="acd-rating-banner__right">
                  <Stars rating={rating} size={16} />
                  <span className="acd-rating-banner__num">{rating.toFixed(2)}</span>
                  <span className="acd-rating-banner__count">{rateCount} Review{rateCount !== 1 ? 's' : ''}</span>
                </div>
              </section>
            )}

            {/* Description */}
            {acc.description && (
              <section className="acd-section">
                <h3 className="acd-section__subtitle">About this place</h3>
                <p className="acd-desc">{acc.description}</p>
              </section>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="acd-section">
                <h3 className="acd-section__subtitle">What this place offers</h3>
                <div className="acd-amenities">
                  {amenities.map((a, i) => {
                    const label = typeof a === 'string' ? a : (a.name ?? String(a));
                    const Icon  = amenityIcon(label);
                    return (
                      <div key={i} className="acd-amenity">
                        <Icon className="acd-amenity__icon" />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── HOST PROFILE ── */}
            {host && (
              <section className="acd-section acd-host-section">
                <h3 className="acd-section__subtitle">Hosted by</h3>
                <div className="acd-host-card">
                  <div className="acd-host-card__left">
                    <div className="acd-host-card__avatar-wrap">
                      <img
                        src={hostAvatar(host)}
                        alt={host.name ?? 'Host'}
                        className="acd-host-card__avatar"
                        onError={e => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(host.name ?? 'Host')}&background=FF385C&color=fff&size=128`;
                        }}
                      />
                      {host.isSuperhost && (
                        <span className="acd-host-card__badge" title="Superhost">🏅</span>
                      )}
                    </div>
                    <div className="acd-host-card__info">
                      <p className="acd-host-card__name">{host.name}</p>
                      <p className="acd-host-card__sub">
                        {host.isSuperhost && <span className="acd-host-card__superhost">Superhost · </span>}
                        {/* FIX: derived from createdAt, not a missing joinedYear field */}
                        {host.joinedYear ? `Joined ${host.joinedYear}` : ''}
                      </p>
                      {/* FIX: totalReviews from host.stats.totalReviews */}
                      {(host.totalReviews ?? rateCount) > 0 && (
                        <p className="acd-host-card__reviews">
                          {host.totalReviews ?? rateCount} reviews
                        </p>
                      )}
                    </div>
                  </div>
                  <button className="acd-host-card__btn">
                    <FaEnvelope style={{ marginRight: 7, fontSize: 13 }} /> Contact host
                  </button>
                </div>
              </section>
            )}

            {/* ── REVIEWS ── */}
            {(rating > 0 || reviews.length > 0) && (
              <section className="acd-section acd-reviews">

                {/* Header */}
                <div className="acd-reviews__header">
                  <Stars rating={rating} size={17} />
                  <span className="acd-reviews__rating">{rating.toFixed(2)}</span>
                  <span className="acd-reviews__count">· {rateCount} reviews</span>
                </div>

                {/* Rating breakdown */}
                <div className="acd-reviews__breakdown">
                  <div className="acd-reviews__bars">
                    <p className="acd-reviews__bars-title">Overall rating</p>
                    {[5, 4, 3, 2, 1].map(num => (
                      <div key={num} className="acd-bar-row">
                        <span className="acd-bar-num">{num}</span>
                        <div className="acd-bar-track">
                          <div className="acd-bar-fill"
                            style={{ width: `${(rateCount > 0 ? Math.min(num / 5, 1) : num === Math.round(rating) ? 0.8 : 0.1) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="acd-reviews__cats">
                    {[
                      { label: 'Cleanliness',   value: rbd.cleanliness   ?? rating, icon: '🧹' },
                      { label: 'Accuracy',      value: rbd.accuracy      ?? rating, icon: '✓'  },
                      { label: 'Check-in',      value: rbd.checkIn       ?? rating, icon: '🔍' },
                      { label: 'Communication', value: rbd.communication ?? rating, icon: '💬' },
                      { label: 'Location',      value: rbd.location      ?? rating, icon: '🏢' },
                      { label: 'Value',         value: rbd.value         ?? rating, icon: '💵' },
                    ].map((cat, i) => (
                      <div key={i} className="acd-cat-item">
                        <span className="acd-cat-icon">{cat.icon}</span>
                        <div>
                          <p className="acd-cat-label">{cat.label}</p>
                          <p className="acd-cat-val">{Number(cat.value).toFixed(1)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guest review cards */}
                {reviews.length > 0 && (
                  <div className="acd-reviews__grid">
                    {reviews.map((rev, i) => {
                      // FIX: reviewer is now a populated User object, not a flat review object.
                      // Pull name/avatar from rev.reviewer (User), not from rev directly.
                      const reviewer  = rev.reviewer;
                      const revName   = (typeof reviewer === 'object' ? reviewer?.name : null) ?? 'Guest';
                      const revImgRaw = typeof reviewer === 'object'
                        ? (reviewer?.profileImage ?? reviewer?.avatar)
                        : null;
                      const revAvatar = revImgRaw
                        ? (revImgRaw.startsWith('http') ? revImgRaw : photoSrc(revImgRaw))
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(revName)}&background=ebebeb&color=222&size=96`;

                      // FIX: date comes from rev.createdAt, not a missing rev.date field
                      const revDate = rev.createdAt
                        ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        : (rev.date ?? '');

                      // FIX: location comes from reviewer.address, not rev.location
                      const revLocation = typeof reviewer === 'object' ? reviewer?.address : null;

                      return (
                        <div key={i} className="acd-review-card">
                          <div className="acd-review-card__head">
                            <img src={revAvatar} alt={revName}
                              className="acd-review-card__avatar"
                              onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=U&background=ebebeb&color=222'; }} />
                            <div>
                              <p className="acd-review-card__name">{revName}</p>
                              <p className="acd-review-card__meta">{revLocation ?? ''}</p>
                            </div>
                          </div>
                          <div className="acd-review-card__meta-row">
                            <Stars rating={rev.rating ?? 5} size={11} />
                            <span className="acd-review-card__date">{revDate}</span>
                          </div>
                          <p className={`acd-review-card__text${expandedRev[i] ? ' acd-review-card__text--expanded' : ''}`}>
                            {rev.comment}
                          </p>
                          <button className="acd-review-card__toggle"
                            onClick={() => setExpandedRev(p => ({ ...p, [i]: !p[i] }))}>
                            {expandedRev[i] ? 'Show less' : 'Show more'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button className="acd-show-all-btn">Show all reviews</button>
              </section>
            )}

          </div>{/* end acd-left */}

          {/* ════ RIGHT COLUMN ════ */}
          <div className="acd-right">

            {/* Booking card */}
            <div className="acd-booking-card">
              <div className="acd-booking-card__price-row">
                {acc.pricePerMonth
                  ? <>
                      <span className="acd-booking-card__price">Rs {acc.pricePerMonth?.toLocaleString()}</span>
                      <span className="acd-booking-card__per"> / month</span>
                    </>
                  : <span className="acd-booking-card__price-label">Add dates for prices</span>}
              </div>

              <div className="acd-booking-card__dates">
                <div className="acd-booking-card__date-field">
                  <label>CHECK-IN</label>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                </div>
                <div className="acd-booking-card__date-field">
                  <label>CHECK-OUT</label>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                </div>
              </div>

              <div className="acd-booking-card__guests">
                <label>GUESTS</label>
                <div className="acd-booking-card__guests-row">
                  <input type="number" min="1" max={acc.maxGuests ?? 10}
                    value={guests} onChange={e => setGuests(parseInt(e.target.value) || 1)} />
                  <FaChevronDown size={13} />
                </div>
              </div>

              <button className="acd-booking-card__btn">Book Now</button>
              <p className="acd-booking-card__note">You won't be charged yet</p>

              {acc.pricePerMonth && (
                <div className="acd-booking-card__breakdown">
                  <div className="acd-booking-card__breakdown-row">
                    <span>Rs {acc.pricePerMonth?.toLocaleString()} × 1 month</span>
                    <span>Rs {acc.pricePerMonth?.toLocaleString()}</span>
                  </div>
                  <div className="acd-booking-card__breakdown-row acd-booking-card__breakdown-row--total">
                    <span>Total</span>
                    <span>Rs {acc.pricePerMonth?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick info card */}
            <div className="acd-info-card">
              {acc.genderPolicy && (
                <div className="acd-info-card__row">
                  <FaUsers className="acd-info-card__icon" />
                  <span>Gender: <strong>{acc.genderPolicy}</strong></span>
                </div>
              )}
              {acc.roomType && (
                <div className="acd-info-card__row">
                  <FaBed className="acd-info-card__icon" />
                  <span>Room type: <strong>{acc.roomType}</strong></span>
                </div>
              )}
              {acc.address && (
                <div className="acd-info-card__row">
                  <FaMapMarkerAlt className="acd-info-card__icon" />
                  <span>{acc.address}</span>
                </div>
              )}
            </div>

          </div>{/* end acd-right */}

        </div>{/* end acd-content-grid */}
      </main>

      {/* ══ FOOTER ══ */}
      <footer className="acd-footer">
        <div className="acd-footer__grid">
          {[
            { title: 'Support',   links: ['Help Center','Safety','Cancellation Options','Community Guideline'] },
            { title: 'Community', links: ['Bodima Adventures','New Features','Tips for Hosts','Careers'] },
            { title: 'Host',      links: ['Host a home','Host an experience','Responsible hosting','Community forum'] },
            { title: 'About',     links: ['About Bodima','Newsroom','Investors','Bodima Plus'] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="acd-footer__col-title">{title}</h4>
              {links.map(l => <a key={l} href="#" className="acd-footer__link">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="acd-footer__bottom">
          <span>© 2026 Bodima, Inc. · <a href="#" className="acd-footer__legal">Privacy · Terms · Sitemap</a></span>
          <div className="acd-footer__socials">
            <a href="#" className="acd-footer__social-icon"><FaFacebookF /></a>
            <a href="#" className="acd-footer__social-icon"><FaTwitter /></a>
            <a href="#" className="acd-footer__social-icon"><FaInstagram /></a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default AccommodationDetails;
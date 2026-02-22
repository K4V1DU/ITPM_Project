import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AccommodationDetails.css';
import {
  FaHeart, FaRegHeart, FaShare, FaStar,
  FaUsers, FaBed, FaBath,
  FaChevronDown, FaAirbnb,
  FaComments, FaUser, FaCog, FaGlobe,
  FaQuestionCircle, FaSignOutAlt,
  FaUserFriends, FaGift,
  FaFacebookF, FaTwitter, FaInstagram,
  FaWifi, FaSnowflake, FaFire, FaUtensils,
  FaTools, FaTv, FaTint, FaParking,
  FaArrowLeft, FaBars, FaEnvelope,
  FaMapMarkerAlt, FaCheck,
} from 'react-icons/fa';

// ─── Config ───────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';
const photoSrc  = (id) => id ? `${API_BASE}/Photo/${id}` : null;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─── Amenity icon map ─────────────────────────────────────────────────────
const AMENITY_ICONS = {
  wifi:           FaWifi,
  'air conditioning': FaSnowflake,
  ac:             FaSnowflake,
  heating:        FaFire,
  kitchen:        FaUtensils,
  'hair dryer':   FaTools,
  iron:           FaTools,
  tv:             FaTv,
  washer:         FaTint,
  parking:        FaParking,
};

function amenityIcon(name = '') {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return FaCheck;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
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

// ─── Star row ─────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = 13 }) {
  return (
    <span className="acd-stars" style={{ fontSize: size }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= Math.round(rating) ? '#FF385C' : '#ddd' }}>★</span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
const AccommodationDetails = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  // data
  const [acc,        setAcc]        = useState(null);
  const [images,     setImages]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // UI
  const [isSaved,        setIsSaved]        = useState(false);
  const [activeImg,      setActiveImg]      = useState(0);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [checkIn,        setCheckIn]        = useState('');
  const [checkOut,       setCheckOut]       = useState('');
  const [guests,         setGuests]         = useState(1);
  const [expandedRev,    setExpandedRev]    = useState({});

  const dropdownRef = useRef(null);

  // ── Fetch accommodation ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`${API_BASE}/accommodation/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(async raw => {
        const data = unwrap(raw);
        setAcc(data);

        // Load images
        const imgIds = data.images ?? [];
        const loaded = await Promise.all(
          imgIds.map(async imgId => {
            try {
              const res = await fetch(`${API_BASE}/Photo/${imgId}`);
              if (!res.ok) throw new Error();
              const blob = await res.blob();
              return URL.createObjectURL(blob);
            } catch {
              return null;
            }
          })
        );
        setImages(loaded.filter(Boolean));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Close dropdown outside click ──────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────
  const prevImg = () => setActiveImg(p => (p - 1 + images.length) % images.length);
  const nextImg = () => setActiveImg(p => (p + 1) % images.length);

  // ── Render guards ─────────────────────────────────────────────────────
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

  const rating     = acc.ratingAverage ?? 0;
  const rateCount  = acc.ratingCount   ?? 0;
  const amenities  = acc.amenities     ?? [];
  const reviews    = acc.reviews       ?? [];

  const displayImages = images.length > 0
    ? images
    : ['https://via.placeholder.com/800x500?text=No+Image'];

  return (
    <div className="acd-page">

      {/* ══ NAVBAR ══ */}
      <NavBar navigate={navigate} showDropdown={showDropdown}
        setShowDropdown={setShowDropdown} dropdownRef={dropdownRef} />

      <main className="acd-main">

        {/* ── Title row ── */}
        <div className="acd-title-row">
          <h1 className="acd-title">{acc.title}</h1>
          <div className="acd-title-actions">
            <button className="acd-action-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              <FaShare size={14} /> Share
            </button>
            <button className={`acd-action-btn${isSaved ? ' acd-action-btn--saved' : ''}`}
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

          {/* LEFT COLUMN */}
          <div className="acd-left">

            {/* Room info */}
            <section className="acd-section acd-section--room">
              <h2 className="acd-section__title">
                {acc.type ?? acc.roomType ?? 'Room'} · {acc.address}
              </h2>
              <div className="acd-specs">
                {acc.maxGuests  && <><span><FaUsers />  {acc.maxGuests} guest{acc.maxGuests  !== 1 ? 's' : ''}</span><span className="acd-dot">·</span></>}
                {acc.bedrooms   && <><span><FaBed />    {acc.bedrooms}  bedroom{acc.bedrooms  !== 1 ? 's' : ''}</span><span className="acd-dot">·</span></>}
                {acc.beds       && <><span><FaBed />    {acc.beds}      bed{acc.beds          !== 1 ? 's' : ''}</span><span className="acd-dot">·</span></>}
                {acc.bathrooms  && <span><FaBath />     {acc.bathrooms} bath{acc.bathrooms   !== 1 ? 's' : ''}</span>}
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

            {/* Host */}
            {acc.host && (
              <section className="acd-section">
                <h3 className="acd-section__subtitle">Hosted by</h3>
                <div className="acd-host-card">
                  <div className="acd-host-card__left">
                    <div className="acd-host-card__avatar-wrap">
                      <img
                        src={acc.host.avatar ? photoSrc(acc.host.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(acc.host.name ?? 'Host')}&background=FF385C&color=fff`}
                        alt={acc.host.name}
                        className="acd-host-card__avatar"
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=Host&background=FF385C&color=fff`; }}
                      />
                      {acc.host.isSuperhost && <span className="acd-host-card__badge">🏅</span>}
                    </div>
                    <div>
                      <p className="acd-host-card__name">{acc.host.name}</p>
                      <p className="acd-host-card__sub">
                        {acc.host.isSuperhost && 'Superhost · '}
                        {acc.host.joinedYear ? `Joined ${acc.host.joinedYear}` : ''}
                      </p>
                      {acc.host.totalReviews > 0 &&
                        <p className="acd-host-card__reviews">{acc.host.totalReviews} reviews</p>}
                    </div>
                  </div>
                  <button className="acd-host-card__btn">Contact host</button>
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="acd-section acd-reviews">
                <div className="acd-reviews__header">
                  <Stars rating={rating} size={16} />
                  <span className="acd-reviews__rating">{rating.toFixed(2)}</span>
                  <span className="acd-reviews__count">· {rateCount} reviews</span>
                </div>
                <div className="acd-reviews__grid">
                  {reviews.map((rev, i) => (
                    <div key={i} className="acd-review-card">
                      <div className="acd-review-card__head">
                        <img src={rev.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(rev.name ?? 'U')}&background=eee`}
                          alt={rev.name} className="acd-review-card__avatar"
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=U&background=eee`; }} />
                        <div>
                          <p className="acd-review-card__name">{rev.name}</p>
                          <p className="acd-review-card__meta">{rev.yearsOnAirbnb ?? rev.location ?? ''}</p>
                        </div>
                      </div>
                      <div className="acd-review-card__meta-row">
                        <Stars rating={rev.rating ?? 5} size={11} />
                        <span className="acd-review-card__date">{rev.date}</span>
                        {rev.stayDuration && <span className="acd-review-card__stay">{rev.stayDuration}</span>}
                      </div>
                      <p className={`acd-review-card__text${expandedRev[i] ? ' acd-review-card__text--expanded' : ''}`}>
                        {rev.comment}
                      </p>
                      <button className="acd-review-card__toggle"
                        onClick={() => setExpandedRev(p => ({ ...p, [i]: !p[i] }))}>
                        {expandedRev[i] ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  ))}
                </div>
                <button className="acd-show-all-btn">Show all reviews</button>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN — Booking card */}
          <div className="acd-right">
            <div className="acd-booking-card">
              <div className="acd-booking-card__price-row">
                {acc.pricePerMonth
                  ? <><span className="acd-booking-card__price">Rs {acc.pricePerMonth?.toLocaleString()}</span>
                      <span className="acd-booking-card__per">/month</span></>
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
                  <input type="number" min="1"
                    max={acc.maxGuests ?? 10}
                    value={guests}
                    onChange={e => setGuests(parseInt(e.target.value) || 1)} />
                  <FaChevronDown size={14} />
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
          </div>

        </div>
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
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="acd-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

// ─── Navbar sub-component ─────────────────────────────────────────────────
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
        <div className="acd-nav__icon-btn"><FaUser /></div>
        <div ref={dropdownRef} className="acd-dropdown">
          <div className="acd-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}>
            <FaBars />
          </div>
          {showDropdown && (
            <div className="acd-dropdown__menu">
              <div className="acd-dropdown__item"><FaUser style={{ opacity: 0.7 }} /> Profile</div>
              <div className="acd-dropdown__item"><FaEnvelope style={{ opacity: 0.7 }} /> Messages</div>
              <div className="acd-dropdown__divider" />
              <div className="acd-dropdown__item"><FaCog style={{ opacity: 0.7 }} /> Settings</div>
              <div className="acd-dropdown__item acd-dropdown__item--danger">
                <FaSignOutAlt style={{ opacity: 0.7 }} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default AccommodationDetails;
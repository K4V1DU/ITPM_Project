import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaAirbnb, FaBars, FaUser, FaTimes,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSignOutAlt, FaMapMarkerAlt, FaStar,
  FaEdit, FaHome, FaUtensils, FaPlus,
  FaPhone, FaEnvelope, FaCalendarAlt,
  FaShieldAlt, FaCheckCircle, FaCamera,
  FaLanguage, FaHeart, FaMedal, FaGlobe,
  FaCommentDots,
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import "./HostProfile.css";

const BASE_URL        = "http://localhost:8000";
const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";
const photoUrl        = (id) => `${BASE_URL}/Photo/${id}`;
const DEFAULT_AVATAR  = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231b1b1b'/><circle cx='50' cy='38' r='20' fill='%23555'/><ellipse cx='50' cy='85' rx='32' ry='22' fill='%23555'/></svg>";
const DEFAULT_COVER   = "data:image/png;base64,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";

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    name:      user.name      ?? "",
    phone:     user.phone     ?? "",
    address:   user.address   ?? "",
    about:     user.about     ?? "",
    languages: (user.languages ?? []).join(", "),
    interests: (user.interests ?? []).join(", "),
  });
  const [saving,        setSaving]        = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const fileRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let profileImage = user.profileImage;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("photo", avatarFile);
        if (profileImage) {
          const res = await axios.put(`${BASE_URL}/Photo/${profileImage}`, fd);
          if (res.data.success) profileImage = res.data.data._id;
        } else {
          const res = await axios.post(`${BASE_URL}/Photo`, fd);
          if (res.data.success) profileImage = res.data.data._id;
        }
      }
      const payload = {
        name:         form.name,
        phone:        form.phone,
        address:      form.address,
        about:        form.about,
        languages:    form.languages.split(",").map(s => s.trim()).filter(Boolean),
        interests:    form.interests.split(",").map(s => s.trim()).filter(Boolean),
        profileImage,
      };
      await axios.put(`${BASE_URL}/User/${CURRENT_USER_ID}`, payload);
      onSave({ ...user, ...payload });
    } catch {
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hp-modal-overlay" onClick={onClose}>
      <div className="hp-modal" onClick={e => e.stopPropagation()}>
        <div className="hp-modal-header">
          <h3>Edit Profile</h3>
          <button className="hp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="hp-modal-body">
          <div className="hp-modal-avatar-wrap">
            <img
              src={avatarPreview ?? (user.profileImage ? photoUrl(user.profileImage) : DEFAULT_AVATAR)}
              alt="avatar" className="hp-modal-avatar"
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
            <button className="hp-modal-avatar-btn" onClick={() => fileRef.current.click()}>
              <FaCamera />
            </button>
            <input type="file" accept="image/*" ref={fileRef} hidden onChange={handleAvatarChange} />
          </div>
          <div className="hp-modal-fields">
            <div className="hp-field">
              <label>Full Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="hp-field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 000 0000" />
            </div>
            <div className="hp-field">
              <label>Address / Location</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City, District" />
            </div>
            <div className="hp-field hp-field--full">
              <label>About</label>
              <textarea rows={3} value={form.about} onChange={e => setForm({ ...form, about: e.target.value })} placeholder="Tell guests about yourself..." />
            </div>
            <div className="hp-field">
              <label>Languages (comma separated)</label>
              <input value={form.languages} onChange={e => setForm({ ...form, languages: e.target.value })} placeholder="English, Sinhala, Tamil" />
            </div>
            <div className="hp-field">
              <label>Interests (comma separated)</label>
              <input value={form.interests} onChange={e => setForm({ ...form, interests: e.target.value })} placeholder="Cooking, Travel, Music" />
            </div>
          </div>
        </div>
        <div className="hp-modal-footer">
          <button className="hp-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="hp-modal-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving\u2026" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loader Component ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="aop-loader-overlay">
      <div className="aop-loader-card">
        <div className="aop-loader-logo">
          <FaHome className="aop-loader-logo-icon" />
          <span>Bodima</span>
        </div>
        <div className="aop-loader-spinner">
          <div className="aop-loader-ring" />
          <div className="aop-loader-ring aop-loader-ring--2" />
          <div className="aop-loader-ring aop-loader-ring--3" />
        </div>
        <p className="aop-loader-text">Loading your profile…</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HostProfile() {
  const navigate = useNavigate();

  const [user,            setUser]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [activeNav,       setActiveNav]       = useState("profile");
  const [profileImageUrl, setProfileImageUrl] = useState(DEFAULT_AVATAR);
  const [userName,        setUserName]        = useState("");
  const [listingCounts,   setListingCounts]   = useState({ food: 0, accommodation: 0 });
  const [messageOpen,     setMessageOpen]     = useState(false);
  const [message,         setMessage]         = useState("");
  const [sent,            setSent]            = useState(false);

  const [reviewCounts, setReviewCounts] = useState({
    accommodation: 0,
    food:          0,
    host:          0,
  });

  const dropdownRef = useRef(null);

  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!CURRENT_USER_ID) { setLoading(false); return; }
    axios.get(`${BASE_URL}/User/${CURRENT_USER_ID}`)
      .then(r => {
        const u = r.data?.data || r.data;
        setUser(u);
        if (u?.name)         setUserName(u.name);
        if (u?.profileImage) setProfileImageUrl(photoUrl(u.profileImage));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!CURRENT_USER_ID) return;
    Promise.allSettled([
      axios.get(`${BASE_URL}/FoodService`),
      axios.get(`${BASE_URL}/Accommodation`),
      axios.get(`${BASE_URL}/Review`),
    ]).then(([fsRes, acRes, rvRes]) => {
      const myFood = fsRes.status === "fulfilled"
        ? (fsRes.value.data?.data || []).filter(f => String(f.owner) === CURRENT_USER_ID)
        : [];
      const myAcc  = acRes.status === "fulfilled"
        ? (acRes.value.data?.data || []).filter(a => String(a.owner) === CURRENT_USER_ID)
        : [];
      setListingCounts({ food: myFood.length, accommodation: myAcc.length });
      if (rvRes.status === "fulfilled") {
        const allReviews = rvRes.value.data?.data || [];
        const myFoodIds = new Set(myFood.map(f => String(f._id)));
        const myAccIds  = new Set(myAcc.map(a => String(a._id)));
        let acCount = 0, foodCount = 0, hostCount = 0;
        allReviews.forEach(r => {
          if (r.host && String(r.host._id ?? r.host) === CURRENT_USER_ID) hostCount++;
          if (r.accommodation) {
            const acId = String(r.accommodation._id ?? r.accommodation);
            if (myAccIds.has(acId)) acCount++;
          }
          if (r.foodService) {
            const fsId = String(r.foodService._id ?? r.foodService);
            if (myFoodIds.has(fsId)) foodCount++;
          }
        });
        setReviewCounts({ accommodation: acCount, food: foodCount, host: hostCount });
      }
    });
  }, []);

  const handleSaveProfile = (updated) => {
    setUser(updated);
    setUserName(updated.name ?? "");
    if (updated.profileImage) setProfileImageUrl(photoUrl(updated.profileImage));
    setShowEditModal(false);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
    setTimeout(() => { setSent(false); setMessageOpen(false); }, 2500);
  };

  const displayName   = userName || user?.name || "Host";
  const firstName     = displayName.split(" ")[0];
  const joinedYear    = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const yearsHosting  = joinedYear ? new Date().getFullYear() - joinedYear : 0;
  const hostRating    = user?.stats?.hostRating   ?? 0;
  const totalReviews  = user?.stats?.totalReviews > 0
    ? user.stats.totalReviews
    : (reviewCounts.accommodation + reviewCounts.food + reviewCounts.host);
  const isSuperhost   = hostRating >= 4.5 && totalReviews >= 5;
  const totalListings = listingCounts.food + listingCounts.accommodation;

  // ── Navbar ────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav className="hl-nav">
      <div className="hl-nav__logo-wrap">
        <a href="/Boardings" className="hl-nav__logo"><FaAirbnb /> Bodima</a>
      </div>
      <div className="hl-nav__center">
        {[
          { key: "today",    label: "Today",    href: "/host" },
          { key: "listings", label: "Listings", href: "/Listings" },
          { key: "food",     label: "Foods",    href: "/Foods" },
        ].map(({ key, label, href }) => (
          <a key={key} href={href}
            className={`hl-nav__tab${activeNav === key ? " hl-nav__tab--active" : ""}`}
            onClick={() => setActiveNav(key)}
          >
            {label}
            {activeNav === key && <span className="hl-nav__tab-underline" />}
          </a>
        ))}
      </div>
      <div className="hl-nav__right">
        <button className="hl-nav__switch-btn" onClick={() => navigate("/Boardings")}>
          Switch to exploring
        </button>
        <div ref={dropdownRef} className="hl-dropdown">
          <button className="hl-nav__menu-btn" onClick={() => setShowDropdown(p => !p)}>
            <FaBars className="hl-menu-icon" />
            {firstName && <span className="hl-user-name">{firstName}</span>}
            <img src={profileImageUrl} alt="profile" className="hl-user-avatar"
              onError={e => {
                if (e.currentTarget.src !== DEFAULT_AVATAR)
                  e.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
          </button>
          {showDropdown && (
            <div className="hl-dropdown__menu">
              <div className="hl-dropdown__item" onClick={() => navigate("/host")}>
                <FaUser style={{ opacity: 0.6 }} /> Host Dashboard
              </div>
              <div className="hl-dropdown__divider" />
              <div className="hl-dropdown__item hl-dropdown__item--danger"
                onClick={() => { localStorage.clear(); navigate("/Login"); }}>
                <FaSignOutAlt style={{ opacity: 0.6 }} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  if (loading) return (
    <div className="aop-page">
      <Navbar />
      <PageLoader />
    </div>
  );

  if (!user) return (
    <div className="aop-page">
      <Navbar />
      <div className="aop-error">
        <FaUser className="aop-error-icon" />
        <p>Could not load profile.</p>
        <button onClick={() => navigate("/host")}>\u2190 Back</button>
      </div>
    </div>
  );

  return (
    <div className="aop-page">
      <Navbar />

      <div className="aop-wrapper">

        {/* ── HERO ── */}
        <div className="aop-hero">
          <div className="aop-cover">
            <img src={DEFAULT_COVER} alt="Cover" className="aop-cover-img" />
            <div className="aop-cover-overlay" />
          </div>
          <div className="aop-avatar-row">
            <div className="aop-avatar-wrap">
              <img src={profileImageUrl} alt={displayName} className="aop-avatar"
                onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              {isSuperhost && (
                <span className="aop-superhost-dot" title="Superhost"><FaMedal /></span>
              )}
            </div>
            <div className="aop-name-block">
              <div className="aop-name-row">
                <h1 className="aop-name">{displayName}</h1>
                {user.isVerified?.email && (
                  <MdVerified className="aop-verified-icon" title="Email verified" />
                )}
              </div>
              {user.address && (
                <p className="aop-location">
                  <FaGlobe className="aop-inline-icon" /> {user.address}
                </p>
              )}
            </div>
            <button className="aop-edit-btn" onClick={() => setShowEditModal(true)}>
              <FaEdit /> Edit Profile
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="aop-body">

          {/* LEFT */}
          <div className="aop-left">

            <div className="aop-stats-strip">
              <div className="aop-stat">
                <span className="aop-stat-val">{totalReviews}</span>
                <span className="aop-stat-lbl">Total Reviews</span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val">{hostRating > 0 ? hostRating.toFixed(2) : "New"}</span>
                <span className="aop-stat-lbl">Rating</span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val aop-stat-val--red">{reviewCounts.accommodation}</span>
                <span className="aop-stat-lbl">
                  <FaHome className="aop-stat-icon aop-stat-icon--red" /> Accom. Reviews
                </span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val aop-stat-val--green">{reviewCounts.food}</span>
                <span className="aop-stat-lbl">
                  <FaUtensils className="aop-stat-icon aop-stat-icon--green" /> Food Reviews
                </span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val">{yearsHosting > 0 ? yearsHosting : "\u2014"}</span>
                <span className="aop-stat-lbl">Years hosting</span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val">{totalListings}</span>
                <span className="aop-stat-lbl">Listings</span>
              </div>
            </div>

            <div className="aop-section">
              <h2 className="aop-section-title">About {firstName}</h2>
              {user.about
                ? <p className="aop-about">{user.about}</p>
                : <p className="aop-empty">
                    No bio yet.{" "}
                    <button className="aop-link-btn" onClick={() => setShowEditModal(true)}>Add one \u2192</button>
                  </p>
              }
            </div>

            <div className="aop-section">
              <h2 className="aop-section-title">Host highlights</h2>
              <div className="aop-highlights">
                {isSuperhost && (
                  <div className="aop-highlight-card">
                    <FaMedal className="aop-highlight-icon aop-hi--gold" />
                    <div>
                      <p className="aop-highlight-label">Superhost</p>
                      <p className="aop-highlight-desc">{yearsHosting} year{yearsHosting !== 1 ? "s" : ""} hosting</p>
                    </div>
                  </div>
                )}
                <div className="aop-highlight-card">
                  <FaHome className="aop-highlight-icon aop-hi--red" />
                  <div>
                    <p className="aop-highlight-label">
                      {listingCounts.accommodation} Accommodation{listingCounts.accommodation !== 1 ? "s" : ""}
                    </p>
                    <p className="aop-highlight-desc">
                      {reviewCounts.accommodation} review{reviewCounts.accommodation !== 1 ? "s" : ""} \u00b7 Active properties
                    </p>
                  </div>
                </div>
                <div className="aop-highlight-card">
                  <FaUtensils className="aop-highlight-icon aop-hi--green" />
                  <div>
                    <p className="aop-highlight-label">
                      {listingCounts.food} Food Service{listingCounts.food !== 1 ? "s" : ""}
                    </p>
                    <p className="aop-highlight-desc">
                      {reviewCounts.food} review{reviewCounts.food !== 1 ? "s" : ""} \u00b7 Active kitchens
                    </p>
                  </div>
                </div>
                {user.languages?.length > 0 && (
                  <div className="aop-highlight-card">
                    <FaGlobe className="aop-highlight-icon aop-hi--blue" />
                    <div>
                      <p className="aop-highlight-label">Multilingual</p>
                      <p className="aop-highlight-desc">{user.languages.join(", ")}</p>
                    </div>
                  </div>
                )}
                {user.interests?.length > 0 && (
                  <div className="aop-highlight-card">
                    <FaHeart className="aop-highlight-icon aop-hi--pink" />
                    <div>
                      <p className="aop-highlight-label">Interests</p>
                      <p className="aop-highlight-desc">{user.interests.join(", ")}</p>
                    </div>
                  </div>
                )}
                {joinedYear && (
                  <div className="aop-highlight-card">
                    <FaCalendarAlt className="aop-highlight-icon aop-hi--purple" />
                    <div>
                      <p className="aop-highlight-label">Hosting since {joinedYear}</p>
                      <p className="aop-highlight-desc">Member of Bodima</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {totalReviews > 0 && (
              <div className="aop-section">
                <h2 className="aop-section-title">
                  <FaStar className="aop-inline-icon aop-star-icon" />
                  {hostRating.toFixed(2)} \u00b7 {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                </h2>
                <div className="aop-review-breakdown">
                  <div className="aop-rb-card aop-rb-card--red">
                    <FaHome className="aop-rb-icon" />
                    <div>
                      <p className="aop-rb-val">{reviewCounts.accommodation}</p>
                      <p className="aop-rb-lbl">Accommodation reviews</p>
                    </div>
                  </div>
                  <div className="aop-rb-card aop-rb-card--green">
                    <FaUtensils className="aop-rb-icon" />
                    <div>
                      <p className="aop-rb-val">{reviewCounts.food}</p>
                      <p className="aop-rb-lbl">Food service reviews</p>
                    </div>
                  </div>
                  {reviewCounts.host > 0 && (
                    <div className="aop-rb-card aop-rb-card--blue">
                      <FaUser className="aop-rb-icon" />
                      <div>
                        <p className="aop-rb-val">{reviewCounts.host}</p>
                        <p className="aop-rb-lbl">Direct host reviews</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT */}
          <div className="aop-right">
            <div className="aop-contact-card">
              <div className="aop-contact-header">
                <img src={profileImageUrl} alt={displayName} className="aop-contact-avatar"
                  onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
                />
                <div>
                  <p className="aop-contact-name">{displayName}</p>
                  {isSuperhost && (
                    <span className="aop-superhost-pill"><FaMedal /> Superhost</span>
                  )}
                </div>
              </div>
              <div className="aop-card-review-row">
                <div className="aop-card-rv">
                  <FaHome className="aop-card-rv-icon" />
                  <span className="aop-card-rv-val">{reviewCounts.accommodation}</span>
                  <span className="aop-card-rv-lbl">Accom.</span>
                </div>
                <div className="aop-card-rv aop-card-rv--green">
                  <FaUtensils className="aop-card-rv-icon" />
                  <span className="aop-card-rv-val">{reviewCounts.food}</span>
                  <span className="aop-card-rv-lbl">Food</span>
                </div>
                <div className="aop-card-rv aop-card-rv--gold">
                  <FaStar className="aop-card-rv-icon" />
                  <span className="aop-card-rv-val">{hostRating > 0 ? hostRating.toFixed(1) : "New"}</span>
                  <span className="aop-card-rv-lbl">Rating</span>
                </div>
              </div>
              <div className="aop-trust-list">
                {user.isVerified?.email && (
                  <div className="aop-trust-item">
                    <FaShieldAlt className="aop-trust-icon aop-trust-icon--blue" />
                    <span>Email verified</span>
                  </div>
                )}
                {user.isVerified?.phone && (
                  <div className="aop-trust-item">
                    <FaCheckCircle className="aop-trust-icon aop-trust-icon--green" />
                    <span>Phone verified</span>
                  </div>
                )}
                {user.isVerified?.id && (
                  <div className="aop-trust-item">
                    <FaShieldAlt className="aop-trust-icon aop-trust-icon--blue" />
                    <span>Identity verified</span>
                  </div>
                )}
                {user.email && (
                  <div className="aop-trust-item">
                    <FaEnvelope className="aop-trust-icon" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="aop-trust-item">
                    <FaPhone className="aop-trust-icon" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.address && (
                  <div className="aop-trust-item">
                    <FaMapMarkerAlt className="aop-trust-icon" />
                    <span>{user.address}</span>
                  </div>
                )}
              </div>
              {user.languages?.length > 0 && (
                <div className="aop-languages">
                  <FaGlobe className="aop-inline-icon" />
                  <span>Speaks: {user.languages.join(", ")}</span>
                </div>
              )}
              <div className="aop-manage-links">
                <button className="aop-manage-btn" onClick={() => navigate("/Listings")}>
                  <FaHome /> Accommodations
                  <span className="aop-manage-count">{listingCounts.accommodation}</span>
                </button>
                <button className="aop-manage-btn" onClick={() => navigate("/Foods")}>
                  <FaUtensils /> Food Services
                  <span className="aop-manage-count">{listingCounts.food}</span>
                </button>
               
              </div>
             

              <p className="aop-disclaimer">
                To protect your payment, never transfer money or communicate outside of the Bodima website or app.
              </p>
            </div>
            {joinedYear && (
              <div className="aop-joined-note">
                <FaHome className="aop-inline-icon" /> Hosting since {joinedYear}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="hl-footer">
        <div className="hl-footer__grid">
          {[
            { title: "Support",   links: ["Help Center", "Safety info", "Cancellation options", "Community guidelines"] },
            { title: "Community", links: ["Bodima Adventures", "New features", "Tips for hosts", "Careers"] },
            { title: "Hosting",   links: ["Host a home", "Host an experience", "Responsible hosting", "Community forum"] },
            { title: "About",     links: ["About Bodima", "Newsroom", "Investors", "Bodima Plus"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="hl-footer__col-title">{title}</h4>
              {links.map(l => <a key={l} href="#" className="hl-footer__link">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="hl-footer__bottom">
          <span>\u00a9 2026 Bodima, Inc. \u00b7 <a href="#" className="hl-footer__legal">Privacy \u00b7 Terms \u00b7 Sitemap</a></span>
          <div className="hl-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="hl-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
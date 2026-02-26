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
const DEFAULT_AVATAR  = "/default-avatar.png";
const DEFAULT_COVER   = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=300&fit=crop";

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
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
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

  // ── NEW: per-type review counts fetched from GET /Review ─────────────
  const [reviewCounts, setReviewCounts] = useState({
    accommodation: 0,   // reviews where review.accommodation exists and listing belongs to this host
    food:          0,   // reviews where review.foodService exists and listing belongs to this host
    host:          0,   // reviews where review.host === CURRENT_USER_ID  (direct host reviews)
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

  // ── Fetch user ────────────────────────────────────────────────────────
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

  // ── Fetch listings + reviews in one pass ─────────────────────────────
  // Review controller's getReviews populates:
  //   reviewer, accommodation { title, address }, foodService { kitchenName, address }, host
  // We use this to count:
  //   - accomodation reviews  → review.accommodation._id matches one of this host's accommodations
  //   - food reviews          → review.foodService._id matches one of this host's food services
  //   - direct host reviews   → review.host._id === CURRENT_USER_ID
  useEffect(() => {
    if (!CURRENT_USER_ID) return;

    Promise.allSettled([
      axios.get(`${BASE_URL}/FoodService`),
      axios.get(`${BASE_URL}/Accommodation`),
      axios.get(`${BASE_URL}/Review`),
    ]).then(([fsRes, acRes, rvRes]) => {

      // Listing counts
      const myFood = fsRes.status === "fulfilled"
        ? (fsRes.value.data?.data || []).filter(f => String(f.owner) === CURRENT_USER_ID)
        : [];
      const myAcc  = acRes.status === "fulfilled"
        ? (acRes.value.data?.data || []).filter(a => String(a.owner) === CURRENT_USER_ID)
        : [];

      setListingCounts({ food: myFood.length, accommodation: myAcc.length });

      // Review counts — broken down by type
      if (rvRes.status === "fulfilled") {
        const allReviews = rvRes.value.data?.data || [];

        // Build sets of this host's listing IDs for O(1) lookup
        const myFoodIds = new Set(myFood.map(f => String(f._id)));
        const myAccIds  = new Set(myAcc.map(a => String(a._id)));

        let acCount   = 0;
        let foodCount = 0;
        let hostCount = 0;

        allReviews.forEach(r => {
          // Review written directly for this host
          if (r.host && String(r.host._id ?? r.host) === CURRENT_USER_ID) {
            hostCount++;
          }
          // Review for one of this host's accommodations
          if (r.accommodation) {
            const acId = String(r.accommodation._id ?? r.accommodation);
            if (myAccIds.has(acId)) acCount++;
          }
          // Review for one of this host's food services
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

  // Use user.stats.totalReviews as the authoritative total (updated server-side by updateHostRating)
  // Fall back to summing our fetched counts if stats haven't been computed yet
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
                if (e.currentTarget.src !== window.location.origin + DEFAULT_AVATAR)
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

  // ── Skeleton ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="aop-page">
      <Navbar />
      <div className="aop-skeleton">
        <div className="aop-skeleton-cover" />
        <div className="aop-skeleton-body">
          <div className="aop-skeleton-avatar" />
          <div className="aop-skeleton-lines">
            <div className="aop-skeleton-line" style={{ width: "30%", height: 22 }} />
            <div className="aop-skeleton-line" style={{ width: "50%", height: 14 }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="aop-page">
      <Navbar />
      <div className="aop-error">
        <FaUser className="aop-error-icon" />
        <p>Could not load profile.</p>
        <button onClick={() => navigate("/host")}>← Back</button>
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

            {/* ── Stats strip: 6 cells ── */}
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
              {/* Accommodation reviews */}
              <div className="aop-stat">
                <span className="aop-stat-val aop-stat-val--red">{reviewCounts.accommodation}</span>
                <span className="aop-stat-lbl">
                  <FaHome className="aop-stat-icon aop-stat-icon--red" /> Accom. Reviews
                </span>
              </div>
              <div className="aop-stat-divider" />
              {/* Food reviews */}
              <div className="aop-stat">
                <span className="aop-stat-val aop-stat-val--green">{reviewCounts.food}</span>
                <span className="aop-stat-lbl">
                  <FaUtensils className="aop-stat-icon aop-stat-icon--green" /> Food Reviews
                </span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val">{yearsHosting > 0 ? yearsHosting : "—"}</span>
                <span className="aop-stat-lbl">Years hosting</span>
              </div>
              <div className="aop-stat-divider" />
              <div className="aop-stat">
                <span className="aop-stat-val">{totalListings}</span>
                <span className="aop-stat-lbl">Listings</span>
              </div>
            </div>

            {/* About */}
            <div className="aop-section">
              <h2 className="aop-section-title">About {firstName}</h2>
              {user.about
                ? <p className="aop-about">{user.about}</p>
                : <p className="aop-empty">
                    No bio yet.{" "}
                    <button className="aop-link-btn" onClick={() => setShowEditModal(true)}>Add one →</button>
                  </p>
              }
            </div>

            {/* Host highlights */}
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
                {/* Accommodation highlight — with real review count */}
                <div className="aop-highlight-card">
                  <FaHome className="aop-highlight-icon aop-hi--red" />
                  <div>
                    <p className="aop-highlight-label">
                      {listingCounts.accommodation} Accommodation{listingCounts.accommodation !== 1 ? "s" : ""}
                    </p>
                    <p className="aop-highlight-desc">
                      {reviewCounts.accommodation} review{reviewCounts.accommodation !== 1 ? "s" : ""} · Active properties
                    </p>
                  </div>
                </div>
                {/* Food highlight — with real review count */}
                <div className="aop-highlight-card">
                  <FaUtensils className="aop-highlight-icon aop-hi--green" />
                  <div>
                    <p className="aop-highlight-label">
                      {listingCounts.food} Food Service{listingCounts.food !== 1 ? "s" : ""}
                    </p>
                    <p className="aop-highlight-desc">
                      {reviewCounts.food} review{reviewCounts.food !== 1 ? "s" : ""} · Active kitchens
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

            {/* Reviews breakdown section */}
            {totalReviews > 0 && (
              <div className="aop-section">
                <h2 className="aop-section-title">
                  <FaStar className="aop-inline-icon aop-star-icon" />
                  {hostRating.toFixed(2)} · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
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

          </div>{/* /aop-left */}

          {/* RIGHT — contact card */}
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

              {/* Review counts in card */}
              <div className="aop-card-review-row">
                <div className="aop-card-rv aop-card-rv--red">
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
                <button className="aop-manage-btn aop-manage-btn--add" onClick={() => navigate("/add-accommodation")}>
                  <FaPlus /> Add New Listing
                </button>
              </div>

              <button className="aop-message-btn" onClick={() => setMessageOpen(!messageOpen)}>
                <FaCommentDots /> Message {firstName}
              </button>

              {messageOpen && (
                <div className="aop-message-box">
                  {sent ? (
                    <p className="aop-sent-confirm">
                      <FaCheckCircle style={{ marginRight: 6 }} /> Message sent!
                    </p>
                  ) : (
                    <>
                      <textarea
                        className="aop-textarea"
                        placeholder={`Hi ${firstName}, I'd like to ask about...`}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={4}
                      />
                      <button className="aop-send-btn" onClick={handleSendMessage}>Send</button>
                    </>
                  )}
                </div>
              )}

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

      {/* ══ FOOTER ══ */}
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
          <span>© 2026 Bodima, Inc. · <a href="#" className="hl-footer__legal">Privacy · Terms · Sitemap</a></span>
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
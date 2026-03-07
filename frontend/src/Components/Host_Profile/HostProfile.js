import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBars, FaUser, FaTimes,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSignOutAlt, FaMapMarkerAlt, FaStar,
  FaEdit, FaHome, FaUtensils,
  FaPhone, FaEnvelope, FaCalendarAlt,
  FaShieldAlt, FaCheckCircle, FaCamera,
  FaHeart, FaMedal, FaGlobe,
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import {
  Home, Users, ChevronRight, CheckCircle, Loader2,
  MapPin, Star, Award, Utensils, Phone, Mail,
  Calendar, Shield, Globe, Heart, Edit3,
  BarChart2, LogOut, Menu, X,
} from "lucide-react";
import "./HostProfile.css";
import Footer from "../NavBar/Footer/Footer";

const BASE_URL        = "http://localhost:8000";
const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";
const photoUrl        = (id) => `${BASE_URL}/Photo/${id}`;
const DEFAULT_AVATAR  = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f5f5f5'/><circle cx='50' cy='38' r='20' fill='%23ddd'/><ellipse cx='50' cy='85' rx='32' ry='22' fill='%23ddd'/></svg>";
const DEFAULT_COVER   = "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1400&h=600&fit=crop&q=90";

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

        {/* Modal Header — matches aac-topbar style */}
        <div className="hp-modal-header">
          <div className="hp-modal-header__brand">
            <div className="hp-modal-header__dot"><Edit3 size={14} /></div>
            <span>Edit Profile</span>
          </div>
          <button className="hp-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="hp-modal-body">
          {/* Avatar Upload */}
          <div className="hp-modal-avatar-wrap">
            <img
              src={avatarPreview ?? (user.profileImage ? photoUrl(user.profileImage) : DEFAULT_AVATAR)}
              alt="avatar"
              className="hp-modal-avatar"
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
            <button className="hp-modal-avatar-btn" onClick={() => fileRef.current.click()}>
              <FaCamera size={12} />
            </button>
            <input type="file" accept="image/*" ref={fileRef} hidden onChange={handleAvatarChange} />
          </div>

          {/* Fields — aac-field grid style */}
          <div className="hp-modal-fields">
            {[
              { label: "Full Name",             key: "name",      placeholder: "Your name",             type: "input" },
              { label: "Phone",                 key: "phone",     placeholder: "+94 77 000 0000",        type: "input" },
              { label: "Address / Location",    key: "address",   placeholder: "City, District",         type: "input" },
            ].map(({ label, key, placeholder }) => (
              <div className="hp-field" key={key}>
                <label className="hp-field__label">{label}</label>
                <input
                  className="hp-field__input"
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="hp-field hp-field--full">
              <label className="hp-field__label">About</label>
              <textarea
                className="hp-field__textarea"
                rows={3}
                value={form.about}
                onChange={e => setForm({ ...form, about: e.target.value })}
                placeholder="Tell guests about yourself..."
              />
            </div>
            <div className="hp-field">
              <label className="hp-field__label">Languages <span>comma separated</span></label>
              <input
                className="hp-field__input"
                value={form.languages}
                onChange={e => setForm({ ...form, languages: e.target.value })}
                placeholder="English, Sinhala, Tamil"
              />
            </div>
            <div className="hp-field">
              <label className="hp-field__label">Interests <span>comma separated</span></label>
              <input
                className="hp-field__input"
                value={form.interests}
                onChange={e => setForm({ ...form, interests: e.target.value })}
                placeholder="Cooking, Travel, Music"
              />
            </div>
          </div>
        </div>

        <div className="hp-modal-footer">
          <button className="hp-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="hp-modal-save" onClick={handleSave} disabled={saving}>
            {saving
              ? <><Loader2 size={14} className="hp-spin" /> Saving…</>
              : <><CheckCircle size={14} /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Loader ──────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="hp-loader">
      <div className="hp-loader__card">
        <div className="hp-loader__brand">
          <div className="hp-loader__dot"><Home size={15} /></div>
          Host<span>Profile</span>
        </div>
        <div className="hp-loader__spinner">
          <Loader2 size={28} className="hp-spin" />
        </div>
        <p className="hp-loader__text">Loading your profile…</p>
      </div>
    </div>
  );
}

// ─── Stat Counter ─────────────────────────────────────────────────────────────
function StatItem({ value, label, accent }) {
  return (
    <div className="hp-stat-item">
      <span className={`hp-stat-num${accent ? ` hp-stat-num--${accent}` : ""}`}>{value}</span>
      <span className="hp-stat-tag">{label}</span>
    </div>
  );
}

// ─── Highlight Card ───────────────────────────────────────────────────────────
function HighlightCard({ icon: Icon, label, desc, badge, accent, count }) {
  return (
    <div className={`hp-hc hp-hc--${accent}`}>
      <div className={`hp-hc__icon hp-hci--${accent}`}><Icon size={16} /></div>
      <div className="hp-hc__content">
        <p className="hp-hc__label">{label}</p>
        <p className="hp-hc__desc">{desc}</p>
      </div>
      {badge && <div className="hp-hc__badge">{badge}</div>}
      {count !== undefined && <span className="hp-hc__count">{count}</span>}
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
  const [profileImageUrl, setProfileImageUrl] = useState(DEFAULT_AVATAR);
  const [userName,        setUserName]        = useState("");
  const [listingCounts,   setListingCounts]   = useState({ food: 0, accommodation: 0 });
  const [reviewCounts,    setReviewCounts]    = useState({ accommodation: 0, food: 0, host: 0 });

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
        ? (fsRes.value.data?.data || []).filter(f => String(f.owner) === CURRENT_USER_ID) : [];
      const myAcc  = acRes.status === "fulfilled"
        ? (acRes.value.data?.data || []).filter(a => String(a.owner) === CURRENT_USER_ID) : [];
      setListingCounts({ food: myFood.length, accommodation: myAcc.length });

      if (rvRes.status === "fulfilled") {
        const allReviews = rvRes.value.data?.data || [];
        const myFoodIds  = new Set(myFood.map(f => String(f._id)));
        const myAccIds   = new Set(myAcc.map(a => String(a._id)));
        let acCount = 0, foodCount = 0, hostCount = 0;
        allReviews.forEach(r => {
          if (r.host && String(r.host._id ?? r.host) === CURRENT_USER_ID) hostCount++;
          if (r.accommodation && myAccIds.has(String(r.accommodation._id ?? r.accommodation))) acCount++;
          if (r.foodService && myFoodIds.has(String(r.foodService._id ?? r.foodService))) foodCount++;
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

  const displayName  = userName || user?.name || "Host";
  const firstName    = displayName.split(" ")[0];
  const joinedYear   = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;
  const yearsHosting = joinedYear ? new Date().getFullYear() - joinedYear : 0;
  const hostRating   = user?.stats?.hostRating ?? 0;
  const totalReviews = user?.stats?.totalReviews > 0
    ? user.stats.totalReviews
    : (reviewCounts.accommodation + reviewCounts.food + reviewCounts.host);
  const isSuperhost  = hostRating >= 4.5 && totalReviews >= 5;

  // ── Topbar — identical structure to AddAccommodation ────────────────────
  const Topbar = () => (
    <div className="hp-topbar">
      <div className="hp-topbar__brand">
        <div className="hp-topbar__dot"><Home size={15} /></div>
        Host<span>Profile</span>
      </div>
      <nav className="hp-topbar__nav">
        {[
          { label: "Dashboard", href: "/host"     },
          { label: "Listings",  href: "/Listings" },
          { label: "Foods",     href: "/Foods"    },
        ].map(({ label, href }) => (
          <a key={label} href={href} className="hp-topbar__link">{label}</a>
        ))}
      </nav>
      <div className="hp-topbar__right">
        <button className="hp-topbar__explore-btn" onClick={() => navigate("/Boardings")}>
          Switch to exploring <ChevronRight size={13} />
        </button>
        <div ref={dropdownRef} className="hp-topbar__dropdown-wrap">
          <button className="hp-topbar__menu-btn" onClick={() => setShowDropdown(p => !p)}>
            <Menu size={15} />
            {firstName && <span>{firstName}</span>}
            <img
              src={profileImageUrl} alt="avatar" className="hp-topbar__avatar"
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
          </button>
          {showDropdown && (
            <div className="hp-dropdown">
              <div className="hp-dropdown__item" onClick={() => navigate("/host")}>
                <Home size={14} /> Host Dashboard
              </div>
              <div className="hp-dropdown__divider" />
              <div className="hp-dropdown__item hp-dropdown__item--danger"
                onClick={() => { localStorage.clear(); navigate("/Login"); }}>
                <LogOut size={14} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="hp-root"><Topbar /><PageLoader /></div>;

  if (!user) return (
    <div className="hp-root">
      <Topbar />
      <div className="hp-error">
        <div className="hp-error__icon"><Users size={32} /></div>
        <p>Could not load profile.</p>
        <button className="hp-error__btn" onClick={() => navigate("/host")}>← Back to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="hp-root">
      <Topbar />

      {/* ── HERO ── */}
      <div className="hp-hero">
        <div className="hp-cover">
          <img src={DEFAULT_COVER} alt="Cover" className="hp-cover-img"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <div className="hp-cover-overlay" />
          {isSuperhost && (
            <div className="hp-cover-badge"><Award size={13} /> Superhost</div>
          )}
        </div>

        <div className="hp-identity-row">
          <div className="hp-avatar-wrap">
            <img src={profileImageUrl} alt={displayName} className="hp-avatar"
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
            {isSuperhost && (
              <span className="hp-superhost-dot" title="Superhost"><Award size={11} /></span>
            )}
          </div>
          <div className="hp-name-block">
            <div className="hp-name-row">
              <h1 className="hp-name">{displayName}</h1>
              {user.isVerified?.email && (
                <MdVerified className="hp-verified-icon" title="Verified" />
              )}
            </div>
            {user.address && (
              <p className="hp-meta-line"><MapPin size={12} /> {user.address}</p>
            )}
            {joinedYear && (
              <p className="hp-meta-line"><Calendar size={12} /> Member since {joinedYear}</p>
            )}
          </div>
          <button className="hp-edit-btn" onClick={() => setShowEditModal(true)}>
            <Edit3 size={13} /> Edit Profile
          </button>
        </div>
      </div>

      {/* ── STATS RIBBON — same card style as aac-card ── */}
      <div className="hp-stats-ribbon">
        <StatItem value={totalReviews} label="Reviews" />
        <div className="hp-stat-sep" />
        <StatItem value={hostRating > 0 ? hostRating.toFixed(1) : "New"} label="Rating" accent="gold" />
        <div className="hp-stat-sep" />
        <StatItem value={listingCounts.accommodation} label="Accommodations" accent="orange" />
        <div className="hp-stat-sep" />
        <StatItem value={listingCounts.food} label="Food Services" accent="green" />
        <div className="hp-stat-sep" />
        <StatItem value={yearsHosting > 0 ? yearsHosting : "—"} label="Yrs Hosting" />
      </div>

      {/* ── BODY ── */}
      <div className="hp-layout">

        {/* LEFT COLUMN */}
        <div className="hp-left">

          {/* About — aac-card */}
          <div className="hp-card">
            <div className="hp-card__head">
              <div>
                <div className="hp-card__title">About {firstName}</div>
                <div className="hp-card__subtitle">Personal bio visible to guests</div>
              </div>
              <button className="hp-card__edit-btn" onClick={() => setShowEditModal(true)}>
                <Edit3 size={13} /> Edit
              </button>
            </div>
            <div className="hp-divider" />
            {user.about
              ? <p className="hp-about">{user.about}</p>
              : (
                <div className="hp-empty-state">
                  <p>No bio added yet.</p>
                  <button className="hp-link-btn" onClick={() => setShowEditModal(true)}>
                    Add a bio <ChevronRight size={13} />
                  </button>
                </div>
              )
            }
          </div>

          {/* Highlights — aac-card */}
          <div className="hp-card">
            <div className="hp-card__title">Host highlights</div>
            <div className="hp-card__subtitle">What makes you stand out</div>
            <div className="hp-divider" />
            <div className="hp-highlights">
              {isSuperhost && (
                <HighlightCard
                  icon={Award} label="Superhost" accent="gold"
                  desc={`${yearsHosting} year${yearsHosting !== 1 ? "s" : ""} of exceptional hosting`}
                  badge="Top Host"
                />
              )}
              <HighlightCard
                icon={Home} label={`${listingCounts.accommodation} Accommodation${listingCounts.accommodation !== 1 ? "s" : ""}`}
                desc={`${reviewCounts.accommodation} review${reviewCounts.accommodation !== 1 ? "s" : ""} · Active properties`}
                accent="orange" count={reviewCounts.accommodation}
              />
              <HighlightCard
                icon={Utensils} label={`${listingCounts.food} Food Service${listingCounts.food !== 1 ? "s" : ""}`}
                desc={`${reviewCounts.food} review${reviewCounts.food !== 1 ? "s" : ""} · Active kitchens`}
                accent="green" count={reviewCounts.food}
              />
              {user.languages?.length > 0 && (
                <HighlightCard icon={Globe} label="Multilingual" desc={user.languages.join(" · ")} accent="blue" />
              )}
              {user.interests?.length > 0 && (
                <HighlightCard icon={Heart} label="Interests" desc={user.interests.join(" · ")} accent="pink" />
              )}
              {joinedYear && (
                <HighlightCard icon={Calendar} label={`Hosting since ${joinedYear}`} desc="Proud member of Bodima" accent="purple" />
              )}
            </div>
          </div>

          {/* Review Breakdown — aac-card */}
          {totalReviews > 0 && (
            <div className="hp-card">
              <div className="hp-card__title">
                <Star size={16} className="hp-star-icon" />
                {hostRating.toFixed(2)} · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </div>
              <div className="hp-card__subtitle">Across all your listings</div>
              <div className="hp-divider" />
              <div className="hp-rb-grid">
                <div className="hp-rb-card hp-rb-card--orange">
                  <div className="hp-rb-icon"><Home size={16} /></div>
                  <div>
                    <p className="hp-rb-val">{reviewCounts.accommodation}</p>
                    <p className="hp-rb-lbl">Accommodation</p>
                  </div>
                </div>
                <div className="hp-rb-card hp-rb-card--green">
                  <div className="hp-rb-icon"><Utensils size={16} /></div>
                  <div>
                    <p className="hp-rb-val">{reviewCounts.food}</p>
                    <p className="hp-rb-lbl">Food Service</p>
                  </div>
                </div>
                {reviewCounts.host > 0 && (
                  <div className="hp-rb-card hp-rb-card--blue">
                    <div className="hp-rb-icon"><Users size={16} /></div>
                    <div>
                      <p className="hp-rb-val">{reviewCounts.host}</p>
                      <p className="hp-rb-lbl">Direct Host</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — contact card */}
        <div className="hp-right">
          <div className="hp-contact-card">

            {/* Avatar + name header */}
            <div className="hp-cc-header">
              <div className="hp-cc-avatar-wrap">
                <img src={profileImageUrl} alt={displayName} className="hp-cc-avatar"
                  onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
                />
                {isSuperhost && <div className="hp-cc-badge"><Award size={10} /></div>}
              </div>
              <div className="hp-cc-info">
                <p className="hp-cc-name">{displayName}</p>
                {isSuperhost
                  ? <span className="hp-superhost-pill"><Award size={11} /> Superhost</span>
                  : <span className="hp-host-pill">Host</span>
                }
              </div>
            </div>

            {/* Mini stat row */}
            <div className="hp-cc-stats">
              <div className="hp-cc-stat">
                <Home size={14} className="hp-cc-stat__icon hp-cc-stat--orange" />
                <span className="hp-cc-stat__val">{reviewCounts.accommodation}</span>
                <span className="hp-cc-stat__lbl">Accom.</span>
              </div>
              <div className="hp-cc-sep" />
              <div className="hp-cc-stat">
                <Utensils size={14} className="hp-cc-stat__icon hp-cc-stat--green" />
                <span className="hp-cc-stat__val">{reviewCounts.food}</span>
                <span className="hp-cc-stat__lbl">Food</span>
              </div>
              <div className="hp-cc-sep" />
              <div className="hp-cc-stat">
                <Star size={14} className="hp-cc-stat__icon hp-cc-stat--gold" />
                <span className="hp-cc-stat__val">{hostRating > 0 ? hostRating.toFixed(1) : "New"}</span>
                <span className="hp-cc-stat__lbl">Rating</span>
              </div>
            </div>

            <div className="hp-divider" />

            {/* Trust / Contact info */}
            <div className="hp-trust-list">
              {user.isVerified?.email && (
                <div className="hp-trust-item hp-trust-item--verified">
                  <CheckCircle size={14} className="hp-trust-icon hp-ti--green" />
                  <span>Email verified</span>
                  <span className="hp-trust-tick">✓</span>
                </div>
              )}
              {user.isVerified?.phone && (
                <div className="hp-trust-item hp-trust-item--verified">
                  <CheckCircle size={14} className="hp-trust-icon hp-ti--green" />
                  <span>Phone verified</span>
                  <span className="hp-trust-tick">✓</span>
                </div>
              )}
              {user.isVerified?.id && (
                <div className="hp-trust-item hp-trust-item--verified">
                  <Shield size={14} className="hp-trust-icon hp-ti--blue" />
                  <span>Identity verified</span>
                  <span className="hp-trust-tick">✓</span>
                </div>
              )}
              {user.email && (
                <div className="hp-trust-item">
                  <Mail size={14} className="hp-trust-icon" />
                  <span>{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="hp-trust-item">
                  <Phone size={14} className="hp-trust-icon" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.address && (
                <div className="hp-trust-item">
                  <MapPin size={14} className="hp-trust-icon" />
                  <span>{user.address}</span>
                </div>
              )}
            </div>

            {user.languages?.length > 0 && (
              <div className="hp-languages">
                <Globe size={13} className="hp-lang-icon" />
                <span>Speaks: <strong>{user.languages.join(", ")}</strong></span>
              </div>
            )}

            <div className="hp-divider" />

            {/* Manage buttons — matches aac-btn style */}
            <div className="hp-manage-links">
              <button className="hp-manage-btn hp-mb--orange" onClick={() => navigate("/Listings")}>
                <Home size={14} />
                <span>Accommodations</span>
                <span className="hp-manage-count">{listingCounts.accommodation}</span>
              </button>
              <button className="hp-manage-btn hp-mb--dark" onClick={() => navigate("/Foods")}>
                <Utensils size={14} />
                <span>Food Services</span>
                <span className="hp-manage-count">{listingCounts.food}</span>
              </button>
            </div>

            <p className="hp-disclaimer">
              To protect your payment, never transfer money or communicate outside of the Bodima website or app.
            </p>
          </div>

          {joinedYear && (
            <div className="hp-joined-note">
              <Calendar size={13} /> Hosting since {joinedYear}
            </div>
          )}
        </div>

      </div>

      {/* ── FOOTER ── */}
            <Footer></Footer>

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
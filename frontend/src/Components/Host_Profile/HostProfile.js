import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaCamera,
  FaMapMarkerAlt,
  FaStar,
  FaHome,
  FaUtensils,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaShieldAlt,
  FaCheckCircle,
  FaGlobe,
  FaHeart,
  FaEdit,
  FaMedal,
  FaUsers,
  FaChevronRight,
  FaSpinner,
  FaExclamationCircle,
  FaImage,
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./HostProfile.css";

const BASE_URL        = "http://localhost:8000";
const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";
const photoUrl        = (id) => `${BASE_URL}/Photo/${id}`;
const DEFAULT_AVATAR  = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f0f0f0'/><circle cx='50' cy='38' r='20' fill='%23ccc'/><ellipse cx='50' cy='85' rx='32' ry='22' fill='%23ccc'/></svg>";

// ─── Diagonal Cover Strip ─────────────────────────────────────────────────────
function CoverStrip({ userId }) {
  const [panels, setPanels] = useState([]);
  const [loaded, setLoaded]  = useState(false);

  useEffect(() => {
    if (!userId) { setLoaded(true); return; }

    const collect = async () => {
      try {
        const [fsRes, acRes] = await Promise.allSettled([
          axios.get(`${BASE_URL}/FoodService`),
          axios.get(`${BASE_URL}/Accommodation`),
        ]);

        const images = [];

        // Food service — BackgroundImage or iconImage
        if (fsRes.status === "fulfilled") {
          const list = (fsRes.value.data?.data || []).filter(
            f => String(f.owner) === userId
          );
          for (const f of list) {
            if (f.BackgroundImage) images.push(photoUrl(f.BackgroundImage));
            else if (f.iconImage)  images.push(photoUrl(f.iconImage));
            if (images.length >= 5) break;
          }
        }

        // Accommodation — first image in images array
        if (images.length < 5 && acRes.status === "fulfilled") {
          const list = (acRes.value.data?.data || []).filter(
            a => String(a.owner) === userId
          );
          for (const a of list) {
            if (a.images?.length) images.push(photoUrl(a.images[0]));
            if (images.length >= 5) break;
          }
        }

        setPanels(images.slice(0, 5));
      } catch {
        // silently fall back to gradient panels
      } finally {
        setLoaded(true);
      }
    };

    collect();
  }, [userId]);

  // Gradient fallbacks so empty panels still look good
  const FALLBACKS = [
    "linear-gradient(135deg,#1a4a6b 0%,#1e6694 100%)",
    "linear-gradient(135deg,#154060 0%,#1a5580 100%)",
    "linear-gradient(135deg,#113550 0%,#174a70 100%)",
    "linear-gradient(135deg,#0f2d44 0%,#143f60 100%)",
    "linear-gradient(135deg,#0c2436 0%,#103450 100%)",
  ];

  return (
    <div className="hp-cover-strip" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => {
        const src = panels[i];
        return (
          <div key={i} className="hp-cover-panel">
            {src ? (
              <img
                src={src}
                alt=""
                className="hp-cover-panel__img"
                onError={e => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentNode.style.background = FALLBACKS[i];
                }}
              />
            ) : (
              <div
                className="hp-cover-panel__fallback"
                style={{ background: FALLBACKS[i] }}
              />
            )}
          </div>
        );
      })}

      {/* Dark overlay so identity row text stays readable */}
      <div className="hp-cover-strip__overlay" />
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
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
        const res = profileImage
          ? await axios.put(`${BASE_URL}/Photo/${profileImage}`, fd)
          : await axios.post(`${BASE_URL}/Photo`, fd);
        if (res.data.success) profileImage = res.data.data._id;
      }
      const payload = {
        name:      form.name,
        phone:     form.phone,
        address:   form.address,
        about:     form.about,
        languages: form.languages.split(",").map(s => s.trim()).filter(Boolean),
        interests: form.interests.split(",").map(s => s.trim()).filter(Boolean),
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
    <div className="hp-overlay" onClick={onClose}>
      <div className="hp-modal" onClick={e => e.stopPropagation()}>

        <div className="hp-modal__header">
          <h3 className="hp-modal__title">Edit Profile</h3>
          <button className="hp-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="hp-modal__body">
          <div className="hp-modal__avatar-wrap">
            <img
              src={avatarPreview ?? (user.profileImage ? photoUrl(user.profileImage) : DEFAULT_AVATAR)}
              alt="avatar" className="hp-modal__avatar"
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
            <button className="hp-modal__avatar-btn" onClick={() => fileRef.current.click()}>
              <FaCamera size={11} />
            </button>
            <input type="file" accept="image/*" ref={fileRef} hidden onChange={handleAvatarChange} />
          </div>

          <div className="hp-modal__fields">
            {[
              { label: "Full Name",          key: "name",    placeholder: "Your name"      },
              { label: "Phone",              key: "phone",   placeholder: "+94 77 000 0000" },
              { label: "Address / Location", key: "address", placeholder: "City, District"  },
            ].map(({ label, key, placeholder }) => (
              <div className="hp-field" key={key}>
                <label className="hp-field__label">{label}</label>
                <input className="hp-field__input" value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder} />
              </div>
            ))}
            <div className="hp-field hp-field--full">
              <label className="hp-field__label">About</label>
              <textarea className="hp-field__textarea" rows={3} value={form.about}
                onChange={e => setForm({ ...form, about: e.target.value })}
                placeholder="Tell guests about yourself..." />
            </div>
            <div className="hp-field">
              <label className="hp-field__label">Languages <span>comma separated</span></label>
              <input className="hp-field__input" value={form.languages}
                onChange={e => setForm({ ...form, languages: e.target.value })}
                placeholder="English, Sinhala, Tamil" />
            </div>
            <div className="hp-field">
              <label className="hp-field__label">Interests <span>comma separated</span></label>
              <input className="hp-field__input" value={form.interests}
                onChange={e => setForm({ ...form, interests: e.target.value })}
                placeholder="Cooking, Travel, Music" />
            </div>
          </div>
        </div>

        <div className="hp-modal__footer">
          <button className="hp-modal__btn hp-modal__btn--ghost" onClick={onClose}>Cancel</button>
          <button className="hp-modal__btn hp-modal__btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <FaSpinner className="ho-spin" /> : <FaCheckCircle />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Highlight Card ───────────────────────────────────────────────────────────
function HighlightCard({ icon: Icon, label, desc, badge, accent, count }) {
  return (
    <div className={`hp-hc hp-hc--${accent}`}>
      <div className={`hp-hc__icon hp-hci--${accent}`}><Icon size={15} /></div>
      <div className="hp-hc__body">
        <p className="hp-hc__label">{label}</p>
        <p className="hp-hc__desc">{desc}</p>
      </div>
      {badge  && <span className="hp-hc__badge">{badge}</span>}
      {count !== undefined && <span className="hp-hc__count">{count}</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HostProfile() {
  const navigate = useNavigate();

  const [user,            setUser]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(DEFAULT_AVATAR);
  const [userName,        setUserName]        = useState("");
  const [listingCounts,   setListingCounts]   = useState({ food: 0, accommodation: 0 });
  const [reviewCounts,    setReviewCounts]    = useState({ accommodation: 0, food: 0, host: 0 });

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

  if (loading) return (
    <div className="hp-page">
      <HostNavbar />
      <div className="hp-state">
        <FaSpinner className="ho-spin hp-state__spinner" />
        <p className="hp-state__text">Loading your profile…</p>
      </div>
      <Footer />
    </div>
  );

  if (!user) return (
    <div className="hp-page">
      <HostNavbar />
      <div className="hp-state">
        <FaExclamationCircle className="hp-state__err-icon" />
        <p className="hp-state__text">Could not load profile.</p>
        <button className="hp-state__btn" onClick={() => navigate("/host")}>
          ← Back to Dashboard
        </button>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="hp-page">
      <HostNavbar activeHref="/profile" />

      {/* ── HERO ── */}
      <div className="hp-hero">

        {/* Diagonal 5-panel cover strip */}
        <CoverStrip userId={CURRENT_USER_ID} />

        {/* Identity row overlapping the strip */}
        <div className="hp-identity">
          <div className="hp-identity__avatar-wrap">
            <img src={profileImageUrl} alt={displayName} className="hp-identity__avatar"
              onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }} />
            {isSuperhost && (
              <span className="hp-identity__superhost-dot"><FaMedal size={10} /></span>
            )}
          </div>
          <div className="hp-identity__info">
            <div className="hp-identity__name-row">
              <h1 className="hp-identity__name">{displayName}</h1>
              {user.isVerified?.email && (
                <MdVerified className="hp-identity__verified" title="Verified" />
              )}
              {isSuperhost && (
                <span className="hp-identity__sh-pill"><FaMedal size={10} /> Superhost</span>
              )}
            </div>
            {user.address && (
              <p className="hp-identity__meta"><FaMapMarkerAlt size={11} /> {user.address}</p>
            )}
            {joinedYear && (
              <p className="hp-identity__meta"><FaCalendarAlt size={11} /> Member since {joinedYear}</p>
            )}
          </div>
          <button className="hp-edit-btn" onClick={() => setShowEditModal(true)}>
            <FaEdit size={12} /> Edit Profile
          </button>
        </div>
      </div>

      {/* ── STATS RIBBON ── */}
      <div className="hp-ribbon">
        {[
          { value: totalReviews,                                     label: "Reviews"        },
          { value: hostRating > 0 ? hostRating.toFixed(1) : "New",  label: "Rating",   accent: "gold"   },
          { value: listingCounts.accommodation,                      label: "Accommodations", accent: "orange" },
          { value: listingCounts.food,                               label: "Food Services",  accent: "green"  },
          { value: yearsHosting > 0 ? yearsHosting : "—",            label: "Yrs Hosting"    },
        ].map(({ value, label, accent }, i, arr) => (
          <div key={label} className="hp-ribbon__group">
            <div className="hp-ribbon__item">
              <span className={`hp-ribbon__num${accent ? ` hp-ribbon__num--${accent}` : ""}`}>{value}</span>
              <span className="hp-ribbon__label">{label}</span>
            </div>
            {i < arr.length - 1 && <div className="hp-ribbon__sep" />}
          </div>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="hp-wrapper">
        <div className="hp-layout">

          {/* LEFT */}
          <div className="hp-left">

            {/* About */}
            <div className="hp-card">
              <div className="hp-card__head">
                <div>
                  <div className="hp-card__title">About {firstName}</div>
                  <div className="hp-card__sub">Personal bio visible to guests</div>
                </div>
                <button className="hp-card__edit-btn" onClick={() => setShowEditModal(true)}>
                  <FaEdit size={11} /> Edit
                </button>
              </div>
              <div className="hp-divider" />
              {user.about
                ? <p className="hp-about">{user.about}</p>
                : (
                  <div className="hp-empty">
                    <p>No bio added yet.</p>
                    <button className="hp-link-btn" onClick={() => setShowEditModal(true)}>
                      Add a bio <FaChevronRight size={10} />
                    </button>
                  </div>
                )
              }
            </div>

            {/* Highlights */}
            <div className="hp-card">
              <div className="hp-card__title">Host highlights</div>
              <div className="hp-card__sub">What makes you stand out</div>
              <div className="hp-divider" />
              <div className="hp-highlights">
                {isSuperhost && (
                  <HighlightCard icon={FaMedal} label="Superhost" accent="gold"
                    desc={`${yearsHosting} year${yearsHosting !== 1 ? "s" : ""} of exceptional hosting`}
                    badge="Top Host" />
                )}
                <HighlightCard icon={FaHome}
                  label={`${listingCounts.accommodation} Accommodation${listingCounts.accommodation !== 1 ? "s" : ""}`}
                  desc={`${reviewCounts.accommodation} review${reviewCounts.accommodation !== 1 ? "s" : ""} · Active properties`}
                  accent="orange" count={reviewCounts.accommodation} />
                <HighlightCard icon={FaUtensils}
                  label={`${listingCounts.food} Food Service${listingCounts.food !== 1 ? "s" : ""}`}
                  desc={`${reviewCounts.food} review${reviewCounts.food !== 1 ? "s" : ""} · Active kitchens`}
                  accent="green" count={reviewCounts.food} />
                {user.languages?.length > 0 && (
                  <HighlightCard icon={FaGlobe} label="Multilingual"
                    desc={user.languages.join(" · ")} accent="blue" />
                )}
                {user.interests?.length > 0 && (
                  <HighlightCard icon={FaHeart} label="Interests"
                    desc={user.interests.join(" · ")} accent="pink" />
                )}
                {joinedYear && (
                  <HighlightCard icon={FaCalendarAlt}
                    label={`Hosting since ${joinedYear}`} desc="Proud member of Bodima" accent="purple" />
                )}
              </div>
            </div>

            {/* Review breakdown */}
            {totalReviews > 0 && (
              <div className="hp-card">
                <div className="hp-card__title">
                  <FaStar className="hp-star" />
                  {hostRating.toFixed(2)} · {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                </div>
                <div className="hp-card__sub">Across all your listings</div>
                <div className="hp-divider" />
                <div className="hp-rb-grid">
                  <div className="hp-rb hp-rb--orange">
                    <div className="hp-rb__icon"><FaHome /></div>
                    <div>
                      <p className="hp-rb__val">{reviewCounts.accommodation}</p>
                      <p className="hp-rb__lbl">Accommodation</p>
                    </div>
                  </div>
                  <div className="hp-rb hp-rb--green">
                    <div className="hp-rb__icon"><FaUtensils /></div>
                    <div>
                      <p className="hp-rb__val">{reviewCounts.food}</p>
                      <p className="hp-rb__lbl">Food Service</p>
                    </div>
                  </div>
                  {reviewCounts.host > 0 && (
                    <div className="hp-rb hp-rb--blue">
                      <div className="hp-rb__icon"><FaUsers /></div>
                      <div>
                        <p className="hp-rb__val">{reviewCounts.host}</p>
                        <p className="hp-rb__lbl">Direct Host</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="hp-right">
            <div className="hp-contact">

              <div className="hp-contact__header">
                <div className="hp-contact__avatar-wrap">
                  <img src={profileImageUrl} alt={displayName} className="hp-contact__avatar"
                    onError={e => { e.currentTarget.src = DEFAULT_AVATAR; }} />
                  {isSuperhost && (
                    <div className="hp-contact__badge"><FaMedal size={9} /></div>
                  )}
                </div>
                <div>
                  <p className="hp-contact__name">{displayName}</p>
                  {isSuperhost
                    ? <span className="hp-pill hp-pill--orange"><FaMedal size={10} /> Superhost</span>
                    : <span className="hp-pill hp-pill--grey">Host</span>
                  }
                </div>
              </div>

              <div className="hp-mini-stats">
                <div className="hp-mini-stat">
                  <FaHome className="hp-mini-stat__icon hp-mini-stat--orange" />
                  <span className="hp-mini-stat__val">{reviewCounts.accommodation}</span>
                  <span className="hp-mini-stat__lbl">Accom.</span>
                </div>
                <div className="hp-mini-sep" />
                <div className="hp-mini-stat">
                  <FaUtensils className="hp-mini-stat__icon hp-mini-stat--green" />
                  <span className="hp-mini-stat__val">{reviewCounts.food}</span>
                  <span className="hp-mini-stat__lbl">Food</span>
                </div>
                <div className="hp-mini-sep" />
                <div className="hp-mini-stat">
                  <FaStar className="hp-mini-stat__icon hp-mini-stat--gold" />
                  <span className="hp-mini-stat__val">{hostRating > 0 ? hostRating.toFixed(1) : "New"}</span>
                  <span className="hp-mini-stat__lbl">Rating</span>
                </div>
              </div>

              <div className="hp-divider" />

              <div className="hp-trust">
                {user.isVerified?.email && (
                  <div className="hp-trust__item hp-trust__item--verified">
                    <FaCheckCircle className="hp-trust__icon hp-ti--green" />
                    <span>Email verified</span>
                    <FaCheckCircle className="hp-trust__tick" />
                  </div>
                )}
                {user.isVerified?.phone && (
                  <div className="hp-trust__item hp-trust__item--verified">
                    <FaCheckCircle className="hp-trust__icon hp-ti--green" />
                    <span>Phone verified</span>
                    <FaCheckCircle className="hp-trust__tick" />
                  </div>
                )}
                {user.isVerified?.id && (
                  <div className="hp-trust__item hp-trust__item--verified">
                    <FaShieldAlt className="hp-trust__icon hp-ti--blue" />
                    <span>Identity verified</span>
                    <FaCheckCircle className="hp-trust__tick" />
                  </div>
                )}
                {user.email && (
                  <div className="hp-trust__item">
                    <FaEnvelope className="hp-trust__icon" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="hp-trust__item">
                    <FaPhone className="hp-trust__icon" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.address && (
                  <div className="hp-trust__item">
                    <FaMapMarkerAlt className="hp-trust__icon" />
                    <span>{user.address}</span>
                  </div>
                )}
              </div>

              {user.languages?.length > 0 && (
                <div className="hp-languages">
                  <FaGlobe className="hp-languages__icon" />
                  <span>Speaks: <strong>{user.languages.join(", ")}</strong></span>
                </div>
              )}

              <div className="hp-divider" />

              <div className="hp-manage">
                <button className="hp-manage__btn hp-manage__btn--primary"
                  onClick={() => navigate("/Listings")}>
                  <FaHome />
                  <span>Accommodations</span>
                  <span className="hp-manage__count">{listingCounts.accommodation}</span>
                </button>
                <button className="hp-manage__btn hp-manage__btn--dark"
                  onClick={() => navigate("/Foods")}>
                  <FaUtensils />
                  <span>Food Services</span>
                  <span className="hp-manage__count">{listingCounts.food}</span>
                </button>
              </div>

              <p className="hp-disclaimer">
                To protect your payment, never transfer money or communicate outside of the Bodima website or app.
              </p>
            </div>

            {joinedYear && (
              <div className="hp-joined">
                <FaCalendarAlt /> Hosting since {joinedYear}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

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
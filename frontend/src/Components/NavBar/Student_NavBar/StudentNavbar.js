import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaAirbnb, FaBars, FaUser,
  FaSignOutAlt, FaEnvelope,
} from "react-icons/fa";
import "./StudentNavbar.css";

const API_BASE = "http://localhost:8000";
const FONT     = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;

// ─────────────────────────────────────────
// LOGOUT MODAL
// ─────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="snav-overlay" onClick={onCancel}>
      <div className="snav-modal" onClick={e => e.stopPropagation()}>
        <div className="snav-modal__icon-wrap snav-modal__icon-wrap--danger">
          <FaSignOutAlt />
        </div>
        <h3 className="snav-modal__title">Logout</h3>
        <p className="snav-modal__desc">Are you sure you want to logout?</p>
        <div className="snav-modal__btns">
          <button className="snav-modal__btn snav-modal__btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="snav-modal__btn snav-modal__btn--danger" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STUDENT NAVBAR
// Props:
//   activeTab  — "Boardings" | "Food Services" | "Orders" | ""
// ─────────────────────────────────────────
export default function StudentNavbar({ activeTab = "" }) {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [currentUser,   setCurrentUser]   = useState(null);
  const [userAvatarSrc, setUserAvatarSrc] = useState(null);
  const [dropdown,      setDropdown]      = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);
  const dropRef = useRef(null);

  // Fetch user profile
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (!raw) return;
        const user = raw?.data ?? raw?.result ?? raw;
        setCurrentUser(user);
        if (user?.profileImage) setUserAvatarSrc(photoSrc(user.profileImage));
      })
      .catch(() => {});
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("CurrentUserId");
    navigate("/Login");
  };

  const isLoggedIn = !!currentUser;
  const userRole   = currentUser?.role ?? null;
  const isHost     = userRole === "host";
  const isStudent  = userRole === "student";

  const TABS = [
    { label: "Boardings",     href: "/Boardings"    },
    { label: "Food Services", href: "/Foods" },
    { label: "Orders",        href: "/StudentOrders"       },
  ];

  return (
    <>
      <nav className="snav" style={{ fontFamily: FONT }}>

        {/* Left — logo */}
        <div className="snav__left">
          <a href="/" className="snav__logo">
            <FaAirbnb /> Unisewana
          </a>
        </div>

        {/* Centre — tabs */}
        <div className="snav__tabs">
          {TABS.map(({ label, href }) => {
            const active = activeTab === label;
            return (
              <a key={label} href={href}
                className={`snav__tab${active ? " snav__tab--active" : ""}`}>
                {label}
                {active && <span className="snav__tab-underline" />}
              </a>
            );
          })}
        </div>

        {/* Right — avatar + menu */}
        <div className="snav__right">
          {!isLoggedIn && (
            <button className="snav__host-btn" onClick={() => navigate("/Login")}>
              Login
            </button>
          )}
          {isHost && (
            <button className="snav__host-btn" onClick={() => navigate("/Listings")}>
              Host Page
            </button>
          )}

          {/* Avatar */}
          <div className="snav__avatar">
            {userAvatarSrc
              ? <img src={userAvatarSrc} alt="Profile" className="snav__avatar-img"
                  onError={() => setUserAvatarSrc(null)} />
              : <FaUser className="snav__avatar-icon" />}
          </div>

          {/* Dropdown burger */}
          <div ref={dropRef} className="snav__dropdown">
            <div className="snav__icon-btn" onClick={() => setDropdown(p => !p)}>
              <FaBars />
            </div>
            {dropdown && (
              <div className="snav__dropdown-menu">
                {isLoggedIn && currentUser && (
                  <>
                    <div className="snav__dropdown-user">
                      <span className="snav__dropdown-username">{currentUser.name ?? "User"}</span>
                      <span className="snav__dropdown-email">{currentUser.email ?? ""}</span>
                      <span className={`snav__dropdown-role snav__dropdown-role--${userRole}`}>
                        {userRole}
                      </span>
                    </div>
                    <div className="snav__dropdown-divider" />
                  </>
                )}
                {(isStudent || isHost) && (
                  <div className="snav__dropdown-item"
                    onClick={() => { setDropdown(false); navigate("/Profile"); }}>
                    <FaUser style={{ opacity: 0.7 }} /> Profile
                  </div>
                )}
                {isStudent && (
                  <div className="snav__dropdown-item"
                    onClick={() => { setDropdown(false); navigate("/Messages"); }}>
                    <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                  </div>
                )}
                {isLoggedIn && (isStudent || isHost) && (
                  <>
                    <div className="snav__dropdown-divider" />
                    <div className="snav__dropdown-item snav__dropdown-item--danger"
                      onClick={() => { setDropdown(false); setShowLogout(true); }}>
                      <FaSignOutAlt style={{ opacity: 0.7 }} /> Logout
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}

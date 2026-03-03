import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaAirbnb, FaBars, FaUser,
  FaSignOutAlt, FaEnvelope, FaCreditCard,
  FaBell,
} from "react-icons/fa";
import "./HostNavbar.css";

const API_BASE = "http://localhost:8000";
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─────────────────────────────────────────
// LOGOUT MODAL
// ─────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="hn-modal-overlay" onClick={onCancel}>
      <div className="hn-modal" onClick={e => e.stopPropagation()}>
        <h3>Logout</h3>
        <p>Are you sure you want to logout from your host account?</p>
        <div className="hn-modal__actions">
          <button className="hn-modal__cancel" onClick={onCancel}>Cancel</button>
          <button className="hn-modal__confirm" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// NAV TABS
// ─────────────────────────────────────────
const NAV_TABS = [
  { label: "Bookings", href: "/Bookings"   },
  { label: "Orders",   href: "/HostOrders" },
  { label: "Listings", href: "/Listings"   },
];

// ─────────────────────────────────────────
// HOSTNAV COMPONENT
// Props:
//   activeHref      — href of the active tab, e.g. "/Listings"
//   pendingCount    — number shown on the bell badge (0 = hidden)
//   notifications   — array of { id, message, time, unread }
// ─────────────────────────────────────────
export default function HostNavbar({
  activeHref    = "",
  pendingCount  = 0,
  notifications = [],
}) {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [currentUser,   setCurrentUser]   = useState(null);
  const [userAvatarSrc, setUserAvatarSrc] = useState(null);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [showBell,      setShowBell]      = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);

  const dropdownRef = useRef(null);
  const bellRef     = useRef(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (!raw) return;
        const user = unwrap(raw);
        setCurrentUser(user);
        if (user?.profileImage) setUserAvatarSrc(photoSrc(user.profileImage));
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
      if (bellRef.current && !bellRef.current.contains(e.target))
        setShowBell(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    navigate("/Login");
  };

  return (
    <>
      <nav className="hn-nav">

        {/* ── Logo ── */}
        <div className="hn-nav__logo-wrap">
          <a href="/" className="hn-nav__logo">
            <FaAirbnb /> Unisewana
          </a>
        </div>

        {/* ── Center tabs ── */}
        <div className="hn-nav__center">
          {NAV_TABS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className={`hn-nav__tab${href === activeHref ? " hn-nav__tab--active" : ""}`}
            >
              {label}
              {href === activeHref && <span className="hn-nav__tab-underline" />}
            </a>
          ))}
        </div>

        {/* ── Right side ── */}
        <div className="hn-nav__right">

          {/* Switch to exploring */}
          <a href="/Boardings" className="hn-switch-link">
            Switch to exploring
          </a>

          {/* Bell */}
          <div className="hn-bell-wrap" ref={bellRef}>
            <button
              className="hn-bell-btn"
              onClick={() => { setShowBell(p => !p); setShowDropdown(false); }}
              aria-label="Notifications"
            >
              <FaBell className="hn-bell-icon" />
              {pendingCount > 0 && (
                <span className="hn-bell-badge">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>

            {showBell && (
              <div className="hn-bell-dropdown">
                <div className="hn-bell-dropdown__header">
                  <span className="hn-bell-dropdown__title">Notifications</span>
                  {pendingCount > 0 && (
                    <span className="hn-bell-dropdown__count">{pendingCount} new</span>
                  )}
                </div>
                <div className="hn-bell-dropdown__divider" />
                {notifications.length === 0 ? (
                  <div className="hn-bell-empty">
                    <FaBell style={{ fontSize: 28, color: "#d1d5db", marginBottom: 8 }} />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <ul className="hn-bell-list">
                    {notifications.map((n) => (
                      <li key={n.id}
                        className={`hn-bell-item${n.unread ? " hn-bell-item--unread" : ""}`}>
                        <div className="hn-bell-item__dot" />
                        <div className="hn-bell-item__body">
                          <div className="hn-bell-item__msg">{n.message}</div>
                          <div className="hn-bell-item__time">{n.time}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Hamburger + avatar pill */}
          <div className="hn-dropdown" ref={dropdownRef}>
            <button
              className="hn-nav__menu-btn"
              onClick={() => { setShowDropdown(p => !p); setShowBell(false); }}
            >
              <FaBars className="hn-menu-icon" />
              {userAvatarSrc
                ? <img src={userAvatarSrc} alt="Profile" className="hn-user-avatar"
                    onError={() => setUserAvatarSrc(null)} />
                : <span className="hn-user-icon-wrap">
                    <FaUser className="hn-user-icon" />
                  </span>}
            </button>

            {showDropdown && (
              <div className="hn-dropdown__menu">
                {currentUser && (
                  <>
                    <div className="hn-dropdown__profile">
                      <div className="hn-dropdown__name">{currentUser.name ?? "Host"}</div>
                      <div className="hn-dropdown__email">{currentUser.email ?? ""}</div>
                    </div>
                    <div className="hn-dropdown__divider" />
                  </>
                )}
                <div className="hn-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/Host-Profile"); }}>
                  <FaUser style={{ opacity: 0.55 }} /> Profile
                </div>
                <div className="hn-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/Payment"); }}>
                  <FaCreditCard style={{ opacity: 0.55 }} /> Payment
                </div>
                <div className="hn-dropdown__item"
                  onClick={() => { setShowDropdown(false); navigate("/Messages"); }}>
                  <FaEnvelope style={{ opacity: 0.55 }} /> Messages
                </div>
                <div className="hn-dropdown__divider" />
                <div className="hn-dropdown__item hn-dropdown__item--danger"
                  onClick={() => { setShowDropdown(false); setShowLogout(true); }}>
                  <FaSignOutAlt style={{ opacity: 0.65 }} /> Logout
                </div>
              </div>
            )}
          </div>

        </div>
      </nav>

      {showLogout && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}
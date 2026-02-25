import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaAirbnb, FaBars, FaUser, FaTimes,
  FaFacebookF, FaTwitter, FaInstagram,
  FaCog, FaSignOutAlt, FaEnvelope,
  FaMapMarkerAlt, FaClock, FaMotorcycle,
  FaShoppingBag, FaStar, FaCreditCard,
  FaCheckCircle, FaEdit, FaTrash,
} from "react-icons/fa";
import "./HostListings.css";

const BASE_URL        = "http://localhost:8000";
const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";
const photoUrl        = (id) => `${BASE_URL}/photo/${id}`;

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ item, type, onClick }) {
  const coverImg = type === "food"
    ? (item.BackgroundImage ? photoUrl(item.BackgroundImage) : null)
    : (item.photos?.[0]     ? photoUrl(item.photos[0])       : null);

  const isAvailable = type === "food" ? item.isAvailable : item.isActive;
  const title       = type === "food" ? item.kitchenName  : item.title;
  const subtitle    = type === "food" ? item.serviceType  : (item.propertyType || "Accommodation");

  return (
    <div className="listing-card" onClick={() => onClick(item, type)}>
      <div className="card-cover">
        {coverImg
          ? <img src={coverImg} alt={title} className="cover-img" />
          : <div className="cover-placeholder">
              <span>{type === "food" ? "🍽️" : "🏠"}</span>
            </div>
        }
        <div className={`availability-pill ${isAvailable ? "on" : "off"}`}>
          <span className="pill-dot" />
          {isAvailable ? "Listed" : "Unlisted"}
        </div>
      </div>

      <div className="card-body">
        <div className="card-top">
          <div className="card-top-text">
            <p className="card-subtitle">{subtitle}</p>
            <h3 className="card-title">{title || "Untitled listing"}</h3>
          </div>
        </div>

        <p className="card-address">
          <FaMapMarkerAlt className="card-addr-icon" />
          {item.address || <span className="no-address">No address set</span>}
        </p>

        {type === "food" && item.operatingHours && (
          <p className="card-hours">
            <FaClock className="card-addr-icon" />
            {item.operatingHours.open} – {item.operatingHours.close}
          </p>
        )}

        <div className="card-chips">
          {type === "food" && item.deliveryAvailable && <span className="chip chip-blue"><FaMotorcycle /> Delivery</span>}
          {type === "food" && item.pickupAvailable   && <span className="chip chip-orange"><FaShoppingBag /> Pickup</span>}
          {type === "food" && item.menu?.length > 0  && <span className="chip chip-gray">{item.menu.length} menu items</span>}
          {type === "accommodation" && item.pricePerNight && (
            <span className="chip chip-green">LKR {Number(item.pricePerNight).toLocaleString()} / night</span>
          )}
        </div>

        <p className="card-click-hint">Click to manage →</p>
      </div>
    </div>
  );
}

// ─── Menu Item Row ────────────────────────────────────────────────────────────
function MenuItemRow({ menuItemId }) {
  const [menuItem,  setMenuItem]  = useState(null);
  const [toggling,  setToggling]  = useState(false);

  useEffect(() => {
    axios.get(`${BASE_URL}/menuitem/${menuItemId}`)
      .then(r => setMenuItem(r.data?.data || r.data))
      .catch(() => {});
  }, [menuItemId]);

  const handleToggle = async () => {
    if (!menuItem) return;
    setToggling(true);
    try {
      const newVal = !menuItem.isAvailable;
      await axios.put(`${BASE_URL}/menuitem/${menuItemId}`, { isAvailable: newVal });
      setMenuItem(m => ({ ...m, isAvailable: newVal }));
    } catch { alert("Failed to update menu item."); }
    finally { setToggling(false); }
  };

  if (!menuItem) return (
    <div className="menu-item-row menu-item-row--loading">
      <div className="mi-skeleton-img" />
      <div className="mi-skeleton-text">
        <div className="mi-skeleton-line" style={{ width: "60%" }} />
        <div className="mi-skeleton-line" style={{ width: "40%" }} />
      </div>
    </div>
  );

  const imgId = menuItem.image || menuItem.imageId || menuItem.photo;
  return (
    <div className="menu-item-row">
      <div className="mi-img-wrap">
        {imgId
          ? <img src={photoUrl(imgId)} alt={menuItem.name} className="mi-img" />
          : <div className="mi-img-fallback">🍽</div>
        }
      </div>
      <div className="mi-info">
        <span className="mi-name">{menuItem.name}</span>
        <span className="mi-meta">
          {menuItem.category && <span className="mi-cat">{menuItem.category}</span>}
          {menuItem.price    && <span className="mi-price">LKR {Number(menuItem.price).toLocaleString()}</span>}
        </span>
      </div>
      <div
        className={`toggle-switch ${menuItem.isAvailable ? "on" : "off"} ${toggling ? "loading" : ""}`}
        onClick={!toggling ? handleToggle : undefined}
        title={menuItem.isAvailable ? "Click to hide" : "Click to show"}
      >
        <span className="toggle-thumb" />
      </div>
    </div>
  );
}

// ─── Listing Detail Popup ─────────────────────────────────────────────────────
function ListingPopup({ item, type, onClose, onEdit, onDelete, onToggle, onAddPayment }) {
  const [toggling, setToggling] = useState(false);

  const coverImg = type === "food"
    ? (item.BackgroundImage ? photoUrl(item.BackgroundImage) : null)
    : (item.photos?.[0]     ? photoUrl(item.photos[0])       : null);

  const iconImg     = type === "food" && item.iconImage ? photoUrl(item.iconImage) : null;
  const isAvailable = type === "food" ? item.isAvailable : item.isActive;
  const title       = type === "food" ? item.kitchenName  : item.title;
  const subtitle    = type === "food" ? item.serviceType  : (item.propertyType || "Accommodation");

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(item._id, !isAvailable, type);
    setToggling(false);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const isExpired = item.expireDate && new Date(item.expireDate) < new Date();

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>

        {/* ── Fixed cover (not scrollable) */}
        <div className="popup-cover">
          {coverImg
            ? <img src={coverImg} alt={title} className="popup-cover-img" />
            : <div className="popup-cover-placeholder">{type === "food" ? "🍽️" : "🏠"}</div>
          }
          <button className="popup-close" onClick={onClose}><FaTimes /></button>
          <div className={`popup-status-badge ${isAvailable ? "on" : "off"}`}>
            <span className="pill-dot" />{isAvailable ? "Listed" : "Unlisted"}
          </div>
          {iconImg && (
            <div className="popup-icon-wrap">
              <img src={iconImg} alt="icon" className="popup-icon" />
            </div>
          )}
        </div>

        {/* ── Scrollable body */}
        <div className="popup-scroll">

          {/* Title + rating */}
          <div className="popup-body-top">
            <div>
              <p className="popup-subtitle">{subtitle}</p>
              <h2 className="popup-title">{title || "Untitled listing"}</h2>
            </div>
            {item.ratingAverage > 0 && (
              <div className="popup-rating">
                <FaStar className="popup-star" />
                <span>{item.ratingAverage.toFixed(1)}</span>
                {item.ratingCount > 0 && <span className="popup-review-count">({item.ratingCount})</span>}
              </div>
            )}
          </div>

          {/* Detail rows */}
          <div className="popup-details">
            {item.address && (
              <div className="popup-detail-row">
                <FaMapMarkerAlt className="popup-detail-icon" />
                <span>{item.address}</span>
              </div>
            )}
            {type === "food" && item.operatingHours && (
              <div className="popup-detail-row">
                <FaClock className="popup-detail-icon" />
                <span>{item.operatingHours.open} – {item.operatingHours.close}</span>
              </div>
            )}
            {type === "food" && (item.deliveryAvailable || item.pickupAvailable) && (
              <div className="popup-detail-row">
                <FaMotorcycle className="popup-detail-icon" />
                <span>{[item.deliveryAvailable && "Delivery", item.pickupAvailable && "Pickup"].filter(Boolean).join(" · ")}</span>
              </div>
            )}
            {type === "food" && item.menu?.length > 0 && (
              <div className="popup-detail-row">
                <span className="popup-detail-icon" style={{ fontSize: 13 }}>🍴</span>
                <span>{item.menu.length} menu item{item.menu.length !== 1 ? "s" : ""}</span>
              </div>
            )}
            {type === "accommodation" && item.pricePerNight && (
              <div className="popup-detail-row">
                <FaCreditCard className="popup-detail-icon" />
                <span>LKR {Number(item.pricePerNight).toLocaleString()} / night</span>
              </div>
            )}
            {item.expireDate && (
              <div className="popup-detail-row">
                <FaClock className={`popup-detail-icon ${isExpired ? "icon-red" : "icon-green"}`} />
                <span className={isExpired ? "text-red" : "text-green"}>
                  {isExpired ? `Expired ${fmtDate(item.expireDate)}` : `Expires ${fmtDate(item.expireDate)}`}
                </span>
              </div>
            )}
          </div>

          {/* Menu items section — food only */}
          {type === "food" && item.menu?.length > 0 && (
            <div className="popup-menu-section">
              <h4 className="popup-section-title">Menu Items</h4>
              <div className="popup-menu-list">
                {item.menu.map(id => (
                  <MenuItemRow key={id} menuItemId={id} />
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="popup-actions">
            <button
              className={`popup-btn popup-btn--status ${isAvailable ? "deactivate" : "activate"}`}
              onClick={handleToggle}
              disabled={toggling}
            >
              <FaCheckCircle />
              {toggling ? "Updating…" : isAvailable ? "Mark as Unlisted" : "Mark as Active"}
            </button>

            <button className="popup-btn popup-btn--payment" onClick={() => onAddPayment(item._id, type)}>
              <FaCreditCard />
              Add Payment
            </button>

            <button className="popup-btn popup-btn--edit" onClick={() => onEdit(item._id, type)}>
              <FaEdit />
              Edit Listing
            </button>

            <button className="popup-btn popup-btn--delete" onClick={() => onDelete(item._id, type)}>
              <FaTrash />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ type, onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">{type === "food" ? "🍳" : "🏡"}</div>
      <h3>No {type === "food" ? "food services" : "accommodations"} yet</h3>
      <p>
        {type === "food"
          ? "List your kitchen, restaurant, or café to start receiving orders."
          : "List your property to start hosting guests."}
      </p>
      <button className="btn-add-empty" onClick={onAdd}>+ Create a listing</button>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Remove listing?</h3>
        <p>This listing will be permanently deleted. This action can't be undone.</p>
        <div className="modal-actions">
          <button className="modal-cancel"  onClick={onCancel}>Keep listing</button>
          <button className="modal-confirm" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HostListings() {
  const navigate = useNavigate();

  const [activeTab,      setActiveTab]      = useState("food");
  const [foodServices,   setFoodServices]   = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [selectedItem,   setSelectedItem]   = useState(null); // { item, type }
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [activeNav,      setActiveNav]      = useState("listings");

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Fetch listings belonging to this host ──────────────────────────────────
  useEffect(() => {
    if (!CURRENT_USER_ID) { setLoading(false); return; }
    const fetchAll = async () => {
      setLoading(true);
      const [fsRes, acRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/Foodservice`),
        axios.get(`${BASE_URL}/accommodation`),
      ]);
      if (fsRes.status === "fulfilled") {
        const all = fsRes.value.data?.data || [];
        setFoodServices(all.filter(f => String(f.owner) === String(CURRENT_USER_ID)));
      }
      if (acRes.status === "fulfilled") {
        const all = acRes.value.data?.data || [];
        setAccommodations(all.filter(a => String(a.owner) === String(CURRENT_USER_ID)));
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleEdit = (id, type) => {
    setSelectedItem(null);
    navigate(type === "food" ? `/host/food/edit/${id}` : `/host/accommodation/edit/${id}`);
  };

  const handleToggle = async (id, val, type) => {
    try {
      if (type === "food") {
        await axios.put(`${BASE_URL}/Foodservice/${id}`, { isAvailable: val });
        setFoodServices(p => p.map(f => f._id === id ? { ...f, isAvailable: val } : f));
        // keep popup in sync
        setSelectedItem(s => s && s.item._id === id
          ? { ...s, item: { ...s.item, isAvailable: val } } : s);
      } else {
        await axios.put(`${BASE_URL}/accommodation/${id}`, { isActive: val });
        setAccommodations(p => p.map(a => a._id === id ? { ...a, isActive: val } : a));
        setSelectedItem(s => s && s.item._id === id
          ? { ...s, item: { ...s.item, isActive: val } } : s);
      }
    } catch { alert("Failed to update status."); }
  };

  const handleAddPayment = (id, type) => {
    setSelectedItem(null);
    navigate(type === "food"
      ? `/host/food/payment/${id}`
      : `/host/accommodation/payment/${id}`);
  };

  const handleDeleteRequest = (id, type) => {
    setSelectedItem(null);
    setDeleteTarget({ id, type });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, type } = deleteTarget;
    try {
      if (type === "food") {
        await axios.delete(`${BASE_URL}/Foodservice/${id}`);
        setFoodServices(p => p.filter(f => f._id !== id));
      } else {
        await axios.delete(`${BASE_URL}/accommodation/${id}`);
        setAccommodations(p => p.filter(a => a._id !== id));
      }
    } catch { alert("Failed to delete."); }
    finally  { setDeleteTarget(null); }
  };

  const currentList = activeTab === "food" ? foodServices : accommodations;

  return (
    <div className="page">

      {/* ══ NAVBAR ══ */}
      <nav className="hl-nav">
        {/* Logo — left */}
        <div className="hl-nav__logo-wrap">
          <a href="/" className="hl-nav__logo"><FaAirbnb /> Bodima</a>
        </div>

        {/* Nav tabs — center */}
        <div className="hl-nav__center">
          {[
            { key: "today",    label: "Today",    href: "/host" },
            { key: "calendar", label: "Calendar", href: "/host/calendar" },
            { key: "listings", label: "Listings", href: "/host/listings" },
            { key: "messages", label: "Messages", href: "/host/messages" },
          ].map(({ key, label, href }) => (
            <a
              key={key} href={href}
              className={`hl-nav__tab${activeNav === key ? " hl-nav__tab--active" : ""}`}
              onClick={() => setActiveNav(key)}
            >
              {label}
              {activeNav === key && <span className="hl-nav__tab-underline" />}
            </a>
          ))}
        </div>

        {/* Right — switch + menu+avatar */}
        <div className="hl-nav__right">
          <button className="hl-nav__switch-btn" onClick={() => navigate("/")}>
            Switch to exploring
          </button>
          <div ref={dropdownRef} className="hl-dropdown">
            <button
              className="hl-nav__menu-btn"
              onClick={() => setShowDropdown(p => !p)}
            >
              <FaBars className="hl-menu-icon" />
              <FaUser className="hl-user-icon" />
            </button>
            {showDropdown && (
              <div className="hl-dropdown__menu">
                <div className="hl-dropdown__item" onClick={() => navigate("/profile")}>
                  <FaUser style={{ opacity: 0.6 }} /> Profile
                </div>
                <div className="hl-dropdown__item" onClick={() => navigate("/messages")}>
                  <FaEnvelope style={{ opacity: 0.6 }} /> Messages
                </div>
                <div className="hl-dropdown__divider" />
                <div className="hl-dropdown__item" onClick={() => navigate("/settings")}>
                  <FaCog style={{ opacity: 0.6 }} /> Settings
                </div>
                <div className="hl-dropdown__item hl-dropdown__item--danger"
                  onClick={() => { localStorage.clear(); navigate("/login"); }}>
                  <FaSignOutAlt style={{ opacity: 0.6 }} /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ PAGE HEADER ══ */}
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-left">
            <h1 className="page-title">Your listings</h1>
            {!loading && (
              <span className="listings-count">
                {currentList.length} listing{currentList.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            className="btn-create"
            onClick={() => navigate(activeTab === "food" ? "/host/food/add" : "/host/accommodation/add")}
          >
            + Create listing
          </button>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === "food" ? "active" : ""}`} onClick={() => setActiveTab("food")}>
            Food Services
            {foodServices.length > 0 && <span className="tab-badge">{foodServices.length}</span>}
          </button>
          <button className={`tab ${activeTab === "accommodation" ? "active" : ""}`} onClick={() => setActiveTab("accommodation")}>
            Accommodations
            {accommodations.length > 0 && <span className="tab-badge">{accommodations.length}</span>}
          </button>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="page-content">
        {loading ? (
          <div className="grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-cover" />
                <div className="skeleton-body">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                </div>
              </div>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <EmptyState
            type={activeTab}
            onAdd={() => navigate(activeTab === "food" ? "/host/food/add" : "/host/accommodation/add")}
          />
        ) : (
          <div className="grid">
            {currentList.map(item => (
              <ListingCard
                key={item._id}
                item={item}
                type={activeTab}
                onClick={(item, type) => setSelectedItem({ item, type })}
              />
            ))}
          </div>
        )}
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

      {/* ══ LISTING DETAIL POPUP ══ */}
      {selectedItem && (
        <ListingPopup
          item={selectedItem.item}
          type={selectedItem.type}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onToggle={handleToggle}
          onAddPayment={handleAddPayment}
        />
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteTarget && (
        <DeleteModal onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
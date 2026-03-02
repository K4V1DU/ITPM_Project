import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaAirbnb, FaBars, FaUser, FaTimes,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSignOutAlt,
  FaMapMarkerAlt, FaClock, FaMotorcycle,
  FaShoppingBag, FaStar, FaCreditCard,
  FaEdit, FaTrash,
} from "react-icons/fa";
import "./HostListings.css";

const BASE_URL        = "http://localhost:8000";
const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";
const photoUrl        = (id) => `${BASE_URL}/photo/${id}`;
const DEFAULT_AVATAR  = "/default-avatar.png";

function ListingCard({ item, type, onClick }) {
  const coverImg = type === "food"
    ? (item.BackgroundImage ? photoUrl(item.BackgroundImage) : null)
    : (item.images?.[0]     ? photoUrl(item.images[0])       : null);

  const isAvailable = item.isAvailable;
  const title       = type === "food" ? item.kitchenName : item.title;
  const subtitle    = type === "food" ? item.serviceType : (item.accommodationType || "Accommodation");

  return (
    <div className="listing-card" onClick={() => onClick(item, type)}>
      <div className="card-cover">
        {coverImg
          ? <img src={coverImg} alt={title} className="cover-img" />
          : <div className="cover-placeholder"><span>{type === "food" ? "🍽️" : "🏠"}</span></div>
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
          {type === "accommodation" && item.pricePerMonth && (
            <span className="chip chip-green">LKR {Number(item.pricePerMonth).toLocaleString()} / month</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItemRow({ menuItemId, cachedData, onUpdate }) {
  const [menuItem, setMenuItem] = useState(cachedData || null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (cachedData) { setMenuItem(cachedData); return; }
    axios.get(`${BASE_URL}/menuitem/${menuItemId}`)
      .then(r => {
        const data = r.data?.data || r.data;
        setMenuItem(data);
        onUpdate?.(menuItemId, data);
      })
      .catch(() => {});
  }, [menuItemId, cachedData]);

  const handleToggle = async () => {
    if (!menuItem) return;
    setToggling(true);
    try {
      const newVal = !menuItem.isAvailable;
      await axios.put(`${BASE_URL}/menuitem/${menuItemId}`, { isAvailable: newVal });
      const updated = { ...menuItem, isAvailable: newVal };
      setMenuItem(updated);
      onUpdate?.(menuItemId, updated);
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

function ListingPopup({ item, type, onClose, onEdit, onDelete, onToggle, onAddPayment, menuItemCache, onMenuItemCacheUpdate }) {
  const [toggling, setToggling] = useState(false);

  const coverImg    = type === "food"
    ? (item.BackgroundImage ? photoUrl(item.BackgroundImage) : null)
    : (item.images?.[0]     ? photoUrl(item.images[0])       : null);
  const iconImg     = type === "food" && item.iconImage ? photoUrl(item.iconImage) : null;
  const isAvailable = item.isAvailable;
  const title       = type === "food" ? item.kitchenName : item.title;
  const subtitle    = type === "food" ? item.serviceType : (item.accommodationType || "Accommodation");

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(item._id, !isAvailable, type);
    setToggling(false);
  };

  const fmtDate  = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const isExpired = item.expireDate && new Date(item.expireDate) < new Date();

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>
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
              <img src={iconImg} alt="icon" className="popup-icon" onError={e => { e.currentTarget.style.display = "none"; }} />
            </div>
          )}
        </div>

        <div className="popup-scroll">
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

          <div className="popup-details">
            {item.address && (
              <div className="popup-detail-row"><FaMapMarkerAlt className="popup-detail-icon" /><span>{item.address}</span></div>
            )}
            {type === "food" && item.operatingHours && (
              <div className="popup-detail-row"><FaClock className="popup-detail-icon" /><span>{item.operatingHours.open} – {item.operatingHours.close}</span></div>
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
            {type === "accommodation" && item.pricePerMonth && (
              <div className="popup-detail-row"><FaCreditCard className="popup-detail-icon" /><span>LKR {Number(item.pricePerMonth).toLocaleString()} / month</span></div>
            )}
            {type === "accommodation" && (item.bedrooms || item.bathrooms) && (
              <div className="popup-detail-row">
                <span className="popup-detail-icon" style={{ fontSize: 13 }}>🛏</span>
                <span>
                  {[
                    item.bedrooms  && `${item.bedrooms} bedroom${item.bedrooms !== 1 ? "s" : ""}`,
                    item.bathrooms && `${item.bathrooms} bathroom${item.bathrooms !== 1 ? "s" : ""}`,
                  ].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
            {type === "accommodation" && item.genderPreference && (
              <div className="popup-detail-row">
                <span className="popup-detail-icon" style={{ fontSize: 13 }}>👥</span>
                <span style={{ textTransform: "capitalize" }}>{item.genderPreference}</span>
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

          {type === "food" && item.menu?.length > 0 && (
            <div className="popup-menu-section">
              <h4 className="popup-section-title">Menu Items</h4>
              <div className="popup-menu-list">
                {item.menu.map(id => (
                  <MenuItemRow
                    key={id}
                    menuItemId={id}
                    cachedData={menuItemCache[id] || null}
                    onUpdate={onMenuItemCacheUpdate}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="popup-status-toggle-section">
            <div className="popup-status-toggle-label">
              <span className="toggle-label-text">Listing Status</span>
              <span className={`toggle-label-status ${isAvailable ? "active" : "inactive"}`}>
                {isAvailable ? "Active" : "Unlisted"}
              </span>
            </div>
            <div
              className={`toggle-switch-large ${isAvailable ? "on" : "off"} ${toggling ? "loading" : ""}`}
              onClick={!toggling ? handleToggle : undefined}
              title={isAvailable ? "Click to unlist" : "Click to activate"}
            >
              <span className="toggle-thumb-large" />
            </div>
          </div>

          <div className="popup-actions">
            {/* ── FIXED: navigates to /Payment with correct state ── */}
            <button className="popup-btn popup-btn--payment" onClick={() => onAddPayment(item._id, type, item)}>
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

export default function HostListings() {
  const navigate = useNavigate();

  const [activeTab,      setActiveTab]      = useState("food");
  const [foodServices,   setFoodServices]   = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [selectedItem,   setSelectedItem]   = useState(null);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [activeNav,      setActiveNav]      = useState("listings");
  const [profileImageUrl, setProfileImageUrl] = useState(DEFAULT_AVATAR);

  const menuItemCacheRef = useRef({});
  const [menuItemCache,  setMenuItemCache]  = useState({});
  const dropdownRef = useRef(null);

  const handleMenuItemCacheUpdate = (id, data) => {
    menuItemCacheRef.current[id] = data;
    setMenuItemCache(prev => ({ ...prev, [id]: data }));
  };

  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!CURRENT_USER_ID) return;
    axios.get(`${BASE_URL}/user/${CURRENT_USER_ID}`)
      .then(r => {
        const user = r.data?.data || r.data;
        if (user?.profileImage) setProfileImageUrl(photoUrl(user.profileImage));
      })
      .catch(() => {});
  }, []);

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

  const handleEdit = (id, type) => {
    setSelectedItem(null);
    navigate(type === "food" ? `/EditFoodService/${id}` : `/edit-Accommodation/${id}`);
  };

  const handleToggle = async (id, val, type) => {
    try {
      if (type === "food") {
        await axios.put(`${BASE_URL}/Foodservice/${id}`, { isAvailable: val });
        setFoodServices(p => p.map(f => f._id === id ? { ...f, isAvailable: val } : f));
        setSelectedItem(s => s && s.item._id === id ? { ...s, item: { ...s.item, isAvailable: val } } : s);
      } else {
        await axios.put(`${BASE_URL}/accommodation/${id}`, { isAvailable: val });
        setAccommodations(p => p.map(a => a._id === id ? { ...a, isAvailable: val } : a));
        setSelectedItem(s => s && s.item._id === id ? { ...s, item: { ...s.item, isAvailable: val } } : s);
      }
    } catch { alert("Failed to update status."); }
  };

  // Navigate to /Payment — host paying to publish/extend their listing
  const handleAddPayment = (id, type, item) => {
    setSelectedItem(null);
    navigate("/Payment", {
      state: {
        type:             type,
        listingId:        id,
        listingName:      type === "food" ? (item?.kitchenName ?? "Food Service") : (item?.title ?? "Accommodation"),
        currentExpireDate: item?.expireDate ?? null,
        bankName:         "Commercial Bank",
        accountName:      "Bodima Payments",
        accountNumber:    "8000123456",
        branch:           "Negombo",
      },
    });
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

      <nav className="hl-nav">
        <div className="hl-nav__logo-wrap">
          <a href="/Boardings" className="hl-nav__logo"><FaAirbnb /> Bodima</a>
        </div>
        <div className="hl-nav__center">
          {[
            { key: "today",    label: "Today",    href: "#" },
            { key: "Calendar", label: "Calendar", href: "#" },
            { key: "listings", label: "Listings", href: "/Listings" },
            { key: "Messages", label: "Messages", href: "/Messages" },
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
              <img
                src={profileImageUrl} alt="profile" className="hl-user-avatar"
                onError={e => {
                  if (e.currentTarget.src !== window.location.origin + DEFAULT_AVATAR)
                    e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
            </button>
            {showDropdown && (
              <div className="hl-dropdown__menu">
                <div className="hl-dropdown__item" onClick={() => navigate("/Host-Profile")}>
                  <FaUser style={{ opacity: 0.6 }} /> Profile
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

      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-left">
            <h1 className="page-title">Your listings</h1>
            {!loading && (
              <span className="listings-count">
                {foodServices.length + accommodations.length} listing{foodServices.length + accommodations.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button className="btn-create" onClick={() => navigate("/host")}>+ Create listing</button>
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
            onAdd={() => navigate(activeTab === "food" ? "/AddFoodService" : "/add-accommodation")}
          />
        ) : (
          <div className="grid">
            {currentList.map(item => (
              <ListingCard key={item._id} item={item} type={activeTab}
                onClick={(item, type) => setSelectedItem({ item, type })} />
            ))}
          </div>
        )}
      </div>

      <footer className="hl-footer">
        <div className="hl-footer__grid">
          {[
            { title: "Support",   links: ["Help Center","Safety info","Cancellation options","Community guidelines"] },
            { title: "Community", links: ["Bodima Adventures","New features","Tips for hosts","Careers"] },
            { title: "Hosting",   links: ["Host a home","Host an experience","Responsible hosting","Community forum"] },
            { title: "About",     links: ["About Bodima","Newsroom","Investors","Bodima Plus"] },
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

      {selectedItem && (
        <ListingPopup
          item={selectedItem.item}
          type={selectedItem.type}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onToggle={handleToggle}
          onAddPayment={handleAddPayment}
          menuItemCache={menuItemCache}
          onMenuItemCacheUpdate={handleMenuItemCacheUpdate}
        />
      )}

      {deleteTarget && (
        <DeleteModal onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
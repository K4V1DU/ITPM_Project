import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaTimes,
  FaMapMarkerAlt, FaClock, FaMotorcycle,
  FaShoppingBag, FaStar, FaCreditCard,
  FaEdit, FaTrash,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import { usePhotoCache, CachedImg, prefetchPhotos } from "../Image_Cache/usePhotoCache";
import "./HostListings.css";

const BASE_URL = "http://localhost:8000";

// ─── ListingCard ──────────────────────────────────────────────────────────────
function ListingCard({ item, type, onClick }) {
  const { cachedUrl, photoStatus } = usePhotoCache();

  const coverPhotoId = type === "food" ? item.iconImage : item.images?.[0];
  const coverUrl     = cachedUrl(coverPhotoId);
  const status       = photoStatus(coverPhotoId);
  const imgLoading   = status === "loading";

  const isAvailable = item.isAvailable;
  const isOpen      = isAvailable;
  const title       = type === "food" ? item.kitchenName : item.title;
  const typeLabel   = type === "food" ? item.serviceType : (item.accommodationType || "Accommodation");
  const rating      = item.ratingAverage ?? 0;
  const reviewCount = item.ratingCount   ?? item.reviews?.length ?? 0;

  if (imgLoading) {
    return (
      <div className="lc lc--skeleton">
        <div className="lc__img-skeleton" />
        <div className="lc__body">
          <div className="lc__skel-line lc__skel-line--title" />
          <div className="lc__skel-line lc__skel-line--sub" />
          <div className="lc__skel-line lc__skel-line--meta" />
        </div>
      </div>
    );
  }

  return (
    <div className="lc" onClick={() => onClick(item, type)}>
      <div className="lc__img-wrap">
        {coverUrl
          ? <img src={coverUrl} alt={title} className="lc__img" />
          : <div className="lc__img-placeholder" />
        }
        <div className={`lc__status ${isOpen ? "lc__status--open" : "lc__status--closed"}`}>
          <span className="lc__status-dot" />
          {isOpen ? "Listed" : "Unlisted"}
        </div>
        <div className="lc__img-chips">
          {type === "food" && item.deliveryAvailable && (
            <span className="lc__img-chip lc__img-chip--delivery"><FaMotorcycle /> Delivery</span>
          )}
          {type === "food" && item.pickupAvailable && (
            <span className="lc__img-chip lc__img-chip--pickup"><FaShoppingBag /> Pickup</span>
          )}
          {type === "accommodation" && item.pricePerMonth && (
            <span className="lc__img-chip lc__img-chip--delivery">
              LKR {Number(item.pricePerMonth).toLocaleString()}/mo
            </span>
          )}
        </div>
      </div>

      <div className="lc__body">
        <div className="lc__title-row">
          <h3 className="lc__title">{title || "Untitled listing"}</h3>
          {rating > 0 && (
            <span className="lc__rating">
              <FaStar className="lc__star" /> {rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="lc__subtitle">
          {typeLabel}
          {item.address && <> · <span className="lc__addr">{item.address}</span></>}
        </p>
        <div className="lc__meta-row">
          <span className="lc__reviews">
            {reviewCount > 0
              ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}`
              : "No reviews yet"}
          </span>
          {type === "food" && item.operatingHours && (
            <span className="lc__hours">
              <FaClock className="lc__clock-icon" />
              {item.operatingHours.open} – {item.operatingHours.close}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MenuItemRow ──────────────────────────────────────────────────────────────
function MenuItemRow({ menuItemId, cachedData, onUpdate }) {
  const [menuItem, setMenuItem] = useState(cachedData || null);
  const [toggling, setToggling] = useState(false);
  const { cachedUrl } = usePhotoCache();

  useEffect(() => {
    if (cachedData) { setMenuItem(cachedData); return; }
    axios.get(`${BASE_URL}/menuitem/${menuItemId}`)
      .then(r => {
        const data = r.data?.data || r.data;
        setMenuItem(data);
        onUpdate?.(menuItemId, data);
        const imgId = data?.image || data?.imageId || data?.photo;
        if (imgId) prefetchPhotos([imgId]);
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

  const imgId  = menuItem.image || menuItem.imageId || menuItem.photo;
  const imgUrl = cachedUrl(imgId);

  return (
    <div className="menu-item-row">
      <div className="mi-img-wrap">
        {imgUrl
          ? <img src={imgUrl} alt={menuItem.name} className="mi-img" />
          : <div className="mi-img-fallback" />
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

// ─── ListingPopup ─────────────────────────────────────────────────────────────
function ListingPopup({ item, type, onClose, onEdit, onDelete, onToggle, onAddPayment, menuItemCache, onMenuItemCacheUpdate }) {
  const [toggling, setToggling] = useState(false);
  const { cachedUrl } = usePhotoCache();

  const coverPhotoId = type === "food" ? item.BackgroundImage : item.images?.[0];
  const coverUrl     = cachedUrl(coverPhotoId);
  const iconUrl      = type === "food" ? cachedUrl(item.iconImage) : null;

  const isAvailable = item.isAvailable;
  const title       = type === "food" ? item.kitchenName : item.title;
  const subtitle    = type === "food" ? item.serviceType : (item.accommodationType || "Accommodation");

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(item._id, !isAvailable, type);
    setToggling(false);
  };

  const fmtDate   = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const isExpired = item.expireDate && new Date(item.expireDate) < new Date();

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>
        <div className="popup-cover">
          {coverUrl
            ? <img src={coverUrl} alt={title} className="popup-cover-img" />
            : <div className="popup-cover-placeholder">{type === "food" ? "Food Service" : "Accommodation"}</div>
          }
          <button className="popup-close" onClick={onClose}><FaTimes /></button>
          <div className={`popup-status-badge ${isAvailable ? "on" : "off"}`}>
            <span className="pill-dot" />{isAvailable ? "Listed" : "Unlisted"}
          </div>
          {iconUrl && (
            <div className="popup-icon-wrap">
              <img src={iconUrl} alt="icon" className="popup-icon"
                onError={e => { e.currentTarget.style.display = "none"; }} />
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
            <button className="popup-btn popup-btn--payment" onClick={() => onAddPayment(item._id, type, item)}>
              <FaCreditCard /> Add Payment
            </button>
            <button className="popup-btn popup-btn--edit" onClick={() => onEdit(item._id, type)}>
              <FaEdit /> Edit Listing
            </button>
            <button className="popup-btn popup-btn--delete" onClick={() => onDelete(item._id, type)}>
              <FaTrash /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ type, onAdd }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <img
          src={type === "food" ? "/images/icon3.jpg" : "/images/icon2.jpg"}
          alt={type === "food" ? "Food Service" : "Accommodation"}
          className="empty-illustration__img"
        />
      </div>
      <h3>No {type === "food" ? "food services" : "accommodations"} yet</h3>
      <p>
        {type === "food"
          ? "List your kitchen, restaurant, or café to start receiving orders."
          : "List your property to start hosting guests."}
      </p>
      <button className="btn-add-empty" onClick={onAdd}>Create a listing</button>
    </div>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────
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

// ─── CreateListingModal ───────────────────────────────────────────────────────
function CreateListingModal({ onClose, onSelect }) {
  const [selected, setSelected] = useState(null);

  const options = [
    {
      key: "accommodation",
      label: "Accommodation",
      icon: (
        <img src="/images/icon2.jpg" alt="Accommodation" className="cl-option__img"
          onError={e => { e.currentTarget.style.display="none"; }} />
      ),
    },
    {
      key: "food",
      label: "Food Service",
      icon: (
        <img src="/images/icon3.jpg" alt="Food Service" className="cl-option__img"
          onError={e => { e.currentTarget.style.display="none"; }} />
      ),
    },
  ];

  return (
    <div className="cl-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={e => e.stopPropagation()}>
        <h2 className="cl-title">What would you like to host?</h2>
        <div className="cl-options">
          {options.map(opt => (
            <div
              key={opt.key}
              className={`cl-option${selected === opt.key ? " cl-option--selected" : ""}`}
              onClick={() => setSelected(opt.key)}
            >
              <div className="cl-option__icon">{opt.icon}</div>
              <span className="cl-option__label">{opt.label}</span>
            </div>
          ))}
        </div>
        <button
          className={`cl-next${selected ? " cl-next--active" : ""}`}
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ─── HostListings (main) ──────────────────────────────────────────────────────
export default function HostListings() {
  const navigate = useNavigate();

  const [activeTab,      setActiveTab]      = useState("food");
  const [foodServices,   setFoodServices]   = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [showCreate,     setShowCreate]     = useState(false);
  const [selectedItem,   setSelectedItem]   = useState(null);

  const menuItemCacheRef = useRef({});
  const [menuItemCache,  setMenuItemCache]  = useState({});

  const handleMenuItemCacheUpdate = (id, data) => {
    menuItemCacheRef.current[id] = data;
    setMenuItemCache(prev => ({ ...prev, [id]: data }));
  };

  useEffect(() => {
    const currentUserId = localStorage.getItem("CurrentUserId") ?? "";
    if (!currentUserId) { setLoading(false); return; }

    const CACHE_KEY_FS = `hl_fs_${currentUserId}`;
    const CACHE_KEY_AC = `hl_ac_${currentUserId}`;

    // ── 1. Serve cached data instantly so the page feels immediate ────────
    const cachedFs = sessionStorage.getItem(CACHE_KEY_FS);
    const cachedAc = sessionStorage.getItem(CACHE_KEY_AC);
    if (cachedFs || cachedAc) {
      if (cachedFs) setFoodServices(JSON.parse(cachedFs));
      if (cachedAc) setAccommodations(JSON.parse(cachedAc));
      setLoading(false); // show cached content right away
    }

    // ── Helper: fetch one collection, filter by owner, update state ───────
    const fetchCollection = async (url, setter, cacheKey, getPhotoIds) => {
      try {
        // Try owner-filtered endpoint first (much smaller payload if backend supports it)
        let mine = [];
        try {
          const res = await axios.get(`${url}?owner=${currentUserId}`);
          const data = res.data?.data || res.data || [];
          // If backend ignored the filter it returns everything — detect and re-filter
          mine = Array.isArray(data)
            ? data.filter(i => !i.owner || String(i.owner) === String(currentUserId) || String(i.owner?._id) === String(currentUserId))
            : [];
        } catch {
          // Fallback: fetch all and filter client-side
          const res = await axios.get(url);
          const all = res.data?.data || res.data || [];
          mine = Array.isArray(all)
            ? all.filter(i => String(i.owner) === String(currentUserId) || String(i.owner?._id) === String(currentUserId))
            : [];
        }

        setter(mine);
        sessionStorage.setItem(cacheKey, JSON.stringify(mine));

        // Pre-warm photo cache
        const photoIds = mine.flatMap(getPhotoIds).filter(Boolean);
        if (photoIds.length) prefetchPhotos(photoIds);
      } catch (err) {
        // Only set error if we have no cached fallback to show
        if (!sessionStorage.getItem(cacheKey)) {
          setError(err.message ?? "Connection error");
        }
      }
    };

    // ── 2. Fetch both independently so each updates the UI as it arrives ──
    const run = async () => {
      if (!cachedFs && !cachedAc) {
        setLoading(true);
        setError(null);
      }

      await Promise.all([
        fetchCollection(
          `${BASE_URL}/Foodservice`,
          setFoodServices,
          CACHE_KEY_FS,
          f => [f.iconImage, f.BackgroundImage],
        ),
        fetchCollection(
          `${BASE_URL}/accommodation`,
          setAccommodations,
          CACHE_KEY_AC,
          a => [a.images?.[0]],
        ),
      ]);

      setLoading(false);
    };

    run();
  }, []); // runs once on mount — userId is read fresh inside

  const handleEdit = (id, type) => {
    setSelectedItem(null);
    navigate(type === "food" ? `/EditFoodService/${id}` : `/edit-Accommodation/${id}`);
  };

  const handleToggle = async (id, val, type) => {
    const currentUserId = localStorage.getItem("CurrentUserId") ?? "";
    try {
      if (type === "food") {
        await axios.put(`${BASE_URL}/Foodservice/${id}`, { isAvailable: val });
        setFoodServices(p => {
          const updated = p.map(f => f._id === id ? { ...f, isAvailable: val } : f);
          sessionStorage.setItem(`hl_fs_${currentUserId}`, JSON.stringify(updated));
          return updated;
        });
        setSelectedItem(s => s && s.item._id === id ? { ...s, item: { ...s.item, isAvailable: val } } : s);
      } else {
        await axios.put(`${BASE_URL}/accommodation/${id}`, { isAvailable: val });
        setAccommodations(p => {
          const updated = p.map(a => a._id === id ? { ...a, isAvailable: val } : a);
          sessionStorage.setItem(`hl_ac_${currentUserId}`, JSON.stringify(updated));
          return updated;
        });
        setSelectedItem(s => s && s.item._id === id ? { ...s, item: { ...s.item, isAvailable: val } } : s);
      }
    } catch { alert("Failed to update status."); }
  };

  const handleAddPayment = (id, type, item) => {
    setSelectedItem(null);
    navigate("/Payment", {
      state: {
        type,
        listingId:         id,
        listingName:       type === "food" ? (item?.kitchenName ?? "Food Service") : (item?.title ?? "Accommodation"),
        currentExpireDate: item?.expireDate ?? null,
        bankName:          "Commercial Bank",
        accountName:       "Bodima Payments",
        accountNumber:     "8000123456",
        branch:            "Negombo",
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
    const currentUserId = localStorage.getItem("CurrentUserId") ?? "";
    try {
      if (type === "food") {
        await axios.delete(`${BASE_URL}/Foodservice/${id}`);
        setFoodServices(p => {
          const updated = p.filter(f => f._id !== id);
          sessionStorage.setItem(`hl_fs_${currentUserId}`, JSON.stringify(updated));
          return updated;
        });
      } else {
        await axios.delete(`${BASE_URL}/accommodation/${id}`);
        setAccommodations(p => {
          const updated = p.filter(a => a._id !== id);
          sessionStorage.setItem(`hl_ac_${currentUserId}`, JSON.stringify(updated));
          return updated;
        });
      }
    } catch { alert("Failed to delete."); }
    finally  { setDeleteTarget(null); }
  };

  const currentList = activeTab === "food" ? foodServices : accommodations;

  return (
    <div className="page">

      <HostNavbar activeHref="/Listings" />

      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-left">
            <h1 className="page-title">Your listings</h1>
            {!loading && !error && (
              <span className="listings-count">
                {foodServices.length + accommodations.length} listing{foodServices.length + accommodations.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button className="btn-create" onClick={() => setShowCreate(true)}>Create listing</button>
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
        ) : error ? (
          /* ── Connection error state ── */
          <div className="hl-error">
            <img src="/images/icon7.jpg" alt="Connection error" className="hl-error__img" />
            <div className="hl-error__title">Connection Error</div>
            <div className="hl-error__msg">Something went wrong. Please check your connection and try again.</div>
            <button className="hl-error__btn" onClick={() => window.location.reload()}>Retry</button>
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

      <Footer />

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

      {showCreate && (
        <CreateListingModal
          onClose={() => setShowCreate(false)}
          onSelect={(type) => {
            setShowCreate(false);
            navigate(type === "food" ? "/AddFoodService" : "/add-accommodation");
          }}
        />
      )}
    </div>
  );
}
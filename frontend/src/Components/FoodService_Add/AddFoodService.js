import React, { useState, useCallback, useRef } from "react";
import "./AddFoodService.css";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import {
  Trash2, RefreshCw, X, ChevronRight, ChevronLeft,
  Home, UtensilsCrossed, Coffee, Croissant, Truck, ShoppingBag,
  MapPin, Crosshair, Upload, Leaf, Flame, Wheat, Sprout,
  CheckCircle, Loader2, Image as ImageIcon, Plus, Clock,
} from "lucide-react";
import axios from "axios";

const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES = ["places"];
const mapContainerStyle = { width: "100%", height: "420px", borderRadius: "10px" };
const defaultOptions = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
  mapTypeId: "roadmap",
};

const DIETARY_TAGS = [
  { key: "Vegetarian", icon: Leaf,   color: "#e67e22", bg: "#fff4ec", border: "#e67e22" },
  { key: "Vegan",      icon: Sprout, color: "#e67e22", bg: "#fff4ec", border: "#e67e22" },
  { key: "Spicy",      icon: Flame,  color: "#1c1c1e", bg: "#f3f4f6", border: "#1c1c1e" },
  { key: "Gluten-Free",icon: Wheat,  color: "#1c1c1e", bg: "#f3f4f6", border: "#1c1c1e" },
];

const MENU_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];

const SERVICE_TYPES = [
  { key: "Home Kitchen", icon: Home,            desc: "Cook from home" },
  { key: "Restaurant",   icon: UtensilsCrossed, desc: "Dine-in & takeout" },
  { key: "Cafe",         icon: Coffee,          desc: "Coffee & light bites" },
  { key: "Bakery",       icon: Croissant,       desc: "Baked goods" },
];

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hour   = h % 12 === 0 ? 12 : h % 12;
      const minute = m === 0 ? "00" : "30";
      const period = h < 12 ? "AM" : "PM";
      opts.push(`${hour.toString().padStart(2, "0")}:${minute} ${period}`);
    }
  }
  return opts;
})();

const timeIdx = (t) => TIME_OPTIONS.indexOf(t);

const clampTime = (t, opOpen, opClose) => {
  const i = timeIdx(t), lo = timeIdx(opOpen), hi = timeIdx(opClose);
  if (i < lo) return opOpen;
  if (i > hi) return opClose;
  return t;
};

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
};

const emptyMenuItem = () => ({
  name: "", description: "", price: "", category: "Lunch",
  dietaryTags: [],
  AvailableHours: { open: "08:00 AM", close: "08:00 PM" },
  isAvailable: true, prepTime: 15,
  imagePreview: null, imageFile: null, imageId: null, imageUploading: false,
});

// ─── Component ────────────────────────────────────────────────────────────────
function AddFoodService() {
  const navigate       = useNavigate();
  const updatePhotoRef = useRef(null);
  const menuImageRefs  = useRef([]);

  const [currentStep,  setCurrentStep]  = useState(1);
  const [showForm,     setShowForm]     = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  const [kitchenName,       setKitchenName]       = useState("");
  const [description,       setDescription]       = useState("");
  const [serviceType,       setServiceType]       = useState("Home Kitchen");
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable,   setPickupAvailable]   = useState(true);
  const [operatingHours,    setOperatingHours]    = useState({ open: "08:00 AM", close: "10:00 PM" });

  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [map,                 setMap]                 = useState(null);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  const [iconPreview,   setIconPreview]   = useState(null);
  const [iconFile,      setIconFile]      = useState(null);
  const [iconImageId,   setIconImageId]   = useState(null);
  const [bgPreview,     setBgPreview]     = useState(null);
  const [bgFile,        setBgFile]        = useState(null);
  const [bgImageId,     setBgImageId]     = useState(null);
  const [updatingField, setUpdatingField] = useState(null);

  const [menuItems,  setMenuItems]  = useState([emptyMenuItem()]);
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleExit       = () => navigate("/Listings");
  const handleGetStarted = () => setShowForm(true);

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!kitchenName.trim())      return alert("Kitchen name cannot be empty.");
      if (kitchenName.length > 60)  return alert("Kitchen name cannot exceed 60 characters.");
      if (!description.trim())      return alert("Description cannot be empty.");
      if (description.length > 300) return alert("Description cannot exceed 300 characters.");
      if (!deliveryAvailable && !pickupAvailable) return alert("Enable at least Delivery or Pickup.");
    }
    if (currentStep === 2) {
      if (!hasSelectedLocation) return alert("Please pin your kitchen location on the map.");
      if (!address.trim())      return alert("Please enter your address.");
    }
    if (currentStep === 3) {
      if (!iconFile && !iconImageId) return alert("Please upload a kitchen icon image.");
      if (!bgFile && !bgImageId)     return alert("Please upload a kitchen background image.");
    }
    if (currentStep === 4) {
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        if (!it.name.trim()) return alert(`Item ${i + 1}: Name required.`);
        const p = Number(it.price);
        if (!it.price || p < 100 || p > 10000) return alert(`Item ${i + 1}: Price must be LKR 100–10,000.`);
        if (Number(it.prepTime) < 1 || Number(it.prepTime) > 120) return alert(`Item ${i + 1}: Prep time 1–120 min.`);
      }
    }
    setCurrentStep(s => s + 1);
  };

  const handlePreviousStep = () => setCurrentStep(s => s - 1);

  // ── Menu helpers ──────────────────────────────────────────────────────────
  const addMenuItem    = () => { setMenuItems(p => [...p, emptyMenuItem()]); menuImageRefs.current.push(null); };
  const removeMenuItem = (i) => {
    if (menuItems.length === 1) return alert("At least one menu item required.");
    setMenuItems(p => p.filter((_, idx) => idx !== i));
    menuImageRefs.current.splice(i, 1);
  };
  const updateMenuItem      = (i, f, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],[f]:v}; return u; });
  const updateMenuItemHours = (i, t, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],AvailableHours:{...u[i].AvailableHours,[t]:v}}; return u; });
  const toggleDietaryTag    = (i, tag)  => setMenuItems(p => { const u=[...p], cur=u[i].dietaryTags; u[i]={...u[i],dietaryTags:cur.includes(tag)?cur.filter(t=>t!==tag):[...cur,tag]}; return u; });
  const setItemField        = (i, flds) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],...flds}; return u; });

  // ── Menu item images (deferred) ───────────────────────────────────────────
  const handleMenuItemImageSelect = (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    setItemField(i, { imagePreview: URL.createObjectURL(file), imageFile: file, imageId: null });
    e.target.value = null;
  };
  const handleMenuItemImageDelete = (i) => setItemField(i, { imagePreview: null, imageFile: null, imageId: null });
  const triggerMenuItemUpdate = (i) => {
    const inp = document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange = e => handleMenuItemImageSelect(i, e); inp.click();
  };

  // ── Kitchen photos (deferred) ─────────────────────────────────────────────
  const handleIconSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIconPreview(URL.createObjectURL(file)); setIconFile(file); setIconImageId(null); e.target.value=null;
  };
  const handleBgSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBgPreview(URL.createObjectURL(file)); setBgFile(file); setBgImageId(null); e.target.value=null;
  };
  const handleUpdateKitchenPhoto = (e) => {
    const file = e.target.files[0]; if (!file || !updatingField) return;
    const preview = URL.createObjectURL(file);
    if (updatingField==="icon") { setIconPreview(preview); setIconFile(file); setIconImageId(null); }
    else                        { setBgPreview(preview);   setBgFile(file);   setBgImageId(null); }
    setUpdatingField(null); e.target.value=null;
  };
  const handleDeleteKitchenPhoto = (field) => {
    if (field==="icon") { setIconPreview(null); setIconFile(null); setIconImageId(null); }
    else                { setBgPreview(null);   setBgFile(null);   setBgImageId(null); }
  };
  const triggerKitchenUpdate = (field) => { setUpdatingField(field); updatePhotoRef.current.click(); };

  // ── Map ───────────────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);
  const onMapClick = event => {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status==="OK" && results[0]) setAddress(results[0].formatted_address);
    });
  };
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status==="OK" && results[0]) setAddress(results[0].formatted_address);
      });
      if (map) { map.panTo(loc); map.setZoom(17); }
    });
  };
  const handleSLIITLocation = () => {
    setSelectedLocation(SLIIT_LOCATION); setHasSelectedLocation(true);
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveListing = async () => {
    if (!hasSelectedLocation)                        return alert("Please pin your kitchen location.");
    if (!iconPreview || (!iconFile && !iconImageId)) return alert("Please upload a kitchen icon image.");
    if (!bgPreview   || (!bgFile   && !bgImageId))   return alert("Please upload a kitchen background image.");
    if (!isVerified || !isAgreed)                    return alert("Please confirm accuracy and agree to terms.");

    setIsSaving(true);
    try {
      let finalIconId = iconImageId;
      if (iconFile) {
        setSaveProgress("Uploading kitchen icon...");
        const fd = new FormData(); fd.append("photo", iconFile);
        finalIconId = (await axios.post(`${BASE_URL}/Photo`, fd)).data.data._id;
      }
      let finalBgId = bgImageId;
      if (bgFile) {
        setSaveProgress("Uploading cover image...");
        const fd = new FormData(); fd.append("photo", bgFile);
        finalBgId = (await axios.post(`${BASE_URL}/Photo`, fd)).data.data._id;
      }
      setSaveProgress("Creating food service...");
      const fsRes = await axios.post(`${BASE_URL}/Foodservice`, {
        owner: localStorage.getItem("CurrentUserId"),
        kitchenName, description, address,
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        operatingHours, serviceType, deliveryAvailable, pickupAvailable,
        iconImage: finalIconId, BackgroundImage: finalBgId,
        isAvailable: true, expireDate: getYesterday(),
      });
      const foodServiceId = fsRes.data.data._id;
      const menuItemIds = [];
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        setSaveProgress(`Saving menu item ${i+1} of ${menuItems.length}...`);
        let imageId = it.imageId;
        if (it.imageFile) {
          const fd = new FormData(); fd.append("photo", it.imageFile);
          const r = await axios.post(`${BASE_URL}/Photo`, fd);
          if (r.data.success) imageId = r.data.data._id;
        }
        const miRes = await axios.post(`${BASE_URL}/menuitem`, {
          foodServiceId, name: it.name, description: it.description,
          price: Number(it.price), category: it.category,
          dietaryTags: it.dietaryTags, AvailableHours: it.AvailableHours,
          isAvailable: it.isAvailable, prepTime: Number(it.prepTime),
          ...(imageId && { image: imageId }),
        });
        menuItemIds.push(miRes.data.data._id);
      }
      setSaveProgress("Finalising...");
      await axios.put(`${BASE_URL}/Foodservice/${foodServiceId}`, { menu: menuItemIds });
      alert(`Food service listed with ${menuItemIds.length} menu item(s)!`);
      navigate("/Listings");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || "Something went wrong."));
    } finally { setIsSaving(false); setSaveProgress(""); }
  };

  const STEPS = [
    { num: 1, label: "Details" }, { num: 2, label: "Location" },
    { num: 3, label: "Photos"  }, { num: 4, label: "Menu"     },
    { num: 5, label: "Review"  },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="afs-root">

      {/* Top Bar */}
      <div className={`afs-topbar ${!showForm ? "dark" : ""}`}>
        <div className="hn-nav__logo-wrap">
          <a href="/Listings" className="hn-nav__logo">
            <img
              src={showForm ? "/images/logo2.png" : "/images/logo6.png"}
              alt="Unisewana Logo"
              style={{ height: "32px", width: "auto", display: "block" }}
            />
          </a>
        </div>
        <button className="afs-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>

      {/* ── LANDING ── */}
      {!showForm && (
        <div className="afs-hero" style={{ height: "calc(100vh - 58px)" }}>
          <div className="afs-hero-bg" style={{ backgroundImage: "url('/images/foodbg1.png')" }} />
          <div className="afs-hero-overlay" />
          <div className="afs-hero-content">
            <h1 className="afs-hero-title">Share your food.<br /><em>Grow your business.</em></h1>
            <p className="afs-hero-sub">List your kitchen, set your menu, and start receiving orders from your community. Takes only a few minutes.</p>
            <button className="afs-hero-cta" onClick={handleGetStarted}>
              Get started <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <>
          {/* Progress bar */}
          <div className="afs-progress-wrapper">
            <div className="afs-progress-steps">
              {STEPS.map((step, idx) => {
                const done   = currentStep > step.num;
                const active = currentStep === step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div className={`afs-progress-step ${active?"active":""} ${done?"done":""}`}>
                      <div className="afs-progress-bubble">
                        {done ? <CheckCircle size={16} /> : step.num}
                      </div>
                      <span className="afs-progress-label">{step.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="afs-progress-line">
                        <div className="afs-progress-line-fill" style={{ width: done ? "100%" : "0%" }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="afs-layout">

            {/* ── STEP 1 ── */}
            {currentStep === 1 && (
              <div className="afs-card">
                <div className="afs-card-title">Tell us about your kitchen</div>
                <div className="afs-card-subtitle">Basic information customers will see on your listing</div>

                <div className="afs-field">
                  <label className="afs-label">Kitchen name <span>*</span></label>
                  <input className="afs-input" type="text" value={kitchenName}
                    onChange={e => setKitchenName(e.target.value)}
                    placeholder="e.g. Mama's Home Kitchen" maxLength={60} />
                  <div className="afs-field-footer">
                    <span className={`afs-char-count ${kitchenName.length > 50 ? "warn" : ""}`}>{kitchenName.length}/60</span>
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Description <span>*</span></label>
                  <textarea className="afs-textarea" value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what makes your kitchen special..." maxLength={300} />
                  <div className="afs-field-footer">
                    <span className={`afs-char-count ${description.length > 250 ? "warn" : ""}`}>{description.length}/300</span>
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Service type <span>*</span></label>
                  <div className="afs-type-grid">
                    {SERVICE_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.key} type="button"
                          className={`afs-type-card ${serviceType === t.key ? "selected" : ""}`}
                          onClick={() => setServiceType(t.key)}>
                          <div className="afs-type-icon"><Icon size={18} /></div>
                          <span className="afs-type-name">{t.key}</span>
                          <span className="afs-type-desc">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Operating hours <span>*</span></label>
                  <div className="afs-time-row">
                    <div className="afs-time-group">
                      <span className="afs-time-label">Opens</span>
                      <select className="afs-select" value={operatingHours.open}
                        onChange={e => {
                          const newOpen = e.target.value;
                          const openIdx = TIME_OPTIONS.indexOf(newOpen);
                          const closeIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                          const newClose = closeIdx > openIdx ? operatingHours.close : TIME_OPTIONS[openIdx + 1] || TIME_OPTIONS[openIdx];
                          setOperatingHours({ open: newOpen, close: newClose });
                          setMenuItems(prev => prev.map(item => {
                            const iOpen  = clampTime(item.AvailableHours.open,  newOpen, newClose);
                            const iClose = clampTime(item.AvailableHours.close, newOpen, newClose);
                            return { ...item, AvailableHours: { open: iOpen, close: timeIdx(iClose) > timeIdx(iOpen) ? iClose : newClose } };
                          }));
                        }}>
                        {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="afs-time-divider"><ChevronRight size={16} /></div>
                    <div className="afs-time-group">
                      <span className="afs-time-label">Closes</span>
                      <select className="afs-select" value={operatingHours.close}
                        onChange={e => {
                          const newClose = e.target.value;
                          setOperatingHours(p => ({ ...p, close: newClose }));
                          setMenuItems(prev => prev.map(item => {
                            const iOpen  = clampTime(item.AvailableHours.open,  operatingHours.open, newClose);
                            const iClose = clampTime(item.AvailableHours.close, operatingHours.open, newClose);
                            return { ...item, AvailableHours: { open: iOpen, close: timeIdx(iClose) > timeIdx(iOpen) ? iClose : newClose } };
                          }));
                        }}>
                        {TIME_OPTIONS.filter(t => TIME_OPTIONS.indexOf(t) > TIME_OPTIONS.indexOf(operatingHours.open))
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Service options <span>*</span></label>
                  <div className="afs-option-row">
                    <button type="button" className={`afs-option-card ${deliveryAvailable ? "active" : ""}`}
                      onClick={() => setDeliveryAvailable(p => !p)}>
                      <div className="afs-option-icon-box"><Truck size={18} /></div>
                      <span className="afs-option-name">Delivery</span>
                      <span className={`afs-badge ${deliveryAvailable ? "on" : "off"}`}>{deliveryAvailable ? "On" : "Off"}</span>
                    </button>
                    <button type="button" className={`afs-option-card ${pickupAvailable ? "active" : ""}`}
                      onClick={() => setPickupAvailable(p => !p)}>
                      <div className="afs-option-icon-box"><ShoppingBag size={18} /></div>
                      <span className="afs-option-name">Pickup</span>
                      <span className={`afs-badge ${pickupAvailable ? "on" : "off"}`}>{pickupAvailable ? "On" : "Off"}</span>
                    </button>
                  </div>
                </div>

                <div className="afs-nav">
                  <div />
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {currentStep === 2 && (
              <div className="afs-card">
                <div className="afs-card-title">Set your kitchen location</div>
                <div className="afs-card-subtitle">Click the map to pin your exact position</div>

                {mapLoadError ? (
                  <div className="afs-map-error">
                    <MapPin size={22} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Map failed to load</div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>Check your internet connection and reload the page.</div>
                    </div>
                  </div>
                ) : !mapIsLoaded ? (
                  <div className="afs-map-loading">
                    <Loader2 size={22} className="afs-spin" />
                    <span>Loading map...</span>
                  </div>
                ) : (
                  <div className="afs-map-wrapper">
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                      zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                      <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                    </GoogleMap>
                  </div>
                )}

                <div className="afs-map-actions">
                  <button className="afs-map-btn" onClick={handleSLIITLocation}><MapPin size={14} /> SLIIT University</button>
                  <button className="afs-map-btn" onClick={handleUseCurrentLocation}><Crosshair size={14} /> Use my location</button>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Address <span>*</span></label>
                  <textarea className="afs-textarea" rows="2" value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Full address will appear after clicking the map, or type manually..." />
                </div>

                <div className="afs-nav">
                  <button className="afs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {currentStep === 3 && (
              <div className="afs-card">
                <div className="afs-card-title">Kitchen photos</div>
                <div className="afs-card-subtitle">Photos are uploaded when you save your listing</div>

                <input type="file" accept="image/*" ref={updatePhotoRef} style={{ display:"none" }} onChange={handleUpdateKitchenPhoto} />

                <div className="afs-field">
                  <label className="afs-label">Icon image <span>*</span></label>
                  <span className="afs-hint">Displayed as a circle — your kitchen's profile picture</span>
                  {!iconPreview ? (
                    <div className="afs-upload-zone" onClick={() => document.getElementById("icon-upload").click()}>
                      <input type="file" accept="image/*" id="icon-upload" style={{ display:"none" }} onChange={handleIconSelect} />
                      <div className="afs-upload-icon"><Upload size={18} /></div>
                      <div className="afs-upload-text">Click to upload icon</div>
                      <div className="afs-upload-hint">PNG, JPG up to 5MB</div>
                    </div>
                  ) : (
                    <div className="afs-photo-preview">
                      <img src={iconPreview} alt="icon" className="afs-preview-icon" />
                      <div className="afs-photo-actions">
                        <button type="button" className="afs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("icon")}><Trash2 size={13} /></button>
                        <button type="button" className="afs-icon-btn upd" onClick={() => triggerKitchenUpdate("icon")}><RefreshCw size={13} /></button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="afs-divider" />

                <div className="afs-field">
                  <label className="afs-label">Cover / Background image <span>*</span></label>
                  <span className="afs-hint">Wide banner showcasing your kitchen or signature dish</span>
                  {!bgPreview ? (
                    <div className="afs-upload-zone" onClick={() => document.getElementById("bg-upload").click()}>
                      <input type="file" accept="image/*" id="bg-upload" style={{ display:"none" }} onChange={handleBgSelect} />
                      <div className="afs-upload-icon"><ImageIcon size={18} /></div>
                      <div className="afs-upload-text">Click to upload cover image</div>
                      <div className="afs-upload-hint">PNG, JPG — recommended 1200×400</div>
                    </div>
                  ) : (
                    <div className="afs-photo-preview">
                      <img src={bgPreview} alt="bg" className="afs-preview-bg" />
                      <div className="afs-photo-actions">
                        <button type="button" className="afs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("bg")}><Trash2 size={13} /></button>
                        <button type="button" className="afs-icon-btn upd" onClick={() => triggerKitchenUpdate("bg")}><RefreshCw size={13} /></button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="afs-nav">
                  <button className="afs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 4 ── */}
            {currentStep === 4 && (
              <div>
                <div className="afs-card" style={{ marginBottom: 16 }}>
                  <div className="afs-card-title">Build your menu</div>
                  <div className="afs-card-subtitle">Add the dishes and items you'll be offering</div>
                </div>

                {menuItems.map((item, index) => (
                  <div key={index} className="afs-menu-card">
                    <div className="afs-menu-header">
                      <div className="afs-menu-header-left">
                        <div className="afs-menu-num">{String(index + 1).padStart(2, "0")}</div>
                        <span className="afs-menu-title">{item.name || "Untitled item"}</span>
                      </div>
                      <button type="button" className="afs-remove-btn" onClick={() => removeMenuItem(index)}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Item photo</label>
                      {!item.imagePreview ? (
                        <div className="afs-upload-zone" style={{ padding:"18px 20px" }}
                          onClick={() => menuImageRefs.current[index]?.click()}>
                          <input type="file" accept="image/*" style={{ display:"none" }}
                            ref={el => (menuImageRefs.current[index] = el)}
                            onChange={e => handleMenuItemImageSelect(index, e)} />
                          <div className="afs-upload-icon" style={{ width:34, height:34, marginBottom:6 }}><Upload size={15} /></div>
                          <div className="afs-upload-text" style={{ fontSize:13 }}>Upload item photo</div>
                        </div>
                      ) : (
                        <div className="afs-photo-preview">
                          <img src={item.imagePreview} alt={`item-${index}`} className="afs-item-img" />
                          <div className="afs-photo-actions">
                            <button type="button" className="afs-icon-btn del" onClick={() => handleMenuItemImageDelete(index)}><Trash2 size={13} /></button>
                            <button type="button" className="afs-icon-btn upd" onClick={() => triggerMenuItemUpdate(index)}><RefreshCw size={13} /></button>
                          </div>
                          {item.imageUploading && <div className="afs-img-uploading"><Loader2 size={16} className="afs-spin" /> Uploading...</div>}
                        </div>
                      )}
                    </div>

                    <div className="afs-row">
                      <div className="afs-field">
                        <label className="afs-label">Item name <span>*</span></label>
                        <input className="afs-input" type="text" value={item.name}
                          onChange={e => updateMenuItem(index, "name", e.target.value)}
                          placeholder="e.g. Grilled Chicken Rice" />
                      </div>
                      <div className="afs-field">
                        <label className="afs-label">Category <span>*</span></label>
                        <select className="afs-select" value={item.category}
                          onChange={e => updateMenuItem(index, "category", e.target.value)}>
                          {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Description</label>
                      <input className="afs-input" type="text" value={item.description}
                        onChange={e => updateMenuItem(index, "description", e.target.value)}
                        placeholder="Brief description of the dish..." />
                    </div>

                    <div className="afs-row">
                      <div className="afs-field">
                        <label className="afs-label">Price (LKR) <span>* 100–10,000</span></label>
                        <input className="afs-input" type="number" value={item.price}
                          onChange={e => updateMenuItem(index, "price", e.target.value)}
                          onBlur={e => {
                            const v = Number(e.target.value);
                            if (e.target.value === "") return;
                            if (v < 100)        updateMenuItem(index, "price", "100");
                            else if (v > 10000) updateMenuItem(index, "price", "10000");
                          }}
                          min="100" max="10000" placeholder="350" />
                      </div>
                      <div className="afs-field">
                        <label className="afs-label">Prep time <span>* 1–120 mins</span></label>
                        <input className="afs-input" type="number" value={item.prepTime}
                          onChange={e => updateMenuItem(index, "prepTime", e.target.value)}
                          onBlur={e => {
                            const v = Number(e.target.value);
                            if (e.target.value === "") return;
                            if (v < 1)        updateMenuItem(index, "prepTime", "1");
                            else if (v > 120) updateMenuItem(index, "prepTime", "120");
                          }}
                          min="1" max="120" />
                      </div>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Available hours</label>
                      <div className="afs-time-row">
                        <div className="afs-time-group">
                          <span className="afs-time-label">From</span>
                          <select className="afs-select" value={item.AvailableHours.open}
                            onChange={e => {
                              const newOpen = e.target.value;
                              const openIdx = TIME_OPTIONS.indexOf(newOpen);
                              const closeIdx = TIME_OPTIONS.indexOf(item.AvailableHours.close);
                              const opCloseIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                              updateMenuItemHours(index, "open", newOpen);
                              if (closeIdx <= openIdx) updateMenuItemHours(index, "close", TIME_OPTIONS[Math.min(openIdx + 1, opCloseIdx)]);
                            }}>
                            {TIME_OPTIONS.filter(t => { const i=TIME_OPTIONS.indexOf(t); return i>=timeIdx(operatingHours.open) && i<timeIdx(operatingHours.close); }).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="afs-time-divider"><ChevronRight size={16} /></div>
                        <div className="afs-time-group">
                          <span className="afs-time-label">Until</span>
                          <select className="afs-select" value={item.AvailableHours.close}
                            onChange={e => updateMenuItemHours(index, "close", e.target.value)}>
                            {TIME_OPTIONS.filter(t => { const i=TIME_OPTIONS.indexOf(t); return i>timeIdx(item.AvailableHours.open) && i<=timeIdx(operatingHours.close); }).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Dietary tags</label>
                      <div className="afs-tags-row">
                        {DIETARY_TAGS.map(tag => {
                          const active = item.dietaryTags.includes(tag.key);
                          const Icon = tag.icon;
                          return (
                            <button key={tag.key} type="button" className="afs-tag-btn"
                              style={{ background: active ? tag.bg : "#f5f5f5", color: active ? tag.color : "#aaa", borderColor: active ? tag.border : "#e8e8e8", fontWeight: active ? 600 : 400 }}
                              onClick={() => toggleDietaryTag(index, tag.key)}>
                              <Icon size={13} />
                              <span>{tag.key}</span>
                              {active && <span className="afs-tag-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="afs-field">
                      <div className={`afs-avail ${item.isAvailable ? "on" : "off"}`}
                        onClick={() => updateMenuItem(index, "isAvailable", !item.isAvailable)}>
                        <div className="afs-avail-dot" />
                        <span>{item.isAvailable ? "Currently available" : "Not available"}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className="afs-add-item-btn" onClick={addMenuItem}>
                  <Plus size={16} /> Add another menu item
                </button>

                <div className="afs-nav" style={{ background:"#fff", borderRadius:14, padding:"16px 24px", border:"1px solid #ebebeb" }}>
                  <button className="afs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 5 ── */}
            {currentStep === 5 && (
              <div className="afs-card">
                <div className="afs-card-title">Review & publish</div>
                <div className="afs-card-subtitle">Here's how your listing will look — images upload on save</div>

                <div className="afs-section-label" style={{ marginBottom: 14 }}>Listing preview</div>
                <div className="afs-service-card">
                  {bgPreview
                    ? <img src={bgPreview} alt="cover" className="afs-service-card-cover" />
                    : <div className="afs-service-card-cover-placeholder"><ImageIcon size={28} color="#555" /></div>
                  }
                  <div className="afs-service-card-body">
                    <div className="afs-service-card-avatar">
                      {iconPreview
                        ? <img src={iconPreview} alt="icon" />
                        : <UtensilsCrossed size={40} color="#fff" />
                      }
                    </div>
                    <div className="afs-service-card-info">
                      <div className="afs-service-card-name">{kitchenName || "Your Kitchen Name"}</div>
                      <div className="afs-service-card-meta">
                        <span><Clock size={12} /> {operatingHours.open} – {operatingHours.close}</span>
                        <span><MapPin size={12} /> {address ? address.split(",")[0] : "Location not set"}</span>
                      </div>
                      <div className="afs-service-card-chips">
                        <span className="afs-chip orange">{serviceType}</span>
                        {deliveryAvailable && <span className="afs-chip dark">Delivery</span>}
                        {pickupAvailable   && <span className="afs-chip dark">Pickup</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="afs-divider" />

                <div style={{ marginBottom: 24 }}>
                  <div className="afs-section-label">Kitchen details</div>
                  <table className="afs-summary-table">
                    <tbody>
                      {[
                        ["Name",     kitchenName],
                        ["Type",     serviceType],
                        ["Hours",    `${operatingHours.open} – ${operatingHours.close}`],
                        ["Delivery", deliveryAvailable ? "Yes" : "No"],
                        ["Pickup",   pickupAvailable   ? "Yes" : "No"],
                        ["Address",  address],
                      ].map(([k, v]) => (
                        <tr key={k}><td>{k}</td><td>{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="afs-divider" />

                <div style={{ marginBottom: 24 }}>
                  <div className="afs-section-label">Menu — {menuItems.length} item(s)</div>
                  {menuItems.map((item, i) => (
                    <div key={i} className="afs-menu-preview-row">
                      {item.imagePreview
                        ? <img src={item.imagePreview} alt={item.name} className="afs-menu-preview-thumb" />
                        : <div className="afs-menu-preview-noimg"><UtensilsCrossed size={16} /></div>}
                      <span className="afs-menu-preview-name">{item.name || `Item ${i + 1}`}</span>
                      <span className="afs-menu-preview-cat">{item.category}</span>
                      <span className="afs-menu-preview-price">LKR {Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="afs-divider" />

                <div style={{ marginBottom: 20 }}>
                  <div className="afs-section-label">Confirmation</div>
                  <label className="afs-check-label">
                    <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                    I confirm all information provided is accurate and up to date.
                  </label>
                  <label className="afs-check-label" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                    I agree to the Terms of Service. Images will be uploaded when I save.
                  </label>
                </div>

                {isSaving && saveProgress && (
                  <div className="afs-save-bar">
                    <Loader2 size={16} className="afs-spin" />
                    <span>{saveProgress}</span>
                  </div>
                )}

                <div className="afs-nav">
                  <button className="afs-btn-secondary" onClick={handlePreviousStep} disabled={isSaving}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="afs-btn-save" onClick={handleSaveListing} disabled={isSaving || !isVerified || !isAgreed}>
                    {isSaving
                      ? <><Loader2 size={15} className="afs-spin" /> Saving...</>
                      : <><CheckCircle size={15} /> Save listing</>
                    }
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

export default AddFoodService;
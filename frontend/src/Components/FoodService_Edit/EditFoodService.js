import React, { useState, useCallback, useRef, useEffect } from "react";
import "./EditFoodService.css";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from "@react-google-maps/api";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trash2, RefreshCw, X, ChevronRight, ChevronLeft,
  Home, UtensilsCrossed, Coffee, Croissant, Truck, ShoppingBag,
  MapPin, Crosshair, Upload, Leaf, Flame, Wheat, Sprout,
  CheckCircle, Loader2, Image as ImageIcon, Plus, Clock,
  AlertCircle, PenLine,
} from "lucide-react";
import axios from "axios";

// ─── Config ───────────────────────────────────────────────────────────────────
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

const clampMenuItemsToHours = (opOpen, opClose, items) =>
  items.map(item => {
    let iOpen = clampTime(item.AvailableHours.open, opOpen, opClose);
    if (timeIdx(iOpen) >= timeIdx(opClose)) iOpen = opOpen;
    let iClose = clampTime(item.AvailableHours.close, opOpen, opClose);
    if (timeIdx(iClose) <= timeIdx(iOpen)) iClose = opClose;
    return { ...item, AvailableHours: { open: iOpen, close: iClose } };
  });

const emptyMenuItem = () => ({
  _id: null, name: "", description: "", price: "", category: "Lunch",
  dietaryTags: [], AvailableHours: { open: "08:00 AM", close: "08:00 PM" },
  isAvailable: true, prepTime: 15,
  imagePreview: null, imageFile: null, imageId: null, imageUploading: false,
  isNew: true,
});

// ─── Component ────────────────────────────────────────────────────────────────
function EditFoodService() {
  const navigate       = useNavigate();
  const { id }         = useParams();
  const updatePhotoRef = useRef(null);
  const menuImageRefs  = useRef([]);

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [isLoading,    setIsLoading]    = useState(true);
  const [loadError,    setLoadError]    = useState(null);
  const [currentStep,  setCurrentStep]  = useState(1);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  // Step 1
  const [kitchenName,       setKitchenName]       = useState("");
  const [description,       setDescription]       = useState("");
  const [serviceType,       setServiceType]       = useState("Home Kitchen");
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable,   setPickupAvailable]   = useState(true);
  const [operatingHours,    setOperatingHours]    = useState({ open: "08:00 AM", close: "10:00 PM" });

  // Step 2
  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [map,                 setMap]                 = useState(null);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  // Step 3
  const [iconPreview,   setIconPreview]   = useState(null);
  const [iconFile,      setIconFile]      = useState(null);
  const [iconImageId,   setIconImageId]   = useState(null);
  const [bgPreview,     setBgPreview]     = useState(null);
  const [bgFile,        setBgFile]        = useState(null);
  const [bgImageId,     setBgImageId]     = useState(null);
  const [updatingField, setUpdatingField] = useState(null);

  // Step 4
  const [menuItems,      setMenuItems]      = useState([emptyMenuItem()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);

  // Step 5
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  // ── Load existing data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setLoadError("No food service ID provided."); setIsLoading(false); return; }

    const fetchData = async () => {
      try {
        const fsRes = await axios.get(`${BASE_URL}/Foodservice/${id}`);
        const fs    = fsRes.data.data;

        setKitchenName(fs.kitchenName || "");
        setDescription(fs.description || "");
        setServiceType(fs.serviceType || "Home Kitchen");
        setDeliveryAvailable(fs.deliveryAvailable ?? true);
        setPickupAvailable(fs.pickupAvailable ?? true);
        if (fs.operatingHours) setOperatingHours(fs.operatingHours);

        if (fs.location?.coordinates) {
          const [lng, lat] = fs.location.coordinates;
          setSelectedLocation({ lat, lng });
          setHasSelectedLocation(true);
        }
        setAddress(fs.address || "");

        const photoUrl = (pid) => `${BASE_URL}/photo/${pid}`;

        if (fs.iconImage)       { setIconPreview(photoUrl(fs.iconImage));     setIconImageId(fs.iconImage); }
        if (fs.BackgroundImage) { setBgPreview(photoUrl(fs.BackgroundImage)); setBgImageId(fs.BackgroundImage); }

        if (fs.menu && fs.menu.length > 0) {
          const items = await Promise.all(
            fs.menu.map(async (itemId) => {
              const miRes = await axios.get(`${BASE_URL}/menuitem/${itemId}`);
              const mi    = miRes.data.data;
              return {
                _id:            mi._id,
                name:           mi.name || "",
                description:    mi.description || "",
                price:          mi.price?.toString() || "",
                category:       mi.category || "Lunch",
                dietaryTags:    mi.dietaryTags || [],
                AvailableHours: mi.AvailableHours || { open: "08:00 AM", close: "08:00 PM" },
                isAvailable:    mi.isAvailable ?? true,
                prepTime:       mi.prepTime || 15,
                imagePreview:   mi.image ? photoUrl(mi.image) : null,
                imageFile:      null,
                imageId:        mi.image || null,
                imageUploading: false,
                isNew:          false,
              };
            })
          );
          const opOpen  = fs.operatingHours?.open  || "08:00 AM";
          const opClose = fs.operatingHours?.close || "10:00 PM";
          setMenuItems(clampMenuItemsToHours(opOpen, opClose, items));
          menuImageRefs.current = items.map(() => null);
        }
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load food service data. Please try again.");
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleExit = () => navigate("/Listings");

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
      if (!iconImageId && !iconFile) return alert("Please upload a kitchen icon image.");
      if (!bgImageId && !bgFile)     return alert("Please upload a kitchen background image.");
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
    const item = menuItems[i];
    if (item._id && !item.isNew) setDeletedItemIds(prev => [...prev, item._id]);
    setMenuItems(p => p.filter((_, idx) => idx !== i));
    menuImageRefs.current.splice(i, 1);
  };
  const updateMenuItem      = (i, f, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],[f]:v}; return u; });
  const updateMenuItemHours = (i, t, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],AvailableHours:{...u[i].AvailableHours,[t]:v}}; return u; });
  const toggleDietaryTag    = (i, tag)  => setMenuItems(p => { const u=[...p], cur=u[i].dietaryTags; u[i]={...u[i],dietaryTags:cur.includes(tag)?cur.filter(t=>t!==tag):[...cur,tag]}; return u; });
  const setItemField        = (i, flds) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],...flds}; return u; });

  // ── Menu item images ──────────────────────────────────────────────────────
  const handleMenuItemImageSelect = (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    setItemField(i, { imagePreview: URL.createObjectURL(file), imageFile: file });
    e.target.value = null;
  };
  const handleMenuItemImageDelete = (i) => setItemField(i, { imagePreview: null, imageFile: null, imageId: null });
  const triggerMenuItemUpdate = (i) => {
    const inp = document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange = e => handleMenuItemImageSelect(i, e); inp.click();
  };

  // ── Kitchen photos ────────────────────────────────────────────────────────
  const handleIconSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIconPreview(URL.createObjectURL(file)); setIconFile(file); e.target.value = null;
  };
  const handleBgSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBgPreview(URL.createObjectURL(file)); setBgFile(file); e.target.value = null;
  };
  const handleUpdateKitchenPhoto = (e) => {
    const file = e.target.files[0]; if (!file || !updatingField) return;
    const preview = URL.createObjectURL(file);
    if (updatingField === "icon") { setIconPreview(preview); setIconFile(file); }
    else                          { setBgPreview(preview);   setBgFile(file); }
    setUpdatingField(null); e.target.value = null;
  };
  const handleDeleteKitchenPhoto = (field) => {
    if (field === "icon") { setIconPreview(null); setIconFile(null); setIconImageId(null); }
    else                  { setBgPreview(null);   setBgFile(null);   setBgImageId(null); }
  };
  const triggerKitchenUpdate = (field) => { setUpdatingField(field); updatePhotoRef.current.click(); };

  // ── Map ───────────────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);
  const onMapClick = event => {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) setAddress(results[0].formatted_address);
    });
  };
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status === "OK" && results[0]) setAddress(results[0].formatted_address);
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
    if (!iconPreview || (!iconImageId && !iconFile)) return alert("Please upload a kitchen icon image.");
    if (!bgPreview   || (!bgImageId   && !bgFile))   return alert("Please upload a kitchen background image.");
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

      setSaveProgress("Updating food service...");
      await axios.put(`${BASE_URL}/Foodservice/${id}`, {
        kitchenName, description, address,
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        operatingHours, serviceType, deliveryAvailable, pickupAvailable,
        iconImage: finalIconId, BackgroundImage: finalBgId,
      });

      if (deletedItemIds.length > 0) {
        setSaveProgress("Removing deleted menu items...");
        await Promise.all(deletedItemIds.map(itemId => axios.delete(`${BASE_URL}/menuitem/${itemId}`)));
      }

      const menuItemIds = [];
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        setSaveProgress(`Saving menu item ${i + 1} of ${menuItems.length}...`);

        let imageId = it.imageId;
        if (it.imageFile) {
          const fd = new FormData(); fd.append("photo", it.imageFile);
          const r = await axios.post(`${BASE_URL}/Photo`, fd);
          if (r.data.success) imageId = r.data.data._id;
        }

        const payload = {
          foodServiceId: id, name: it.name, description: it.description,
          price: Number(it.price), category: it.category,
          dietaryTags: it.dietaryTags, AvailableHours: it.AvailableHours,
          isAvailable: it.isAvailable, prepTime: Number(it.prepTime),
          ...(imageId && { image: imageId }),
        };

        if (it.isNew || !it._id) {
          const miRes = await axios.post(`${BASE_URL}/menuitem`, payload);
          menuItemIds.push(miRes.data.data._id);
        } else {
          await axios.put(`${BASE_URL}/menuitem/${it._id}`, payload);
          menuItemIds.push(it._id);
        }
      }

      setSaveProgress("Linking menu to food service...");
      await axios.put(`${BASE_URL}/Foodservice/${id}`, { menu: menuItemIds });

      alert("Food service updated successfully!");
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

  // ── Topbar shared across all states ──────────────────────────────────────
  const Topbar = () => (
    <div className="efs-topbar">
      <div className="hn-nav__logo-wrap">
        <a href="/Listings" className="hn-nav__logo">
          <img
            src="/Images/logo2.png"
            alt="Unisewana Logo"
            style={{ height: "32px", width: "auto", display: "block" }}
          />
        </a>
      </div>
      {!isLoading && !loadError && (
        <div className="efs-topbar-center">
          <PenLine size={13} />
          <span>Editing listing</span>
          <div className="efs-topbar-center-dot" />
          <span className="efs-topbar-center-name">{kitchenName || "…"}</span>
        </div>
      )}
      <button className="efs-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="efs-root">
      <Topbar />
      <div className="efs-state-screen">
        <Loader2 size={32} className="efs-spin" color="#e67e22" />
        <p>Loading food service data...</p>
      </div>
    </div>
  );

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="efs-root">
      <Topbar />
      <div className="efs-state-screen">
        <AlertCircle size={32} color="#c0392b" />
        <p className="err">{loadError}</p>
        <button className="efs-btn-back" onClick={handleExit}>Go Back</button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="efs-root">

      <Topbar />

      {/* Progress Bar */}
      <div className="efs-progress-wrapper">
        <div className="efs-progress-steps">
          {STEPS.map((step, idx) => {
            const done   = currentStep > step.num;
            const active = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <div className={`efs-progress-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                  <div className="efs-progress-bubble">
                    {done ? <CheckCircle size={16} /> : step.num}
                  </div>
                  <span className="efs-progress-label">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="efs-progress-line">
                    <div className="efs-progress-line-fill" style={{ width: done ? "100%" : "0%" }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="efs-layout">

        {/* ── STEP 1 ── */}
        {currentStep === 1 && (
          <div className="efs-card">
            <div className="efs-card-title">Kitchen details</div>
            <div className="efs-card-subtitle">Update your basic information</div>

            <div className="efs-field">
              <label className="efs-label">Kitchen name <span>*</span></label>
              <input className="efs-input" type="text" value={kitchenName}
                onChange={e => setKitchenName(e.target.value)}
                placeholder="e.g. Mama's Home Kitchen" maxLength={60} />
              <div className="efs-field-footer">
                <span className={`efs-char-count ${kitchenName.length > 50 ? "warn" : ""}`}>{kitchenName.length}/60</span>
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Description <span>*</span></label>
              <textarea className="efs-textarea" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what makes your kitchen special..." maxLength={300} />
              <div className="efs-field-footer">
                <span className={`efs-char-count ${description.length > 250 ? "warn" : ""}`}>{description.length}/300</span>
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Service type <span>*</span></label>
              <div className="efs-type-grid">
                {SERVICE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.key} type="button"
                      className={`efs-type-card ${serviceType === t.key ? "selected" : ""}`}
                      onClick={() => setServiceType(t.key)}>
                      <div className="efs-type-icon"><Icon size={18} /></div>
                      <span className="efs-type-name">{t.key}</span>
                      <span className="efs-type-desc">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Operating hours <span>*</span></label>
              <div className="efs-time-row">
                <div className="efs-time-group">
                  <span className="efs-time-label">Opens</span>
                  <select className="efs-select" value={operatingHours.open}
                    onChange={e => {
                      const newOpen = e.target.value;
                      const openIdx = TIME_OPTIONS.indexOf(newOpen);
                      const closeIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                      const newClose = closeIdx > openIdx ? operatingHours.close : TIME_OPTIONS[openIdx + 1] || TIME_OPTIONS[openIdx];
                      setOperatingHours({ open: newOpen, close: newClose });
                      setMenuItems(prev => clampMenuItemsToHours(newOpen, newClose, prev));
                    }}>
                    {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="efs-time-divider"><ChevronRight size={16} /></div>
                <div className="efs-time-group">
                  <span className="efs-time-label">Closes</span>
                  <select className="efs-select" value={operatingHours.close}
                    onChange={e => {
                      const newClose = e.target.value;
                      setOperatingHours(p => ({ ...p, close: newClose }));
                      setMenuItems(prev => clampMenuItemsToHours(operatingHours.open, newClose, prev));
                    }}>
                    {TIME_OPTIONS.filter(t => TIME_OPTIONS.indexOf(t) > TIME_OPTIONS.indexOf(operatingHours.open))
                      .map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Service options <span>*</span></label>
              <div className="efs-option-row">
                <button type="button" className={`efs-option-card ${deliveryAvailable ? "active" : ""}`}
                  onClick={() => setDeliveryAvailable(p => !p)}>
                  <div className="efs-option-icon-box"><Truck size={18} /></div>
                  <span className="efs-option-name">Delivery</span>
                  <span className={`efs-badge ${deliveryAvailable ? "on" : "off"}`}>{deliveryAvailable ? "On" : "Off"}</span>
                </button>
                <button type="button" className={`efs-option-card ${pickupAvailable ? "active" : ""}`}
                  onClick={() => setPickupAvailable(p => !p)}>
                  <div className="efs-option-icon-box"><ShoppingBag size={18} /></div>
                  <span className="efs-option-name">Pickup</span>
                  <span className={`efs-badge ${pickupAvailable ? "on" : "off"}`}>{pickupAvailable ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            <div className="efs-nav">
              <div />
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {currentStep === 2 && (
          <div className="efs-card">
            <div className="efs-card-title">Kitchen location</div>
            <div className="efs-card-subtitle">Click the map to update your kitchen's position</div>

            {mapLoadError ? (
              <div className="efs-map-error">
                <MapPin size={22} />
                <div>
                  <div className="efs-map-error-title">Map failed to load</div>
                  <div className="efs-map-error-sub">Check your internet connection and reload.</div>
                </div>
              </div>
            ) : !mapIsLoaded ? (
              <div className="efs-map-loading">
                <Loader2 size={22} className="efs-spin" />
                <span>Loading map...</span>
              </div>
            ) : (
              <div className="efs-map-wrapper">
                <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                  zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                  <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                </GoogleMap>
              </div>
            )}

            <div className="efs-map-actions">
              <button className="efs-map-btn" onClick={handleSLIITLocation}><MapPin size={14} /> SLIIT University</button>
              <button className="efs-map-btn" onClick={handleUseCurrentLocation}><Crosshair size={14} /> Use my location</button>
            </div>

            <div className="efs-field">
              <label className="efs-label">Address <span>*</span></label>
              <textarea className="efs-textarea" rows="2" value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Full address..." />
            </div>

            <div className="efs-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {currentStep === 3 && (
          <div className="efs-card">
            <div className="efs-card-title">Kitchen photos</div>
            <div className="efs-card-subtitle">New photos are uploaded when you save changes</div>

            <input type="file" accept="image/*" ref={updatePhotoRef} style={{ display: "none" }} onChange={handleUpdateKitchenPhoto} />

            <div className="efs-field">
              <label className="efs-label">Icon image <span>*</span></label>
              <span className="efs-hint">Displayed as a circle — your kitchen's profile picture</span>
              {!iconPreview ? (
                <div className="efs-upload-zone" onClick={() => document.getElementById("efs-icon-upload").click()}>
                  <input type="file" accept="image/*" id="efs-icon-upload" style={{ display: "none" }} onChange={handleIconSelect} />
                  <div className="efs-upload-icon"><Upload size={18} /></div>
                  <div className="efs-upload-text">Click to upload icon</div>
                  <div className="efs-upload-hint">PNG, JPG up to 5MB</div>
                </div>
              ) : (
                <div className="efs-photo-preview">
                  <img src={iconPreview} alt="icon" className="efs-preview-icon" />
                  <div className="efs-photo-actions">
                    <button type="button" className="efs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("icon")}><Trash2 size={13} /></button>
                    <button type="button" className="efs-icon-btn upd" onClick={() => triggerKitchenUpdate("icon")}><RefreshCw size={13} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="efs-divider" />

            <div className="efs-field">
              <label className="efs-label">Cover / Background image <span>*</span></label>
              <span className="efs-hint">Wide banner showcasing your kitchen or signature dish</span>
              {!bgPreview ? (
                <div className="efs-upload-zone" onClick={() => document.getElementById("efs-bg-upload").click()}>
                  <input type="file" accept="image/*" id="efs-bg-upload" style={{ display: "none" }} onChange={handleBgSelect} />
                  <div className="efs-upload-icon"><ImageIcon size={18} /></div>
                  <div className="efs-upload-text">Click to upload cover image</div>
                  <div className="efs-upload-hint">PNG, JPG — recommended 1200×400</div>
                </div>
              ) : (
                <div className="efs-photo-preview">
                  <img src={bgPreview} alt="bg" className="efs-preview-bg" />
                  <div className="efs-photo-actions">
                    <button type="button" className="efs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("bg")}><Trash2 size={13} /></button>
                    <button type="button" className="efs-icon-btn upd" onClick={() => triggerKitchenUpdate("bg")}><RefreshCw size={13} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="efs-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {currentStep === 4 && (
          <div>
            <div className="efs-card efs-menu-header-card">
              <div className="efs-card-title">Edit menu</div>
              <div className="efs-card-subtitle">Update, remove, or add new items</div>
            </div>

            {menuItems.map((item, index) => (
              <div key={index} className="efs-menu-card">
                <div className="efs-menu-header">
                  <div className="efs-menu-header-left">
                    <div className="efs-menu-num">{String(index + 1).padStart(2, "0")}</div>
                    <span className="efs-menu-title">{item.name || "Untitled item"}</span>
                    <span className={`efs-item-badge ${item.isNew ? "new" : "existing"}`}>
                      {item.isNew ? "New" : "Existing"}
                    </span>
                  </div>
                  <button type="button" className="efs-remove-btn" onClick={() => removeMenuItem(index)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Item photo</label>
                  {!item.imagePreview ? (
                    <div className="efs-upload-zone efs-upload-zone--sm"
                      onClick={() => menuImageRefs.current[index]?.click()}>
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        ref={el => (menuImageRefs.current[index] = el)}
                        onChange={e => handleMenuItemImageSelect(index, e)} />
                      <div className="efs-upload-icon efs-upload-icon--sm"><Upload size={15} /></div>
                      <div className="efs-upload-text efs-upload-text--sm">Upload item photo</div>
                    </div>
                  ) : (
                    <div className="efs-photo-preview">
                      <img src={item.imagePreview} alt={`item-${index}`} className="efs-item-img" />
                      <div className="efs-photo-actions">
                        <button type="button" className="efs-icon-btn del" onClick={() => handleMenuItemImageDelete(index)}><Trash2 size={13} /></button>
                        <button type="button" className="efs-icon-btn upd" onClick={() => triggerMenuItemUpdate(index)}><RefreshCw size={13} /></button>
                      </div>
                      {item.imageUploading && <div className="efs-img-uploading"><Loader2 size={16} className="efs-spin" /> Uploading...</div>}
                    </div>
                  )}
                </div>

                <div className="efs-row">
                  <div className="efs-field">
                    <label className="efs-label">Item name <span>*</span></label>
                    <input className="efs-input" type="text" value={item.name}
                      onChange={e => updateMenuItem(index, "name", e.target.value)}
                      placeholder="e.g. Grilled Chicken Rice" />
                  </div>
                  <div className="efs-field">
                    <label className="efs-label">Category <span>*</span></label>
                    <select className="efs-select" value={item.category}
                      onChange={e => updateMenuItem(index, "category", e.target.value)}>
                      {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Description</label>
                  <input className="efs-input" type="text" value={item.description}
                    onChange={e => updateMenuItem(index, "description", e.target.value)}
                    placeholder="Brief description of the dish..." />
                </div>

                <div className="efs-row">
                  <div className="efs-field">
                    <label className="efs-label">Price (LKR) <span>* 100–10,000</span></label>
                    <input className="efs-input" type="number" value={item.price}
                      onChange={e => updateMenuItem(index, "price", e.target.value)}
                      onBlur={e => {
                        const v = Number(e.target.value);
                        if (e.target.value === "") return;
                        if (v < 100)        updateMenuItem(index, "price", "100");
                        else if (v > 10000) updateMenuItem(index, "price", "10000");
                      }}
                      min="100" max="10000" placeholder="350" />
                  </div>
                  <div className="efs-field">
                    <label className="efs-label">Prep time <span>* 1–120 mins</span></label>
                    <input className="efs-input" type="number" value={item.prepTime}
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

                <div className="efs-field">
                  <label className="efs-label">Available hours</label>
                  <div className="efs-time-row">
                    <div className="efs-time-group">
                      <span className="efs-time-label">From</span>
                      <select className="efs-select" value={item.AvailableHours.open}
                        onChange={e => {
                          const newOpen = e.target.value;
                          const openIdx = TIME_OPTIONS.indexOf(newOpen);
                          const closeIdx = TIME_OPTIONS.indexOf(item.AvailableHours.close);
                          const opCloseIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                          updateMenuItemHours(index, "open", newOpen);
                          if (closeIdx <= openIdx) updateMenuItemHours(index, "close", TIME_OPTIONS[Math.min(openIdx + 1, opCloseIdx)]);
                        }}>
                        {TIME_OPTIONS.filter(t => { const i = TIME_OPTIONS.indexOf(t); return i >= timeIdx(operatingHours.open) && i < timeIdx(operatingHours.close); })
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="efs-time-divider"><ChevronRight size={16} /></div>
                    <div className="efs-time-group">
                      <span className="efs-time-label">Until</span>
                      <select className="efs-select" value={item.AvailableHours.close}
                        onChange={e => updateMenuItemHours(index, "close", e.target.value)}>
                        {TIME_OPTIONS.filter(t => { const i = TIME_OPTIONS.indexOf(t); return i > timeIdx(item.AvailableHours.open) && i <= timeIdx(operatingHours.close); })
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Dietary tags</label>
                  <div className="efs-tags-row">
                    {DIETARY_TAGS.map(tag => {
                      const active = item.dietaryTags.includes(tag.key);
                      const Icon = tag.icon;
                      return (
                        <button key={tag.key} type="button" className="efs-tag-btn"
                          style={{ background: active ? tag.bg : "#f5f5f5", color: active ? tag.color : "#aaa", borderColor: active ? tag.border : "#e8e8e8", fontWeight: active ? 600 : 400 }}
                          onClick={() => toggleDietaryTag(index, tag.key)}>
                          <Icon size={13} />
                          <span>{tag.key}</span>
                          {active && <span className="efs-tag-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="efs-field">
                  <div className={`efs-avail ${item.isAvailable ? "on" : "off"}`}
                    onClick={() => updateMenuItem(index, "isAvailable", !item.isAvailable)}>
                    <div className="efs-avail-dot" />
                    <span>{item.isAvailable ? "Currently available" : "Not available"}</span>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="efs-add-item-btn" onClick={addMenuItem}>
              <Plus size={16} /> Add another menu item
            </button>

            <div className="efs-nav efs-step4-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {currentStep === 5 && (
          <div className="efs-card">
            <div className="efs-card-title">Review & save</div>
            <div className="efs-card-subtitle">Confirm everything looks right before saving changes</div>

            <div className="efs-section-label efs-section-label--spaced">Listing preview</div>
            <div className="efs-service-card">
              {bgPreview
                ? <img src={bgPreview} alt="cover" className="efs-service-card-cover" />
                : <div className="efs-service-card-cover-placeholder"><ImageIcon size={28} color="#555" /></div>
              }
              <div className="efs-service-card-body">
                <div className="efs-service-card-avatar">
                  {iconPreview
                    ? <img src={iconPreview} alt="icon" />
                    : <UtensilsCrossed size={40} color="#fff" />
                  }
                </div>
                <div className="efs-service-card-info">
                  <div className="efs-service-card-name">{kitchenName || "Your Kitchen Name"}</div>
                  <div className="efs-service-card-meta">
                    <span><Clock size={12} /> {operatingHours.open} – {operatingHours.close}</span>
                    <span><MapPin size={12} /> {address ? address.split(",")[0] : "Location not set"}</span>
                  </div>
                  <div className="efs-service-card-chips">
                    <span className="efs-chip orange">{serviceType}</span>
                    {deliveryAvailable && <span className="efs-chip dark">Delivery</span>}
                    {pickupAvailable   && <span className="efs-chip dark">Pickup</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="efs-divider" />

            <div className="efs-review-block">
              <div className="efs-section-label">Kitchen details</div>
              <table className="efs-summary-table">
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

            <div className="efs-divider" />

            <div className="efs-review-block">
              <div className="efs-section-label">
                Menu — {menuItems.length} item(s){deletedItemIds.length > 0 ? `, ${deletedItemIds.length} to be removed` : ""}
              </div>
              {deletedItemIds.length > 0 && (
                <div className="efs-delete-notice">
                  <Trash2 size={14} /> {deletedItemIds.length} item(s) will be permanently deleted on save.
                </div>
              )}
              {menuItems.map((item, i) => (
                <div key={i} className="efs-menu-preview-row">
                  {item.imagePreview
                    ? <img src={item.imagePreview} alt={item.name} className="efs-menu-preview-thumb" />
                    : <div className="efs-menu-preview-noimg"><UtensilsCrossed size={16} /></div>}
                  <span className="efs-menu-preview-name">{item.name || `Item ${i + 1}`}</span>
                  <span className="efs-menu-preview-cat">{item.category}</span>
                  {item.isNew && <span className="efs-menu-preview-new">New</span>}
                  <span className="efs-menu-preview-price">LKR {Number(item.price || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="efs-divider" />

            <div className="efs-review-block">
              <div className="efs-section-label">Confirmation</div>
              <label className="efs-check-label">
                <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                I confirm all updated information is accurate and up to date.
              </label>
              <label className="efs-check-label efs-check-label--spaced">
                <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                I agree to the Terms of Service. New images will be uploaded on save.
              </label>
            </div>

            {isSaving && saveProgress && (
              <div className="efs-save-bar">
                <Loader2 size={16} className="efs-spin" />
                <span>{saveProgress}</span>
              </div>
            )}

            <div className="efs-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep} disabled={isSaving}>
                <ChevronLeft size={15} /> Previous
              </button>
              <button className="efs-btn-save" onClick={handleSaveListing} disabled={isSaving || !isVerified || !isAgreed}>
                {isSaving
                  ? <><Loader2 size={15} className="efs-spin" /> Saving...</>
                  : <><CheckCircle size={15} /> Save changes</>
                }
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EditFoodService;
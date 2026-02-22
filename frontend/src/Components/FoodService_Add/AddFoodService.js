import React, { useState, useCallback, useRef } from "react";
import "./AddFoodService.css";
import {
  GoogleMap,
  LoadScript,
  Marker,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaSyncAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import axios from "axios";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL = "http://localhost:5000";

const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES = ["places"];
const mapContainerStyle = { width: "100%", height: "420px", borderRadius: "12px" };
const defaultOptions = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
  mapTypeId: "roadmap",
};

const DIETARY_TAGS = [
  { key: "Vegetarian", emoji: "🥦", color: "#16a34a", bg: "#dcfce7" },
  { key: "Vegan",      emoji: "🌱", color: "#15803d", bg: "#bbf7d0" },
  { key: "Spicy",      emoji: "🌶️", color: "#dc2626", bg: "#fee2e2" },
  { key: "Gluten-Free",emoji: "🌾", color: "#b45309", bg: "#fef3c7" },
];

const MENU_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];

const SERVICE_TYPES = [
  { key: "Home Kitchen", emoji: "🏠", desc: "Cook from home" },
  { key: "Restaurant",   emoji: "🍽️", desc: "Dine-in & takeout" },
  { key: "Cafe",         emoji: "☕", desc: "Coffee & light bites" },
  { key: "Bakery",       emoji: "🥐", desc: "Baked goods" },
];

// Generate time options in 30-min intervals
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

const emptyMenuItem = () => ({
  name: "", description: "", price: "", category: "Lunch",
  dietaryTags: [],
  AvailableHours: { open: "08:00 AM", close: "08:00 PM" },
  isAvailable: true, prepTime: 15,
  imagePreview: null, imageId: null, imageUploading: false,
});

// ─── Component ────────────────────────────────────────────────────────────────
function AddFoodService() {
  const navigate       = useNavigate();
  const updatePhotoRef = useRef(null);
  const menuImageRefs  = useRef([]);

  const [currentStep,   setCurrentStep]   = useState(1);
  const [showForm,      setShowForm]       = useState(false);
  const [isSaving,      setIsSaving]       = useState(false);
  const [saveProgress,  setSaveProgress]   = useState("");

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
  const [iconImageId,   setIconImageId]   = useState(null);
  const [bgPreview,     setBgPreview]     = useState(null);
  const [bgImageId,     setBgImageId]     = useState(null);
  const [isUploading,   setIsUploading]   = useState(false);
  const [updatingField, setUpdatingField] = useState(null);

  // Step 4
  const [menuItems, setMenuItems] = useState([emptyMenuItem()]);

  // Step 5
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleExit       = () => navigate("/");
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
      if (!iconImageId) return alert("Please upload a kitchen icon image.");
      if (!bgImageId)   return alert("Please upload a kitchen background image.");
    }
    if (currentStep === 4) {
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        if (!it.name.trim()) return alert(`Item ${i + 1}: Name required.`);
        const p = Number(it.price);
        if (!it.price || p < 100 || p > 10000) return alert(`Item ${i + 1}: Price must be between LKR 100 – 10,000.`);
        if (Number(it.prepTime) < 1 || Number(it.prepTime) > 120) return alert(`Item ${i + 1}: Prep time 1–120 min.`);
      }
    }
    setCurrentStep(s => s + 1);
  };

  const handlePreviousStep = () => setCurrentStep(s => s - 1);

  // ── Menu helpers ───────────────────────────────────────────────────────────
  const addMenuItem    = () => { setMenuItems(p => [...p, emptyMenuItem()]); menuImageRefs.current.push(null); };
  const removeMenuItem = (i) => {
    if (menuItems.length === 1) return alert("At least one menu item required.");
    setMenuItems(p => p.filter((_, idx) => idx !== i));
    menuImageRefs.current.splice(i, 1);
  };
  const updateMenuItem      = (i, field, val) =>
    setMenuItems(p => { const u = [...p]; u[i] = { ...u[i], [field]: val }; return u; });
  const updateMenuItemHours = (i, type, val) =>
    setMenuItems(p => { const u = [...p]; u[i] = { ...u[i], AvailableHours: { ...u[i].AvailableHours, [type]: val } }; return u; });
  const toggleDietaryTag    = (i, tag) =>
    setMenuItems(p => {
      const u = [...p], cur = u[i].dietaryTags;
      u[i] = { ...u[i], dietaryTags: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag] };
      return u;
    });
  const setItemField = (i, fields) =>
    setMenuItems(p => { const u = [...p]; u[i] = { ...u[i], ...fields }; return u; });

  // ── Menu item image handlers ───────────────────────────────────────────────
  const handleMenuItemImageUpload = async (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    setItemField(i, { imageUploading: true });
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.post(`${BASE_URL}/Photo`, fd);
      if (res.data.success)
        setItemField(i, { imagePreview: URL.createObjectURL(file), imageId: res.data.data._id, imageUploading: false });
    } catch {
      alert(`Image upload failed for item ${i + 1}.`);
      setItemField(i, { imageUploading: false });
    }
    e.target.value = null;
  };
  const handleMenuItemImageDelete = async (i) => {
    try {
      await axios.delete(`${BASE_URL}/Photo/${menuItems[i].imageId}`);
      setItemField(i, { imagePreview: null, imageId: null });
    } catch { alert("Failed to delete image."); }
  };
  const handleMenuItemImageUpdate = async (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    setItemField(i, { imageUploading: true });
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.put(`${BASE_URL}/Photo/${menuItems[i].imageId}`, fd);
      if (res.data.success) setItemField(i, { imagePreview: URL.createObjectURL(file), imageUploading: false });
    } catch { alert("Failed to update image."); setItemField(i, { imageUploading: false }); }
    e.target.value = null;
  };
  const triggerMenuItemUpdate = (i) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = e => handleMenuItemImageUpdate(i, e);
    inp.click();
  };

  // ── Kitchen photo handlers ─────────────────────────────────────────────────
  const handleIconUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.post(`${BASE_URL}/Photo`, fd);
      if (res.data.success) { setIconPreview(URL.createObjectURL(file)); setIconImageId(res.data.data._id); }
    } catch { alert("Icon upload failed."); }
    finally { setIsUploading(false); e.target.value = null; }
  };
  const handleBgUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.post(`${BASE_URL}/Photo`, fd);
      if (res.data.success) { setBgPreview(URL.createObjectURL(file)); setBgImageId(res.data.data._id); }
    } catch { alert("Background upload failed."); }
    finally { setIsUploading(false); e.target.value = null; }
  };
  const handleUpdateKitchenPhoto = async (e) => {
    const file = e.target.files[0]; if (!file || !updatingField) return;
    setIsUploading(true);
    const id = updatingField === "icon" ? iconImageId : bgImageId;
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.put(`${BASE_URL}/Photo/${id}`, fd);
      if (res.data.success) {
        const preview = URL.createObjectURL(file);
        if (updatingField === "icon") setIconPreview(preview); else setBgPreview(preview);
      }
    } catch { alert("Failed to update photo."); }
    finally { setIsUploading(false); setUpdatingField(null); e.target.value = null; }
  };
  const handleDeleteKitchenPhoto = async (field) => {
    const id = field === "icon" ? iconImageId : bgImageId;
    try {
      await axios.delete(`${BASE_URL}/Photo/${id}`);
      if (field === "icon") { setIconPreview(null); setIconImageId(null); }
      else                  { setBgPreview(null);   setBgImageId(null); }
    } catch { alert("Failed to delete image."); }
  };
  const triggerKitchenUpdate = (field) => { setUpdatingField(field); updatePhotoRef.current.click(); };

  // ── Map handlers ───────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);

  const onMapClick = event => {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setSelectedLocation(loc);
    setHasSelectedLocation(true);
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
    setSelectedLocation(SLIIT_LOCATION);
    setHasSelectedLocation(true);
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSaveListing = async () => {
    if (!hasSelectedLocation)       return alert("Please pin your kitchen location on the map.");
    if (!iconImageId || !bgImageId) return alert("Please upload both icon and background images.");
    if (!isVerified || !isAgreed)   return alert("Please confirm accuracy and agree to terms.");

    setIsSaving(true);
    try {
      setSaveProgress("Creating food service...");
      const fsRes = await axios.post(`${BASE_URL}/Foodservice`, {
        owner: "699174a3a19b70085fffefc8",
        kitchenName, description, address,
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        operatingHours, serviceType, deliveryAvailable, pickupAvailable,
        iconImage: iconImageId, BackgroundImage: bgImageId,
        isAvailable: true,
      });

      const foodServiceId = fsRes.data.data._id;
      const menuItemIds   = [];

      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        setSaveProgress(`Saving menu item ${i + 1} of ${menuItems.length}...`);
        const miRes = await axios.post(`${BASE_URL}/menuitem`, {
          foodServiceId,
          name: it.name, description: it.description,
          price: Number(it.price), category: it.category,
          dietaryTags: it.dietaryTags, AvailableHours: it.AvailableHours,
          isAvailable: it.isAvailable, prepTime: Number(it.prepTime),
          ...(it.imageId && { image: it.imageId }),
        });
        menuItemIds.push(miRes.data.data._id);
      }

      setSaveProgress("Linking menu to food service...");
      await axios.put(`${BASE_URL}/Foodservice/${foodServiceId}`, { menu: menuItemIds });

      alert(`Food service saved with ${menuItemIds.length} menu item(s)!`);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || "Something went wrong."));
    } finally {
      setIsSaving(false); setSaveProgress("");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container">

      {/* ── LANDING ──────────────────────────────────────────────────────────── */}
      {!showForm && (
        <>
          <div className="header">
            <h1>It's easy to get started on Food Service</h1>
          </div>
          <div className="steps">
            {[
              { img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=250&fit=crop", num: 1, title: "Tell us about your Kitchen", desc: "Share your kitchen type, operating hours, and delivery options." },
              { img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=250&fit=crop", num: 2, title: "Set your location & add photos", desc: "Pin your kitchen on the map and upload icon and cover images." },
              { img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop", num: 3, title: "Build your menu & save", desc: "Add dishes with photos, prices, categories, and dietary info." },
            ].map(s => (
              <div key={s.num} className="step">
                <img src={s.img} className="step-image" alt={`step${s.num}`} />
                <div className="step-content">
                  <div className="step-number">{s.num}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-description">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="button-container">
            <button className="get-started-btn" onClick={handleGetStarted}>Get Started</button>
          </div>
        </>
      )}

      {/* ── FORM ─────────────────────────────────────────────────────────────── */}
      {showForm && (
        <>
          <div className="header">
            <h1>List your Food Service</h1>
            <button className="exit-btn" onClick={handleExit}><IoClose className="close-icon" /></button>
          </div>

          {/* Progress */}
          <div className="progress-bar-container">
            <div className="progress-steps">
              {[{num:1,label:"Details"},{num:2,label:"Location"},{num:3,label:"Photos"},{num:4,label:"Menu"},{num:5,label:"Save"}]
                .map((step, idx, arr) => (
                  <React.Fragment key={step.num}>
                    <div className={`progress-step ${currentStep >= step.num ? "active" : ""}`}>
                      <span className="progress-step-number">{step.num}</span>
                      <span className="progress-step-label">{step.label}</span>
                    </div>
                    {idx < arr.length - 1 && <div className={`progress-line ${currentStep > step.num ? "active" : ""}`} />}
                  </React.Fragment>
                ))}
            </div>
          </div>

          {/* ── STEP 1 ─────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="form-container">
              <h2 className="form-title">Tell us about your Kitchen</h2>

              <div className="form-group">
                <label>Kitchen Name (Max 60) *</label>
                <input type="text" className="form-input" value={kitchenName}
                  onChange={e => setKitchenName(e.target.value)}
                  placeholder="e.g., Mama's Home Kitchen" maxLength={60} />
              </div>

              <div className="form-group">
                <label>Description (Max 300) *</label>
                <textarea className="form-textarea" rows="4" value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your food service..." maxLength={300} />
              </div>

              {/* Service Type – visual card picker */}
              <div className="form-group">
                <label>Service Type *</label>
                <div className="service-type-grid">
                  {SERVICE_TYPES.map(t => (
                    <button
                      key={t.key} type="button"
                      className={`service-type-card ${serviceType === t.key ? "selected" : ""}`}
                      onClick={() => setServiceType(t.key)}
                    >
                      <span className="service-type-emoji">{t.emoji}</span>
                      <span className="service-type-name">{t.key}</span>
                      <span className="service-type-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Operating Hours – dropdowns */}
              <div className="form-group">
                <label>Operating Hours *</label>
                <div className="time-picker-row">
                  <div className="time-picker-group">
                    <span className="time-picker-label">Opens</span>
                    <select className="form-input time-select"
                      value={operatingHours.open}
                      onChange={e => setOperatingHours(p => ({ ...p, open: e.target.value }))}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="time-picker-divider">→</div>
                  <div className="time-picker-group">
                    <span className="time-picker-label">Closes</span>
                    <select className="form-input time-select"
                      value={operatingHours.close}
                      onChange={e => setOperatingHours(p => ({ ...p, close: e.target.value }))}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Service Options – visual toggle cards */}
              <div className="form-group">
                <label>Service Options *</label>
                <div className="service-option-row">
                  <button
                    type="button"
                    className={`service-option-card ${deliveryAvailable ? "active" : ""}`}
                    onClick={() => setDeliveryAvailable(p => !p)}
                  >
                    <span className="service-option-icon">🛵</span>
                    <span className="service-option-name">Delivery</span>
                    <span className={`service-option-badge ${deliveryAvailable ? "on" : "off"}`}>
                      {deliveryAvailable ? "ON" : "OFF"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`service-option-card ${pickupAvailable ? "active" : ""}`}
                    onClick={() => setPickupAvailable(p => !p)}
                  >
                    <span className="service-option-icon">🛍️</span>
                    <span className="service-option-name">Pickup</span>
                    <span className={`service-option-badge ${pickupAvailable ? "on" : "off"}`}>
                      {pickupAvailable ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="form-navigation">
                <button className="btn-next" onClick={handleNextStep}>Next</button>
              </div>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="form-container">
              <h2 className="form-title">Set your Kitchen Location</h2>
              <p className="field-hint" style={{ marginBottom: 12 }}>Click on the map to pin your kitchen location</p>

              <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
                <div className="map-wrapper">
                  <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                    zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                    <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                  </GoogleMap>
                </div>
              </LoadScript>

              <div className="quick-locations">
                <button className="quick-location-btn" onClick={handleSLIITLocation}>📍 SLIIT University</button>
                <button className="quick-location-btn" onClick={handleUseCurrentLocation}>🎯 Use My Location</button>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Address *</label>
                <textarea className="form-input" rows="2" value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Your full address will appear here after clicking the map, or type it manually..." />
              </div>

              <div className="form-navigation">
                <button className="btn-prev" onClick={handlePreviousStep}>Previous</button>
                <button className="btn-next" onClick={handleNextStep}>Next</button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ─────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="form-container">
              <h2 className="form-title">Make it stand out</h2>

              <input type="file" accept="image/*" ref={updatePhotoRef}
                style={{ display: "none" }} onChange={handleUpdateKitchenPhoto} />

              <div className="form-group">
                <label>Kitchen Icon Image *</label>
                <p className="field-hint">A logo or icon shown in food service listings</p>
                {!iconPreview ? (
                  <div className="photo-upload-area" onClick={() => document.getElementById("icon-upload").click()}>
                    <input type="file" accept="image/*" id="icon-upload" style={{ display: "none" }} onChange={handleIconUpload} />
                    <button type="button" className="photo-upload-btn">
                      {isUploading ? "Uploading..." : "+ Upload Icon Image"}
                    </button>
                  </div>
                ) : (
                  <div className="single-photo-preview">
                    <img src={iconPreview} alt="icon" className="preview-img icon-preview" />
                    <div className="photo-actions">
                      <button type="button" className="action-btn delete" onClick={() => handleDeleteKitchenPhoto("icon")}><FaTrash /></button>
                      <button type="button" className="action-btn update" onClick={() => triggerKitchenUpdate("icon")}><FaSyncAlt /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Kitchen Background / Cover Image *</label>
                <p className="field-hint">A wide banner showcasing your kitchen or food</p>
                {!bgPreview ? (
                  <div className="photo-upload-area" onClick={() => document.getElementById("bg-upload").click()}>
                    <input type="file" accept="image/*" id="bg-upload" style={{ display: "none" }} onChange={handleBgUpload} />
                    <button type="button" className="photo-upload-btn">
                      {isUploading ? "Uploading..." : "+ Upload Background Image"}
                    </button>
                  </div>
                ) : (
                  <div className="single-photo-preview">
                    <img src={bgPreview} alt="bg" className="preview-img bg-preview" />
                    <div className="photo-actions">
                      <button type="button" className="action-btn delete" onClick={() => handleDeleteKitchenPhoto("bg")}><FaTrash /></button>
                      <button type="button" className="action-btn update" onClick={() => triggerKitchenUpdate("bg")}><FaSyncAlt /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-navigation">
                <button className="btn-prev" onClick={handlePreviousStep}>Previous</button>
                <button className="btn-next" onClick={handleNextStep}>Next</button>
              </div>
            </div>
          )}

          {/* ── STEP 4 ─────────────────────────────────────────────────────────── */}
          {currentStep === 4 && (
            <div className="form-container">
              <h2 className="form-title">Build your Menu</h2>

              {menuItems.map((item, index) => (
                <div key={index} className="menu-item-card">
                  <div className="menu-item-header">
                    <h3>Item {index + 1}</h3>
                    <button type="button" className="remove-item-btn" onClick={() => removeMenuItem(index)}>
                      <FaTrash /> Remove
                    </button>
                  </div>

                  {/* Photo */}
                  <div className="form-group">
                    <label>Item Photo</label>
                    {!item.imagePreview ? (
                      <div className="photo-upload-area menu-item-photo-area"
                        onClick={() => menuImageRefs.current[index]?.click()}>
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          ref={el => (menuImageRefs.current[index] = el)}
                          onChange={e => handleMenuItemImageUpload(index, e)} />
                        <button type="button" className="photo-upload-btn">
                          {item.imageUploading ? "Uploading..." : "+ Upload Item Photo"}
                        </button>
                      </div>
                    ) : (
                      <div className="menu-item-img-preview">
                        <img src={item.imagePreview} alt={`item-${index}`} className="menu-item-img" />
                        <div className="photo-actions">
                          <button type="button" className="action-btn delete" onClick={() => handleMenuItemImageDelete(index)}><FaTrash /></button>
                          <button type="button" className="action-btn update" onClick={() => triggerMenuItemUpdate(index)}><FaSyncAlt /></button>
                        </div>
                        {item.imageUploading && <div className="img-uploading-overlay">Updating...</div>}
                      </div>
                    )}
                  </div>

                  {/* Name + Category */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Item Name *</label>
                      <input type="text" className="form-input" value={item.name}
                        onChange={e => updateMenuItem(index, "name", e.target.value)}
                        placeholder="e.g., Grilled Chicken Rice" />
                    </div>
                    <div className="form-group">
                      <label>Category *</label>
                      <select className="form-input" value={item.category}
                        onChange={e => updateMenuItem(index, "category", e.target.value)}>
                        {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input type="text" className="form-input" value={item.description}
                      onChange={e => updateMenuItem(index, "description", e.target.value)}
                      placeholder="Brief description of the dish..." />
                  </div>

                  {/* Price + Prep Time */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Price (LKR 100 – 10,000) *</label>
                      <input type="number" className="form-input" value={item.price}
                        onChange={e => updateMenuItem(index, "price", e.target.value)}
                        min="100" max="10000" placeholder="e.g., 350" />
                    </div>
                    <div className="form-group">
                      <label>Prep Time (1–120 mins) *</label>
                      <input type="number" className="form-input" value={item.prepTime}
                        onChange={e => updateMenuItem(index, "prepTime", e.target.value)}
                        min="1" max="120" />
                    </div>
                  </div>

                  {/* Available Hours – dropdowns */}
                  <div className="form-group">
                    <label>Available Hours</label>
                    <div className="time-picker-row">
                      <div className="time-picker-group">
                        <span className="time-picker-label">From</span>
                        <select className="form-input time-select"
                          value={item.AvailableHours.open}
                          onChange={e => updateMenuItemHours(index, "open", e.target.value)}>
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="time-picker-divider">→</div>
                      <div className="time-picker-group">
                        <span className="time-picker-label">Until</span>
                        <select className="form-input time-select"
                          value={item.AvailableHours.close}
                          onChange={e => updateMenuItemHours(index, "close", e.target.value)}>
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Dietary Tags – visual pill buttons */}
                  <div className="form-group">
                    <label>Dietary Tags</label>
                    <div className="dietary-tags-row">
                      {DIETARY_TAGS.map(tag => {
                        const active = item.dietaryTags.includes(tag.key);
                        return (
                          <button
                            key={tag.key} type="button"
                            className="dietary-tag-btn"
                            style={{
                              background: active ? tag.bg : "#f5f5f5",
                              color:      active ? tag.color : "#888",
                              border:     `2px solid ${active ? tag.color : "#e0e0e0"}`,
                              fontWeight: active ? 700 : 500,
                            }}
                            onClick={() => toggleDietaryTag(index, tag.key)}
                          >
                            <span>{tag.emoji}</span>
                            <span>{tag.key}</span>
                            {active && <span className="tag-check">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Availability toggle */}
                  <div className="form-group">
                    <div
                      className={`availability-toggle ${item.isAvailable ? "available" : "unavailable"}`}
                      onClick={() => updateMenuItem(index, "isAvailable", !item.isAvailable)}
                    >
                      <div className="availability-toggle-dot" />
                      <span>{item.isAvailable ? "Item is currently available" : "Item is unavailable"}</span>
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" className="add-item-btn" onClick={addMenuItem}>
                + Add Another Menu Item
              </button>

              <div className="form-navigation">
                <button className="btn-prev" onClick={handlePreviousStep}>Previous</button>
                <button className="btn-next" onClick={handleNextStep}>Next</button>
              </div>
            </div>
          )}

          {/* ── STEP 5 ─────────────────────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div className="form-container">
              <h2 className="form-title">Review & Save</h2>

              <div className="summary-card">
                <h3>Kitchen Summary</h3>
                <div className="summary-row"><span>Kitchen Name</span><strong>{kitchenName}</strong></div>
                <div className="summary-row"><span>Service Type</span><strong>{serviceType}</strong></div>
                <div className="summary-row"><span>Operating Hours</span><strong>{operatingHours.open} – {operatingHours.close}</strong></div>
                <div className="summary-row"><span>Delivery</span><strong>{deliveryAvailable ? "✅ Yes" : "❌ No"}</strong></div>
                <div className="summary-row"><span>Pickup</span><strong>{pickupAvailable ? "✅ Yes" : "❌ No"}</strong></div>
                <div className="summary-row"><span>Address</span><strong>{address}</strong></div>
                <div className="summary-row"><span>Menu Items</span><strong>{menuItems.length} item(s)</strong></div>
              </div>

              <div className="summary-card">
                <h3>Menu Preview</h3>
                {menuItems.map((item, i) => (
                  <div key={i} className="menu-preview-row">
                    {item.imagePreview
                      ? <img src={item.imagePreview} alt={item.name} className="menu-preview-thumb" />
                      : <div className="menu-preview-thumb menu-preview-no-img">🍽️</div>}
                    <span className="menu-preview-name">{item.name || `Item ${i + 1}`}</span>
                    <span className="menu-preview-cat">{item.category}</span>
                    <span className="menu-preview-price">LKR {Number(item.price || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="verification-section">
                <h3>Verification</h3>
                <label className="checkbox-label">
                  <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                  I confirm that all information provided is accurate
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                  I agree to the Terms of Service
                </label>
              </div>

              {isSaving && saveProgress && (
                <div className="save-progress">
                  <div className="save-progress-spinner" />
                  <span>{saveProgress}</span>
                </div>
              )}

              <div className="form-navigation">
                <button className="btn-prev" onClick={handlePreviousStep} disabled={isSaving}>Previous</button>
                <button className="btn-publish" onClick={handleSaveListing} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Listing"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AddFoodService;
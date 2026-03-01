import React, { useState, useCallback, useRef } from "react";
import "./AddAccommodation.css";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaSyncAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import axios from "axios";
import {
  Home, Users, BedDouble, Bath, Wifi, Car, Wind, UtensilsCrossed,
  Tv, Dumbbell, Waves, Camera, ShieldCheck, MapPin, Crosshair,
  ChevronRight, ChevronLeft, CheckCircle, Loader2, Upload,
  Image as ImageIcon, Building2, DoorOpen, Zap, Droplets,
  CigaretteOff, VolumeX, PartyPopper, PawPrint,
} from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL = "http://localhost:8000";
const CURRENT_USER_ID = localStorage.getItem("CurrentUserId") ?? "";

const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES = ["places"];
const mapContainerStyle = { width: "100%", height: "420px", borderRadius: "10px" };
const defaultOptions = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
};

const ACC_TYPES = [
  { key: "Private Room",  icon: DoorOpen,    desc: "Your own private room" },
  { key: "Shared Room",   icon: Users,       desc: "Share with others"     },
  { key: "Apartment",     icon: Building2,   desc: "Full apartment"        },
  { key: "House",         icon: Home,        desc: "Entire house"          },
];

const GENDER_OPTIONS = [
  { key: "mixed", label: "Mixed",       desc: "Boys & Girls" },
  { key: "boys",  label: "Boys Only",   desc: "Male tenants" },
  { key: "girls", label: "Girls Only",  desc: "Female tenants" },
];

const AMENITY_LIST = [
  { key: "WiFi",    icon: Wifi          },
  { key: "Kitchen", icon: UtensilsCrossed },
  { key: "Parking", icon: Car           },
  { key: "AC",      icon: Wind          },
  { key: "Washer",  icon: Droplets      },
  { key: "CCTV",   icon: Camera        },
  { key: "TV",      icon: Tv            },
  { key: "Gym",     icon: Dumbbell      },
  { key: "Pool",    icon: Waves         },
];

const RULE_LIST = [
  { key: "No Smoking",           icon: CigaretteOff  },
  { key: "Quiet hours after 10 PM", icon: VolumeX    },
  { key: "No Party",             icon: PartyPopper   },
  { key: "No Pets",              icon: PawPrint      },
];

const STEPS = [
  { num: 1, label: "Details"  },
  { num: 2, label: "Location" },
  { num: 3, label: "Photos"   },
  { num: 4, label: "Save"     },
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Component ───────────────────────────────────────────────────────────────
const AddAccommodation = () => {
  const navigate      = useNavigate();
  const updateInputRef = useRef(null);

  const [currentStep,  setCurrentStep]  = useState(1);
  const [showForm,     setShowForm]     = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);

  // Step 1 — Details
  const [genderPref,   setGenderPref]   = useState("mixed");
  const [accType,      setAccType]      = useState("Private Room");
  const [rooms,        setRooms]        = useState(1);
  const [beds,         setBeds]         = useState(1);
  const [bathrooms,    setBathrooms]    = useState(1);
  const [utilities,    setUtilities]    = useState({ electricity: false, water: false });
  const [amenities,    setAmenities]    = useState([]);

  // Step 2 — Location
  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("SLIIT University, Malabe, Sri Lanka");
  const [map,                 setMap]                 = useState(null);
  const [autocomplete,        setAutocomplete]        = useState(null);
  const [searchInput,         setSearchInput]         = useState("");
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  // Step 3 — Photos + Title/Description
  const [photos,           setPhotos]           = useState([]);
  const [uploadedImageIds, setUploadedImageIds] = useState([]);
  const [isUploading,      setIsUploading]      = useState(false);
  const [updatingIndex,    setUpdatingIndex]    = useState(null);
  const [title,            setTitle]            = useState("");
  const [description,      setDescription]      = useState("");

  // Step 4 — Pricing + Rules
  const [price,       setPrice]       = useState("");
  const [keyDuration, setKeyDuration] = useState(0);
  const [rules,       setRules]       = useState([]);
  const [otherRules,  setOtherRules]  = useState("");
  const [isVerified,  setIsVerified]  = useState(false);
  const [isAgreed,    setIsAgreed]    = useState(false);

  const calculatedKeyMoney = price && keyDuration ? Number(price) * Number(keyDuration) : 0;
  const distanceFromSLIIT  = calculateDistance(selectedLocation.lat, selectedLocation.lng, SLIIT_LOCATION.lat, SLIIT_LOCATION.lng);

  const getFormattedDistance = () =>
    distanceFromSLIIT < 1 ? `${Math.round(distanceFromSLIIT * 1000)} meters` : `${distanceFromSLIIT.toFixed(1)} km`;

  const clampValue = (value, min, max, setter) => {
    if (value === "") return;
    const num = Number(value);
    setter(num < min ? min : num > max ? max : num);
  };

  const toggleAmenity = (name) => setAmenities(p => p.includes(name) ? p.filter(a => a !== name) : [...p, name]);
  const toggleRule    = (name) => setRules(p => p.includes(name) ? p.filter(r => r !== name) : [...p, name]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleExit       = () => navigate("/");
  const handleGetStarted = () => setShowForm(true);

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (rooms < 1 || rooms > 10)     return alert("Rooms must be 1–10.");
      if (beds < 1 || beds > 10)       return alert("Beds must be 1–10.");
      if (bathrooms < 1 || bathrooms > 10) return alert("Bathrooms must be 1–10.");
    }
    if (currentStep === 2) {
      if (!hasSelectedLocation) return alert("Please pin your location on the map.");
    }
    if (currentStep === 3) {
      if (uploadedImageIds.length === 0) return alert("Please upload at least one photo.");
      if (!title.trim())        return alert("Title cannot be empty.");
      if (title.length > 50)   return alert("Title cannot exceed 50 characters.");
      if (!description.trim()) return alert("Description cannot be empty.");
      if (description.length > 200) return alert("Description cannot exceed 200 characters.");
    }
    setCurrentStep(s => s + 1);
  };
  const handlePreviousStep = () => setCurrentStep(s => s - 1);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveListing = async () => {
    const numPrice = Number(price);
    const numKey   = Number(keyDuration);
    if (!hasSelectedLocation)               return alert("Please select a location.");
    if (uploadedImageIds.length === 0)      return alert("Please upload at least one photo.");
    if (numPrice < 5000 || numPrice > 50000) return alert("Price must be LKR 5,000–50,000.");
    if (numKey < 0 || numKey > 3)           return alert("Key money duration must be 0–3 months.");
    if (!isVerified || !isAgreed)           return alert("Please confirm accuracy and agree to terms.");

    setIsSaving(true);
    const payload = {
      owner: CURRENT_USER_ID,
      title, description, address,
      location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
      distance: getFormattedDistance(),
      pricePerMonth: numPrice, keyMoneyDuration: numKey,
      genderPreference: genderPref, accommodationType: accType,
      bedrooms: Number(rooms), beds: Number(beds), bathrooms: Number(bathrooms),
      amenities,
      rules: otherRules ? [...rules, otherRules] : rules,
      utilityBills: { electricityIncluded: utilities.electricity, waterIncluded: utilities.water },
      images: uploadedImageIds,
    };
    try {
      const res = await axios.post(`${BASE_URL}/Accommodation`, payload);
      if (res.data) {
        alert("Accommodation saved successfully!");
        navigate("/Listings");
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Check required fields."));
    } finally { setIsSaving(false); }
  };

  // ── Photo handlers ────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    for (const file of files) {
      const fd = new FormData(); fd.append("photo", file);
      try {
        const res = await axios.post(`${BASE_URL}/Photo`, fd);
        if (res.data.success) {
          setPhotos(p => [...p, URL.createObjectURL(file)]);
          setUploadedImageIds(p => [...p, res.data.data._id]);
        }
      } catch { alert("Upload failed."); }
    }
    setIsUploading(false); e.target.value = null;
  };

  const handleDeletePhoto = async (index) => {
    try {
      await axios.delete(`${BASE_URL}/Photo/${uploadedImageIds[index]}`);
      setPhotos(p => p.filter((_, i) => i !== index));
      setUploadedImageIds(p => p.filter((_, i) => i !== index));
    } catch { alert("Failed to delete image."); }
  };

  const triggerUpdate = (index) => { setUpdatingIndex(index); updateInputRef.current.click(); };

  const handlePhotoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || updatingIndex === null) return;
    setIsUploading(true);
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.put(`${BASE_URL}/Photo/${uploadedImageIds[updatingIndex]}`, fd);
      if (res.data.success) {
        const updated = [...photos]; updated[updatingIndex] = URL.createObjectURL(file);
        setPhotos(updated);
      }
    } catch { alert("Failed to update photo."); }
    finally { setIsUploading(false); setUpdatingIndex(null); e.target.value = null; }
  };

  // ── Map handlers ──────────────────────────────────────────────────────────
  const onMapLoad          = useCallback(m => setMap(m), []);
  const onAutocompleteLoad = (ac) => setAutocomplete(ac);

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (place.geometry?.location) {
      const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      const addr = place.formatted_address || place.name;
      setAddress(addr); setSearchInput(addr);
      if (map) { map.panTo(loc); map.setZoom(17); }
    }
  };

  const onMapClick = (e) => {
    const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) {
        setAddress(results[0].formatted_address);
        setSearchInput(results[0].formatted_address);
      }
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
          setSearchInput(results[0].formatted_address);
        }
      });
      if (map) { map.panTo(loc); map.setZoom(17); }
    });
  };

  const handleSLIITLocation = () => {
    setSelectedLocation(SLIIT_LOCATION); setHasSelectedLocation(true);
    setAddress("SLIIT University, Malabe, Sri Lanka");
    setSearchInput("SLIIT University, Malabe, Sri Lanka");
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Counter helper ────────────────────────────────────────────────────────
  const Counter = ({ label, value, setter, min = 1, max = 10 }) => (
    <div className="aac-counter">
      <span className="aac-counter__label">{label}</span>
      <div className="aac-counter__controls">
        <button type="button" className="aac-counter__btn"
          onClick={() => setter(v => Math.max(min, Number(v) - 1))} disabled={Number(value) <= min}>−</button>
        <span className="aac-counter__val">{value}</span>
        <button type="button" className="aac-counter__btn"
          onClick={() => setter(v => Math.min(max, Number(v) + 1))} disabled={Number(value) >= max}>+</button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="aac-root">

      {/* ── Top Bar ── */}
      <div className={`aac-topbar${!showForm ? " dark" : ""}`}>
        <div className="aac-topbar__brand">
          <div className="aac-topbar__dot"><Home size={15} /></div>
          Add<span>Accommodation</span>
        </div>
        <button className="aac-exit-btn" onClick={handleExit}>
          <IoClose size={14} /> Exit
        </button>
      </div>

      {/* ── LANDING ── */}
      {!showForm && (
        <div className="aac-hero">
          <div className="aac-hero__bg" />
          <div className="aac-hero__overlay" />
          <div className="aac-hero__content">
            <p className="aac-hero__eyebrow">List your space on Uni Sewana</p>
            <h1 className="aac-hero__title">Host students.<br /><em>Earn every month.</em></h1>
            <p className="aac-hero__sub">
              List your boarding, apartment, or private room and connect directly with SLIIT students looking for accommodation nearby.
            </p>
            <button className="aac-hero__cta" onClick={handleGetStarted}>
              Get started <ChevronRight size={17} />
            </button>
            {/* <div className="aac-hero__steps">
              {[
                { num: "01", title: "Tell us about your place", desc: "Rooms, type, amenities & preferences" },
                { num: "02", title: "Pin your location",       desc: "Set exact map location near SLIIT"   },
                { num: "03", title: "Add photos & pricing",    desc: "Showcase your space, set your price" },
              ].map(s => (
                <div key={s.num} className="aac-hero__step">
                  <div className="aac-hero__step-num">{s.num}</div>
                  <div>
                    <div className="aac-hero__step-title">{s.title}</div>
                    <div className="aac-hero__step-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div> */}
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <>
          {/* Progress Bar */}
          <div className="aac-progress-wrapper">
            <div className="aac-progress-steps">
              {STEPS.map((step, idx) => {
                const done   = currentStep > step.num;
                const active = currentStep === step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div className={`aac-progress-step${active ? " active" : ""}${done ? " done" : ""}`}>
                      <div className="aac-progress-bubble">
                        {done ? <CheckCircle size={16} /> : step.num}
                      </div>
                      <span className="aac-progress-label">{step.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="aac-progress-line">
                        <div className="aac-progress-line-fill" style={{ width: done ? "100%" : "0%" }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="aac-layout">

            {/* ══ STEP 1 — Details ══ */}
            {currentStep === 1 && (
              <div className="aac-card">
                <div className="aac-card__title">About your accommodation</div>
                <div className="aac-card__subtitle">Basic details students will see on your listing</div>

                {/* Accommodation Type */}
                <div className="aac-field">
                  <label className="aac-label">Accommodation type <span>*</span></label>
                  <div className="aac-type-grid">
                    {ACC_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.key} type="button"
                          className={`aac-type-card${accType === t.key ? " selected" : ""}`}
                          onClick={() => setAccType(t.key)}>
                          <div className="aac-type-icon"><Icon size={18} /></div>
                          <span className="aac-type-name">{t.key}</span>
                          <span className="aac-type-desc">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gender Preference */}
                <div className="aac-field">
                  <label className="aac-label">Accommodation for <span>*</span></label>
                  <div className="aac-option-row">
                    {GENDER_OPTIONS.map(g => (
                      <button key={g.key} type="button"
                        className={`aac-option-card${genderPref === g.key ? " active" : ""}`}
                        onClick={() => setGenderPref(g.key)}>
                        <div className="aac-option-icon-box"><Users size={16} /></div>
                        <div className="aac-option-info">
                          <span className="aac-option-name">{g.label}</span>
                          <span className="aac-option-desc">{g.desc}</span>
                        </div>
                        {genderPref === g.key && (
                          <CheckCircle size={16} style={{ color: "#e67e22", flexShrink: 0 }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="aac-divider" />

                {/* Counters */}
                <div className="aac-field">
                  <label className="aac-label">Capacity <span>(1–10 each)</span></label>
                  <div className="aac-counters-row">
                    <Counter label="Bedrooms" value={rooms}     setter={setRooms}     />
                    <Counter label="Beds"     value={beds}      setter={setBeds}      />
                    <Counter label="Bathrooms" value={bathrooms} setter={setBathrooms} />
                  </div>
                </div>

                <div className="aac-divider" />

                {/* Utility Bills */}
                <div className="aac-field">
                  <label className="aac-label">Utilities included</label>
                  <div className="aac-utility-row">
                    <button type="button"
                      className={`aac-utility-card${utilities.electricity ? " active" : ""}`}
                      onClick={() => setUtilities(u => ({ ...u, electricity: !u.electricity }))}>
                      <Zap size={18} />
                      <span>Electricity</span>
                      <span className={`aac-badge${utilities.electricity ? " on" : " off"}`}>
                        {utilities.electricity ? "Included" : "Not incl."}
                      </span>
                    </button>
                    <button type="button"
                      className={`aac-utility-card${utilities.water ? " active" : ""}`}
                      onClick={() => setUtilities(u => ({ ...u, water: !u.water }))}>
                      <Droplets size={18} />
                      <span>Water</span>
                      <span className={`aac-badge${utilities.water ? " on" : " off"}`}>
                        {utilities.water ? "Included" : "Not incl."}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="aac-divider" />

                {/* Amenities */}
                <div className="aac-field">
                  <label className="aac-label">Amenities <span>select all that apply</span></label>
                  <div className="aac-amenities-grid">
                    {AMENITY_LIST.map(({ key, icon: Icon }) => {
                      const active = amenities.includes(key);
                      return (
                        <button key={key} type="button"
                          className={`aac-amenity-item${active ? " active" : ""}`}
                          onClick={() => toggleAmenity(key)}>
                          <Icon size={15} />
                          <span>{key}</span>
                          {active && <CheckCircle size={12} className="aac-amenity-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="aac-nav">
                  <div />
                  <button className="aac-btn-primary" onClick={handleNextStep}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2 — Location ══ */}
            {currentStep === 2 && (
              <div className="aac-card">
                <div className="aac-card__title">Set your location</div>
                <div className="aac-card__subtitle">Click the map or search to pin your exact position</div>

                <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
                  {/* Search */}
                  <div className="aac-field">
                    <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                      <input type="text" className="aac-input" placeholder="Search near SLIIT…"
                        value={searchInput} onChange={e => setSearchInput(e.target.value)} />
                    </Autocomplete>
                  </div>

                  {/* Map */}
                  <div className="aac-map-wrapper">
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                      zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                      <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                    </GoogleMap>
                  </div>
                </LoadScript>

                {/* Quick Buttons */}
                <div className="aac-map-actions">
                  <button className="aac-map-btn" onClick={handleSLIITLocation}>
                    <MapPin size={14} /> SLIIT University
                  </button>
                  <button className="aac-map-btn" onClick={handleUseCurrentLocation}>
                    <Crosshair size={14} /> Use my location
                  </button>
                </div>

                {/* Distance Badge */}
                {hasSelectedLocation && (
                  <div className="aac-distance-badge">
                    <MapPin size={14} />
                    <span>
                      <strong>
                        {distanceFromSLIIT < 1
                          ? `${Math.round(distanceFromSLIIT * 1000)}m`
                          : `${distanceFromSLIIT.toFixed(2)}km`}
                      </strong> from SLIIT University
                    </span>
                  </div>
                )}

                {/* Address */}
                <div className="aac-field" style={{ marginTop: 16 }}>
                  <label className="aac-label">Address <span>*</span></label>
                  <textarea className="aac-textarea" rows="2" value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Full address will auto-fill after clicking the map…" />
                </div>

                <div className="aac-nav">
                  <button className="aac-btn-secondary" onClick={handlePreviousStep}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="aac-btn-primary" onClick={handleNextStep}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 3 — Photos ══ */}
            {currentStep === 3 && (
              <div className="aac-card">
                <div className="aac-card__title">Make it stand out</div>
                <div className="aac-card__subtitle">Photos upload immediately — add at least one to continue</div>

                <input type="file" accept="image/*" ref={updateInputRef}
                  style={{ display: "none" }} onChange={handlePhotoUpdate} />

                {/* Upload Zone */}
                <div className="aac-field">
                  <label className="aac-label">Photos <span>* at least 1 required</span></label>
                  <div className="aac-upload-zone" onClick={() => document.getElementById("acc-photo-upload").click()}>
                    <input type="file" multiple accept="image/*" id="acc-photo-upload"
                      style={{ display: "none" }} onChange={handlePhotoUpload} />
                    <div className="aac-upload-icon">
                      {isUploading ? <Loader2 size={20} className="aac-spin" /> : <Upload size={20} />}
                    </div>
                    <div className="aac-upload-text">
                      {isUploading ? "Uploading…" : "Click to upload photos"}
                    </div>
                    <div className="aac-upload-hint">PNG, JPG — up to 5 photos</div>
                  </div>
                </div>

                {/* Photo Grid */}
                {photos.length > 0 && (
                  <div className="aac-photo-grid">
                    {[0, 1, 2, 3, 4].map(index => (
                      <div key={index} className="aac-photo-box">
                        {photos[index] ? (
                          <div className="aac-photo-box__inner">
                            <img src={photos[index]} alt={`photo-${index}`} />
                            <div className="aac-photo-box__actions">
                              <button type="button" className="aac-icon-btn del"
                                onClick={() => handleDeletePhoto(index)}>
                                <FaTrash size={11} />
                              </button>
                              <button type="button" className="aac-icon-btn upd"
                                onClick={() => triggerUpdate(index)}>
                                <FaSyncAlt size={11} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="aac-photo-box__empty">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="aac-divider" />

                {/* Title */}
                <div className="aac-field">
                  <label className="aac-label">Title <span>* max 50 characters</span></label>
                  <input className="aac-input" type="text" value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Cozy private room near SLIIT" maxLength={50} />
                  <div className="aac-field-footer">
                    <span className={`aac-char-count${title.length > 40 ? " warn" : ""}`}>{title.length}/50</span>
                  </div>
                </div>

                {/* Description */}
                <div className="aac-field">
                  <label className="aac-label">Description <span>* max 200 characters</span></label>
                  <textarea className="aac-textarea" rows="4" value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what makes your place great — location, vibe, what's nearby…"
                    maxLength={200} />
                  <div className="aac-field-footer">
                    <span className={`aac-char-count${description.length > 170 ? " warn" : ""}`}>{description.length}/200</span>
                  </div>
                </div>

                <div className="aac-nav">
                  <button className="aac-btn-secondary" onClick={handlePreviousStep}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="aac-btn-primary" onClick={handleNextStep}>
                    Next <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 4 — Pricing & Save ══ */}
            {currentStep === 4 && (
              <div className="aac-card">
                <div className="aac-card__title">Finish up and save</div>
                <div className="aac-card__subtitle">Set your price, house rules, and confirm your listing</div>

                {/* Pricing */}
                <div className="aac-row">
                  <div className="aac-field">
                    <label className="aac-label">Price / month (LKR) <span>* 5,000–50,000</span></label>
                    <input className="aac-input" type="number" value={price}
                      onChange={e => setPrice(e.target.value)}
                      onBlur={e => clampValue(e.target.value, 5000, 50000, setPrice)}
                      placeholder="15,000" min="5000" max="50000" />
                  </div>
                  <div className="aac-field">
                    <label className="aac-label">Key money <span>* 0–3 months</span></label>
                    <input className="aac-input" type="number" value={keyDuration}
                      onChange={e => setKeyDuration(e.target.value)}
                      onBlur={e => clampValue(e.target.value, 0, 3, setKeyDuration)}
                      placeholder="0" min="0" max="3" />
                  </div>
                </div>

                {calculatedKeyMoney > 0 && (
                  <div className="aac-key-money-info">
                    <span>🔑 Key money total:</span>
                    <strong>LKR {calculatedKeyMoney.toLocaleString()}</strong>
                  </div>
                )}

                <div className="aac-divider" />

                {/* House Rules */}
                <div className="aac-field">
                  <label className="aac-label">House rules</label>
                  <div className="aac-rules-grid">
                    {RULE_LIST.map(({ key, icon: Icon }) => {
                      const active = rules.includes(key);
                      return (
                        <button key={key} type="button"
                          className={`aac-rule-item${active ? " active" : ""}`}
                          onClick={() => toggleRule(key)}>
                          <Icon size={15} />
                          <span>{key}</span>
                          {active && <CheckCircle size={12} className="aac-rule-check" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="aac-field">
                  <label className="aac-label">Other rules <span>optional</span></label>
                  <textarea className="aac-textarea" rows="2" value={otherRules}
                    onChange={e => setOtherRules(e.target.value)}
                    placeholder="e.g. No loud music after 11 PM, no overnight guests…" />
                </div>

                <div className="aac-divider" />

                {/* Verification */}
                <div className="aac-verify-section">
                  <div className="aac-verify-section__title">Confirmation</div>
                  <label className="aac-check-label">
                    <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                    I confirm that all information provided is accurate and up to date.
                  </label>
                  <label className="aac-check-label" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                    I agree to the Terms of Service and Bodima hosting guidelines.
                  </label>
                </div>

                <div className="aac-nav">
                  <button className="aac-btn-secondary" onClick={handlePreviousStep} disabled={isSaving}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="aac-btn-save" onClick={handleSaveListing}
                    disabled={isSaving || !isVerified || !isAgreed}>
                    {isSaving
                      ? <><Loader2 size={15} className="aac-spin" /> Saving…</>
                      : <><CheckCircle size={15} /> Save listing</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default AddAccommodation;
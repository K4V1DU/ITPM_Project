import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import axios from "axios";
import "./AccommodationEdit.css";
import {
  X, Home, MapPin, Bed, Bath, Zap, Droplets, Wifi, Car,
  Wind, Tv, Dumbbell, Waves, Camera, UtensilsCrossed,
  Trash2, Plus, Users, User, Upload, RefreshCw,
  CheckCircle, Loader2, ChevronRight, ChevronLeft,
  Crosshair, AlertCircle, Pencil, ImagePlus, Key,
} from "lucide-react";
import { MdApartment, MdHouse, MdBedroomParent, MdKey } from "react-icons/md";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL            = "http://localhost:8000";
const SLIIT_LOCATION      = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES           = ["places"];
const mapContainerStyle   = { width: "100%", height: "420px", borderRadius: "10px" };
const defaultOptions      = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
};

const ACCOMMODATION_TYPES = [
  { key: "Apartment",    icon: MdApartment,    desc: "Flat or apartment unit"  },
  { key: "House",        icon: MdHouse,        desc: "Full house or annex"     },
  { key: "Shared Room",  icon: MdBedroomParent,desc: "Room shared with others" },
  { key: "Private Room", icon: MdKey,          desc: "Your own private room"   },
];

const GENDER_OPTIONS = [
  { key: "boys",  label: "Boys Only",  icon: User  },
  { key: "girls", label: "Girls Only", icon: User  },
  { key: "mixed", label: "Mixed",      icon: Users },
];

const AMENITY_LIST = [
  { key: "WiFi",    icon: Wifi            },
  { key: "Kitchen", icon: UtensilsCrossed },
  { key: "Parking", icon: Car             },
  { key: "AC",      icon: Wind            },
  { key: "Washer",  icon: Droplets        },
  { key: "CCTV",    icon: Camera          },
  { key: "TV",      icon: Tv              },
  { key: "Gym",     icon: Dumbbell        },
  { key: "Pool",    icon: Waves           },
];

const STEPS = [
  { num: 1, label: "Details"   },
  { num: 2, label: "Location"  },
  { num: 3, label: "Photos"    },
  { num: 4, label: "Amenities" },
  { num: 5, label: "Review"    },
];

// ─── Component ────────────────────────────────────────────────────────────────
function AccommodationEdit() {
  const navigate = useNavigate();
  const { id }   = useParams();

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving,    setIsSaving]    = useState(false);

  // Step 1 – Details
  const [title,               setTitle]               = useState("");
  const [description,         setDescription]         = useState("");
  const [accommodationType,   setAccommodationType]   = useState("Apartment");
  const [genderPreference,    setGenderPreference]    = useState("mixed");
  const [bedrooms,            setBedrooms]            = useState(1);
  const [beds,                setBeds]                = useState(1);
  const [bathrooms,           setBathrooms]           = useState(1);
  const [pricePerMonth,       setPricePerMonth]       = useState("");
  const [keyMoneyDuration,    setKeyMoneyDuration]    = useState(0);
  const [electricityIncluded, setElectricityIncluded] = useState(false);
  const [waterIncluded,       setWaterIncluded]       = useState(false);
  const [newRule,             setNewRule]             = useState("");
  const [rules,               setRules]               = useState([]);

  // Step 2 – Location
  const [map,                 setMap]                 = useState(null);
  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);
  const [distance,            setDistance]            = useState("Distance not available");

  // Step 3 – Photos
  const fileInputRef   = useRef(null);
  const updateInputRef = useRef(null);
  const [photos,           setPhotos]           = useState([]);
  const [uploadedImageIds, setUploadedImageIds] = useState([]);
  const [isUploading,      setIsUploading]      = useState(false);
  const [updatingIndex,    setUpdatingIndex]    = useState(null);

  // Step 4 – Amenities
  const [amenities, setAmenities] = useState([]);

  // Step 5 – Review
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setLoadError("No accommodation ID provided."); setIsLoading(false); return; }
    const fetchData = async () => {
      try {
        const res  = await axios.get(`${BASE_URL}/accommodation/${id}`);
        const data = res.data.data;
        setTitle(data.title || "");
        setDescription(data.description || "");
        setAccommodationType(data.accommodationType || "Apartment");
        setGenderPreference(data.genderPreference || "mixed");
        setBedrooms(data.bedrooms || 1);
        setBeds(data.beds || 1);
        setBathrooms(data.bathrooms || 1);
        setPricePerMonth(data.pricePerMonth?.toString() || "");
        setKeyMoneyDuration(data.keyMoneyDuration || 0);
        setElectricityIncluded(data.utilityBills?.electricityIncluded ?? false);
        setWaterIncluded(data.utilityBills?.waterIncluded ?? false);
        setRules(data.rules || []);
        setAddress(data.address || "");
        setAmenities(data.amenities || []);
        if (data.location?.coordinates) {
          const [lng, lat] = data.location.coordinates;
          setSelectedLocation({ lat, lng });
          setHasSelectedLocation(true);
        }
        if (data.images?.length) {
          setUploadedImageIds(data.images);
          setPhotos(data.images.map(imgId => `${BASE_URL}/photo/${imgId}`));
        }
        setIsLoading(false);
      } catch {
        setLoadError("Failed to load accommodation data. Please try again.");
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Distance ──────────────────────────────────────────────────────────────
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R    = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const d    = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d > 1000 ? (d / 1000).toFixed(2) + " km" : Math.round(d) + " m";
  };

  useEffect(() => {
    setDistance(calcDistance(SLIIT_LOCATION.lat, SLIIT_LOCATION.lng, selectedLocation.lat, selectedLocation.lng));
  }, [selectedLocation]);

  // ── Map ───────────────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);
  const onMapClick = (e) => {
    const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) setAddress(results[0].formatted_address);
    });
  };
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      if (map) { map.panTo(loc); map.setZoom(17); }
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status === "OK" && results[0]) setAddress(results[0].formatted_address);
      });
    });
  };
  const handleSLIIT = () => {
    setSelectedLocation(SLIIT_LOCATION); setHasSelectedLocation(true);
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Photos ────────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (uploadedImageIds.length + files.length > 5) return alert("Max 5 images.");
    setIsUploading(true);
    for (const file of files) {
      const fd = new FormData(); fd.append("photo", file);
      try {
        const res = await axios.post(`${BASE_URL}/photo`, fd);
        if (res.data.success) {
          setPhotos(p => [...p, URL.createObjectURL(file)]);
          setUploadedImageIds(p => [...p, res.data.data._id]);
        }
      } catch { console.error("Upload failed"); }
    }
    setIsUploading(false);
  };
  const handleDeletePhoto = async (index) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await axios.delete(`${BASE_URL}/photo/${uploadedImageIds[index]}`);
      setPhotos(p => p.filter((_, i) => i !== index));
      setUploadedImageIds(p => p.filter((_, i) => i !== index));
    } catch { alert("Delete failed."); }
  };
  const triggerUpdate = (index) => { setUpdatingIndex(index); updateInputRef.current.click(); };
  const handlePhotoUpdate = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsUploading(true);
    const fd = new FormData(); fd.append("photo", file);
    try {
      const res = await axios.put(`${BASE_URL}/photo/${uploadedImageIds[updatingIndex]}`, fd);
      if (res.data.success) {
        const updated = [...photos]; updated[updatingIndex] = URL.createObjectURL(file); setPhotos(updated);
      }
    } catch { alert("Update failed."); }
    finally { setIsUploading(false); }
  };

  // ── Amenities ─────────────────────────────────────────────────────────────
  const toggleAmenity = (key) =>
    setAmenities(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim())       return alert("Property title is required.");
      if (!description.trim()) return alert("Description is required.");
      if (!pricePerMonth || Number(pricePerMonth) < 1) return alert("Please enter a valid monthly rent.");
    }
    if (currentStep === 2) {
      if (!hasSelectedLocation) return alert("Please pin your property location on the map.");
      if (!address.trim())      return alert("Please enter the address.");
    }
    if (currentStep === 3) {
      if (uploadedImageIds.length === 0) return alert("Please upload at least one photo.");
    }
    setCurrentStep(s => s + 1);
  };
  const handlePrev = () => setCurrentStep(s => s - 1);
  const handleExit = () => navigate(-1);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isVerified || !isAgreed) return alert("Please confirm accuracy and agree to terms.");
    setIsSaving(true);
    try {
      await axios.put(`${BASE_URL}/accommodation/${id}`, {
        title, description, address,
        accommodationType, genderPreference,
        bedrooms: Number(bedrooms), beds: Number(beds), bathrooms: Number(bathrooms),
        pricePerMonth: Number(pricePerMonth), keyMoneyDuration: Number(keyMoneyDuration),
        utilityBills: { electricityIncluded, waterIncluded },
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        distance, amenities, rules, images: uploadedImageIds,
      });
      alert("Accommodation updated successfully!");
      navigate(-1);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Something went wrong."));
    } finally { setIsSaving(false); }
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (isLoading) return (
    <div className="ae-root">
      <div className="ae-topbar">
        <div className="ae-topbar-brand">
          <div className="ae-topbar-brand-dot"><Home size={15} /></div>
          Manage <span>Listing</span>
        </div>
        <button className="ae-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>
      <div className="ae-state-screen">
        <Loader2 size={32} className="ae-spin" color="#e67e22" />
        <p>Loading accommodation data…</p>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="ae-root">
      <div className="ae-topbar">
        <div className="ae-topbar-brand">
          <div className="ae-topbar-brand-dot"><Home size={15} /></div>
          Manage <span>Listing</span>
        </div>
        <button className="ae-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>
      <div className="ae-state-screen">
        <AlertCircle size={32} color="#c0392b" />
        <p style={{ color: "#c0392b", fontWeight: 500 }}>{loadError}</p>
        <button className="ae-btn-back" onClick={handleExit}>Go Back</button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="ae-root">

      {/* ── Top Bar ── */}
      <div className="ae-topbar">
<a href="/Listings" className="hn-nav__logo">
            <img
              src="/images/logo2.png"
              alt="Unisewana Logo"
              style={{ height: "32px", width: "auto", display: "block"  }}
            />
            
          </a>



        <div className="ae-topbar-center">
          <Pencil size={13} />
          <span>Editing listing</span>
          <div className="ae-topbar-center-dot" />
          <span style={{ color: "#1c1c1e", fontWeight: 700 }}>{title || "…"}</span>
        </div>
        <button className="ae-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>

      {/* ── Progress Bar ── */}
      <div className="ae-progress-wrapper">
        <div className="ae-progress-steps">
          {STEPS.map((step, idx) => {
            const done   = currentStep > step.num;
            const active = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <div className={`ae-progress-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                  <div className="ae-progress-bubble">
                    {done ? <CheckCircle size={16} /> : step.num}
                  </div>
                  <span className="ae-progress-label">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="ae-progress-line">
                    <div className="ae-progress-line-fill" style={{ width: done ? "100%" : "0%" }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="ae-layout">

        {/* ══ STEP 1 — Details ══ */}
        {currentStep === 1 && (
          <div className="ae-card">
            <div className="ae-card-title">Property details</div>
            <div className="ae-card-subtitle">Update the basic information about your accommodation</div>

            <div className="ae-field">
              <label className="ae-label">Property title <span>*</span></label>
              <input className="ae-input" type="text" value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cozy 2-Bedroom Apartment near SLIIT" maxLength={80} />
              <div className="ae-field-footer">
                <span className={`ae-char-count ${title.length > 65 ? "warn" : ""}`}>{title.length}/80</span>
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Description <span>*</span></label>
              <textarea className="ae-textarea" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your property — location perks, room quality, nearby facilities…"
                maxLength={400} />
              <div className="ae-field-footer">
                <span className={`ae-char-count ${description.length > 320 ? "warn" : ""}`}>{description.length}/400</span>
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Accommodation type <span>*</span></label>
              <div className="ae-type-grid">
                {ACCOMMODATION_TYPES.map(t => {
                  const TypeIcon = t.icon;
                  return (
                  <button key={t.key} type="button"
                    className={`ae-type-card ${accommodationType === t.key ? "selected" : ""}`}
                    onClick={() => setAccommodationType(t.key)}>
                    <div className="ae-type-icon-box"><TypeIcon size={24} /></div>
                    <span className="ae-type-name">{t.key}</span>
                    <span className="ae-type-desc">{t.desc}</span>
                  </button>
                  );
                })}
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Gender preference <span>*</span></label>
              <div className="ae-option-row">
                {GENDER_OPTIONS.map(g => {
                  const Icon   = g.icon;
                  const active = genderPreference === g.key;
                  return (
                    <button key={g.key} type="button"
                      className={`ae-option-card ${active ? "active" : ""}`}
                      onClick={() => setGenderPreference(g.key)}>
                      <div className="ae-option-icon-box"><Icon size={18} /></div>
                      <span className="ae-option-name">{g.label}</span>
                      <span className={`ae-badge ${active ? "on" : "off"}`}>{active ? "✓" : "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">Room configuration</label>
              <div className="ae-three-cols">
                <div>
                  <label className="ae-sub-label">Bedrooms</label>
                  <input className="ae-input" type="number" min="1" max="10"
                    value={bedrooms} onChange={e => setBedrooms(e.target.value)} />
                </div>
                <div>
                  <label className="ae-sub-label">Beds</label>
                  <input className="ae-input" type="number" min="1" max="10"
                    value={beds} onChange={e => setBeds(e.target.value)} />
                </div>
                <div>
                  <label className="ae-sub-label">Bathrooms</label>
                  <input className="ae-input" type="number" min="1" max="10"
                    value={bathrooms} onChange={e => setBathrooms(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">Pricing</label>
              <div className="ae-row">
                <div>
                  <label className="ae-sub-label">Rent / month (LKR) <span>*</span></label>
                  <input className="ae-input" type="number" value={pricePerMonth}
                    onChange={e => setPricePerMonth(e.target.value)} placeholder="e.g. 25000" />
                </div>
                <div>
                  <label className="ae-sub-label">Key money (months)</label>
                  <input className="ae-input" type="number" min="0" max="6"
                    value={keyMoneyDuration} onChange={e => setKeyMoneyDuration(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="ae-field">
              <label className="ae-label">Utility bills included</label>
              <div className="ae-option-row">
                <button type="button"
                  className={`ae-option-card ${electricityIncluded ? "active" : ""}`}
                  onClick={() => setElectricityIncluded(p => !p)}>
                  <div className="ae-option-icon-box"><Zap size={18} /></div>
                  <span className="ae-option-name">Electricity</span>
                  <span className={`ae-badge ${electricityIncluded ? "on" : "off"}`}>{electricityIncluded ? "Incl." : "Excl."}</span>
                </button>
                <button type="button"
                  className={`ae-option-card ${waterIncluded ? "active" : ""}`}
                  onClick={() => setWaterIncluded(p => !p)}>
                  <div className="ae-option-icon-box"><Droplets size={18} /></div>
                  <span className="ae-option-name">Water</span>
                  <span className={`ae-badge ${waterIncluded ? "on" : "off"}`}>{waterIncluded ? "Incl." : "Excl."}</span>
                </button>
              </div>
            </div>

            <div className="ae-divider" />

            <div className="ae-field">
              <label className="ae-label">House rules <span>(optional)</span></label>
              <div className="ae-rule-input-row">
                <input className="ae-input" placeholder="e.g. No smoking, No pets…"
                  value={newRule} onChange={e => setNewRule(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newRule.trim()) {
                      setRules(p => [...p, newRule.trim()]); setNewRule("");
                    }
                  }} />
                <button className="ae-add-rule-btn" type="button" onClick={() => {
                  if (newRule.trim()) { setRules(p => [...p, newRule.trim()]); setNewRule(""); }
                }}><Plus size={16} /></button>
              </div>
              {rules.length > 0 && (
                <div className="ae-rules-list">
                  {rules.map((rule, i) => (
                    <div key={i} className="ae-rule-chip">
                      <CheckCircle size={12} />
                      <span>{rule}</span>
                      <button type="button" className="ae-rule-del"
                        onClick={() => setRules(p => p.filter((_, idx) => idx !== i))}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ae-nav">
              <div />
              <button className="ae-btn-primary" onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 2 — Location ══ */}
        {currentStep === 2 && (
          <div className="ae-card">
            <div className="ae-card-title">Property location</div>
            <div className="ae-card-subtitle">Click the map to pin your property's exact position</div>

            {mapLoadError ? (
              <div className="ae-map-error">
                <MapPin size={22} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Map failed to load</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>Check your internet connection and reload.</div>
                </div>
              </div>
            ) : !mapIsLoaded ? (
              <div className="ae-map-loading">
                <Loader2 size={22} className="ae-spin" />
                <span>Loading map…</span>
              </div>
            ) : (
              <div className="ae-map-wrapper">
                <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                  zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                  <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                </GoogleMap>
              </div>
            )}

            <div className="ae-map-actions">
              <button className="ae-map-btn" onClick={handleSLIIT}><MapPin size={14} /> SLIIT University</button>
              <button className="ae-map-btn" onClick={handleCurrentLocation}><Crosshair size={14} /> Use my location</button>
            </div>

            {hasSelectedLocation && (
              <div className="ae-distance-badge">
                <MapPin size={13} />
                <span><strong>{distance}</strong> from SLIIT University</span>
              </div>
            )}

            <div className="ae-field" style={{ marginTop: 16 }}>
              <label className="ae-label">Address <span>*</span></label>
              <textarea className="ae-textarea" rows="2" value={address}
                onChange={e => setAddress(e.target.value)} placeholder="Full address…" />
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev}><ChevronLeft size={15} /> Previous</button>
              <button className="ae-btn-primary" onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — Photos ══ */}
        {currentStep === 3 && (
          <div className="ae-card">
            <div className="ae-card-title">Property photos</div>
            <div className="ae-card-subtitle">Upload up to 5 photos — the first photo is used as the cover</div>

            <input type="file" multiple accept="image/*" ref={fileInputRef} hidden onChange={handlePhotoUpload} />
            <input type="file" accept="image/*" ref={updateInputRef} hidden onChange={handlePhotoUpdate} />

            <div className="ae-upload-zone" onClick={() => fileInputRef.current.click()}>
              <div className="ae-upload-icon">
                {isUploading ? <Loader2 size={18} className="ae-spin" /> : <Upload size={18} />}
              </div>
              <div className="ae-upload-text">{isUploading ? "Uploading…" : "Click to upload photos"}</div>
              <div className="ae-upload-hint">PNG, JPG — up to 5 photos · {uploadedImageIds.length}/5 uploaded</div>
            </div>

            {/* ── 5 photo slots always on one row ── */}
            <div className="ae-photo-grid">
              {[0, 1, 2, 3, 4].map(index => (
                <div key={index} className="ae-photo-box">
                  {photos[index] ? (
                    <div className="ae-photo-box-inner">
                      {index === 0 && <div className="ae-photo-cover-badge">Cover</div>}
                      <img src={photos[index]} alt={`photo-${index}`} />
                      <div className="ae-photo-box-actions">
                        <button type="button" className="ae-icon-btn del" onClick={() => handleDeletePhoto(index)}>
                          <Trash2 size={12} />
                        </button>
                        <button type="button" className="ae-icon-btn upd" onClick={() => triggerUpdate(index)}>
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ae-photo-box-empty" onClick={() => fileInputRef.current.click()}>
                      <Plus size={18} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev}><ChevronLeft size={15} /> Previous</button>
              <button className="ae-btn-primary" onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 4 — Amenities ══ */}
        {currentStep === 4 && (
          <div className="ae-card">
            <div className="ae-card-title">Amenities</div>
            <div className="ae-card-subtitle">Select all facilities available at your property</div>

            <div className="ae-amenities-grid">
              {AMENITY_LIST.map(({ key, icon: Icon }) => {
                const active = amenities.includes(key);
                return (
                  <button key={key} type="button"
                    className={`ae-amenity-item ${active ? "active" : ""}`}
                    onClick={() => toggleAmenity(key)}>
                    <div className="ae-amenity-icon-box"><Icon size={16} /></div>
                    <span>{key}</span>
                    {active && <CheckCircle size={13} className="ae-amenity-check" />}
                  </button>
                );
              })}
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev}><ChevronLeft size={15} /> Previous</button>
              <button className="ae-btn-primary" onClick={handleNext}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ══ STEP 5 — Review ══ */}
        {currentStep === 5 && (
          <div className="ae-card">
            <div className="ae-card-title">Review & save</div>
            <div className="ae-card-subtitle">Confirm everything looks right before saving changes</div>

            {/* Preview card */}
            <div className="ae-section-label">Listing preview</div>
            <div className="ae-preview-card">
              {photos[0]
                ? <img src={photos[0]} alt="cover" className="ae-preview-cover" />
                : <div className="ae-preview-cover-placeholder"><ImagePlus size={28} color="#555" /></div>
              }
              <div className="ae-preview-body">
                <div className="ae-preview-name">{title || "Your Property Title"}</div>
                <div className="ae-preview-meta">
                  <span><MapPin size={12} /> {address ? address.split(",")[0] : "Location not set"}</span>
                  <span><Zap size={12} /> LKR {Number(pricePerMonth || 0).toLocaleString()} / month</span>
                </div>
                <div className="ae-preview-chips">
                  <span className="ae-chip orange">{accommodationType}</span>
                  <span className="ae-chip dark">{genderPreference === "boys" ? "Boys Only" : genderPreference === "girls" ? "Girls Only" : "Mixed"}</span>
                  {electricityIncluded && <span className="ae-chip dark"><Zap size={11} /> Electricity incl.</span>}
                  {waterIncluded      && <span className="ae-chip dark"><Droplets size={11} /> Water incl.</span>}
                </div>
              </div>
            </div>

            <div className="ae-divider" />

            {/* Summary table */}
            <div style={{ marginBottom: 24 }}>
              <div className="ae-section-label">Property details</div>
              <table className="ae-summary-table">
                <tbody>
                  {[
                    ["Title",      title],
                    ["Type",       accommodationType],
                    ["Gender",     genderPreference === "boys" ? "Boys Only" : genderPreference === "girls" ? "Girls Only" : "Mixed"],
                    ["Bedrooms",   bedrooms],
                    ["Beds",       beds],
                    ["Bathrooms",  bathrooms],
                    ["Rent",       `LKR ${Number(pricePerMonth || 0).toLocaleString()} / month`],
                    ["Key money",  keyMoneyDuration > 0 ? `${keyMoneyDuration} month(s)` : "None"],
                    ["Distance",   distance],
                    ["Address",    address],
                    ["Amenities",  amenities.length > 0 ? amenities.join(", ") : "None selected"],
                    ["Rules",      rules.length > 0 ? rules.join(", ") : "None"],
                    ["Photos",     `${uploadedImageIds.length} uploaded`],
                  ].map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ae-divider" />

            {/* Confirmation */}
            <div style={{ marginBottom: 20 }}>
              <div className="ae-section-label">Confirmation</div>
              <label className="ae-check-label">
                <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                I confirm all updated information is accurate and up to date.
              </label>
              <label className="ae-check-label" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                I agree to the Terms of Service and listing guidelines.
              </label>
            </div>

            <div className="ae-nav">
              <button className="ae-btn-secondary" onClick={handlePrev} disabled={isSaving}>
                <ChevronLeft size={15} /> Previous
              </button>
              <button className="ae-btn-save-final" onClick={handleSave} disabled={isSaving || !isVerified || !isAgreed}>
                {isSaving
                  ? <><Loader2 size={15} className="ae-spin" /> Saving…</>
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

export default AccommodationEdit;
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import axios from "axios";
import "./AccommodationEdit.css";
import {
  ArrowLeft, Pencil, X, Home, MapPin, Bed, Bath,
  Zap, Droplets, Wifi, Car, Wind, Tv, Dumbbell, Waves,
  Camera, UtensilsCrossed, Trash2, Plus, Users, User,
  ImagePlus, Upload, RefreshCw, CheckCircle, Loader2,
} from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const mapContainerStyle = { width: "100%", height: "100%" };
const defaultOptions = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
};

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


const AccommodationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading,       setLoading]       = useState(true);
  const [editMode,      setEditMode]      = useState({});
  const [newRule,       setNewRule]       = useState("");
  const [isUploading,   setIsUploading]   = useState(false);
  const [updatingIndex, setUpdatingIndex] = useState(null);
  const [isSaving,      setIsSaving]      = useState(false);
  const [map,           setMap]           = useState(null);

  const fileInputRef   = useRef(null);
  const updateInputRef = useRef(null);

  const [photos,           setPhotos]           = useState([]);
  const [uploadedImageIds, setUploadedImageIds] = useState([]);

  const [formData, setFormData] = useState({
    title: "", description: "", address: "",
    accommodationType: "Apartment", genderPreference: "mixed",
    bedrooms: 1, beds: 1, bathrooms: 1,
    pricePerMonth: 0, keyMoneyDuration: 0,
    utilityBills: { electricityIncluded: false, waterIncluded: false },
    location: { type: "Point", coordinates: [79.9727, 6.9147] },
    amenities: [], rules: [],
    distance: "Distance not available",
    images: [], isAvailable: true,
  });

  // Derived lat/lng for Google Maps (Mongoose stores [lng, lat])
  const markerPos = {
    lat: formData.location.coordinates[1] ?? SLIIT_LOCATION.lat,
    lng: formData.location.coordinates[0] ?? SLIIT_LOCATION.lng,
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/accommodation/${id}`);
        if (res.data.success) {
          const data = res.data.data;
          setFormData({ ...data });
          if (data.images) {
            setUploadedImageIds(data.images);
            setPhotos(data.images.map(imgId => `http://localhost:8000/photo/${imgId}`));
          }
        }
      } catch { alert("Could not load listing data."); }
      finally { setLoading(false); }
    };
    fetchAccommodation();
  }, [id]);

  // ── Distance (coordinates stored as [lng, lat]) ───────────────────────────
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d > 1000 ? (d / 1000).toFixed(2) + " km" : Math.round(d) + " meters";
  };

  useEffect(() => {
    if (!loading) {
      const [lng, lat] = formData.location.coordinates;
      setFormData(p => ({
        ...p,
        distance: calculateDistance(SLIIT_LOCATION.lat, SLIIT_LOCATION.lng, lat, lng),
      }));
    }
  }, [formData.location.coordinates, loading]);

  // ── Google Maps handlers ──────────────────────────────────────────────────
  const onMapLoad = useCallback(m => setMap(m), []);

  const onMapClick = (e) => {
    if (!editMode.loc) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    update("location", { ...formData.location, coordinates: [lng, lat] });
    // Reverse geocode for address
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) update("address", results[0].formatted_address);
    });
  };

  const onMarkerDragEnd = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    update("location", { ...formData.location, coordinates: [lng, lat] });
    new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) update("address", results[0].formatted_address);
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const updateData = { ...formData, images: uploadedImageIds };
      const res = await axios.put(`http://localhost:8000/accommodation/${id}`, updateData);
      if (res.data.success) { alert("Updated successfully!"); navigate(-1); }
    } catch { alert("Update failed."); }
    finally { setIsSaving(false); }
  };

  // ── Photos ────────────────────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (uploadedImageIds.length + files.length > 5) return alert("Max 5 images.");
    setIsUploading(true);
    for (const file of files) {
      const fd = new FormData(); fd.append("photo", file);
      try {
        const res = await axios.post("http://localhost:8000/photo", fd);
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
      await axios.delete(`http://localhost:8000/photo/${uploadedImageIds[index]}`);
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
      const res = await axios.put(`http://localhost:8000/photo/${uploadedImageIds[updatingIndex]}`, fd);
      if (res.data.success) {
        const updated = [...photos]; updated[updatingIndex] = URL.createObjectURL(file);
        setPhotos(updated);
      }
    } catch { alert("Update failed."); }
    finally { setIsUploading(false); }
  };

  const toggleEdit   = (s) => setEditMode(p => ({ ...p, [s]: !p[s] }));
  const update       = (field, val) => setFormData(p => ({ ...p, [field]: val }));
  const toggleAmenity = (name) => {
    const updated = formData.amenities.includes(name)
      ? formData.amenities.filter(a => a !== name)
      : [...formData.amenities, name];
    update("amenities", updated);
  };

  const genderIcon = (g) => g === "boys" ? <User size={13} /> : g === "girls" ? <User size={13} /> : <Users size={13} />;
  const genderLabel = (g) => g === "boys" ? "Boys Only" : g === "girls" ? "Girls Only" : "Mixed";

  if (loading) return (
    <div className="ae-loading">
      <Loader2 size={28} className="ae-spin" />
      <span>Loading listing…</span>
    </div>
  );

  return (
    <div className="ae-root">

      {/* ── Top Bar ── */}
      <div className="ae-topbar">
        <div className="ae-topbar__left">
          <button className="ae-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>
          <div className="ae-topbar__brand">
            <div className="ae-topbar__dot"><Home size={14} /></div>
            Manage <span>Listing</span>
          </div>
        </div>
        <button className="ae-btn-save" onClick={handleUpdate} disabled={isSaving || isUploading}>
          {isSaving
            ? <><Loader2 size={14} className="ae-spin" /> Saving…</>
            : <><CheckCircle size={14} /> Update listing</>}
        </button>
      </div>

      <div className="ae-layout">

        {/* ── Section: Property Info ── */}
        <div className="ae-card">
          <div className="ae-card__header">
            <div className="ae-card__header-left">
              <div className="ae-section-icon"><Home size={15} /></div>
              <span className="ae-card__title">Property Info</span>
            </div>
            <button className="ae-edit-btn" onClick={() => toggleEdit("basic")}>
              {editMode.basic ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit</>}
            </button>
          </div>

          {editMode.basic ? (
            <div className="ae-form">
              <div className="ae-field">
                <label className="ae-label">Title</label>
                <input className="ae-input" value={formData.title} onChange={e => update("title", e.target.value)} placeholder="Listing title" />
              </div>
              <div className="ae-field">
                <label className="ae-label">Address</label>
                <input className="ae-input" value={formData.address} onChange={e => update("address", e.target.value)} placeholder="Full address" />
              </div>
              <div className="ae-row">
                <div className="ae-field">
                  <label className="ae-label">Type</label>
                  <select className="ae-select" value={formData.accommodationType} onChange={e => update("accommodationType", e.target.value)}>
                    <option value="Apartment">Apartment</option>
                    <option value="House">House</option>
                    <option value="Shared Room">Shared Room</option>
                    <option value="Private Room">Private Room</option>
                  </select>
                </div>
                <div className="ae-field">
                  <label className="ae-label">Gender preference</label>
                  <select className="ae-select" value={formData.genderPreference} onChange={e => update("genderPreference", e.target.value)}>
                    <option value="boys">Boys Only</option>
                    <option value="girls">Girls Only</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
              <div className="ae-field">
                <label className="ae-label">Description</label>
                <textarea className="ae-textarea" rows="3" value={formData.description} onChange={e => update("description", e.target.value)} placeholder="Describe your place…" />
              </div>
              <div className="ae-three-cols">
                <div className="ae-field">
                  <label className="ae-label">Bedrooms</label>
                  <input className="ae-input" type="number" min="1" max="10" value={formData.bedrooms} onChange={e => update("bedrooms", e.target.value)} />
                </div>
                <div className="ae-field">
                  <label className="ae-label">Beds</label>
                  <input className="ae-input" type="number" min="1" max="10" value={formData.beds} onChange={e => update("beds", e.target.value)} />
                </div>
                <div className="ae-field">
                  <label className="ae-label">Bathrooms</label>
                  <input className="ae-input" type="number" min="1" max="10" value={formData.bathrooms} onChange={e => update("bathrooms", e.target.value)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="ae-view">
              <h3 className="ae-view__title">{formData.title || "Untitled Listing"}</h3>
              <p className="ae-view__address"><MapPin size={13} /> {formData.address}</p>
              <div className="ae-badge-row">
                <span className="ae-badge type">{formData.accommodationType}</span>
                <span className={`ae-badge gender ${formData.genderPreference}`}>
                  {genderIcon(formData.genderPreference)} {genderLabel(formData.genderPreference)}
                </span>
              </div>
              {formData.description && <p className="ae-view__desc">{formData.description}</p>}
              <div className="ae-stats-row">
                <div className="ae-stat"><Home size={15} /><span>{formData.bedrooms} Bedrooms</span></div>
                <div className="ae-stat"><Bed size={15} /><span>{formData.beds} Beds</span></div>
                <div className="ae-stat"><Bath size={15} /><span>{formData.bathrooms} Bathrooms</span></div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section: Photos ── */}
        <div className="ae-card">
          <div className="ae-card__header">
            <div className="ae-card__header-left">
              <div className="ae-section-icon"><ImagePlus size={15} /></div>
              <span className="ae-card__title">Photos</span>
              <span className="ae-card__count">{uploadedImageIds.length}/5</span>
              {isUploading && <Loader2 size={14} className="ae-spin ae-uploading-indicator" />}
            </div>
          </div>

          <input type="file" multiple accept="image/*" ref={fileInputRef} hidden onChange={handlePhotoUpload} />
          <input type="file" accept="image/*" ref={updateInputRef} hidden onChange={handlePhotoUpdate} />

          <div className="ae-upload-zone" onClick={() => fileInputRef.current.click()}>
            <div className="ae-upload-icon">
              {isUploading ? <Loader2 size={18} className="ae-spin" /> : <Upload size={18} />}
            </div>
            <span className="ae-upload-text">{isUploading ? "Uploading…" : "Click to upload photos"}</span>
            <span className="ae-upload-hint">PNG, JPG — up to 5 photos</span>
          </div>

          <div className="ae-photo-grid">
            {[0, 1, 2, 3, 4].map(index => (
              <div key={index} className="ae-photo-box">
                {photos[index] ? (
                  <div className="ae-photo-box__inner">
                    <img src={photos[index]} alt={`photo-${index}`} />
                    <div className="ae-photo-box__actions">
                      <button type="button" className="ae-icon-btn del" onClick={() => handleDeletePhoto(index)}>
                        <Trash2 size={12} />
                      </button>
                      <button type="button" className="ae-icon-btn upd" onClick={() => triggerUpdate(index)}>
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ae-photo-box__empty" onClick={() => fileInputRef.current.click()}>
                    <Plus size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section: Amenities ── */}
        <div className="ae-card">
          <div className="ae-card__header">
            <div className="ae-card__header-left">
              <div className="ae-section-icon"><Wifi size={15} /></div>
              <span className="ae-card__title">Amenities</span>
            </div>
            <button className="ae-edit-btn" onClick={() => toggleEdit("amenities")}>
              {editMode.amenities ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit</>}
            </button>
          </div>

          {editMode.amenities ? (
            <div className="ae-amenities-grid">
              {AMENITY_LIST.map(({ key, icon: Icon }) => {
                const active = formData.amenities.includes(key);
                return (
                  <button key={key} type="button"
                    className={`ae-amenity-item${active ? " active" : ""}`}
                    onClick={() => toggleAmenity(key)}>
                    <Icon size={15} />
                    <span>{key}</span>
                    {active && <CheckCircle size={12} className="ae-amenity-check" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ae-tags-row">
              {formData.amenities.length > 0
                ? formData.amenities.map(a => <span key={a} className="ae-tag">{a}</span>)
                : <p className="ae-no-data">No amenities listed</p>}
            </div>
          )}
        </div>

        {/* ── Section: Location ── */}
        <div className="ae-card">
          <div className="ae-card__header">
            <div className="ae-card__header-left">
              <div className="ae-section-icon"><MapPin size={15} /></div>
              <span className="ae-card__title">Location</span>
            </div>
            <button className="ae-edit-btn" onClick={() => toggleEdit("loc")}>
              {editMode.loc ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit</>}
            </button>
          </div>

          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <div className="ae-map-wrapper">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={markerPos}
                zoom={16}
                options={defaultOptions}
                onLoad={onMapLoad}
                onClick={onMapClick}
              >
                <Marker
                  position={markerPos}
                  draggable={!!editMode.loc}
                  onDragEnd={onMarkerDragEnd}
                />
              </GoogleMap>
            </div>
          </LoadScript>

          {editMode.loc && (
            <p className="ae-map-hint">Drag the marker to update your exact location.</p>
          )}

          <div className="ae-distance-badge">
            <MapPin size={13} />
            <span><strong>{formData.distance}</strong> from SLIIT University</span>
          </div>
        </div>

        {/* ── Section: Pricing & Utilities ── */}
        <div className="ae-card">
          <div className="ae-card__header">
            <div className="ae-card__header-left">
              <div className="ae-section-icon"><Zap size={15} /></div>
              <span className="ae-card__title">Pricing & Utilities</span>
            </div>
            <button className="ae-edit-btn" onClick={() => toggleEdit("price")}>
              {editMode.price ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit</>}
            </button>
          </div>

          {editMode.price ? (
            <div className="ae-form">
              <div className="ae-row">
                <div className="ae-field">
                  <label className="ae-label">Rent / month (LKR)</label>
                  <input className="ae-input" type="number" value={formData.pricePerMonth}
                    onChange={e => update("pricePerMonth", e.target.value)} />
                </div>
                <div className="ae-field">
                  <label className="ae-label">Key money (months)</label>
                  <input className="ae-input" type="number" min="0" max="3" value={formData.keyMoneyDuration}
                    onChange={e => update("keyMoneyDuration", e.target.value)} />
                </div>
              </div>
              <div className="ae-field">
                <label className="ae-label">Included in rent</label>
                <div className="ae-utility-row">
                  <button type="button"
                    className={`ae-utility-card${formData.utilityBills.electricityIncluded ? " active" : ""}`}
                    onClick={() => update("utilityBills", { ...formData.utilityBills, electricityIncluded: !formData.utilityBills.electricityIncluded })}>
                    <Zap size={16} />
                    <span>Electricity</span>
                    <span className={`ae-badge-sm${formData.utilityBills.electricityIncluded ? " on" : " off"}`}>
                      {formData.utilityBills.electricityIncluded ? "Incl." : "Excl."}
                    </span>
                  </button>
                  <button type="button"
                    className={`ae-utility-card${formData.utilityBills.waterIncluded ? " active" : ""}`}
                    onClick={() => update("utilityBills", { ...formData.utilityBills, waterIncluded: !formData.utilityBills.waterIncluded })}>
                    <Droplets size={16} />
                    <span>Water</span>
                    <span className={`ae-badge-sm${formData.utilityBills.waterIncluded ? " on" : " off"}`}>
                      {formData.utilityBills.waterIncluded ? "Incl." : "Excl."}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="ae-view">
              <div className="ae-price-row">
                <span className="ae-price-main">LKR {Number(formData.pricePerMonth).toLocaleString()}</span>
                <span className="ae-price-unit">/ month</span>
              </div>
              {formData.keyMoneyDuration > 0 && (
                <div className="ae-key-money-info">
                  🔑 Key money: <strong>LKR {(formData.pricePerMonth * formData.keyMoneyDuration).toLocaleString()}</strong>
                  <span className="ae-key-months">({formData.keyMoneyDuration} months)</span>
                </div>
              )}
              <div className="ae-utility-chips">
                <span className={`ae-utility-chip${formData.utilityBills.electricityIncluded ? " inc" : " exc"}`}>
                  <Zap size={12} /> Electricity {formData.utilityBills.electricityIncluded ? "Included" : "Excluded"}
                </span>
                <span className={`ae-utility-chip${formData.utilityBills.waterIncluded ? " inc" : " exc"}`}>
                  <Droplets size={12} /> Water {formData.utilityBills.waterIncluded ? "Included" : "Excluded"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Section: House Rules ── */}
        <div className="ae-card">
          <div className="ae-card__header">
            <div className="ae-card__header-left">
              <div className="ae-section-icon"><CheckCircle size={15} /></div>
              <span className="ae-card__title">House Rules</span>
            </div>
            <button className="ae-edit-btn" onClick={() => toggleEdit("rules")}>
              {editMode.rules ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit</>}
            </button>
          </div>

          {editMode.rules ? (
            <div className="ae-rules-edit">
              <div className="ae-rule-input-row">
                <input className="ae-input" placeholder="Add a rule (e.g. No pets)"
                  value={newRule} onChange={e => setNewRule(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newRule.trim()) {
                      update("rules", [...formData.rules, newRule.trim()]);
                      setNewRule("");
                    }
                  }} />
                <button className="ae-btn-add-rule" type="button" onClick={() => {
                  if (newRule.trim()) { update("rules", [...formData.rules, newRule.trim()]); setNewRule(""); }
                }}><Plus size={16} /></button>
              </div>
              <div className="ae-rules-list">
                {formData.rules.map((rule, i) => (
                  <div key={i} className="ae-rule-item-edit">
                    <span>{rule}</span>
                    <button type="button" className="ae-rule-delete"
                      onClick={() => update("rules", formData.rules.filter((_, idx) => idx !== i))}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="ae-view">
              {formData.rules.length > 0 ? (
                <div className="ae-rules-view">
                  {formData.rules.map((r, i) => (
                    <div key={i} className="ae-rule-chip">
                      <CheckCircle size={12} /> {r}
                    </div>
                  ))}
                </div>
              ) : <p className="ae-no-data">No specific house rules listed</p>}
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="ae-footer-actions">
          <button className="ae-btn-cancel" onClick={() => navigate(-1)}>Cancel changes</button>
          <button className="ae-btn-save-lg" onClick={handleUpdate} disabled={isSaving || isUploading}>
            {isSaving
              ? <><Loader2 size={15} className="ae-spin" /> Saving…</>
              : <><CheckCircle size={15} /> Update listing</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AccommodationEdit;
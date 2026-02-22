import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import { 
  IoArrowBack, IoPencil, IoBed, IoHome, IoFlash, IoWater, 
  IoLocation, IoWifi, IoSnow, IoTv, IoFitness, IoTrash, IoAdd, 
  IoMan, IoWoman, IoPeople, IoWalk, IoImages, IoCloudUpload, IoSync
} from "react-icons/io5";
import { FaKitchenSet, FaBath } from "react-icons/fa6";
import { GiPoolTableCorner, GiWashingMachine } from "react-icons/gi";
import { MdLocalParking, MdVideocam } from "react-icons/md";
import "./AccommodationEdit.css";

// Leaflet setup
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };

function MapController({ center, interactive }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    interactive ? map.dragging.enable() : map.dragging.disable();
  }, [center, interactive, map]);
  return null;
}

const AccommodationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState({});
  const [newRule, setNewRule] = useState("");
  
  const fileInputRef = useRef(null);
  const updateInputRef = useRef(null);

  // PHOTO STATES
  const [photos, setPhotos] = useState([]); 
  const [uploadedImageIds, setUploadedImageIds] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [updatingIndex, setUpdatingIndex] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    address: "",
    accommodationType: "Apartment",
    genderPreference: "mixed",
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    pricePerMonth: 0,
    keyMoneyDuration: 0,
    utilityBills: { electricityIncluded: false, waterIncluded: false },
    location: { type: "Point", coordinates: [6.9147, 79.9727] },
    amenities: [],
    rules: [],
    distance: "Distance not available",
    images: [], 
    isAvailable: true
  });

  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/accommodation/${id}`);
        if (response.data.success) {
          const data = response.data.data;
          // Mongoose stores as [lng, lat], Leaflet needs [lat, lng]
          const coords = data.location.coordinates;
          setFormData({
            ...data,
            location: { ...data.location, coordinates: [coords[1], coords[0]] }
          });
          if (data.images) {
            setUploadedImageIds(data.images);
            setPhotos(data.images.map(imgId => `http://localhost:8000/photo/${imgId}`));
          }
        }
      } catch (error) {
        alert("Could not load listing data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAccommodation();
  }, [id]);

  // PHOTO LOGIC
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (uploadedImageIds.length + files.length > 5) return alert("Max 5 images.");
    setIsUploading(true);
    for (const file of files) {
      const data = new FormData();
      data.append("photo", file);
      try {
        const res = await axios.post("http://localhost:8000/photo", data);
        if (res.data.success) {
          setPhotos(prev => [...prev, URL.createObjectURL(file)]);
          setUploadedImageIds(prev => [...prev, res.data.data._id]);
        }
      } catch (err) { console.error(err); }
    }
    setIsUploading(false);
  };

  const handleDeletePhoto = async (index) => {
    if (!window.confirm("Delete photo permanently?")) return;
    try {
      await axios.delete(`http://localhost:8000/photo/${uploadedImageIds[index]}`);
      setPhotos(prev => prev.filter((_, i) => i !== index));
      setUploadedImageIds(prev => prev.filter((_, i) => i !== index));
    } catch (err) { alert("Delete failed."); }
  };

  const triggerUpdate = (index) => {
    setUpdatingIndex(index);
    updateInputRef.current.click();
  };

  const handlePhotoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const data = new FormData();
    data.append("photo", file);
    try {
      const res = await axios.put(`http://localhost:8000/photo/${uploadedImageIds[updatingIndex]}`, data);
      if (res.data.success) {
        const newPhotos = [...photos];
        newPhotos[updatingIndex] = URL.createObjectURL(file);
        setPhotos(newPhotos);
      }
    } catch (err) { alert("Update failed."); }
    finally { setIsUploading(false); }
  };

  // DISTANCE CALCULATION
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return d > 1000 ? (d/1000).toFixed(2) + " km" : Math.round(d) + " meters";
  };

  useEffect(() => {
    if (!loading) {
      setFormData(p => ({ ...p, distance: calculateDistance(SLIIT_LOCATION.lat, SLIIT_LOCATION.lng, p.location.coordinates[0], p.location.coordinates[1]) }));
    }
  }, [formData.location.coordinates, loading]);

  // SAVE UPDATE
  const handleUpdate = async () => {
    try {
      const updateData = { ...formData, images: uploadedImageIds };
      // Convert back to [lng, lat] for Mongoose
      updateData.location.coordinates = [formData.location.coordinates[1], formData.location.coordinates[0]];
      const res = await axios.put(`http://localhost:8000/accommodation/${id}`, updateData);
      if (res.data.success) { alert("Updated successfully!"); navigate(-1); }
    } catch (err) { alert("Update failed."); }
  };

  const toggleEdit = (section) => setEditMode(p => ({ ...p, [section]: !p[section] }));

  if (loading) return <div className="loading-container">Loading...</div>;

  return (
    <div className="custom-container">
      <div className="custom-header">
        <button className="custom-back-btn" onClick={() => navigate(-1)}><IoArrowBack /> Back</button>
        <h1>Manage Listing</h1>
        <p className="header-subtitle">Editing: <span>{formData.title}</span></p>
      </div>

      <div className="custom-content">
        
        {/* BASIC & PROPERTY INFO */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoHome /> Property Info</h2>
            <button className="edit-btn" onClick={() => toggleEdit('basic')}>{editMode.basic ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.basic ? (
            <div className="edit-form">
              <div className="form-group"><label>Title</label><input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
              <div className="form-group"><label>Address</label><input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select value={formData.accommodationType} onChange={(e) => setFormData({...formData, accommodationType: e.target.value})}>
                    <option value="Apartment">Apartment</option>
                    <option value="House">House</option>
                    <option value="Shared Room">Shared Room</option>
                    <option value="Private Room">Private Room</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gender Preference</label>
                  <select value={formData.genderPreference} onChange={(e) => setFormData({...formData, genderPreference: e.target.value})}>
                    <option value="boys">Boys Only</option>
                    <option value="girls">Girls Only</option>
                    <option value="mixed">Mixed (Boys & Girls)</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Description</label><textarea rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              <div className="three-cols">
                <div className="form-group"><label>BRs</label><input type="number" value={formData.bedrooms} onChange={(e) => setFormData({...formData, bedrooms: e.target.value})} /></div>
                <div className="form-group"><label>Beds</label><input type="number" value={formData.beds} onChange={(e) => setFormData({...formData, beds: e.target.value})} /></div>
                <div className="form-group"><label>Baths</label><input type="number" value={formData.bathrooms} onChange={(e) => setFormData({...formData, bathrooms: e.target.value})} /></div>
              </div>
            </div>
          ) : (
            <div className="section-content">
              <h3 className="view-title">{formData.title}</h3>
              <p style={{ color: 'var(--light-text)', marginBottom: '10px' }}><IoLocation /> {formData.address}</p>
              <div className="badge-row">
                <span className="type-badge">{formData.accommodationType}</span>
                <span className={`gender-badge ${formData.genderPreference}`}>
                  {formData.genderPreference === 'boys' && <IoMan />}
                  {formData.genderPreference === 'girls' && <IoWoman />}
                  {formData.genderPreference === 'mixed' && <IoPeople />}
                  {formData.genderPreference}
                </span>
              </div>
              <div className="stats-grid">
                <div className="stat-card"><IoHome /> {formData.bedrooms} BR</div>
                <div className="stat-card"><IoBed /> {formData.beds} Beds</div>
                <div className="stat-card"><FaBath /> {formData.bathrooms} Ba</div>
              </div>
            </div>
          )}
        </div>

        {/* PHOTO SECTION */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoImages /> Photos ({uploadedImageIds.length}/5) {isUploading && <IoSync className="spin" />}</h2>
          </div>
          <div className="image-upload-area">
             <div className="upload-placeholder" style={{ width: '100%', marginBottom: '20px' }} onClick={() => fileInputRef.current.click()}>
              <IoCloudUpload size={30} /> <span>{isUploading ? "Uploading..." : "Click to Upload Photos"}</span>
            </div>
            <input type="file" multiple accept="image/*" ref={fileInputRef} hidden onChange={handlePhotoUpload} />
            <input type="file" accept="image/*" ref={updateInputRef} hidden onChange={handlePhotoUpdate} />
            <div className="upload-grid">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="preview-container">
                  {photos[index] ? (
                    <>
                      <img src={photos[index]} alt="preview" className="preview-img clickable-img" />
                      <button className="remove-img-btn" onClick={() => handleDeletePhoto(index)}><IoTrash /></button>
                      <div className="change-overlay" onClick={() => triggerUpdate(index)}><IoSync size={20} /><span>Replace</span></div>
                    </>
                  ) : <div className="upload-placeholder" onClick={() => fileInputRef.current.click()}><span>+</span></div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AMENITIES */}
        <div className="custom-section">
          <div className="section-header">
            <h2>Amenities</h2>
            <button className="edit-btn" onClick={() => toggleEdit('amenities')}>{editMode.amenities ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.amenities ? (
            <div className="amenities-selection-grid">
              {["WiFi", "Kitchen", "Parking", "AC", "Washer", "CCTV", "TV", "Gym"].map(name => (
                <div key={name} className={`amenity-option ${formData.amenities.includes(name) ? 'active' : ''}`} onClick={() => {
                  const updated = formData.amenities.includes(name) ? formData.amenities.filter(a => a !== name) : [...formData.amenities, name];
                  setFormData({...formData, amenities: updated});
                }}>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="amenities-list">
              {formData.amenities.length > 0 ? formData.amenities.map(a => <span key={a} className="amenity-tag">{a}</span>) : <p className="no-data">No amenities listed</p>}
            </div>
          )}
        </div>

        {/* LOCATION */}
        <div className="custom-section">
          <div className="section-header"><h2><IoLocation /> Exact Location</h2><button className="edit-btn" onClick={() => toggleEdit('loc')}>{editMode.loc ? "Save" : <><IoPencil /> Edit</>}</button></div>
          <div className="map-wrapper">
            <MapContainer center={formData.location.coordinates} zoom={15} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapController center={formData.location.coordinates} interactive={!!editMode.loc} />
              <Marker position={formData.location.coordinates} draggable={!!editMode.loc}
                eventHandlers={{ dragend: (e) => setFormData({...formData, location: { ...formData.location, coordinates: [e.target.getLatLng().lat, e.target.getLatLng().lng] }}) }} />
            </MapContainer>
          </div>
          <div className="distance-display-row">
            <span className="distance-pill"><IoWalk /> {formData.distance} from SLIIT Campus</span>
          </div>
        </div>

        {/* PRICING & UTILITIES */}
        <div className="custom-section">
          <div className="section-header"><h2>Pricing & Utilities</h2><button className="edit-btn" onClick={() => toggleEdit('price')}>{editMode.price ? "Save" : <><IoPencil /> Edit</>}</button></div>
          {editMode.price ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group"><label>Rent (LKR)</label><input type="number" value={formData.pricePerMonth} onChange={(e) => setFormData({...formData, pricePerMonth: e.target.value})} /></div>
                <div className="form-group"><label>Key Money (Months)</label><input type="number" value={formData.keyMoneyDuration} onChange={(e) => setFormData({...formData, keyMoneyDuration: e.target.value})} /></div>
              </div>
              <div className="form-group" style={{marginTop: '10px'}}>
                <label>Included in Rent:</label>
                <div style={{display: 'flex', gap: '15px'}}>
                   <label style={{display:'flex', alignItems:'center', gap:'5px'}}><input type="checkbox" checked={formData.utilityBills.electricityIncluded} onChange={(e) => setFormData({...formData, utilityBills: {...formData.utilityBills, electricityIncluded: e.target.checked}})} /> Electricity</label>
                   <label style={{display:'flex', alignItems:'center', gap:'5px'}}><input type="checkbox" checked={formData.utilityBills.waterIncluded} onChange={(e) => setFormData({...formData, utilityBills: {...formData.utilityBills, waterIncluded: e.target.checked}})} /> Water</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="price-summary">
              <span className="main-price">LKR {formData.pricePerMonth?.toLocaleString()} / month</span>
              <span className="key-money-tag" style={{marginBottom: '10px'}}>{formData.keyMoneyDuration} Months Key Money</span>
              <div>
                <span className={`u-pill ${formData.utilityBills.electricityIncluded ? 'inc' : 'exc'}`}><IoFlash /> Electricity {formData.utilityBills.electricityIncluded ? 'Inc.' : 'Exc.'}</span>
                <span className={`u-pill ${formData.utilityBills.waterIncluded ? 'inc' : 'exc'}`}><IoWater /> Water {formData.utilityBills.waterIncluded ? 'Inc.' : 'Exc.'}</span>
              </div>
            </div>
          )}
        </div>

        {/* RULES */}
        <div className="custom-section">
          <div className="section-header">
            <h2>House Rules</h2>
            <button className="edit-btn" onClick={() => toggleEdit('rules')}>{editMode.rules ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.rules ? (
            <div className="rules-edit">
              <div className="rule-input-group">
                <input placeholder="Add a new rule (e.g., No pets)" value={newRule} onChange={(e) => setNewRule(e.target.value)} />
                <button className="add-rule-btn" onClick={() => { if(newRule.trim()) { setFormData({...formData, rules: [...formData.rules, newRule.trim()]}); setNewRule(""); } }}><IoAdd /></button>
              </div>
              {formData.rules.map((rule, i) => (
                <div key={i} className="rule-item-edit">
                  <span>{rule}</span>
                  <IoTrash onClick={() => setFormData({...formData, rules: formData.rules.filter((_, idx) => idx !== i)})} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rules-display-box">
              {formData.rules.length > 0 ? <ul>{formData.rules.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="no-data">No specific house rules</p>}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="publish-btn" onClick={handleUpdate} disabled={isUploading}>Update Listing</button>
          <button className="draft-btn" onClick={() => navigate(-1)}>Cancel Changes</button>
        </div>
      </div>
    </div>
  );
};

export default AccommodationEdit;
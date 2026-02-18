import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  IoArrowBack, IoPencil, IoBed, IoHome, IoFlash, IoWater, 
  IoLocation, IoLocate, IoWifi, IoSnow, IoTv, IoFitness, IoTrash, IoAdd, 
  IoShieldCheckmark, IoMan, IoWoman, IoPeople, IoWalk, IoImages, IoCloudUpload
} from "react-icons/io5";
import { FaKitchenSet, FaBath } from "react-icons/fa6";
import { GiPoolTableCorner, GiWashingMachine } from "react-icons/gi";
import { MdLocalParking, MdVideocam } from "react-icons/md";
import "./AccommodationEdit.css";

// --- Leaflet Icon Fixes ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const SLIIT_LOCATION = {
  lat: 6.9147,
  lng: 79.9727,
};

function MapController({ center, interactive }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    if (interactive) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      if (map.tap) map.tap.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      if (map.tap) map.tap.disable();
    }
  }, [center, interactive, map]);
  return null;
}

const AccommodationEdit = () => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState({});
  const [newRule, setNewRule] = useState("");
  const markerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "Luxury Student Stay",
    description: "Spacious shared room with modern amenities, located very close to the university premises.",
    address: "SLIIT University, Malabe, Sri Lanka",
    accommodationType: "Shared Room",
    genderPreference: "girls",
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    pricePerMonth: 15000,
    keyMoneyDuration: 3,
    utilityBills: { electricityIncluded: false, waterIncluded: true },
    location: { type: "Point", coordinates: [6.9150, 79.9750] },
    amenities: ["Kitchen", "WiFi", "CCTV"],
    rules: ["Quiet hours after 10 PM", "No smoking inside"],
    distance: "0 meters",
    images: [], 
    isAvailable: true
  });

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance > 1000 ? (distance / 1000).toFixed(2) + " km" : Math.round(distance) + " meters";
  };

  useEffect(() => {
    const dist = calculateDistance(SLIIT_LOCATION.lat, SLIIT_LOCATION.lng, formData.location.coordinates[0], formData.location.coordinates[1]);
    setFormData(prev => ({ ...prev, distance: dist }));
  }, [formData.location.coordinates]);

  const allAvailableAmenities = [
    { name: "WiFi", icon: <IoWifi /> }, { name: "Kitchen", icon: <FaKitchenSet /> },
    { name: "Parking", icon: <MdLocalParking /> }, { name: "AC", icon: <IoSnow /> },
    { name: "Washer", icon: <GiWashingMachine /> }, { name: "CCTV", icon: <MdVideocam /> },
    { name: "TV", icon: <IoTv /> }, { name: "Gym", icon: <IoFitness /> },
    { name: "Pool", icon: <GiPoolTableCorner /> }
  ];

  const getGenderIcon = (pref) => pref === "girls" ? <IoWoman /> : pref === "boys" ? <IoMan /> : <IoPeople />;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const toggleAmenity = (amenity) => {
    const updated = formData.amenities.includes(amenity) ? formData.amenities.filter(a => a !== amenity) : [...formData.amenities, amenity];
    setFormData(prev => ({ ...prev, amenities: updated }));
  };

  // --- Updated Image Handling with 5 Image Limit ---
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const currentCount = formData.images.length;
    
    if (currentCount >= 5) {
      alert("You can only upload a maximum of 5 images.");
      return;
    }

    // Only take enough files to reach the limit of 5
    const remainingSlots = 5 - currentCount;
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      alert(`Only the first ${remainingSlots} images were added. Maximum limit is 5.`);
    }

    const newImages = filesToAdd.map(file => URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    
    // Reset input value so same file can be selected again if removed
    e.target.value = null;
  };

  const removeImage = (index) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const addRule = () => {
    if (newRule.trim()) {
      setFormData(prev => ({ ...prev, rules: [...prev.rules, newRule.trim()] }));
      setNewRule("");
    }
  };

  const removeRule = (index) => {
    setFormData(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));
  };

  const toggleEdit = (section) => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const newPos = marker.getLatLng();
        setFormData(prev => ({ ...prev, location: { ...prev.location, coordinates: [newPos.lat, newPos.lng] } }));
      }
    },
  }), []);

  return (
    <div className="custom-container">
      <div className="custom-header">
        <button className="custom-back-btn" onClick={() => navigate(-1)}><IoArrowBack /> Back</button>
        <h1>Manage Listing</h1>
        <p className="header-subtitle">Editing: <span>{formData.title}</span></p>
      </div>

      <div className="custom-content">
        
        {/* BASIC DETAILS */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoHome /> Basic Details</h2>
            <button className="edit-btn" onClick={() => toggleEdit('basic')}>{editMode.basic ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.basic ? (
            <div className="edit-form">
              <div className="form-group"><label>Title</label><input name="title" value={formData.title} onChange={handleInputChange} /></div>
              <div className="form-group"><label>Description</label><textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} /></div>
              <div className="three-cols">
                <div className="form-group"><label>Bedrooms</label><input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInputChange} /></div>
                <div className="form-group"><label>Beds</label><input type="number" name="beds" value={formData.beds} onChange={handleInputChange} /></div>
                <div className="form-group"><label>Bathrooms</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Type</label><select name="accommodationType" value={formData.accommodationType} onChange={handleInputChange}><option>Shared Room</option><option>Private Room</option><option>Apartment</option></select></div>
                <div className="form-group"><label>Gender</label><select name="genderPreference" value={formData.genderPreference} onChange={handleInputChange}><option value="boys">Boys</option><option value="girls">Girls</option><option value="any">Any</option></select></div>
              </div>
              <div className="form-group">
                <label>Utilities Included in Rent</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={formData.utilityBills.electricityIncluded} onChange={(e) => handleNestedInputChange('utilityBills', 'electricityIncluded', e.target.checked)} /> Electricity
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={formData.utilityBills.waterIncluded} onChange={(e) => handleNestedInputChange('utilityBills', 'waterIncluded', e.target.checked)} /> Water
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="section-content">
              <h3 className="view-title">{formData.title}</h3>
              <div className="badge-row">
                <span className="type-badge">{formData.accommodationType}</span>
                <span className={`gender-badge ${formData.genderPreference}`}>{getGenderIcon(formData.genderPreference)} {formData.genderPreference}</span>
              </div>
              <p>{formData.description}</p>
              <div className="stats-grid">
                <div className="stat-card"><IoHome /> {formData.bedrooms} Bedrooms</div>
                <div className="stat-card"><IoBed /> {formData.beds} Beds</div>
                <div className="stat-card"><FaBath /> {formData.bathrooms} Baths</div>
              </div>
              <div>
                <span className={`u-pill ${formData.utilityBills.electricityIncluded ? 'inc' : 'exc'}`}><IoFlash /> Electricity</span>
                <span className={`u-pill ${formData.utilityBills.waterIncluded ? 'inc' : 'exc'}`}><IoWater /> Water</span>
              </div>
            </div>
          )}
        </div>

        {/* IMAGE SECTION */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoImages /> Photos ({formData.images.length}/5)</h2>
            <button className="edit-btn" onClick={() => toggleEdit('images')}>{editMode.images ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.images ? (
            <div className="image-upload-area">
              <div className="upload-grid">
                {formData.images.map((img, index) => (
                  <div key={index} className="preview-container">
                    <img src={img} alt="preview" className="preview-img" />
                    <button className="remove-img-btn" onClick={() => removeImage(index)}><IoTrash /></button>
                  </div>
                ))}
                {formData.images.length < 5 && (
                  <div className="upload-placeholder" onClick={() => fileInputRef.current.click()}>
                    <IoCloudUpload size={30} />
                    <span>Add Photo</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} hidden multiple onChange={handleImageUpload} accept="image/*" />
            </div>
          ) : (
            <div className="image-display-grid">
              {formData.images.length > 0 ? (
                formData.images.map((img, index) => <img key={index} src={img} alt="Listing" className="display-img" />)
              ) : (
                <p className="no-data">No photos uploaded yet.</p>
              )}
            </div>
          )}
        </div>

        {/* LOCATION SECTION */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoLocation /> Location</h2>
            <button className="edit-btn" onClick={() => toggleEdit('loc')}>{editMode.loc ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          <div className="section-content">
            {editMode.loc ? (
              <div className="edit-form">
                <div className="form-group"><label>Address</label><input name="address" value={formData.address} onChange={handleInputChange} /></div>
                <div className="map-controls">
                  <div className="live-distance-badge"><IoWalk /> {formData.distance} from SLIIT</div>
                  <button type="button" className="locate-btn" onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(pos => {
                        setFormData(prev => ({...prev, location: { ...prev.location, coordinates: [pos.coords.latitude, pos.coords.longitude]}}));
                      });
                    }
                  }}><IoLocate /> Current Position</button>
                </div>
                <div className="map-wrapper">
                  <MapContainer center={formData.location.coordinates} zoom={15} style={{ height: "100%", width: "100%", zIndex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapController center={formData.location.coordinates} interactive={true} />
                    <Marker draggable={true} eventHandlers={eventHandlers} position={formData.location.coordinates} ref={markerRef} />
                  </MapContainer>
                </div>
              </div>
            ) : (
              <div className="location-view">
                <p><IoLocation className="icon-teal" /> {formData.address}</p>
                <div className="distance-display-row">
                  <span className="distance-pill"><IoWalk /> {formData.distance} to SLIIT Campus</span>
                </div>
                <div className="static-map-wrapper">
                   <MapContainer center={formData.location.coordinates} zoom={15} zoomControl={false} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapController center={formData.location.coordinates} interactive={false} />
                      <Marker position={formData.location.coordinates} />
                    </MapContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AMENITIES */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoShieldCheckmark /> Amenities</h2>
            <button className="edit-btn" onClick={() => toggleEdit('amenities')}>{editMode.amenities ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.amenities ? (
            <div className="amenities-selection-grid">
              {allAvailableAmenities.map(item => (
                <div key={item.name} className={`amenity-option ${formData.amenities.includes(item.name) ? 'active' : ''}`} onClick={() => toggleAmenity(item.name)}>
                  {item.icon} <span>{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="amenities-tags">
              {formData.amenities.map(a => <span key={a} className="amenity-tag">{a}</span>)}
            </div>
          )}
        </div>

        {/* HOUSE RULES */}
        <div className="custom-section">
          <div className="section-header">
            <h2><IoShieldCheckmark /> House Rules</h2>
            <button className="edit-btn" onClick={() => toggleEdit('rules')}>{editMode.rules ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.rules ? (
            <div className="edit-form">
               <div className="rule-input-group">
                  <input type="text" value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="E.g., No smoking" />
                  <button type="button" className="add-rule-btn" onClick={addRule}><IoAdd /></button>
                </div>
                <div className="rules-list-edit">
                  {formData.rules.map((rule, index) => (
                    <div key={index} className="rule-item-edit"><span>{rule}</span><IoTrash onClick={() => removeRule(index)} /></div>
                  ))}
                </div>
            </div>
          ) : (
            <div className="rules-display-box">
              <ul>{formData.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
        </div>

        {/* PRICING */}
        <div className="custom-section">
          <div className="section-header">
            <h2>Price</h2>
            <button className="edit-btn" onClick={() => toggleEdit('price')}>{editMode.price ? "Save" : <><IoPencil /> Edit</>}</button>
          </div>
          {editMode.price ? (
            <div className="form-row">
              <div className="form-group"><label>Rent (LKR)</label><input type="number" name="pricePerMonth" value={formData.pricePerMonth} onChange={handleInputChange} /></div>
              <div className="form-group"><label>Key Money (Months)</label><input type="number" name="keyMoneyDuration" value={formData.keyMoneyDuration} onChange={handleInputChange} /></div>
            </div>
          ) : (
            <div className="price-summary">
              <span className="main-price">LKR {formData.pricePerMonth.toLocaleString()} / mo</span>
              <span className="key-money-tag">Key Money: {formData.keyMoneyDuration} Months</span>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button className="publish-btn" onClick={() => alert("Updated Successfully")}>Update Accommodation</button>
          <button className="draft-btn" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default AccommodationEdit;
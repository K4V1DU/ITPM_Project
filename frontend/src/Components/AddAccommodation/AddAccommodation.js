import React, { useState, useCallback, useRef } from "react";
import "./AddAccommodation.css";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete,
  InfoWindow,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import { FaReact } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import axios from "axios";

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";

// SLIIT University coordinates
const SLIIT_LOCATION = {
  lat: 6.9147,
  lng: 79.9727,
};

const LIBRARIES = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "450px",
  borderRadius: "12px",
};

const defaultOptions = {
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
  mapTypeId: "roadmap",
};

const AddAccommodation = () => {
  const navigate = useNavigate();

  // --- FORM DATA STATES ---
  const [currentStep, setCurrentStep] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genderPref, setGenderPref] = useState("mixed");
  const [accType, setAccType] = useState("Private Room");
  const [rooms, setRooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [price, setPrice] = useState("");
  const [keyDuration, setKeyDuration] = useState(0); 
  const [amenities, setAmenities] = useState([]);
  const [rules, setRules] = useState([]);
  const [otherRules, setOtherRules] = useState("");
  const [utilities, setUtilities] = useState({ electricity: false, water: false });
  
  // Verification states
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);

  // --- MAP STATES ---
  const [selectedLocation, setSelectedLocation] = useState(SLIIT_LOCATION);
  const [address, setAddress] = useState("SLIIT University, Malabe, Sri Lanka");
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [mapError, setMapError] = useState(false);
  
  // --- PHOTO STATES (UPDATED) ---
  const [photos, setPhotos] = useState([]); // For UI previews
  const [uploadedImageIds, setUploadedImageIds] = useState([]); // For Backend IDs
  const [isUploading, setIsUploading] = useState(false);

  const calculatedKeyMoney = price && keyDuration ? Number(price) * Number(keyDuration) : 0;

  // --- HELPER: VALUE CLAMPING (Triggered on Blur) ---
  const clampValue = (value, min, max, setter) => {
    if (value === "") return;
    const num = Number(value);
    if (num < min) {
      setter(min);
    } else if (num > max) {
      setter(max);
    } else {
      setter(num);
    }
  };

  // --- HANDLERS ---
  const handleExit = () => navigate("/");
  const handleGetStarted = () => setShowForm(true);

  // VALIDATION PER STEP
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (rooms < 1 || rooms > 10) return alert("Number of rooms must be between 1 and 10.");
      if (beds < 1 || beds > 10) return alert("Number of beds must be between 1 and 10.");
      if (bathrooms < 1 || bathrooms > 10) return alert("Number of bathrooms must be between 1 and 10.");
    }
    
    if (currentStep === 3) {
      if (!title.trim()) return alert("Title cannot be empty.");
      if (title.length > 50) return alert("Title cannot exceed 50 characters.");
      if (!description.trim()) return alert("Description cannot be empty.");
      if (description.length > 200) return alert("Description cannot exceed 200 characters.");
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => setCurrentStep(currentStep - 1);

  const toggleAmenity = (name) => {
    setAmenities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };

  const toggleRule = (name) => {
    setRules(prev => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]);
  };

  const getFormattedDistance = () => {
    const distInKm = calculateDistance(
      selectedLocation.lat,
      selectedLocation.lng,
      SLIIT_LOCATION.lat,
      SLIIT_LOCATION.lng
    );

    return distInKm < 1 ? `${Math.round(distInKm * 1000)} meters` : `${distInKm.toFixed(1)} km`;
  };

  const handlePublish = async () => {
    const numPrice = Number(price);
    const numKey = Number(keyDuration);

    if (numPrice < 5000 || numPrice > 50000) {
      return alert("Price per month must be between 5,000 and 50,000 LKR.");
    }
    if (keyDuration === "" || numKey < 0 || numKey > 3) {
      return alert("Key money duration must be between 0 and 3 months.");
    }
    if (!isVerified || !isAgreed) {
      return alert("You must confirm accuracy and agree to terms to publish.");
    }

    setIsPublishing(true);
    
    const payload = {
      owner: "699174a3a19b70085fffefc8",
      title: title,
      description: description,
      address: address,
      location: {
        type: "Point",
        coordinates: [selectedLocation.lng, selectedLocation.lat]
      },
      distance: getFormattedDistance(),
      pricePerMonth: numPrice,
      keyMoneyDuration: numKey,
      genderPreference: genderPref,
      accommodationType: accType,
      bedrooms: Number(rooms),
      beds: Number(beds),
      bathrooms: Number(bathrooms),
      amenities: amenities,
      rules: otherRules ? [...rules, otherRules] : rules,
      utilityBills: {
        electricityIncluded: utilities.electricity,
        waterIncluded: utilities.water,
      },
      // Sending the actual uploaded image IDs from the state
      images: uploadedImageIds 
    };

    try {
      const res = await axios.post("http://localhost:5000/Accommodation", payload);
      if (res.data) {
        alert("Your accommodation has been published successfully!");
        navigate("/cust");
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Check required fields"));
    } finally {
      setIsPublishing(false);
    }
  };

  // --- PHOTO UPLOAD LOGIC (ADDED BACKEND SYNC) ---
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);

    for (const file of files) {
      const formData = new FormData();
      formData.append("photo", file);

      try {
        const res = await axios.post("http://localhost:5000/Photo", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          // Add preview for UI
          setPhotos((prev) => [...prev, URL.createObjectURL(file)]);
          // Add ID for Backend payload
          setUploadedImageIds((prev) => [...prev, res.data.data._id]);
        }
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload an image.");
      }
    }

    setIsUploading(false);
    e.target.value = null;
  };

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onAutocompleteLoad = (autocomplete) => setAutocomplete(autocomplete);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setSelectedLocation(location);
        setAddress(place.formatted_address || place.name);
        setSearchInput(place.formatted_address || place.name);
        if (map) {
          map.panTo(location);
          map.setZoom(17);
        }
      }
    }
  };

  const onMapClick = (event) => {
    const newLocation = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setSelectedLocation(newLocation);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: newLocation }, (results, status) => {
      if (status === "OK" && results[0]) {
        setAddress(results[0].formatted_address);
        setSearchInput(results[0].formatted_address);
      }
    });
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setSelectedLocation(location);
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location }, (results, status) => {
          if (status === "OK" && results[0]) {
            setAddress(results[0].formatted_address);
            setSearchInput(results[0].formatted_address);
          }
        });
        if (map) { map.panTo(location); map.setZoom(17); }
      });
    }
  };

  const handleSLIITLocation = () => {
    setSelectedLocation(SLIIT_LOCATION);
    setAddress("SLIIT University, Malabe, Sri Lanka");
    setSearchInput("SLIIT University, Malabe, Sri Lanka");
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const distanceFromSLIIT = calculateDistance(selectedLocation.lat, selectedLocation.lng, SLIIT_LOCATION.lat, SLIIT_LOCATION.lng);

  if (!showForm) {
    return (
      <div className="container">
        <div className="header"><h1>It's easy to get started on Accommodation</h1></div>
        <div className="steps">
          <div className="step">
            <img src="https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=250&fit=crop" className="step-image" alt="step1" />
            <div className="step-content">
              <div className="step-number">1</div>
              <div className="step-title">Tell us about your Accommodation</div>
              <div className="step-description">Share some basic info, like where it is and how many Student can stay.</div>
            </div>
          </div>
          <div className="step">
            <img src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=250&fit=crop" className="step-image" alt="step2" />
            <div className="step-content">
              <div className="step-number">2</div>
              <div className="step-title">Make it stand out</div>
              <div className="step-description">Add photos plus a title and description.</div>
            </div>
          </div>
          <div className="step">
            <img src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400&h=250&fit=crop" className="step-image" alt="step3" />
            <div className="step-content">
              <div className="step-number">3</div>
              <div className="step-title">Finish up and publish</div>
              <div className="step-description">Choose a starting price, verify a few details, then publish.</div>
            </div>
          </div>
        </div>
        <div className="button-container">
          <button className="get-started-btn" onClick={handleGetStarted}>Get Started</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>List your Accommodation</h1>
        <button className="exit-btn" onClick={handleExit}><IoClose className="close-icon" /></button>
      </div>

      <div className="progress-bar-container">
        <div className="progress-steps">
          <div className={`progress-step ${currentStep >= 1 ? "active" : ""}`}><span className="progress-step-number">1</span><span className="progress-step-label">Details</span></div>
          <div className={`progress-line ${currentStep >= 2 ? "active" : ""}`}></div>
          <div className={`progress-step ${currentStep >= 2 ? "active" : ""}`}><span className="progress-step-number">2</span><span className="progress-step-label">Location</span></div>
          <div className={`progress-line ${currentStep >= 3 ? "active" : ""}`}></div>
          <div className={`progress-step ${currentStep >= 3 ? "active" : ""}`}><span className="progress-step-number">3</span><span className="progress-step-label">Photos</span></div>
          <div className={`progress-line ${currentStep >= 4 ? "active" : ""}`}></div>
          <div className={`progress-step ${currentStep >= 4 ? "active" : ""}`}><span className="progress-step-number">4</span><span className="progress-step-label">Publish</span></div>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="form-container">
          <h2 className="form-title">Tell us about your Accommodation</h2>
          <div className="form-group">
            <label>Accommodation For *</label>
            <select className="form-input" value={genderPref} onChange={(e) => setGenderPref(e.target.value)}>
              <option value="mixed">Mixed (Boys & Girls)</option>
              <option value="boys">Boys Only</option>
              <option value="girls">Girls Only</option>
            </select>
          </div>
          <div className="form-group">
            <label>Accommodation Type *</label>
            <select className="form-input" value={accType} onChange={(e) => setAccType(e.target.value)}>
              <option value="Private Room">Private Room</option>
              <option value="Shared Room">Shared Room</option>
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Number of Rooms (1-10) *</label>
              <input 
                type="number" 
                className="form-input" 
                value={rooms} 
                onChange={(e) => setRooms(e.target.value)}
                onBlur={(e) => clampValue(e.target.value, 1, 10, setRooms)}
              />
            </div>
            <div className="form-group">
              <label>Number of Beds (1-10) *</label>
              <input 
                type="number" 
                className="form-input" 
                value={beds} 
                onChange={(e) => setBeds(e.target.value)}
                onBlur={(e) => clampValue(e.target.value, 1, 10, setBeds)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Number of Bathrooms (1-10) *</label>
            <input 
                type="number" 
                className="form-input" 
                value={bathrooms} 
                onChange={(e) => setBathrooms(e.target.value)}
                onBlur={(e) => clampValue(e.target.value, 1, 10, setBathrooms)}
            />
          </div>
          <div className="form-group">
            <label>Utility Bills *</label>
            <div className="form-input">
              <label><input type="checkbox" checked={utilities.electricity} onChange={(e) => setUtilities({...utilities, electricity: e.target.checked})} /> Electricity Included</label>
              <label><input type="checkbox" checked={utilities.water} onChange={(e) => setUtilities({...utilities, water: e.target.checked})} /> Water Included</label>
            </div>
          </div>
          <div className="form-group">
            <label>Amenities</label>
            <div className="amenities-grid">
              {["WiFi", "Kitchen", "Parking", "AC", "Washer", "CCTV", "TV", "Gym", "Pool"].map(item => (
                <label key={item} className="checkbox-label">
                  <input type="checkbox" checked={amenities.includes(item)} onChange={() => toggleAmenity(item)} /> {item}
                </label>
              ))}
            </div>
          </div>
          <div className="form-navigation">
            <button className="btn-next" onClick={handleNextStep}>Next</button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="form-container">
          <h2 className="form-title">Set your location on map</h2>
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES} onError={() => setMapError(true)}>
            <div className="map-search-container">
              <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <input type="text" placeholder="Search near SLIIT" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="map-search-input" />
              </Autocomplete>
            </div>
            <div className="map-wrapper">
              <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation} zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                <Marker position={selectedLocation} draggable={true} onDragEnd={onMapClick} />
              </GoogleMap>
            </div>
          </LoadScript>
          <div className="quick-locations">
             <button className="quick-location-btn" onClick={handleSLIITLocation}>SLIIT University</button>
             <button className="quick-location-btn" onClick={handleUseCurrentLocation}>Use My Location</button>
          </div>
          <div className="distance-info">
            <div className="distance-badge">
              <span>🚶 <strong>{distanceFromSLIIT < 1 ? `${Math.round(distanceFromSLIIT * 1000)}m` : `${distanceFromSLIIT.toFixed(2)}km`} from SLIIT</strong></span>
            </div>
          </div>
          <div className="form-group">
            <label>Address *</label>
            <textarea className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} required></textarea>
          </div>
          <div className="form-navigation">
            <button className="btn-prev" onClick={handlePreviousStep}>Previous</button>
            <button className="btn-next" onClick={handleNextStep}>Next</button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="form-container">
          <h2 className="form-title">Make it stand out</h2>
          <div className="form-group">
            <label>Upload Photos (Optional)</label>
            <div className="photo-upload-area" onClick={() => document.getElementById("photo-upload").click()}>
              <input type="file" multiple accept="image/*" id="photo-upload" style={{ display: "none" }} onChange={handlePhotoUpload} />
              <button type="button" className="photo-upload-btn">
                {isUploading ? "Uploading..." : "+ Click to upload photos"}
              </button>
            </div>
          </div>
          <div className="photo-box-row">
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="photo-box">
                {photos[index] ? <img src={photos[index]} alt="preview" /> : <span>+</span>}
              </div>
            ))}
          </div>
          <div className="form-group">
            <label>Title (Max 50) *</label>
            <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Cozy room near SLIIT" maxLength={50} />
          </div>
          <div className="form-group">
            <label>Description (Max 200) *</label>
            <textarea className="form-textarea" rows="5" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your place..." maxLength={200}></textarea>
          </div>
          <div className="form-navigation">
            <button className="btn-prev" onClick={handlePreviousStep}>Previous</button>
            <button className="btn-next" onClick={handleNextStep}>Next</button>
          </div>
        </div>
      )}

      {currentStep === 4 && (
        <div className="form-container">
          <h2 className="form-title">Finish up and publish</h2>
          <div className="form-group">
            <label>Price per Month (LKR 5,000 - 50,000) *</label>
            <input 
                type="number" 
                className="form-input" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)}
                onBlur={(e) => clampValue(e.target.value, 5000, 50000, setPrice)}
            />
          </div>
          <div className="form-group">
            <label>Key Money Duration (0-3 Months) *</label>
            <input 
                type="number" 
                className="form-input" 
                value={keyDuration} 
                onChange={(e) => setKeyDuration(e.target.value)}
                onBlur={(e) => clampValue(e.target.value, 0, 3, setKeyDuration)}
            />
          </div>
          <div className="form-group">
            <label>Calculated Key Money (LKR)</label>
            <input type="text" className="form-input" value={calculatedKeyMoney.toLocaleString()} readOnly />
          </div>

          <div className="verification-section">
            <h3>Rules and Policies</h3>
            <label className="checkbox-label"><input type="checkbox" checked={rules.includes("No Smoking")} onChange={() => toggleRule("No Smoking")} /> No Smoking</label>
            <label className="checkbox-label"><input type="checkbox" checked={rules.includes("Quiet hours after 10 PM")} onChange={() => toggleRule("Quiet hours after 10 PM")} /> Quiet hours after 10 PM</label>
            <label className="checkbox-label"><input type="checkbox" checked={rules.includes("No Party")} onChange={() => toggleRule("No Party")} /> No Party</label>
            <br />
            <label>Others</label>
            <textarea className="form-textarea" rows="3" value={otherRules} onChange={(e) => setOtherRules(e.target.value)} placeholder="e.g., No pets allowed..."></textarea>
          </div>

          <div className="verification-section">
            <h3>Verification</h3>
            <label className="checkbox-label">
                <input type="checkbox" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} /> 
                I confirm that all information provided is accurate
            </label>
            <label className="checkbox-label">
                <input type="checkbox" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} /> 
                I agree to the Terms of Service
            </label>
          </div>

          <div className="form-navigation">
            <button className="btn-prev" onClick={handlePreviousStep}>Previous</button>
            <button className="btn-publish" onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish Listing"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAccommodation;
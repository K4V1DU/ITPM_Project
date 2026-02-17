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



// Google Maps API configuration - Using your provided API key
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";

// SLIIT University coordinates
const SLIIT_LOCATION = {
  lat: 6.9147,
  lng: 79.9727,
};

// Library for autocomplete
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
  const [currentStep, setCurrentStep] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(SLIIT_LOCATION);
  const [address, setAddress] = useState("SLIIT University, Malabe, Sri Lanka");
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [showInfoWindow, setShowInfoWindow] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [price, setPrice] = useState("");
  const [keyDuration, setKeyDuration] = useState("");
  const calculatedKeyMoney =
  price && keyDuration
    ? Number(price) * Number(keyDuration)
    : 0;



    const handleExit = () => {
    navigate("/");   // home page
    };
  const handleGetStarted = () => {
    setShowForm(true);
  };

  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handlePublish = () => {
    alert("Your accommodation has been published successfully!");
    setShowForm(false);
    setCurrentStep(1);
    navigate("/cust");
  };

const handlePhotoUpload = (e) => {
  const files = Array.from(e.target.files);

  if (files.length + photos.length > 5) {
    alert("Maximum 5 photos allowed");
    return;
  }

  const imagePreviews = files.map((file) =>
    URL.createObjectURL(file)
  );

  setPhotos((prev) => [...prev, ...imagePreviews]);

  e.target.value = null; // reset input
};

  // Google Maps handlers
  const onMapLoad = useCallback((map) => {
    setMap(map);

    // Search for nearby places after map loads
    const service = new window.google.maps.places.PlacesService(map);
    const request = {
      location: SLIIT_LOCATION,
      radius: "1500",
      type: ["university", "shopping_mall", "restaurant", "hospital"],
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setNearbyPlaces(results.slice(0, 5));
      }
    });
  }, []);

  const onAutocompleteLoad = (autocomplete) => {
    setAutocomplete(autocomplete);
  };

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
        setShowInfoWindow(true);

        // Pan map to new location
        if (map) {
          map.panTo(location);
          map.setZoom(17);
        }
      }
    } else {
      console.log("Autocomplete is not loaded yet!");
    }
  };

  const onMapClick = (event) => {
    const newLocation = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    setSelectedLocation(newLocation);
    setShowInfoWindow(true);

    // Reverse geocode to get address
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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setSelectedLocation(location);
          setShowInfoWindow(true);

          // Reverse geocode
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location }, (results, status) => {
            if (status === "OK" && results[0]) {
              setAddress(results[0].formatted_address);
              setSearchInput(results[0].formatted_address);
            }
          });

          if (map) {
            map.panTo(location);
            map.setZoom(17);
          }
        },
        (error) => {
          alert("Error getting your location: " + error.message);
        },
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  const handleSLIITLocation = () => {
    setSelectedLocation(SLIIT_LOCATION);
    setAddress("SLIIT University, Malabe, Sri Lanka");
    setSearchInput("SLIIT University, Malabe, Sri Lanka");
    setShowInfoWindow(true);

    if (map) {
      map.panTo(SLIIT_LOCATION);
      map.setZoom(17);
    }
  };

  const handleMapError = () => {
    setMapError(true);
  };

  // Calculate distance from SLIIT
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  const distanceFromSLIIT = calculateDistance(
    selectedLocation.lat,
    selectedLocation.lng,
    SLIIT_LOCATION.lat,
    SLIIT_LOCATION.lng,
  );

  // If showForm is false, show the original Get Started page
  if (!showForm) {
    return (
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>It's easy to get started on Accommodation</h1>
        </div>

        {/* Steps */}
        <div className="steps">
          {/* Step 1 */}
          <div className="step">
            <img
              src="https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=250&fit=crop"
              alt="Living room with couch and plants"
              className="step-image"
            />
            <div className="step-content">
              <div className="step-number">1</div>
              <div className="step-title">Tell us about your Accommodation</div>
              <div className="step-description">
                Share some basic info, like where it is and how many Student can
                stay and how many beds are available.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step">
            <img
              src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=250&fit=crop"
              alt="Modern kitchen with white cabinets"
              className="step-image"
            />
            <div className="step-content">
              <div className="step-number">2</div>
              <div className="step-title">Make it stand out</div>
              <div className="step-description">
                Add 5 or more photos plus a title and description—we'll help you
                out.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step">
            <img
              src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400&h=250&fit=crop"
              alt="Cozy bedroom with bed"
              className="step-image"
            />
            <div className="step-content">
              <div className="step-number">3</div>
              <div className="step-title">Finish up and publish</div>
              <div className="step-description">
                Choose a starting price, verify a few details, then publish your
                listing.
              </div>
            </div>
          </div>
        </div>

        {/* Get Started Button - Centered */}
        <div className="button-container">
          <button className="get-started-btn" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // Form steps - shown after clicking Get Started
  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>List your Accommodation</h1>

    <button className="exit-btn" onClick={handleExit}>
      <IoClose className="close-icon" />
    </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-steps">
          <div className={`progress-step ${currentStep >= 1 ? "active" : ""}`}>
            <span className="progress-step-number">1</span>
            <span className="progress-step-label">Details</span>
          </div>
          <div
            className={`progress-line ${currentStep >= 2 ? "active" : ""}`}
          ></div>
          <div className={`progress-step ${currentStep >= 2 ? "active" : ""}`}>
            <span className="progress-step-number">2</span>
            <span className="progress-step-label">Location</span>
          </div>
          <div
            className={`progress-line ${currentStep >= 3 ? "active" : ""}`}
          ></div>
          <div className={`progress-step ${currentStep >= 3 ? "active" : ""}`}>
            <span className="progress-step-number">3</span>
            <span className="progress-step-label">Photos</span>
          </div>
          <div
            className={`progress-line ${currentStep >= 4 ? "active" : ""}`}
          ></div>
          <div className={`progress-step ${currentStep >= 4 ? "active" : ""}`}>
            <span className="progress-step-number">4</span>
            <span className="progress-step-label">Publish</span>
          </div>
        </div>
      </div>

      {/* Step 1 Form - Details */}
      {currentStep === 1 && (
        <div className="form-container">
          <h2 className="form-title">Tell us about your Accommodation</h2>
          <p className="form-subtitle">
            Share some basic info about your place
          </p>

          {/* <div className="form-group"> */}
          {/* <label>Accommodation Location *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter full address"
            />
          </div> */}

          <div className="form-group">
            <label>Accommodation For *</label>
            <select className="form-input" name="accommodationFor" required>
              <option value="">Select option</option>
              <option value="boys">Boys Only</option>
              <option value="girls">Girls Only</option>
              <option value="mixed">Mixed (Boys & Girls)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Accommodation Type *</label>
            <select className="form-input">
              <option>Select type</option>
              <option>Apartment</option>
              <option>House</option>
              <option>Shared Room</option>
              <option>Private Room</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Number of Rooms *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g., 4"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Number of Beds *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g., 2"
                min="1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Number of Bathrooms *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g., 1"
                min="1"
                step="0.5"
              />
            </div>

          </div>


<div className="form-group">
  <label>Utility Bills *</label>
  <div className="form-input">
    <label>
      <input type="checkbox" name="electricity" value="included" />
      Electricity Included
    </label>

    <label>
      <input type="checkbox" name="water" value="included" />
      Water Included
    </label>

  </div>
</div>



          <div className="form-group">
            <label>Amenities</label>
            <div className="amenities-grid">
              <label className="checkbox-label">
                <input type="checkbox" /> WiFi
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Kitchen
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Parking
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> AC
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Washer
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> CCTV
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> TV
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Gym
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Pool
              </label>
            </div>
          </div>

          <div className="form-navigation">
            <button className="btn-next" onClick={handleNextStep}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2 Form - Google Maps with SLIIT University */}
      {currentStep === 2 && (
        <div className="form-container">
          <h2 className="form-title">Set your location on map</h2>
          <p className="form-subtitle">
            Pin the exact location of your accommodation near SLIIT University
          </p>

          <LoadScript
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            libraries={LIBRARIES}
            onError={handleMapError}
          >
            {mapError ? (
              <div className="map-error">
                <span className="error-icon">⚠️</span>
                <h3>Google Maps API Error</h3>
                <p>Please check your API key and enable the required APIs:</p>
                <ul>
                  <li>Maps JavaScript API</li>
                  <li>Places API</li>
                  <li>Geocoding API</li>
                </ul>
              </div>
            ) : (
              <>
                {/* Search Box */}
                <div className="map-search-container">
                  <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <input
                      type="text"
                      placeholder="Search for an address or place near SLIIT"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="map-search-input"
                    />
                  </Autocomplete>
                  <button className="map-search-btn">Search</button>
                </div>

                {/* Google Map */}
                <div className="map-wrapper">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={selectedLocation}
                    zoom={16}
                    options={defaultOptions}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                  >
                    {/* Marker for selected location */}
                    <Marker
                      position={selectedLocation}
                      draggable={true}
                      onDragEnd={(e) => {
                        const newLocation = {
                          lat: e.latLng.lat(),
                          lng: e.latLng.lng(),
                        };
                        setSelectedLocation(newLocation);
                        setShowInfoWindow(true);

                        // Reverse geocode on drag end
                        const geocoder = new window.google.maps.Geocoder();
                        geocoder.geocode(
                          { location: newLocation },
                          (results, status) => {
                            if (status === "OK" && results[0]) {
                              setAddress(results[0].formatted_address);
                              setSearchInput(results[0].formatted_address);
                            }
                          },
                        );
                      }}
                      onClick={() => setShowInfoWindow(true)}
                    />

                    {/* Info Window */}
                    {showInfoWindow && (
                      <InfoWindow
                        position={selectedLocation}
                        onCloseClick={() => setShowInfoWindow(false)}
                      >
                        <div className="info-window">
                          <strong>Selected Location</strong>
                          <p>{address}</p>
                          <small>Drag marker to adjust</small>
                        </div>
                      </InfoWindow>
                    )}

                    {/* Nearby Places Markers */}
                    {nearbyPlaces.map((place, index) => (
                      <Marker
                        key={index}
                        position={{
                          lat: place.geometry.location.lat(),
                          lng: place.geometry.location.lng(),
                        }}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                          scaledSize: new window.google.maps.Size(32, 32),
                        }}
                      />
                    ))}
                  </GoogleMap>
                </div>

                {/* Quick Location Buttons */}
                <div className="quick-locations">
                  <button
                    className="quick-location-btn"
                    onClick={handleSLIITLocation}
                  >
                    <span className="location-icon"></span>
                    SLIIT University
                  </button>
                  <button
                    className="quick-location-btn"
                    onClick={handleUseCurrentLocation}
                  >
                    <span className="location-icon"></span>
                    Use My Location
                  </button>
                </div>

                {/* Nearby Places List */}
                <div className="nearby-places">
                  <h4>Popular near SLIIT University:</h4>
                  <div className="place-tags">
                    <span
                      className="place-tag"
                      onClick={() => {
                        setSearchInput("SLIIT Malabe Campus");
                        setAddress("SLIIT Malabe Campus");
                        setSelectedLocation({ lat: 6.9147, lng: 79.9727 });
                        map?.panTo({ lat: 6.9147, lng: 79.9727 });
                        setShowInfoWindow(true);
                      }}
                    >
                      SLIIT Malabe Campus
                    </span>
                    {/* <span className="place-tag" onClick={() => {
                      setSearchInput("Excel World Colombo");
                      setAddress("Excel World Colombo");
                      setSelectedLocation({ lat: 6.9157, lng: 79.9737 });
                      map?.panTo({ lat: 6.9157, lng: 79.9737 });
                      setShowInfoWindow(true);
                    }}>
                      🎯 Excel World
                    </span>
                    <span className="place-tag" onClick={() => {
                      setSearchInput("Cinnamon Life Colombo");
                      setAddress("Cinnamon Life Colombo");
                      setSelectedLocation({ lat: 6.9137, lng: 79.9717 });
                      map?.panTo({ lat: 6.9137, lng: 79.9717 });
                      setShowInfoWindow(true);
                    }}>
                      🏨 Cinnamon Life
                    </span>
                    <span className="place-tag" onClick={() => {
                      setSearchInput("Kelaniya University");
                      setAddress("Kelaniya University");
                      setSelectedLocation({ lat: 6.9718, lng: 79.9177 });
                      map?.panTo({ lat: 6.9718, lng: 79.9177 });
                      setShowInfoWindow(true);
                    }}>
                      🎓 Kelaniya University
                    </span> */}
                  </div>
                </div>
              </>
            )}
          </LoadScript>

          {/* Address Confirmation */}
          <div className="address-confirmation">
            <h3>Selected Address:</h3>
            <div className="address-card">
              <div className="address-icon"></div>
              <div className="address-details">
                <p className="address-line1">{address}</p>
                <p className="address-line2">Near SLIIT University, Malabe</p>
                <p className="address-line3">Sri Lanka</p>
              </div>
            </div>
          </div>

          {/* Distance from SLIIT */}
          <div className="distance-info">
            <div className="distance-badge">
              <span className="distance-icon">🚶</span>
              <div className="distance-text">
                <strong>
                  {distanceFromSLIIT < 1
                    ? `${Math.round(distanceFromSLIIT * 1000)} meters`
                    : `${distanceFromSLIIT.toFixed(2)} km`}{" "}
                  from SLIIT
                </strong>
                <p>
                  {distanceFromSLIIT < 0.5
                    ? "Walking distance to university"
                    : distanceFromSLIIT < 2
                      ? "Short drive to university"
                      : "A bit far from university"}
                </p>
              </div>
            </div>
          </div>

          <div className="form-group">
  <label>Address *</label>
  <textarea
    className="form-input"
    name="address"
    placeholder="Enter full address"
    required
  ></textarea>
</div>


          <div className="form-navigation">
            <button className="btn-prev" onClick={handlePreviousStep}>
              Previous
            </button>
            <button className="btn-next" onClick={handleNextStep}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3 Form - Photos */}
{/* Step 3 Form - Photos */}
{currentStep === 3 && (
  <div className="form-container">
    <h2 className="form-title">Make it stand out</h2>
    <p className="form-subtitle">
      Add photos and describe your accommodation
    </p>

    {/* Photo Upload */}
    <div className="form-group">
      <label>Upload Photos (minimum 5) *</label>

      <div
        className="photo-upload-area"
        onClick={() => document.getElementById("photo-upload").click()}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          id="photo-upload"
          style={{ display: "none" }}
          onChange={handlePhotoUpload}
        />

        <button type="button" className="photo-upload-btn">
          + Click to upload photos
        </button>

        <p className="photo-upload-hint">
          Drag and drop or click to select files
        </p>
      </div>
    </div>

    {/* Preview Boxes (Max 5) */}
    <div className="photo-box-row">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className="photo-box"
          onClick={() =>
            document.getElementById("photo-upload").click()
          }
        >
          {photos[index] ? (
            <img src={photos[index]} alt={`preview-${index}`} />
          ) : (
            <>
              <span className="plus-icon">+</span>
              <p>Add More</p>
            </>
          )}
        </div>
      ))}
    </div>

    {/* Title */}
    <div className="form-group">
      <label>Title *</label>
      <input
        type="text"
        className="form-input"
        placeholder="e.g., Cozy room near SLIIT University"
      />
    </div>

    {/* Description */}
    <div className="form-group">
      <label>Description *</label>
      <textarea
        className="form-textarea"
        rows="5"
        placeholder="Describe what makes your accommodation special..."
      ></textarea>
    </div>

    <div className="form-navigation">
      <button className="btn-prev" onClick={handlePreviousStep}>
        Previous
      </button>

      <button
        className="btn-next"
        onClick={() => {
          if (photos.length < 5) {
            alert("Please upload at least 5 photos");
            return;
          }
          handleNextStep();
        }}
      >
        Next
      </button>
    </div>
  </div>
)}

      {/* Step 4 Form - Publish */}
      {currentStep === 4 && (
        <div className="form-container">
          <h2 className="form-title">Finish up and publish</h2>
          <p className="form-subtitle">Set your price and verify details</p>

<div className="form-group">
  <label>Price per Month (LKR) *</label>
  <input
    type="number"
    className="form-input"
    placeholder="e.g., 15000"
    min="0"
    value={price}
    onChange={(e) => setPrice(e.target.value)}
  />
</div>

<div className="form-group">
  <label>Key Money Duration (Months)</label>
  <input
    type="number"
    className="form-input"
    placeholder="e.g., 2"
    min="0"
    value={keyDuration}
    onChange={(e) => setKeyDuration(e.target.value)}
  />
</div>

{/* Auto Calculated Result */}
<div className="form-group">
  <label>Calculated Key Money (LKR)</label>
  <input
    type="text"
    className="form-input"
    value={calculatedKeyMoney.toLocaleString()}
    readOnly
  />
</div>


          <div className="form-group">
            <div className="verification-section">
              <h3>Rules and Policies</h3>
              <label className="checkbox-label">
                <input type="checkbox" /> No Smoking
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> Quiet hours after 10 PM
              </label>
              <label className="checkbox-label">
                <input type="checkbox" /> No Party
              </label>
              <br></br>
              <label>Others</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="e.g., No smoking, quiet hours after 10 PM..."
              ></textarea>
            </div>
          </div>

          <div className="verification-section">
            <h3>Verification</h3>
            <label className="checkbox-label">
              <input type="checkbox" /> I confirm that all information provided
              is accurate
            </label>
            <label className="checkbox-label">
              <input type="checkbox" /> I agree to the Terms of Service and Host
              Guarantee
            </label>
            <label className="checkbox-label">
              <input type="checkbox" /> I understand the cancellation policy
            </label>
          </div>

          <div className="form-navigation">
            <button className="btn-prev" onClick={handlePreviousStep}>
              Previous
            </button>
            <button className="btn-publish" onClick={handlePublish}>
              Publish Listing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddAccommodation;

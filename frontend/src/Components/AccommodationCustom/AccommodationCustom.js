import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  IoArrowBack, 
  IoPencil, 
  IoCheckmarkCircle,
  IoAdd,
  IoBed,
  IoHome,
  IoTrash,
  IoClose,
  IoLocation,
  IoImages,
  IoPricetag,
  IoDocumentText,
  IoWifi,
  IoSnow,
  IoTv,
  IoFitness
} from "react-icons/io5";
import { 
  FaKitchenSet
} from "react-icons/fa6";
import { 
  GiPoolTableCorner,
  GiWashingMachine
} from "react-icons/gi";
import { MdLocalParking, MdVideocam } from "react-icons/md";
import "./AccommodationCustom.css";

const AccommodationCustom = () => {
  const navigate = useNavigate();
  const [, setActiveSection] = useState(null); // Added comma to ignore the variable
  const [editMode, setEditMode] = useState({});
  
  // Room and Bed Management State
  const [rooms, setRooms] = useState([
    {
      id: 1,
      name: "Room 1",
      beds: [
        { id: 1, status: "available" },
        { id: 2, status: "reserved" }
      ]
    },
    {
      id: 2,
      name: "Room 2",
      beds: [
        { id: 3, status: "available" },
        { id: 4, status: "available" }
      ]
    }
  ]);
  const [nextRoomId, setNextRoomId] = useState(3);
  const [nextBedId, setNextBedId] = useState(5);

  const [formData, setFormData] = useState({
    // Basic Info
    accommodationFor: "boys",
    accommodationType: "Apartment",
    bathrooms: 2,
    floorArea: 850,
    bathroomType: "private", 
    utilityBills: "included",
    amenities: ["WiFi", "Kitchen", "Parking", "CCTV"],
    
    // Location
    address: "123, SLIIT Road, Malabe",
    fullAddress: "123, SLIIT Road, Malabe, Sri Lanka",
    distance: "350 meters",
    
    // Photos
    photos: [
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=400&h=300&fit=crop",
    ],
    title: "Cozy Room Near SLIIT University",
    description: "A comfortable room just 5 minutes walk from SLIIT Main Campus. Quiet neighborhood with all amenities nearby.",
    
    // Pricing
    pricePerMonth: 15000,
    keyMoney: 30000,
    keyMoneyDuration: 2,
    rules: "No smoking, quiet hours after 10 PM, no parties",
  });

  // Get icon for amenity
  const getAmenityIcon = (amenity) => {
    switch(amenity) {
      case 'WiFi': return <IoWifi />;
      case 'Kitchen': return <FaKitchenSet />;
      case 'Parking': return <MdLocalParking />;
      case 'AC': return <IoSnow />;
      case 'Washer': return <GiWashingMachine />;
      case 'CCTV': return <MdVideocam />; // Using MdVideocam for CCTV
      case 'TV': return <IoTv />;
      case 'Gym': return <IoFitness />;
      case 'Pool': return <GiPoolTableCorner />;
      default: return null;
    }
  };

  // Room Management Functions
  const handleAddRoom = () => {
    const newRoom = {
      id: nextRoomId,
      name: `Room ${nextRoomId}`,
      beds: [{ id: nextBedId, status: "available" }]
    };
    setRooms([...rooms, newRoom]);
    setNextRoomId(nextRoomId + 1);
    setNextBedId(nextBedId + 1);
  };

  const handleRemoveRoom = (roomId) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter(room => room.id !== roomId));
    } else {
      alert("At least one room is required");
    }
  };

  const handleAddBed = (roomId) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        const newBed = {
          id: nextBedId,
          status: "available"
        };
        setNextBedId(nextBedId + 1);
        return {
          ...room,
          beds: [...room.beds, newBed]
        };
      }
      return room;
    }));
  };

  const handleRemoveBed = (roomId, bedId) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        if (room.beds.length > 1) {
          return {
            ...room,
            beds: room.beds.filter(bed => bed.id !== bedId)
          };
        } else {
          alert("Each room must have at least one bed");
          return room;
        }
      }
      return room;
    }));
  };

  const handleBedStatusChange = (roomId, bedId, status) => {
    setRooms(rooms.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          beds: room.beds.map(bed => 
            bed.id === bedId ? { ...bed, status } : bed
          )
        };
      }
      return room;
    }));
  };

  const handleRoomNameChange = (roomId, newName) => {
    setRooms(rooms.map(room => 
      room.id === roomId ? { ...room, name: newName } : room
    ));
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleEdit = (section) => {
    setActiveSection(section);
    setEditMode({ ...editMode, [section]: true });
  };

  const handleSave = (section) => {
    setEditMode({ ...editMode, [section]: false });
    setActiveSection(null);
  };

  const handleCancel = (section) => {
    setEditMode({ ...editMode, [section]: false });
    setActiveSection(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (checked) {
        setFormData({
          ...formData,
          amenities: [...formData.amenities, value]
        });
      } else {
        setFormData({
          ...formData,
          amenities: formData.amenities.filter(item => item !== value)
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePublish = () => {
    // Combine rooms data with form data
    const completeData = {
      ...formData,
      rooms: rooms,
      totalRooms: rooms.length,
      totalBeds: rooms.reduce((total, room) => total + room.beds.length, 0),
      availableBeds: rooms.reduce((total, room) => 
        total + room.beds.filter(bed => bed.status === 'available').length, 0
      ),
      reservedBeds: rooms.reduce((total, room) => 
        total + room.beds.filter(bed => bed.status === 'reserved').length, 0
      )
    };
    
    console.log("Publishing accommodation:", completeData);
    alert("Accommodation published successfully!");
    navigate("/");
  };

  // Calculate totals
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((total, room) => total + room.beds.length, 0);
  const availableBeds = rooms.reduce((total, room) => 
    total + room.beds.filter(bed => bed.status === 'available').length, 0
  );
  const reservedBeds = rooms.reduce((total, room) => 
    total + room.beds.filter(bed => bed.status === 'reserved').length, 0
  );

  return (
    <div className="custom-container">
      {/* Header */}
      <div className="custom-header">
        <button className="custom-back-btn" onClick={handleBack}>
          <IoArrowBack /> Back
        </button>
        <h1>Review Your Accommodation</h1>
        <div className="custom-progress">
          <IoCheckmarkCircle className="progress-icon completed" />
          <span className="progress-line"></span>
          <IoCheckmarkCircle className="progress-icon completed" />
          <span className="progress-line"></span>
          <IoCheckmarkCircle className="progress-icon completed" />
          <span className="progress-line"></span>
          <IoCheckmarkCircle className="progress-icon active" />
        </div>
      </div>

      {/* Review Content */}
      <div className="custom-content">
        {/* Basic Information Section */}
        <div className="custom-section" id="basic">
          <div className="section-header">
            <h2>Basic Information</h2>
            {!editMode.basic ? (
              <button className="edit-btn" onClick={() => handleEdit('basic')}>
                <IoPencil /> Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="save-btn" onClick={() => handleSave('basic')}>Save</button>
                <button className="cancel-btn" onClick={() => handleCancel('basic')}>Cancel</button>
              </div>
            )}
          </div>
          
          {!editMode.basic ? (
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Accommodation For:</span>
                  <span className="info-value">{formData.accommodationFor === 'boys' ? 'Boys Only' : 
                    formData.accommodationFor === 'girls' ? 'Girls Only' : 
                    formData.accommodationFor === 'lecturers' ? 'Lecturers Only' : 'Mixed'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{formData.accommodationType}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Bathrooms:</span>
                  <span className="info-value">{formData.bathrooms}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Floor Area:</span>
                  <span className="info-value">{formData.floorArea} sq.ft</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Bathroom Type:</span>
                  <span className="info-value">{formData.bathroomType === 'private' ? 'Private' : 'Shared'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Utility Bills:</span>
                  <span className="info-value">
                    {formData.utilityBills === 'included' ? 'Included' : 
                     formData.utilityBills === 'excluded' ? 'Not Included' : 'Charged Separately'}
                  </span>
                </div>
              </div>
              <div className="amenities-list">
                <span className="info-label">Amenities:</span>
                <div className="amenities-tags">
                  {formData.amenities.map((item, index) => (
                    <span key={index} className="amenity-tag">
                      {getAmenityIcon(item)} {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Accommodation For</label>
                  <select name="accommodationFor" value={formData.accommodationFor} onChange={handleInputChange}>
                    <option value="boys">Boys Only</option>
                    <option value="girls">Girls Only</option>
                    <option value="lecturers">Lecturers Only</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select name="accommodationType" value={formData.accommodationType} onChange={handleInputChange}>
                    <option>Apartment</option>
                    <option>House</option>
                    <option>Studio</option>
                    <option>Dormitory</option>
                    <option>Shared Room</option>
                    <option>Private Room</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bathrooms</label>
                  <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInputChange} step="0.5" />
                </div>
                <div className="form-group">
                  <label>Floor Area (sq.ft)</label>
                  <input type="number" name="floorArea" value={formData.floorArea} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bathroom Type</label>
                  <select name="bathroomType" value={formData.bathroomType} onChange={handleInputChange}>
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Utility Bills</label>
                  <select name="utilityBills" value={formData.utilityBills} onChange={handleInputChange}>
                    <option value="included">Included</option>
                    <option value="excluded">Not Included</option>
                    <option value="separate">Charged Separately</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Amenities</label>
                <div className="amenities-checkbox-grid">
                  {["WiFi", "Kitchen", "Parking", "AC", "Washer", "CCTV", "TV", "Gym", "Pool"].map(amenity => (
                    <label key={amenity} className="checkbox-label">
                      <input 
                        type="checkbox" 
                        value={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onChange={handleInputChange}
                      /> 
                      {getAmenityIcon(amenity)} {amenity}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rooms & Beds Section */}
        <div className="custom-section" id="rooms">
          <div className="section-header">
            <h2>Rooms & Beds Management</h2>
            {!editMode.rooms ? (
              <button className="edit-btn" onClick={() => handleEdit('rooms')}>
                <IoPencil /> Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="save-btn" onClick={() => handleSave('rooms')}>Save</button>
                <button className="cancel-btn" onClick={() => handleCancel('rooms')}>Cancel</button>
              </div>
            )}
          </div>
          
          {!editMode.rooms ? (
            <div className="section-content">
              {/* Summary Stats */}
              <div className="rooms-summary-stats">
                <div className="summary-stat-card">
                  <IoHome className="stat-icon" />
                  <span className="stat-label">Total Rooms</span>
                  <span className="stat-value">{totalRooms}</span>
                </div>
                <div className="summary-stat-card">
                  <IoBed className="stat-icon" />
                  <span className="stat-label">Total Beds</span>
                  <span className="stat-value">{totalBeds}</span>
                </div>
                <div className="summary-stat-card">
                  <IoCheckmarkCircle className="stat-icon available" />
                  <span className="stat-label">Available</span>
                  <span className="stat-value available">{availableBeds}</span>
                </div>
                <div className="summary-stat-card">
                  <IoClose className="stat-icon reserved" />
                  <span className="stat-label">Reserved</span>
                  <span className="stat-value reserved">{reservedBeds}</span>
                </div>
              </div>

              {/* Rooms List */}
              <div className="rooms-list">
                {rooms.map((room) => (
                  <div key={room.id} className="room-review-card">
                    <div className="room-review-header">
                      <IoHome className="room-icon" />
                      <h4>{room.name}</h4>
                    </div>
                    <div className="beds-review-grid">
                      {room.beds.map((bed) => (
                        <div key={bed.id} className={`bed-review-item ${bed.status}`}>
                          <IoBed className="bed-icon" />
                          <span className="bed-number">Bed {bed.id}</span>
                          <span className={`bed-status-badge ${bed.status}`}>
                            {bed.status === 'available' ? 'Available' : 'Reserved'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="edit-form">
              {/* Add Room Button */}
              <div className="add-room-container">
                <button className="add-room-btn" onClick={handleAddRoom}>
                  <IoAdd /> Add Room
                </button>
              </div>

              {/* Editable Rooms */}
              {rooms.map((room) => (
                <div key={room.id} className="room-edit-card">
                  <div className="room-edit-header">
                    <div className="room-title-edit">
                      <IoHome className="room-icon" />
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => handleRoomNameChange(room.id, e.target.value)}
                        className="room-name-edit"
                        placeholder="Room name"
                      />
                    </div>
                    <button 
                      className="remove-room-btn"
                      onClick={() => handleRemoveRoom(room.id)}
                    >
                      <IoTrash />
                    </button>
                  </div>

                  <div className="beds-edit-grid">
                    {room.beds.map((bed) => (
                      <div key={bed.id} className="bed-edit-item">
                        <div className="bed-info">
                          <IoBed className="bed-icon" />
                          <span>Bed {bed.id}</span>
                        </div>
                        <div className="bed-status-toggle">
                          <button
                            className={`status-btn ${bed.status === 'available' ? 'active' : ''}`}
                            onClick={() => handleBedStatusChange(room.id, bed.id, 'available')}
                          >
                            Available
                          </button>
                          <button
                            className={`status-btn ${bed.status === 'reserved' ? 'active' : ''}`}
                            onClick={() => handleBedStatusChange(room.id, bed.id, 'reserved')}
                          >
                            Reserved
                          </button>
                        </div>
                        <button
                          className="remove-bed-btn"
                          onClick={() => handleRemoveBed(room.id, bed.id)}
                        >
                          <IoTrash />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      className="add-bed-btn"
                      onClick={() => handleAddBed(room.id)}
                    >
                      <IoAdd /> Add Bed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location Section */}
        <div className="custom-section" id="location">
          <div className="section-header">
            <h2>Location</h2>
            {!editMode.location ? (
              <button className="edit-btn" onClick={() => handleEdit('location')}>
                <IoPencil /> Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="save-btn" onClick={() => handleSave('location')}>Save</button>
                <button className="cancel-btn" onClick={() => handleCancel('location')}>Cancel</button>
              </div>
            )}
          </div>
          
          {!editMode.location ? (
            <div className="section-content">
              <div className="location-display">
                <div className="location-map-preview">
                  <img 
                    src="https://maps.googleapis.com/maps/api/staticmap?center=6.9147,79.9727&zoom=15&size=600x200&markers=color:red%7C6.9147,79.9727&key=AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA"
                    alt="Location Map"
                    className="map-preview"
                  />
                </div>
                <div className="location-details">
                  <div className="info-item">
                    <span className="info-label"><IoLocation /> Distance from SLIIT:</span>
                    <span className="info-value highlight">{formData.distance}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label"><IoLocation /> Full Address:</span>
                    <span className="info-value">{formData.fullAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-group">
                <label><IoLocation /> Address</label>
                <textarea 
                  name="fullAddress" 
                  value={formData.fullAddress} 
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
            </div>
          )}
        </div>

        {/* Photos & Description Section */}
        <div className="custom-section" id="photos">
          <div className="section-header">
            <h2>Photos & Description</h2>
            {!editMode.photos ? (
              <button className="edit-btn" onClick={() => handleEdit('photos')}>
                <IoPencil /> Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="save-btn" onClick={() => handleSave('photos')}>Save</button>
                <button className="cancel-btn" onClick={() => handleCancel('photos')}>Cancel</button>
              </div>
            )}
          </div>
          
          {!editMode.photos ? (
            <div className="section-content">
              <div className="photos-grid">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="photo-thumb">
                    <img src={photo} alt={`Room ${index + 1}`} />
                  </div>
                ))}
              </div>
              <div className="info-item">
                <span className="info-label"><IoDocumentText /> Title:</span>
                <span className="info-value">{formData.title}</span>
              </div>
              <div className="info-item">
                <span className="info-label"><IoDocumentText /> Description:</span>
                <p className="description-text">{formData.description}</p>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-group">
                <label><IoDocumentText /> Title</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label><IoDocumentText /> Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange}
                  rows="4"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pricing & Rules Section */}
        <div className="custom-section" id="pricing">
          <div className="section-header">
            <h2>Pricing & Rules</h2>
            {!editMode.pricing ? (
              <button className="edit-btn" onClick={() => handleEdit('pricing')}>
                <IoPencil /> Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="save-btn" onClick={() => handleSave('pricing')}>Save</button>
                <button className="cancel-btn" onClick={() => handleCancel('pricing')}>Cancel</button>
              </div>
            )}
          </div>
          
          {!editMode.pricing ? (
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label"><IoPricetag /> Price per Month:</span>
                  <span className="info-value price">LKR {formData.pricePerMonth.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label"><IoPricetag /> Key Money:</span>
                  <span className="info-value">LKR {formData.keyMoney.toLocaleString()} for {formData.keyMoneyDuration} months</span>
                </div>
              </div>
              <div className="info-item">
                <span className="info-label"><IoDocumentText /> House Rules:</span>
                <p className="rules-text">{formData.rules}</p>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label><IoPricetag /> Price per Month (LKR)</label>
                  <input type="number" name="pricePerMonth" value={formData.pricePerMonth} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label><IoPricetag /> Key Money (LKR)</label>
                  <input type="number" name="keyMoney" value={formData.keyMoney} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label><IoPricetag /> Key Money Duration (months)</label>
                  <input type="number" name="keyMoneyDuration" value={formData.keyMoneyDuration} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label><IoDocumentText /> House Rules</label>
                <textarea 
                  name="rules" 
                  value={formData.rules} 
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary & Actions */}
        <div className="custom-summary">
          <div className="summary-card">
            <h3>Listing Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <IoHome className="stat-icon" />
                <span className="stat-label">Rooms</span>
                <span className="stat-value">{totalRooms}</span>
              </div>
              <div className="stat">
                <IoBed className="stat-icon" />
                <span className="stat-label">Beds</span>
                <span className="stat-value">{totalBeds}</span>
              </div>
              <div className="stat">
                <IoCheckmarkCircle className="stat-icon available" />
                <span className="stat-label">Available</span>
                <span className="stat-value" style={{color: '#00a699'}}>{availableBeds}</span>
              </div>
              <div className="stat">
                <IoClose className="stat-icon reserved" />
                <span className="stat-label">Reserved</span>
                <span className="stat-value" style={{color: '#ff385c'}}>{reservedBeds}</span>
              </div>
              <div className="stat">
                <IoImages className="stat-icon" />
                <span className="stat-label">Photos</span>
                <span className="stat-value">{formData.photos.length}</span>
              </div>
              <div className="stat">
                <IoPricetag className="stat-icon" />
                <span className="stat-label">Monthly Price</span>
                <span className="stat-value price">LKR {formData.pricePerMonth.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="publish-btn" onClick={handlePublish}>
              Publish Listing
            </button>
            <button className="draft-btn" onClick={handleBack}>
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccommodationCustom;
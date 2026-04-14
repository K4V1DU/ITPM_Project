import React, { useState, useCallback, useRef, useEffect } from "react";
import "./EditFoodService.css";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trash2,
  RefreshCw,
  X,
  ChevronRight,
  Home,
  UtensilsCrossed,
  Coffee,
  Croissant,
  Truck,
  ShoppingBag,
  MapPin,
  Crosshair,
  Upload,
  Leaf,
  Flame,
  Wheat,
  Sprout,
  CheckCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Plus,
  Clock,
  AlertCircle,
  PenLine,
  Pencil,
  Save,
  Camera,
  Star,
  BookOpen,
  Settings,
  Clock3,
  MapPinned,
  Check,
  ChevronLeft,
} from "lucide-react";
import axios from "axios";
import LoadingScreen from "../Overlays/LoadingScreen/Loader";

// ── Import the shared toast hook ──────────────────────────────────────────────
import { useToast } from "../Overlays/ToastMessages/ToastContext";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES = ["places"];
const mapContainerStyle = { width: "100%", height: "320px" };
const defaultMapOptions = {
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
};

const DIETARY_TAGS = [
  { key: "Vegetarian", icon: Leaf,   color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "Vegan",      icon: Sprout, color: "#166534", bg: "#dcfce7", border: "#86efac" },
  { key: "Spicy",      icon: Flame,  color: "#b91c1c", bg: "#fff1f2", border: "#fecaca" },
  { key: "Gluten-Free",icon: Wheat,  color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
];

const MENU_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];
const SERVICE_TYPES   = ["Home Kitchen", "Restaurant", "Cafe", "Bakery"];

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

const emptyMenuItem = () => ({
  _id: null,
  name: "",
  description: "",
  price: "",
  category: "Lunch",
  dietaryTags: [],
  AvailableHours: { open: "08:00 AM", close: "08:00 PM" },
  isAvailable: true,
  prepTime: 15,
  imagePreview: null,
  imageFile: null,
  imageId: null,
  isNew: true,
});

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`efs-toggle ${checked ? "on" : "off"}`}
      onClick={() => onChange(!checked)}
      aria-checked={checked}
      role="switch"
    >
      <span className="efs-toggle-thumb" />
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="efs-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`efs-modal ${wide ? "efs-modal--wide" : ""}`}>
        <div className="efs-modal-header">
          <span className="efs-modal-title">{title}</span>
          <button className="efs-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="efs-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditFoodService() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const menuImgRef = useRef(null);

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // ── Toast (now from shared context) ───────────────────────────────────────
  const { toast } = useToast();

  // ── State ─────────────────────────────────────────────────────────────────
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");

  const [kitchenName,       setKitchenName]       = useState("");
  const [description,       setDescription]       = useState("");
  const [serviceType,       setServiceType]       = useState("Home Kitchen");
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable,   setPickupAvailable]   = useState(true);
  const [operatingHours,    setOperatingHours]    = useState({ open: "08:00 AM", close: "10:00 PM" });
  const [selectedLocation,  setSelectedLocation]  = useState(SLIIT_LOCATION);
  const [address,           setAddress]           = useState("");
  const [hasLocation,       setHasLocation]       = useState(false);
  const [iconPreview,       setIconPreview]       = useState(null);
  const [iconFile,          setIconFile]          = useState(null);
  const [iconImageId,       setIconImageId]       = useState(null);
  const [bgPreview,         setBgPreview]         = useState(null);
  const [bgFile,            setBgFile]            = useState(null);
  const [bgImageId,         setBgImageId]         = useState(null);
  const [menuItems,         setMenuItems]         = useState([]);
  const [deletedItemIds,    setDeletedItemIds]    = useState([]);

  const [editingSection, setEditingSection] = useState(null);
  const [draftName,      setDraftName]      = useState("");
  const [draftDesc,      setDraftDesc]      = useState("");
  const [draftType,      setDraftType]      = useState("Home Kitchen");
  const [draftOpen,      setDraftOpen]      = useState("08:00 AM");
  const [draftClose,     setDraftClose]     = useState("10:00 PM");

  const [showMapModal,  setShowMapModal]  = useState(false);
  const [menuModal,     setMenuModal]     = useState(null);
  const [editingItem,   setEditingItem]   = useState(null);
  const [mapInstance,   setMapInstance]   = useState(null);
  const [draftLocation, setDraftLocation] = useState(null);
  const [draftAddress,  setDraftAddress]  = useState("");

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) {
      setLoadError("No food service ID provided.");
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const fsRes = await axios.get(`${BASE_URL}/Foodservice/${id}`);
        const fs = fsRes.data.data;
        setKitchenName(fs.kitchenName || "");
        setDescription(fs.description || "");
        setServiceType(fs.serviceType || "Home Kitchen");
        setDeliveryAvailable(fs.deliveryAvailable ?? true);
        setPickupAvailable(fs.pickupAvailable ?? true);
        if (fs.operatingHours) setOperatingHours(fs.operatingHours);
        if (fs.location?.coordinates) {
          const [lng, lat] = fs.location.coordinates;
          setSelectedLocation({ lat, lng });
          setHasLocation(true);
        }
        setAddress(fs.address || "");
        const photoUrl = (pid) => `${BASE_URL}/photo/${pid}`;
        if (fs.iconImage)       { setIconPreview(photoUrl(fs.iconImage));       setIconImageId(fs.iconImage); }
        if (fs.BackgroundImage) { setBgPreview(photoUrl(fs.BackgroundImage));   setBgImageId(fs.BackgroundImage); }
        if (fs.menu?.length > 0) {
          const items = await Promise.all(
            fs.menu.map(async (itemId) => {
              const miRes = await axios.get(`${BASE_URL}/menuitem/${itemId}`);
              const mi = miRes.data.data;
              return {
                _id:          mi._id,
                name:         mi.name || "",
                description:  mi.description || "",
                price:        mi.price?.toString() || "",
                category:     mi.category || "Lunch",
                dietaryTags:  mi.dietaryTags || [],
                AvailableHours: mi.AvailableHours || { open: "08:00 AM", close: "08:00 PM" },
                isAvailable:  mi.isAvailable ?? true,
                prepTime:     mi.prepTime || 15,
                imagePreview: mi.image ? photoUrl(mi.image) : null,
                imageFile:    null,
                imageId:      mi.image || null,
                isNew:        false,
              };
            }),
          );
          setMenuItems(items);
        }
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load food service data.");
        setIsLoading(false);
      }
    })();
  }, [id]);

  // ── Inline edit handlers ───────────────────────────────────────────────────
  const startEditDetails = () => {
    setDraftName(kitchenName);
    setDraftDesc(description);
    setDraftType(serviceType);
    setEditingSection("details");
  };
  const saveDetails = () => {
    if (!draftName.trim())      return toast("Kitchen name is required.");
    if (draftName.length > 60)  return toast("Name max 60 characters.");
    if (!draftDesc.trim())      return toast("Description is required.");
    if (draftDesc.length > 300) return toast("Description max 300 characters.");
    setKitchenName(draftName);
    setDescription(draftDesc);
    setServiceType(draftType);
    setEditingSection(null);
  };
  const startEditHours = () => {
    setDraftOpen(operatingHours.open);
    setDraftClose(operatingHours.close);
    setEditingSection("hours");
  };
  const saveHours = () => {
    if (timeIdx(draftClose) <= timeIdx(draftOpen))
      return toast("Close time must be after open time.");
    setOperatingHours({ open: draftOpen, close: draftClose });
    setEditingSection(null);
  };

  // ── Map ────────────────────────────────────────────────────────────────────
  const openMapModal = () => {
    setDraftLocation(selectedLocation);
    setDraftAddress(address);
    setShowMapModal(true);
  };
  const onMapLoad  = useCallback((m) => setMapInstance(m), []);
  const onMapClick = (event) => {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setDraftLocation(loc);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) setDraftAddress(results[0].formatted_address);
    });
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setDraftLocation(loc);
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status === "OK" && results[0]) setDraftAddress(results[0].formatted_address);
      });
      if (mapInstance) { mapInstance.panTo(loc); mapInstance.setZoom(17); }
    });
  };
  const useSLIITLocation = () => {
    setDraftLocation(SLIIT_LOCATION);
    if (mapInstance) { mapInstance.panTo(SLIIT_LOCATION); mapInstance.setZoom(17); }
  };
  const saveLocation = () => {
    if (!draftLocation)       return toast("Please pin a location on the map.");
    if (!draftAddress.trim()) return toast("Please enter an address.");
    setSelectedLocation(draftLocation);
    setAddress(draftAddress);
    setHasLocation(true);
    setShowMapModal(false);
  };

  // ── Photos ─────────────────────────────────────────────────────────────────
  const handleIconSelect = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setIconPreview(URL.createObjectURL(f)); setIconFile(f); e.target.value = null;
  };
  const handleBgSelect = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setBgPreview(URL.createObjectURL(f)); setBgFile(f); e.target.value = null;
  };

  // ── Menu ───────────────────────────────────────────────────────────────────
  const openAddMenuItem  = () => { setEditingItem(emptyMenuItem()); setMenuModal({ mode: "add", index: -1 }); };
  const openEditMenuItem = (index) => { setEditingItem({ ...menuItems[index] }); setMenuModal({ mode: "edit", index }); };
  const removeMenuItem   = (i) => {
    if (menuItems.length === 1) return toast("At least one menu item is required.");
    const item = menuItems[i];
    if (item._id && !item.isNew) setDeletedItemIds((p) => [...p, item._id]);
    setMenuItems((p) => p.filter((_, idx) => idx !== i));
  };
  const toggleEditingTag = (tag) => {
    setEditingItem((prev) => {
      const cur = prev.dietaryTags;
      return { ...prev, dietaryTags: cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag] };
    });
  };
  const handleEditingImageSelect = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setEditingItem((prev) => ({ ...prev, imagePreview: URL.createObjectURL(f), imageFile: f }));
    e.target.value = null;
  };
  const saveMenuItem = () => {
    if (!editingItem.name.trim()) return toast("Item name is required.");
    const p = Number(editingItem.price);
    if (!editingItem.price || p < 30 || p > 10000) return toast("Price must be LKR 30–10,000.");
    if (Number(editingItem.prepTime) < 1 || Number(editingItem.prepTime) > 120) return toast("Prep time must be 1–120 minutes.");
    if (menuModal.mode === "add") {
      setMenuItems((prev) => [...prev, editingItem]);
    } else {
      setMenuItems((prev) => { const u = [...prev]; u[menuModal.index] = editingItem; return u; });
    }
    setMenuModal(null);
    setEditingItem(null);
  };

  // ── Save all ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!kitchenName.trim())              return toast("Kitchen name is required.");
    if (!description.trim())              return toast("Description is required.");
    if (!hasLocation)                     return toast("Please set a location.");
    if (!address.trim())                  return toast("Please enter an address.");
    if (!iconPreview && !iconImageId)     return toast("Please upload a kitchen icon.");
    if (!bgPreview   && !bgImageId)       return toast("Please upload a cover image.");

    setIsSaving(true);
    try {
      let finalIconId = iconImageId;
      if (iconFile) {
        setSaveMsg("Uploading icon…");
        const fd = new FormData(); fd.append("photo", iconFile);
        finalIconId = (await axios.post(`${BASE_URL}/Photo`, fd)).data.data._id;
      }
      let finalBgId = bgImageId;
      if (bgFile) {
        setSaveMsg("Uploading cover image…");
        const fd = new FormData(); fd.append("photo", bgFile);
        finalBgId = (await axios.post(`${BASE_URL}/Photo`, fd)).data.data._id;
      }
      setSaveMsg("Updating food service…");
      await axios.put(`${BASE_URL}/Foodservice/${id}`, {
        kitchenName, description, address,
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        operatingHours, serviceType, deliveryAvailable, pickupAvailable,
        iconImage: finalIconId, BackgroundImage: finalBgId,
      });
      if (deletedItemIds.length > 0) {
        setSaveMsg("Removing deleted items…");
        await Promise.all(deletedItemIds.map((itemId) => axios.delete(`${BASE_URL}/menuitem/${itemId}`)));
      }
      const menuItemIds = [];
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        setSaveMsg(`Saving menu item ${i + 1} of ${menuItems.length}…`);
        let imageId = it.imageId;
        if (it.imageFile) {
          const fd = new FormData(); fd.append("photo", it.imageFile);
          const r = await axios.post(`${BASE_URL}/Photo`, fd);
          if (r.data.success) imageId = r.data.data._id;
        }
        const payload = {
          foodServiceId: id,
          name:          it.name,
          description:   it.description,
          price:         Number(it.price),
          category:      it.category,
          dietaryTags:   it.dietaryTags,
          AvailableHours:it.AvailableHours,
          isAvailable:   it.isAvailable,
          prepTime:      Number(it.prepTime),
          ...(imageId && { image: imageId }),
        };
        if (it.isNew || !it._id) {
          const r2 = await axios.post(`${BASE_URL}/menuitem`, payload);
          menuItemIds.push(r2.data.data._id);
        } else {
          await axios.put(`${BASE_URL}/menuitem/${it._id}`, payload);
          menuItemIds.push(it._id);
        }
      }
      setSaveMsg("Linking menu…");
      await axios.put(`${BASE_URL}/Foodservice/${id}`, { menu: menuItemIds });

      toast("Food service updated successfully!", "success");
      setTimeout(() => navigate("/Listings"), 1500);
    } catch (err) {
      console.error(err);
      toast("Error: " + (err.response?.data?.message || "Something went wrong."));
    } finally {
      setIsSaving(false); setSaveMsg("");
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (isLoading) return <LoadingScreen />;
  if (loadError)
    return (
      <div className="efs-root">
        <Topbar />
        <div className="efs-state-screen">
          <AlertCircle size={32} color="#dc2626" />
          <p className="efs-err">{loadError}</p>
          <button className="efs-btn-primary" onClick={() => navigate("/Listings")}>Go Back</button>
        </div>
      </div>
    );

  return (
    <div className="efs-root">
      {/* ── ToastContainer is now rendered globally by <ToastProvider> ── */}
      <Topbar />

      <div className="efs-page">
        {/* ── Cover + Icon ── */}
        <div className="efs-hero">
          <div className="efs-cover-wrap">
            {bgPreview ? (
              <img src={bgPreview} alt="cover" className="efs-cover-img" />
            ) : (
              <div className="efs-cover-empty">
                <ImageIcon size={28} />
                <span>Add cover photo</span>
              </div>
            )}
            <label className="efs-cover-edit-btn" htmlFor="efs-bg-upload">
              <Camera size={13} /> Change cover
            </label>
            <input type="file" accept="image/*" id="efs-bg-upload" style={{ display: "none" }} onChange={handleBgSelect} />
          </div>
          <div className="efs-icon-wrap">
            <div className="efs-icon-circle">
              {iconPreview ? (
                <img src={iconPreview} alt="icon" />
              ) : (
                <Camera size={30} color="#fff" />
              )}
              <label className="efs-icon-edit-btn" htmlFor="efs-icon-upload">
                <Camera size={12} />
              </label>
              <input type="file" accept="image/*" id="efs-icon-upload" style={{ display: "none" }} onChange={handleIconSelect} />
            </div>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div className="efs-card">

          {/* ── Details Section ── */}
          <div className="efs-section">
            {editingSection !== "details" ? (
              <div className="efs-section-header">
                <div>
                  <div className="efs-service-type-label">{serviceType.toUpperCase()}</div>
                  <h1 className="efs-kitchen-name">
                    {kitchenName || <span className="efs-placeholder">Kitchen name</span>}
                  </h1>
                  {description && <p className="efs-description">{description}</p>}
                </div>
                <button className="efs-edit-btn" onClick={startEditDetails}>
                  <Pencil size={13} /> Edit
                </button>
              </div>
            ) : (
              <div className="efs-inline-form efs-inline-form--has-icon">
                <div className="efs-inline-form-title-row">
                  <span className="efs-inline-form-title">Edit Details</span>
                </div>
                <div className="efs-field">
                  <label className="efs-label">Kitchen name</label>
                  <input className="efs-input" type="text" value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="e.g. Mama's Home Kitchen" maxLength={60} autoFocus />
                  <div className="efs-char-hint">{draftName.length}/60</div>
                </div>
                <div className="efs-field">
                  <label className="efs-label">Service type</label>
                  <select className="efs-select" value={draftType} onChange={(e) => setDraftType(e.target.value)}>
                    {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="efs-field">
                  <label className="efs-label">Description</label>
                  <textarea className="efs-textarea" value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    placeholder="Describe your kitchen…" maxLength={300} rows={3} />
                  <div className="efs-char-hint">{draftDesc.length}/300</div>
                </div>
                <div className="efs-inline-form-footer">
                  <button className="efs-cancel-link" onClick={() => setEditingSection(null)}>Cancel</button>
                  <button className="efs-save-inline-btn" onClick={saveDetails}><Check size={14} /> Save changes</button>
                </div>
              </div>
            )}
          </div>

          <div className="efs-divider" />

          {/* ── Operating Hours ── */}
          <div className="efs-section">
            {editingSection !== "hours" ? (
              <div className="efs-info-row">
                <div className="efs-info-left">
                  <Clock size={17} className="efs-info-icon" />
                  <span className="efs-info-text">{operatingHours.open} – {operatingHours.close}</span>
                </div>
                <button className="efs-edit-btn" onClick={startEditHours}><Pencil size={13} /> Edit</button>
              </div>
            ) : (
              <div className="efs-inline-form">
                <div className="efs-inline-form-title-row">
                  <span className="efs-inline-form-title">Operating hours</span>
                </div>
                <div className="efs-hours-row">
                  <div className="efs-field">
                    <label className="efs-label">Opens</label>
                    <select className="efs-select" value={draftOpen} onChange={(e) => {
                      const v = e.target.value; setDraftOpen(v);
                      if (timeIdx(draftClose) <= timeIdx(v))
                        setDraftClose(TIME_OPTIONS[timeIdx(v) + 1] || v);
                    }}>
                      {TIME_OPTIONS.slice(0, -1).map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <span className="efs-hours-dash">–</span>
                  <div className="efs-field">
                    <label className="efs-label">Closes</label>
                    <select className="efs-select" value={draftClose} onChange={(e) => setDraftClose(e.target.value)}>
                      {TIME_OPTIONS.filter((t) => timeIdx(t) > timeIdx(draftOpen)).map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="efs-inline-form-footer">
                  <button className="efs-cancel-link" onClick={() => setEditingSection(null)}>Cancel</button>
                  <button className="efs-save-inline-btn" onClick={saveHours}><Check size={14} /> Save changes</button>
                </div>
              </div>
            )}
          </div>

          <div className="efs-divider" />

          {/* ── Delivery & Pickup ── */}
          <div className="efs-section">
            <div className="efs-info-row">
              <div className="efs-info-left">
                <div className="efs-toggles-wrap">
                  <div className="efs-toggle-row">
                    <div className="efs-toggle-label-wrap">
                      <Truck size={16} className="efs-info-icon" />
                      <span className="efs-toggle-label">Delivery</span>
                    </div>
                    <Toggle checked={deliveryAvailable} onChange={(val) => {
                      if (!val && !pickupAvailable) return toast("At least one of Delivery or Pickup must be active.");
                      setDeliveryAvailable(val);
                    }} />
                  </div>
                  <div className="efs-toggle-row">
                    <div className="efs-toggle-label-wrap">
                      <ShoppingBag size={16} className="efs-info-icon" />
                      <span className="efs-toggle-label">Pickup</span>
                    </div>
                    <Toggle checked={pickupAvailable} onChange={(val) => {
                      if (!val && !deliveryAvailable) return toast("At least one of Delivery or Pickup must be active.");
                      setPickupAvailable(val);
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="efs-divider" />

          {/* ── Location ── */}
          <div className="efs-section">
            <div className="efs-info-row">
              <div className="efs-info-left">
                <MapPin size={17} className="efs-info-icon" />
                <span className="efs-info-text">
                  {address || <span className="efs-placeholder">No location set</span>}
                </span>
              </div>
              <button className="efs-edit-btn" onClick={openMapModal}><Pencil size={13} /> Edit</button>
            </div>
          </div>

          <div className="efs-divider" />

          {/* ── Menu Items ── */}
          <div className="efs-section efs-section--menu">
            <div className="efs-menu-header">
              <span className="efs-menu-title">MENU ITEMS</span>
              <button className="efs-add-menu-btn" onClick={openAddMenuItem}><Plus size={14} /> Add item</button>
            </div>
            {menuItems.length === 0 ? (
              <div className="efs-menu-empty">
                <UtensilsCrossed size={28} color="#ddd" />
                <p>No menu items yet</p>
                <button className="efs-btn-primary" onClick={openAddMenuItem}><Plus size={13} /> Add first item</button>
              </div>
            ) : (
              <div className="efs-menu-list">
                {menuItems.map((item, i) => (
                  <div key={i} className="efs-menu-item">
                    <div className="efs-menu-item-thumb">
                      {item.imagePreview
                        ? <img src={item.imagePreview} alt={item.name} />
                        : <UtensilsCrossed size={20} color="#ccc" />}
                    </div>
                    <div className="efs-menu-item-info">
                      <div className="efs-menu-item-name">{item.name || "Untitled"}</div>
                      <div className="efs-menu-item-meta">
                        <Clock size={12} className="efs-meta-clock" />
                        <span className="efs-meta-hours">{item.AvailableHours?.open} – {item.AvailableHours?.close}</span>
                      </div>
                      <div className="efs-meta-price">
                        LKR {Number(item.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="efs-menu-item-actions">
                      <button className="efs-menu-action-btn edit" onClick={() => openEditMenuItem(i)} title="Edit"><Pencil size={13} /></button>
                      <button className="efs-menu-action-btn del"  onClick={() => removeMenuItem(i)}   title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── In-card Save / Cancel (desktop) ── */}
          <div className="efs-card-actions">
            <div className="efs-card-actions-inner">
              {isSaving && saveMsg && (
                <span className="efs-save-progress"><Loader2 size={13} className="efs-spin" />{saveMsg}</span>
              )}
              <div className="efs-card-actions-btns">
                <button className="efs-bottom-cancel-btn" onClick={() => navigate("/Listings")} disabled={isSaving}>Cancel</button>
                <button className="efs-bottom-save-btn"   onClick={handleSave}                  disabled={isSaving}>
                  {isSaving ? <><Loader2 size={15} className="efs-spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar (mobile) ── */}
      <div className="efs-bottom-bar">
        <div className="efs-bottom-bar-inner">
          {isSaving && saveMsg && (
            <span className="efs-save-progress"><Loader2 size={13} className="efs-spin" />{saveMsg}</span>
          )}
          <div className="efs-bottom-bar-btns">
            <button className="efs-bottom-cancel-btn" onClick={() => navigate("/Listings")} disabled={isSaving}>Cancel</button>
            <button className="efs-bottom-save-btn"   onClick={handleSave}                  disabled={isSaving}>
              {isSaving ? <><Loader2 size={15} className="efs-spin" /> Saving…</> : <><Save size={15} /> Save changes</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Map Modal ── */}
      {showMapModal && (
        <Modal title="Set kitchen location" onClose={() => setShowMapModal(false)} wide>
          {mapLoadError ? (
            <div className="efs-map-error-inline">Map failed to load. Check your connection.</div>
          ) : !mapIsLoaded ? (
            <div className="efs-map-loading"><Loader2 size={20} className="efs-spin" color="#FF6B2B" /><span>Loading map…</span></div>
          ) : (
            <>
              <div className="efs-map-wrapper">
                <GoogleMap mapContainerStyle={mapContainerStyle} center={draftLocation || SLIIT_LOCATION}
                  zoom={16} options={defaultMapOptions} onLoad={onMapLoad} onClick={onMapClick}>
                  {draftLocation && <Marker position={draftLocation} draggable onDragEnd={onMapClick} />}
                </GoogleMap>
              </div>
              <div className="efs-map-actions">
                <button className="efs-map-btn" onClick={useSLIITLocation}><MapPin size={14} /> SLIIT University</button>
                <button className="efs-map-btn" onClick={useCurrentLocation}><Crosshair size={14} /> Use my location</button>
              </div>
            </>
          )}
          <div className="efs-field">
            <label className="efs-label">Address</label>
            <textarea className="efs-textarea" rows="2" value={draftAddress}
              onChange={(e) => setDraftAddress(e.target.value)} placeholder="Full address…" />
          </div>
          <div className="efs-modal-footer">
            <button className="efs-btn-secondary" onClick={() => setShowMapModal(false)}>Cancel</button>
            <button className="efs-btn-primary"   onClick={saveLocation}><Check size={14} /> Confirm location</button>
          </div>
        </Modal>
      )}

      {/* ── Menu Item Modal ── */}
      {menuModal && editingItem && (
        <Modal
          title={menuModal.mode === "add" ? "Add menu item" : "Edit menu item"}
          onClose={() => { setMenuModal(null); setEditingItem(null); }}
          wide
        >
          <div className="efs-field">
            <label className="efs-label">Item photo</label>
            {!editingItem.imagePreview ? (
              <div className="efs-upload-zone" onClick={() => menuImgRef.current?.click()}>
                <input type="file" accept="image/*" style={{ display: "none" }} ref={menuImgRef} onChange={handleEditingImageSelect} />
                <Upload size={18} color="#bbb" />
                <span className="efs-upload-text">Upload item photo</span>
              </div>
            ) : (
              <div className="efs-photo-preview">
                <img src={editingItem.imagePreview} alt="item" className="efs-item-img" />
                <div className="efs-photo-actions">
                  <button type="button" className="efs-icon-btn del"
                    onClick={() => setEditingItem((p) => ({ ...p, imagePreview: null, imageFile: null, imageId: null }))}>
                    <Trash2 size={13} />
                  </button>
                  <button type="button" className="efs-icon-btn upd" onClick={() => menuImgRef.current?.click()}>
                    <RefreshCw size={13} />
                  </button>
                </div>
                <input type="file" accept="image/*" style={{ display: "none" }} ref={menuImgRef} onChange={handleEditingImageSelect} />
              </div>
            )}
          </div>
          <div className="efs-row">
            <div className="efs-field">
              <label className="efs-label">Item name *</label>
              <input className="efs-input" type="text" value={editingItem.name}
                onChange={(e) => setEditingItem((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Grilled Chicken Rice" />
            </div>
            <div className="efs-field">
              <label className="efs-label">Category</label>
              <select className="efs-select" value={editingItem.category}
                onChange={(e) => setEditingItem((p) => ({ ...p, category: e.target.value }))}>
                {MENU_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="efs-field">
            <label className="efs-label">Description</label>
            <input className="efs-input" type="text" value={editingItem.description}
              onChange={(e) => setEditingItem((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description…" />
          </div>
          <div className="efs-row">
            <div className="efs-field">
              <label className="efs-label">Price (LKR) * 30–10,000</label>
              <input className="efs-input" type="number" value={editingItem.price}
                onChange={(e) => setEditingItem((p) => ({ ...p, price: e.target.value }))}
                onBlur={(e) => {
                  const raw = Number(e.target.value);
                  if (!isNaN(raw) && e.target.value !== "")
                    setEditingItem((p) => ({ ...p, price: String(Math.min(10000, Math.max(30, raw))) }));
                }}
                min="30" max="10000" placeholder="350" />
            </div>
            <div className="efs-field">
              <label className="efs-label">Prep time * 1–120 mins</label>
              <input className="efs-input" type="number" value={editingItem.prepTime}
                onChange={(e) => setEditingItem((p) => ({ ...p, prepTime: e.target.value }))}
                onBlur={(e) => {
                  const raw = Number(e.target.value);
                  if (!isNaN(raw) && e.target.value !== "")
                    setEditingItem((p) => ({ ...p, prepTime: String(Math.min(120, Math.max(1, raw))) }));
                }}
                min="1" max="120" />
            </div>
          </div>
          <div className="efs-field">
            <label className="efs-label">Available hours</label>
            <div className="efs-hours-row">
              <div className="efs-field" style={{ flex: 1 }}>
                <label className="efs-label" style={{ fontSize: 10 }}>From</label>
                <select className="efs-select" value={editingItem.AvailableHours.open}
                  onChange={(e) => setEditingItem((p) => ({ ...p, AvailableHours: { ...p.AvailableHours, open: e.target.value } }))}>
                  {TIME_OPTIONS.filter((t) =>
                    timeIdx(t) >= timeIdx(operatingHours.open) && timeIdx(t) < timeIdx(operatingHours.close)
                  ).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <span className="efs-hours-dash">–</span>
              <div className="efs-field" style={{ flex: 1 }}>
                <label className="efs-label" style={{ fontSize: 10 }}>Until</label>
                <select className="efs-select" value={editingItem.AvailableHours.close}
                  onChange={(e) => setEditingItem((p) => ({ ...p, AvailableHours: { ...p.AvailableHours, close: e.target.value } }))}>
                  {TIME_OPTIONS.filter((t) =>
                    timeIdx(t) > timeIdx(editingItem.AvailableHours.open) && timeIdx(t) <= timeIdx(operatingHours.close)
                  ).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="efs-field">
            <label className="efs-label">Dietary tags</label>
            <div className="efs-tags-row">
              {DIETARY_TAGS.map((tag) => {
                const active = editingItem.dietaryTags.includes(tag.key);
                const Icon   = tag.icon;
                return (
                  <button key={tag.key} type="button" className="efs-tag-btn"
                    style={{ background: active ? tag.bg : "#f5f5f7", color: active ? tag.color : "#aaa",
                             borderColor: active ? tag.border : "#e8e8e8", fontWeight: active ? 700 : 500 }}
                    onClick={() => toggleEditingTag(tag.key)}>
                    <Icon size={13} /><span>{tag.key}</span>{active && <span className="efs-tag-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="efs-field">
            <div className="efs-avail-row">
              <span className="efs-avail-label">Currently available</span>
              <Toggle checked={editingItem.isAvailable} onChange={(v) => setEditingItem((p) => ({ ...p, isAvailable: v }))} />
            </div>
          </div>
          <div className="efs-modal-footer">
            <button className="efs-btn-secondary" onClick={() => { setMenuModal(null); setEditingItem(null); }}>Cancel</button>
            <button className="efs-btn-primary"   onClick={saveMenuItem}>
              <Check size={14} /> {menuModal.mode === "add" ? "Add to menu" : "Save changes"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar() {
  return (
    <div className="efs-topbar">
      <a href="/Listings" className="efs-back-btn">
        <ChevronLeft size={16} />
        <span>Back to Listings</span>
      </a>
    </div>
  );
}
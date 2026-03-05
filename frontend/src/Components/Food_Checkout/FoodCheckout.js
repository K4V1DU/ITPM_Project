import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaAirbnb, FaBars, FaUser,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSignOutAlt, FaEnvelope,
  FaMotorcycle, FaShoppingBag,
  FaSpinner, FaExclamationTriangle,
  FaExclamationCircle, FaSignInAlt,
  FaMapMarkerAlt, FaCheckCircle,
  FaArrowLeft, FaReceipt, FaUtensils,
  FaUserCircle, FaStar, FaPhone,
  FaMoneyBillWave, FaCrosshairs,
} from "react-icons/fa";

const API_BASE       = "http://localhost:8000";
const GOOGLE_MAP_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const ORANGE         = "#FF6B2B";
const FONT           = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;
function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }

// ─────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────
function LoginRequiredModal({ onClose, onLogin }) {
  return (
    <div className="fs-gen-modal-overlay" onClick={onClose}>
      <div className="fs-gen-modal" onClick={e => e.stopPropagation()}>
        <div className="fs-gen-modal__icon fs-gen-modal__icon--warn"><FaExclamationCircle /></div>
        <h3 className="fs-gen-modal__title">Student Login Required</h3>
        <p className="fs-gen-modal__msg">
          This feature is only available for student accounts. Please login as a student to continue.
        </p>
        <div className="fs-gen-modal__actions">
          <button className="fs-gen-modal__btn fs-gen-modal__btn--cancel" onClick={onClose}>Close</button>
          <button className="fs-gen-modal__btn fs-gen-modal__btn--confirm" onClick={onLogin}>
            <FaSignInAlt /> Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fs-gen-modal-overlay" onClick={onCancel}>
      <div className="fs-gen-modal" onClick={e => e.stopPropagation()}>
        <div className="fs-gen-modal__icon fs-gen-modal__icon--logout"><FaSignOutAlt /></div>
        <h3 className="fs-gen-modal__title">Logout</h3>
        <p className="fs-gen-modal__msg">Are you sure you want to logout?</p>
        <div className="fs-gen-modal__actions">
          <button className="fs-gen-modal__btn fs-gen-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="fs-gen-modal__btn fs-gen-modal__btn--danger" onClick={onConfirm}>Yes, Logout</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// GOOGLE MAP — DRAGGABLE DELIVERY PIN
// ─────────────────────────────────────────
function GoogleDeliveryMap({ onLocationSelect, selectedCoords, defaultCenter, gpsCoords }) {
  const mapRef    = useRef(null);
  const gMapRef   = useRef(null);
  const markerRef = useRef(null);

  const initialCenter = defaultCenter
    ? { lat: defaultCenter[1], lng: defaultCenter[0] }
    : { lat: 7.8731, lng: 80.7718 };

  // Helper: place or move marker on the map
  const placeMarker = (lat, lng) => {
    if (!gMapRef.current || !window.google) return;
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      markerRef.current = new window.google.maps.Marker({
        position:  { lat, lng },
        map:       gMapRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        icon: buildIcon(),
      });
      markerRef.current.addListener("dragend", (e) => {
        onLocationSelect([e.latLng.lng(), e.latLng.lat()]);
      });
    }
    onLocationSelect([lng, lat]);
  };

  const buildIcon = () => ({
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: ORANGE, fillOpacity: 1,
    strokeColor: "#fff", strokeWeight: 2,
    scale: 2,
    anchor: new window.google.maps.Point(12, 22),
  });

  // React to GPS coords pushed from parent
  useEffect(() => {
    if (!gpsCoords || !gMapRef.current) return;
    placeMarker(gpsCoords.lat, gpsCoords.lng);
    gMapRef.current.panTo({ lat: gpsCoords.lat, lng: gpsCoords.lng });
    gMapRef.current.setZoom(17);
  }, [gpsCoords]);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || gMapRef.current) return;
      const google = window.google;

      const map = new google.maps.Map(mapRef.current, {
        center:             initialCenter,
        zoom:               defaultCenter ? 14 : 8,
        mapTypeControl:     false,
        streetViewControl:  false,
        fullscreenControl:  false,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        styles: [
          { featureType: "poi",     stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      gMapRef.current = map;

      map.addListener("click", (e) => {
        placeMarker(e.latLng.lat(), e.latLng.lng());
      });

      // Restore existing pin
      if (selectedCoords) {
        const [lng, lat] = selectedCoords;
        markerRef.current = new google.maps.Marker({
          position: { lat, lng }, map,
          draggable: true, icon: buildIcon(),
        });
        markerRef.current.addListener("dragend", (e) => {
          onLocationSelect([e.latLng.lng(), e.latLng.lat()]);
        });
        map.setCenter({ lat, lng });
      }
    };

    if (window.google?.maps) { initMap(); return; }

    const scriptId = "gmap-script";
    if (!document.getElementById(scriptId)) {
      const script      = document.createElement("script");
      script.id         = scriptId;
      script.src        = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_KEY}&callback=__initGMap`;
      script.async      = true;
      script.defer      = true;
      window.__initGMap = initMap;
      document.head.appendChild(script);
    } else {
      window.__initGMap = initMap;
    }

    return () => {
      if (gMapRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(gMapRef.current);
        gMapRef.current   = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{
        width: "100%", height: 340, borderRadius: 14,
        border: "1px solid #e2e2e2", overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }} />
      {!selectedCoords && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.95)", borderRadius: 50,
          padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#545454",
          pointerEvents: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}>
          <FaMapMarkerAlt style={{ color: ORANGE }} /> Click on the map to set delivery location
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// GOOGLE MAP — PICKUP (static embed)
// ─────────────────────────────────────────
function GooglePickupMap({ service }) {
  const coords = service?.location?.coordinates;
  const lat    = coords ? coords[1] : 6.9020;
  const lng    = coords ? coords[0] : 79.9667;
  const src    = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  return (
    <div style={{
      width: "100%", height: 280, borderRadius: 14, overflow: "hidden",
      border: "1px solid #e2e2e2", position: "relative",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <iframe src={src} style={{ width: "100%", height: "100%", border: "none" }}
        allowFullScreen loading="lazy" title="Pickup Location" />
      <div style={{
        position: "absolute", bottom: 12, left: 12, background: "#fff",
        borderRadius: 10, padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <FaUtensils style={{ color: ORANGE, fontSize: 16 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{service?.kitchenName ?? "Kitchen"}</div>
          <div style={{ fontSize: 12, color: "#757575" }}>{service?.address ?? ""}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// HOST CARD
// ─────────────────────────────────────────
function HostCard({ ownerUser }) {
  const name      = ownerUser?.name ?? "Host";
  const since     = ownerUser?.createdAt ? new Date(ownerUser.createdAt).getFullYear() : null;
  const phone     = ownerUser?.phone ?? ownerUser?.phoneNumber ?? ownerUser?.contact ?? null;
  const photoId   = ownerUser?.profileImage ?? null;
  const avatarSrc = photoId ? (/^[a-f\d]{24}$/i.test(photoId) ? photoSrc(photoId) : photoId) : null;

  return (
    <div style={{
      border: "1px solid #e2e2e2", borderRadius: 16, padding: "20px 24px",
      background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#FF6B2B,#e85a1a)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", border: "2.5px solid #fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
      }}>
        {avatarSrc
          ? <img src={avatarSrc} alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.currentTarget.style.display = "none"; }} />
          : <FaUserCircle style={{ fontSize: 36, color: "#fff" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
          Your order is handled by
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#000", marginBottom: 3 }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#757575", display: "flex", alignItems: "center", gap: 5 }}>
            <FaStar style={{ color: "#f59e0b", fontSize: 11 }} />
            Unisewana Host {since && `· Since ${since}`}
          </div>
          {phone && (
            <div style={{ fontSize: 12, color: "#545454", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <FaPhone style={{ fontSize: 10, color: ORANGE }} /> {phone}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SUCCESS SCREEN
// ─────────────────────────────────────────
function OrderSuccess({ orderId, orderType, onGoOrders }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "55vh", gap: 20,
      textAlign: "center", padding: "0 24px",
    }}>
      <div style={{
        width: 84, height: 84, borderRadius: "50%",
        background: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fcoModalPop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <FaCheckCircle style={{ color: "#16a34a", fontSize: 38 }} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#000", marginBottom: 6 }}>Order Placed!</div>
        <div style={{ fontSize: 14, color: "#757575", marginBottom: 4 }}>
          Your {orderType === "delivery" ? "delivery" : "pickup"} order has been received.
        </div>
        <div style={{
          display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 700, color: "#545454",
          background: "#f3f4f6", padding: "4px 14px", borderRadius: 20,
        }}>
          Order ID: {orderId}
        </div>
      </div>
      <div style={{
        background: "#fff8f5", border: "1.5px solid #fdd0bb", borderRadius: 14,
        padding: "16px 24px", fontSize: 14, color: "#545454", lineHeight: 1.7, maxWidth: 380,
      }}>
        {orderType === "delivery"
          ? "Pay in cash when your food arrives. Have the exact amount ready."
          : "Head to the kitchen to collect your order. Pay cash on pickup."}
      </div>
      <button onClick={onGoOrders} style={{
        padding: "13px 32px", background: ORANGE, color: "#fff",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: FONT,
      }}>
        <FaReceipt /> View My Orders
      </button>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
export default function FoodCheckout() {
  const { id: FOOD_SERVICE_ID } = useParams();
  const navigate                = useNavigate();
  const location                = useLocation();

  const {
    cartItems   = [],
    cartTotal   = 0,
    orderType   = "delivery",
    service     = null,
    foodServiceId,
  } = location.state ?? {};

  // Delivery is free for now
  const deliveryFee = 0;

  const userId    = localStorage.getItem("CurrentUserId");
  const isLoggedIn = !!userId;

  const [currentUser,       setCurrentUser]       = useState(null);
  const [userAvatarSrc,     setUserAvatarSrc]     = useState(null);
  const [ownerUser,         setOwnerUser]         = useState(null);
  const [showDropdown,      setShowDropdown]      = useState(false);
  const [showLogoutModal,   setShowLogoutModal]   = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [notes,             setNotes]             = useState("");
  const [deliveryCoords,    setDeliveryCoords]    = useState(null);
  const [gpsCoords,         setGpsCoords]         = useState(null);   // triggers map pan
  const [gpsLoading,        setGpsLoading]        = useState(false);
  const [gpsError,          setGpsError]          = useState(null);
  const [submitting,        setSubmitting]        = useState(false);
  const [submitError,       setSubmitError]       = useState(null);
  const [placedOrderId,     setPlacedOrderId]     = useState(null);

  const dropdownRef = useRef(null);
  const userRole    = currentUser?.role ?? null;
  const isStudent   = userRole === "student";
  const isHost      = userRole === "host";

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (!raw) return;
        const user = unwrap(raw);
        setCurrentUser(user);
        if (user?.profileImage) setUserAvatarSrc(photoSrc(user.profileImage));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ownerId = service?.owner?._id ?? service?.owner;
    if (!ownerId) return;
    fetch(`${API_BASE}/User/${ownerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => { if (raw) setOwnerUser(unwrap(raw)); })
      .catch(() => {});
  }, [service]);

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (!cartItems.length) navigate(-1); }, []);
  useEffect(() => { if (currentUser && !isStudent) setShowLoginRequired(true); }, [currentUser]);

  const handleLogoutConfirm = () => {
    localStorage.removeItem("CurrentUserId");
    navigate("/Login");
  };

  // ── Use My Location ────────────────────
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);                              // triggers map pan
        setDeliveryCoords([coords.lng, coords.lat]);       // updates parent state
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1)
          setGpsError("Location access denied. Please allow location in your browser settings.");
        else
          setGpsError("Could not get your location. Please pin manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ── Place order ────────────────────────
  const handlePlaceOrder = async () => {
    if (orderType === "delivery" && !deliveryCoords) {
      setSubmitError("Please drop a pin on the map to set your delivery location.");
      return;
    }
    setSubmitError(null);
    setSubmitting(true);

    const serviceCoords   = service?.location?.coordinates ?? [79.9667, 6.9020];
    const locationPayload = orderType === "delivery"
      ? { type: "Point", coordinates: deliveryCoords }
      : { type: "Point", coordinates: serviceCoords };

    const body = {
      student:     userId,
      foodService: FOOD_SERVICE_ID ?? foodServiceId,
      orderType,
      items: cartItems.map(item => ({
        menuItem: item._id, name: item.name, price: item.price, qty: item.qty,
      })),
      itemCount:   cartItems.reduce((s, i) => s + i.qty, 0),
      subtotal:    cartTotal,
      deliveryFee: deliveryFee,
      total:       cartTotal,
      notes:       notes.trim(),
      location:    locationPayload,
    };

    try {
      const res = await fetch(`${API_BASE}/foodorder`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw   = await res.json();
      const order = unwrap(raw);
      setPlacedOrderId(order._id ?? "—");
    } catch {
      setSubmitError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const bgImageSrc    = service?.BackgroundImage ? photoSrc(service.BackgroundImage) : null;
  const iconImageSrc  = service?.iconImage       ? photoSrc(service.iconImage)       : null;
  const kitchenName   = service?.kitchenName     ?? "Kitchen";
  const address       = service?.address         ?? "";
  const defaultCenter = service?.location?.coordinates ?? null;
  const hostBtnLabel  = !isLoggedIn ? "Login" : isHost ? "Host Page" : null;
  const hostBtnAction = () => navigate(!isLoggedIn ? "/Login" : "/Listings");

  return (
    <div style={{ fontFamily: FONT, background: "#f7f7f7", color: "#1b1b1b", fontSize: 14, lineHeight: 1.5 }}>

      {/* ══ NAVBAR — position:relative so it NEVER overlaps hero ══ */}
      <nav className="fs-nav" style={{ position: "relative", zIndex: 100 }}>
        <div className="fs-nav__left">
          <a href="/" className="fs-nav__logo"><FaAirbnb /> Unisewana</a>
        </div>
        <div className="fs-nav__tabs">
          {[
            { label: "Boardings",     href: "/Boardings"    },
            { label: "Food Services", href: "/FoodServices" },
            { label: "Orders",        href: "/Orders"       },
          ].map(({ label, href }) => (
            <a key={label} href={href} className="fs-nav__tab" style={{ fontFamily: FONT }}>{label}</a>
          ))}
        </div>
        <div className="fs-nav__right">
          {hostBtnLabel && (
            <button className="fs-nav__host-btn" style={{ fontFamily: FONT }} onClick={hostBtnAction}>
              {hostBtnLabel}
            </button>
          )}
          <div className="fs-nav__avatar">
            {userAvatarSrc
              ? <img src={userAvatarSrc} alt="Profile" className="fs-nav__avatar-img"
                  onError={() => setUserAvatarSrc(null)} />
              : <FaUser className="fs-nav__avatar-icon" />}
          </div>
          <div ref={dropdownRef} className="fs-dropdown">
            <div className="fs-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}><FaBars /></div>
            {showDropdown && (
              <div className="fs-dropdown__menu">
                {isLoggedIn && currentUser && (
                  <>
                    <div className="fs-dropdown__user">
                      <span className="fs-dropdown__username">{currentUser.name ?? "User"}</span>
                      <span className="fs-dropdown__email">{currentUser.email ?? ""}</span>
                      <span className={`fs-dropdown__role fs-dropdown__role--${userRole}`}>{userRole}</span>
                    </div>
                    <div className="fs-dropdown__divider" />
                  </>
                )}
                {(isStudent || isHost) && (
                  <div className="fs-dropdown__item" onClick={() => { setShowDropdown(false); navigate("/Profile"); }}>
                    <FaUser style={{ opacity: 0.7 }} /> Profile
                  </div>
                )}
                {isStudent && (
                  <div className="fs-dropdown__item" onClick={() => { setShowDropdown(false); navigate("/Messages"); }}>
                    <FaEnvelope style={{ opacity: 0.7 }} /> Messages
                  </div>
                )}
                {isLoggedIn && (isStudent || isHost) && (
                  <>
                    <div className="fs-dropdown__divider" />
                    <div className="fs-dropdown__item fs-dropdown__item--danger"
                      onClick={() => { setShowDropdown(false); setShowLogoutModal(true); }}>
                      <FaSignOutAlt style={{ opacity: 0.7 }} /> Logout
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO — Facebook-style ══ */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e2e2" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          {/* Banner */}
          <div style={{
            width: "100%", height: 220,
            borderRadius: "0 0 16px 16px",
            overflow: "hidden", position: "relative",
            background: bgImageSrc
              ? "transparent"
              : "linear-gradient(135deg,#FF6B2B 0%,#e85a1a 50%,#c44010 100%)",
          }}>
            {bgImageSrc && (
              <img src={bgImageSrc} alt="banner"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { e.currentTarget.style.display = "none"; }} />
            )}
            {!bgImageSrc && (
              <div style={{
                position: "absolute", inset: 0, opacity: 0.07,
                backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)",
                backgroundSize: "28px 28px",
              }} />
            )}
            {/* Bottom fade */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 100,
              background: "linear-gradient(to bottom,transparent,rgba(0,0,0,0.35))",
            }} />
            {/* Back button */}
            <button onClick={() => navigate(-1)} style={{
              position: "absolute", top: 14, left: 16,
              display: "flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.9)", border: "none",
              borderRadius: 50, padding: "8px 16px",
              fontSize: 13, fontWeight: 700, color: "#1b1b1b",
              cursor: "pointer", fontFamily: FONT,
              boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            }}>
              <FaArrowLeft style={{ fontSize: 11 }} /> Back
            </button>
          </div>

          {/* Icon + name strip */}
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 18,
            transform: "translateY(-44px)", marginBottom: "-28px",
          }}>
            {/* Round kitchen icon */}
            <div style={{
              width: 110, height: 110, borderRadius: "50%", flexShrink: 0,
              border: "4px solid #fff",
              background: iconImageSrc ? "transparent" : "linear-gradient(135deg,#FF6B2B,#e85a1a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
            }}>
              {iconImageSrc
                ? <img src={iconImageSrc} alt="icon"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.currentTarget.style.display = "none"; }} />
                : <FaUtensils style={{ color: "#fff", fontSize: 44 }} />}
            </div>
            {/* Name + address */}
            <div style={{ paddingBottom: 8, flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#000", margin: 0, lineHeight: 1.2 }}>
                {kitchenName}
              </h1>
              {address && (
                <div style={{ fontSize: 13, color: "#757575", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
                  <FaMapMarkerAlt style={{ color: ORANGE, fontSize: 11 }} /> {address}
                </div>
              )}
            </div>
            {/* Order type badge */}
            <div style={{ paddingBottom: 8 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 18px", borderRadius: 50,
                background: orderType === "delivery" ? "#fff5f0" : "#f0f9ff",
                border: `1.5px solid ${orderType === "delivery" ? "#fdd0bb" : "#bae6fd"}`,
                fontSize: 13, fontWeight: 700,
                color: orderType === "delivery" ? ORANGE : "#0369a1",
              }}>
                {orderType === "delivery" ? <><FaMotorcycle /> Delivery</> : <><FaShoppingBag /> Pickup</>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ PAGE BODY ══ */}
      <div className="fs-wrapper" style={{ paddingTop: 28, paddingBottom: 80 }}>
        {placedOrderId ? (
          <OrderSuccess orderId={placedOrderId} orderType={orderType} onGoOrders={() => navigate("/Orders")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 28, alignItems: "start" }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Host card — delivery only */}
              {orderType === "delivery" && <HostCard ownerUser={ownerUser} />}

              {/* Location section */}
              <div style={{
                border: "1px solid #e2e2e2", borderRadius: 16, padding: "24px",
                background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: orderType === "delivery" ? "#fff5f0" : "#f0f9ff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {orderType === "delivery"
                        ? <FaMapMarkerAlt style={{ color: ORANGE, fontSize: 16 }} />
                        : <FaShoppingBag style={{ color: "#0369a1", fontSize: 15 }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#000" }}>
                        {orderType === "delivery" ? "Set Delivery Location" : "Pickup Location"}
                      </div>
                      <div style={{ fontSize: 13, color: "#757575" }}>
                        {orderType === "delivery"
                          ? "Click to place a pin. Drag to adjust the exact position."
                          : "Come to the kitchen to collect your order."}
                      </div>
                    </div>
                  </div>

                  {/* Use My Location button — delivery only */}
                  {orderType === "delivery" && (
                    <button
                      onClick={handleUseMyLocation}
                      disabled={gpsLoading}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "9px 16px", borderRadius: 50,
                        border: `1.5px solid ${ORANGE}`,
                        background: gpsLoading ? "#f7f7f7" : "#fff",
                        color: gpsLoading ? "#aaa" : ORANGE,
                        fontSize: 13, fontWeight: 700, cursor: gpsLoading ? "wait" : "pointer",
                        fontFamily: FONT, transition: "background 0.18s, color 0.18s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { if (!gpsLoading) { e.currentTarget.style.background = ORANGE; e.currentTarget.style.color = "#fff"; } }}
                      onMouseLeave={e => { if (!gpsLoading) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = ORANGE; } }}
                    >
                      {gpsLoading
                        ? <FaSpinner className="fco-spin" style={{ fontSize: 13 }} />
                        : <FaCrosshairs style={{ fontSize: 13 }} />}
                      {gpsLoading ? "Locating..." : "Use My Location"}
                    </button>
                  )}
                </div>

                {/* GPS error */}
                {gpsError && (
                  <div style={{
                    marginBottom: 12, padding: "10px 14px",
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 10, fontSize: 13, color: "#dc2626",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <FaExclamationTriangle style={{ flexShrink: 0 }} /> {gpsError}
                  </div>
                )}

                {orderType === "delivery" ? (
                  <>
                    <GoogleDeliveryMap
                      onLocationSelect={setDeliveryCoords}
                      selectedCoords={deliveryCoords}
                      defaultCenter={defaultCenter}
                      gpsCoords={gpsCoords}
                    />
                    {deliveryCoords && (
                      <div style={{
                        marginTop: 10, display: "flex", alignItems: "center", gap: 8,
                        fontSize: 13, color: "#16a34a", fontWeight: 600,
                        background: "#f0fdf4", padding: "10px 14px",
                        borderRadius: 10, border: "1px solid #bbf7d0",
                      }}>
                        <FaCheckCircle />
                        Location set — {deliveryCoords[1].toFixed(5)}, {deliveryCoords[0].toFixed(5)}
                      </div>
                    )}
                  </>
                ) : (
                  <GooglePickupMap service={service} />
                )}
              </div>

              {/* Notes */}
              <div style={{
                border: "1px solid #e2e2e2", borderRadius: 16, padding: "24px",
                background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#000", marginBottom: 4 }}>
                  Special Instructions
                </div>
                <div style={{ fontSize: 13, color: "#757575", marginBottom: 14 }}>
                  Allergies, preferences, or anything the kitchen should know
                </div>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. Less spicy, extra sauce, no onions"
                  style={{
                    width: "100%", padding: "12px 14px",
                    border: "1px solid #e2e2e2", borderRadius: 10,
                    fontSize: 14, fontFamily: FONT, resize: "vertical",
                    minHeight: 90, outline: "none", color: "#1b1b1b",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = ORANGE; e.target.style.boxShadow = "0 0 0 3px rgba(255,107,43,0.12)"; }}
                  onBlur={e  => { e.target.style.borderColor = "#e2e2e2"; e.target.style.boxShadow = "none"; }}
                />
                <div style={{ fontSize: 11, color: "#aaa", textAlign: "right", marginTop: 4 }}>
                  {notes.length} / 500
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN — Order Summary ── */}
            <div style={{ position: "sticky", top: 24 }}>
              <div style={{
                border: "1px solid #e2e2e2", borderRadius: 16,
                overflow: "hidden", background: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}>
                {/* Header */}
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#000", marginBottom: 2 }}>
                    Order Summary
                  </div>
                  <div style={{ fontSize: 13, color: "#757575", display: "flex", alignItems: "center", gap: 6 }}>
                    {orderType === "delivery"
                      ? <><FaMotorcycle style={{ color: ORANGE }} /> Delivery</>
                      : <><FaShoppingBag style={{ color: "#0369a1" }} /> Pickup</>}
                    {" · "}{kitchenName}
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: "8px 0" }}>
                  {cartItems.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 20px", borderBottom: "1px solid #f9f9f9",
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, background: "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#545454", flexShrink: 0,
                      }}>{item.qty}x</div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#000" }}>{item.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        LKR {(item.price * item.qty).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#545454", marginBottom: 6 }}>
                    <span>Subtotal</span><span>LKR {cartTotal.toLocaleString()}</span>
                  </div>
                  {orderType === "delivery" && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#038a3a", fontWeight: 600, marginBottom: 6 }}>
                      <span>Delivery fee</span><span>Free</span>
                    </div>
                  )}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: 16, fontWeight: 800, color: "#000",
                    borderTop: "1px solid #e2e2e2", paddingTop: 10, marginTop: 4,
                  }}>
                    <span>Total</span>
                    <span style={{ color: ORANGE }}>LKR {cartTotal.toLocaleString()}</span>
                  </div>

                  {/* COD notice */}
                  <div style={{
                    marginTop: 14, padding: "12px 14px",
                    background: "#fff8f5", border: "1px solid #fdd0bb",
                    borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10,
                  }}>
                    <FaMoneyBillWave style={{ color: ORANGE, fontSize: 16, marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#000", marginBottom: 2 }}>
                        Cash on Delivery
                      </div>
                      <div style={{ fontSize: 12, color: "#757575", lineHeight: 1.6 }}>
                        {orderType === "delivery"
                          ? "Pay in cash when your food arrives. Please have the exact amount ready."
                          : "Pay in cash when you collect your order from the kitchen."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {submitError && (
                  <div style={{
                    margin: "0 20px 12px", padding: "10px 14px",
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 10, fontSize: 13, color: "#dc2626",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <FaExclamationTriangle style={{ flexShrink: 0 }} /> {submitError}
                  </div>
                )}

                {/* Place order */}
                <div style={{ padding: "4px 20px 20px" }}>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting || (orderType === "delivery" && !deliveryCoords)}
                    style={{
                      width: "100%", padding: "15px",
                      background: (submitting || (orderType === "delivery" && !deliveryCoords))
                        ? "#e2e2e2"
                        : `linear-gradient(135deg,${ORANGE} 0%,#e85a1a 100%)`,
                      color: (submitting || (orderType === "delivery" && !deliveryCoords)) ? "#999" : "#fff",
                      border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
                      cursor: submitting ? "wait" : (orderType === "delivery" && !deliveryCoords) ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      fontFamily: FONT, transition: "opacity 0.18s",
                    }}
                  >
                    {submitting
                      ? <><FaSpinner className="fco-spin" style={{ fontSize: 14 }} /> Placing Order...</>
                      : orderType === "delivery" && !deliveryCoords
                        ? "Drop a pin to continue"
                        : <>Place Order · LKR {cartTotal.toLocaleString()}</>}
                  </button>
                  <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 10, lineHeight: 1.5 }}>
                    By placing this order you agree to pay cash on {orderType === "delivery" ? "delivery" : "pickup"}.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="fs-footer">
        <div className="fs-footer__bottom">
          <div className="fs-footer__left">
            <span>© 2026 Unisewana, Inc.</span>
            <span className="fs-footer__dot">·</span>
            <a href="#" className="fs-footer__legal-link">Privacy</a>
            <span className="fs-footer__dot">·</span>
            <a href="#" className="fs-footer__legal-link">Terms</a>
            <span className="fs-footer__dot">·</span>
            <a href="#" className="fs-footer__legal-link">Sitemap</a>
          </div>
          <div className="fs-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="fs-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {showLogoutModal && (
        <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogoutModal(false)} />
      )}
      {showLoginRequired && (
        <LoginRequiredModal
          onClose={() => { setShowLoginRequired(false); navigate(-1); }}
          onLogin={() => { setShowLoginRequired(false); navigate("/Login"); }}
        />
      )}

      <style>{`
        @keyframes fcoModalPop {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        .fco-spin { animation: fcoSpin 0.8s linear infinite; display: inline-block; }
        @keyframes fcoSpin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .fco-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
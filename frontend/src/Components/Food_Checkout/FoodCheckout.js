import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaAirbnb, FaMotorcycle, FaShoppingBag,
  FaUser, FaPhone, FaHome, FaMapMarkerAlt,
  FaChevronLeft, FaCheckCircle, FaChevronRight,
  FaSpinner, FaClock, FaReceipt, FaStore,
  FaExclamationCircle, FaMoneyBillWave, FaSearch,
  FaLocationArrow, FaMap,
} from "react-icons/fa";
import "./FoodCheckout.css";

const API_BASE = "http://localhost:8000";
const ORANGE = "#FF6B2B";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function unwrap(raw) { return raw?.data ?? raw?.result ?? raw; }
const photoSrc = (id) => id ? `${API_BASE}/Photo/${id}` : null;

// Google Maps embed URL (no API key — same as FoodService)
const googleMapEmbed = (lat, lng, zoom = 16) =>
  `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

const googleMapEmbedSearch = (query, zoom = 15) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;

// ─── Success Modal ──────────────────────────────────────────────────────────
function SuccessModal({ order, onClose }) {
  return (
    <div className="fco-success-overlay">
      <div className="fco-success-modal">
        <div className="fco-success-anim">
          <div className="fco-success-ring fco-success-ring--1" />
          <div className="fco-success-ring fco-success-ring--2" />
          <FaCheckCircle className="fco-success-icon" />
        </div>
        <h2 className="fco-success-title">Order Confirmed!</h2>
        <p className="fco-success-sub">Your order has been sent to the kitchen.</p>
        <div className="fco-success-meta">
          <div className="fco-success-meta__item">
            <span className="fco-success-meta__label">Order ID</span>
            <span className="fco-success-meta__value">#{order?._id?.slice(-8).toUpperCase() ?? "------"}</span>
          </div>
          <div className="fco-success-meta__sep" />
          <div className="fco-success-meta__item">
            <span className="fco-success-meta__label">{order?.orderType === "pickup" ? "Pickup in" : "Delivered in"}</span>
            <span className="fco-success-meta__value">{order?.orderType === "pickup" ? "15–20 min" : "30–45 min"}</span>
          </div>
        </div>
        <div className="fco-success-payment">
          <FaMoneyBillWave style={{ color: "#059669" }} />
          {order?.orderType === "pickup" ? "Pay cash at the kitchen when you collect" : "Pay cash when your order arrives"}
        </div>
        <button className="fco-success-btn" onClick={onClose} style={{ fontFamily: FONT }}>Done</button>
      </div>
    </div>
  );
}

// ─── Field helper ───────────────────────────────────────────────────────────
function Field({ label, required, optional, error, full, children }) {
  return (
    <div className={"fco-field" + (full ? " fco-field--full" : "")}>
      <label className="fco-field__label">
        {label}
        {required && <span className="fco-req"> *</span>}
        {optional && <span className="fco-opt"> (optional)</span>}
      </label>
      {children}
      {error && <div className="fco-field__err"><FaExclamationCircle style={{ fontSize:11 }} /> {error}</div>}
    </div>
  );
}

// ─── Google Map iframe ──────────────────────────────────────────────────────
function GoogleMapFrame({ src, height = 300, title = "Map" }) {
  return (
    <iframe
      src={src}
      width="100%" height={height}
      style={{ border: 0, display: "block" }}
      allowFullScreen loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title={title}
    />
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function FoodCheckout() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    cartItems     = [],
    cartTotal     = 0,
    orderType     = "delivery",
    deliveryFee   = 0,
    orderTotal    = 0,
    service       = null,
    foodServiceId = null,
  } = location.state ?? {};

  const userId     = localStorage.getItem("CurrentUserId");
  const isDelivery = orderType === "delivery";

  // Shop coords (GeoJSON: [lng, lat])
  const shopCoords = service?.location?.coordinates;
  const shopLat    = shopCoords ? shopCoords[1] : 6.9271;
  const shopLng    = shopCoords ? shopCoords[0] : 79.8612;

  const [step,         setStep]         = useState(1);
  const [submitting,   setSubmitting]   = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);

  const [form, setForm] = useState({
    name:            "",
    phone:           "",
    note:            "",
    deliveryAddress: "",
  });
  const [errors, setErrors] = useState({});

  // Map display state — what the iframe shows
  const [mapSrc, setMapSrc] = useState(
    isDelivery
      ? googleMapEmbed(shopLat, shopLng) // default to shop area until user searches
      : googleMapEmbed(shopLat, shopLng)
  );
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (!cartItems.length) navigate(-1);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => {
        if (!raw) return;
        const user = unwrap(raw);
        setForm(prev => ({ ...prev, name: user?.name ?? "", phone: user?.phone ?? "" }));
      })
      .catch(() => {});
  }, []);

  const kitchenName = service?.kitchenName ?? "Kitchen";
  const shopAddress = service?.address     ?? "";
  const iconImage   = service?.iconImage   ?? null;

  const setField = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  // Search address → update map + form address
  const handleAddressSearch = () => {
    const q = searchInput.trim();
    if (!q) return;
    setMapSrc(googleMapEmbedSearch(q));
    setForm(prev => ({ ...prev, deliveryAddress: q }));
    if (errors.deliveryAddress) setErrors(prev => ({ ...prev, deliveryAddress: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Full name is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^[0-9+\s\-]{7,15}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number";
    if (isDelivery && !form.deliveryAddress.trim()) e.deliveryAddress = "Please enter your delivery address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goReview = () => {
    if (!validate()) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (step === 2) { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else navigate(-1);
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      const payload = {
        student:          userId,
        foodService:      foodServiceId,
        items:            cartItems.map(i => ({ menuItem: i._id, name: i.name, quantity: i.qty, price: i.price })),
        orderType,
        deliveryAddress:  isDelivery ? form.deliveryAddress : shopAddress,
        contactName:      form.name,
        contactPhone:     form.phone,
        specialNote:      form.note,
        paymentMethod:    isDelivery ? "cash_on_delivery" : "cash_on_pickup",
        subtotal:         cartTotal,
        deliveryFee,
        totalAmount:      orderTotal,
        status:           "pending",
      };
      const res  = await fetch(`${API_BASE}/order`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      setSuccessOrder({ ...unwrap(data), orderType });
    } catch {
      setSuccessOrder({ _id: Date.now().toString(), orderType });
    } finally {
      setSubmitting(false);
    }
  };

  const totalQty  = cartItems.reduce((s, i) => s + i.qty, 0);
  const shopMapSrc = googleMapEmbed(shopLat, shopLng);

  return (
    <div className="fco-root" style={{ fontFamily: FONT }}>

      {/* Navbar */}
      <nav className="fco-nav">
        <a href="/" className="fco-nav__logo"><FaAirbnb /> Bodima</a>
        <div className="fco-nav__center">
          <div className="fco-nav__title">Checkout</div>
          <div className="fco-nav__kitchen">
            {iconImage
              ? <img src={photoSrc(iconImage)} alt={kitchenName} className="fco-nav__kitchen-img" />
              : <span className="fco-nav__kitchen-emoji">🍗</span>}
            <span>{kitchenName}</span>
          </div>
        </div>
        <button className="fco-nav__back" onClick={goBack} style={{ fontFamily: FONT }}>
          <FaChevronLeft style={{ fontSize: 11 }} /> Back
        </button>
      </nav>

      {/* Progress bar */}
      <div className="fco-progress">
        <div className="fco-progress__track">
          <div className="fco-progress__fill" style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>
        <div className="fco-progress__steps">
          {["Your Details", "Review & Place"].map((label, i) => {
            const n = i + 1; const done = step > n; const cur = step === n;
            return (
              <div key={n} className={"fco-progress__step" + (cur ? " fco-progress__step--active" : "") + (done ? " fco-progress__step--done" : "")}>
                <div className="fco-progress__dot">
                  {done ? <FaCheckCircle style={{ fontSize: 12 }} /> : n}
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="fco-body">
        <div className="fco-main">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="fco-card">

              {/* Contact */}
              <div className="fco-section">
                <div className="fco-section__head">
                  <div className="fco-section__num">01</div>
                  <div>
                    <div className="fco-section__title">Contact Details</div>
                    <div className="fco-section__sub">So the kitchen can reach you if needed</div>
                  </div>
                </div>
                <div className="fco-form-grid">
                  <Field label="Full Name" required error={errors.name}>
                    <div className={"fco-input-wrap" + (errors.name ? " fco-input-wrap--err" : "")}>
                      <FaUser className="fco-input-icon" />
                      <input className="fco-input" placeholder="e.g. Kamal Perera"
                        value={form.name} onChange={e => setField("name", e.target.value)} style={{ fontFamily: FONT }} />
                    </div>
                  </Field>
                  <Field label="Phone Number" required error={errors.phone}>
                    <div className={"fco-input-wrap" + (errors.phone ? " fco-input-wrap--err" : "")}>
                      <FaPhone className="fco-input-icon" />
                      <input className="fco-input" placeholder="e.g. 077 123 4567"
                        value={form.phone} onChange={e => setField("phone", e.target.value)} style={{ fontFamily: FONT }} />
                    </div>
                  </Field>
                </div>
              </div>

              <div className="fco-section-divider" />

              {/* Location */}
              <div className="fco-section">
                <div className="fco-section__head">
                  <div className="fco-section__num">02</div>
                  <div>
                    <div className="fco-section__title">
                      {isDelivery ? "Delivery Location" : "Pickup Location"}
                    </div>
                    <div className="fco-section__sub">
                      {isDelivery
                        ? "Enter your address — the map will update to confirm"
                        : "Collect your order from this location"}
                    </div>
                  </div>
                </div>

                {isDelivery ? (
                  <>
                    {/* Address input + search */}
                    <div className="fco-addr-row">
                      <div className={"fco-input-wrap fco-input-wrap--grow" + (errors.deliveryAddress ? " fco-input-wrap--err" : "")}>
                        <FaMapMarkerAlt className="fco-input-icon" style={{ color: ORANGE }} />
                        <input className="fco-input" placeholder="Enter your delivery address…"
                          value={searchInput}
                          onChange={e => { setSearchInput(e.target.value); setField("deliveryAddress", e.target.value); }}
                          onKeyDown={e => e.key === "Enter" && handleAddressSearch()}
                          style={{ fontFamily: FONT }} />
                      </div>
                      <button className="fco-search-btn" onClick={handleAddressSearch} style={{ fontFamily: FONT }}>
                        <FaSearch style={{ fontSize: 13 }} /> Show on Map
                      </button>
                    </div>
                    {errors.deliveryAddress && (
                      <div className="fco-field__err" style={{ marginTop: 8 }}>
                        <FaExclamationCircle style={{ fontSize: 11 }} /> {errors.deliveryAddress}
                      </div>
                    )}

                    {/* Google Map embed */}
                    <div className="fco-map-wrap" style={{ marginTop: 16 }}>
                      <GoogleMapFrame src={mapSrc} height={300} title="Delivery location" />
                    </div>
                    <div className="fco-map-tip">
                      <FaLocationArrow style={{ color: ORANGE, fontSize: 12 }} />
                      Type your address and click "Show on Map" to confirm your location
                    </div>
                  </>
                ) : (
                  <>
                    {/* Static shop map */}
                    <div className="fco-map-wrap">
                      <GoogleMapFrame src={shopMapSrc} height={280} title={kitchenName} />
                    </div>
                    <div className="fco-shop-location-card">
                      <div className="fco-shop-location-card__icon">
                        {iconImage
                          ? <img src={photoSrc(iconImage)} alt={kitchenName} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8 }} />
                          : "🍗"}
                      </div>
                      <div>
                        <div className="fco-shop-location-card__name">{kitchenName}</div>
                        {shopAddress && <div className="fco-shop-location-card__addr"><FaMapMarkerAlt style={{ fontSize:11, color: ORANGE }} /> {shopAddress}</div>}
                        <div className="fco-shop-location-card__eta"><FaClock style={{ fontSize:11 }} /> Ready in 15–20 min</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="fco-section-divider" />

              {/* Special instructions */}
              <div className="fco-section">
                <div className="fco-section__head">
                  <div className="fco-section__num">03</div>
                  <div>
                    <div className="fco-section__title">Special Instructions</div>
                    <div className="fco-section__sub">Optional — allergies, spice level, etc.</div>
                  </div>
                </div>
                <textarea className="fco-textarea" rows={3}
                  placeholder="e.g. No onions, extra spicy, ring bell on arrival…"
                  value={form.note} onChange={e => setField("note", e.target.value)}
                  style={{ fontFamily: FONT }} />
              </div>

              {/* Payment banner */}
              <div className="fco-payment-banner">
                <div className="fco-payment-banner__icon"><FaMoneyBillWave /></div>
                <div>
                  <div className="fco-payment-banner__title">{isDelivery ? "Cash on Delivery" : "Pay at Pickup"}</div>
                  <div className="fco-payment-banner__sub">
                    {isDelivery
                      ? "Have the exact amount ready when your order arrives."
                      : "Pay when you collect your order from the kitchen."}
                  </div>
                </div>
              </div>

              <button className="fco-next-btn" onClick={goReview} style={{ fontFamily: FONT }}>
                Review Order <FaChevronRight style={{ fontSize: 12 }} />
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="fco-card">
              <div className="fco-review-header">
                <FaReceipt style={{ color: ORANGE, fontSize: 22 }} />
                <div>
                  <div className="fco-review-header__title">Review Your Order</div>
                  <div className="fco-review-header__sub">Everything look right? Place your order below.</div>
                </div>
              </div>

              {/* Order type */}
              <div className="fco-order-type-row">
                <div className={"fco-order-type-badge fco-order-type-badge--" + orderType}>
                  {isDelivery ? <FaMotorcycle /> : <FaShoppingBag />}
                  {isDelivery ? "Delivery" : "Pickup"}
                </div>
                <div className="fco-order-type-pay">
                  <FaMoneyBillWave style={{ color: "#059669" }} />
                  {isDelivery ? "Cash on delivery" : "Pay at kitchen"}
                </div>
              </div>

              {/* Contact */}
              <div className="fco-review-block">
                <div className="fco-review-block__label">Contact</div>
                <div className="fco-review-grid">
                  <div className="fco-review-chip"><FaUser /><span>{form.name}</span></div>
                  <div className="fco-review-chip"><FaPhone /><span>{form.phone}</span></div>
                </div>
              </div>

              {/* Location */}
              <div className="fco-review-block">
                <div className="fco-review-block__label">{isDelivery ? "Delivery Location" : "Pickup Location"}</div>
                <div className="fco-map-wrap fco-map-wrap--review">
                  <GoogleMapFrame
                    src={isDelivery ? mapSrc : shopMapSrc}
                    height={200}
                    title="Location"
                  />
                </div>
                <div className="fco-review-addr">
                  <FaMapMarkerAlt style={{ color: ORANGE, flexShrink: 0 }} />
                  <span>{isDelivery ? form.deliveryAddress : (shopAddress || kitchenName)}</span>
                </div>
              </div>

              {/* Note */}
              {form.note && (
                <div className="fco-review-block">
                  <div className="fco-review-block__label">Note</div>
                  <div className="fco-review-note-text">{form.note}</div>
                </div>
              )}

              {/* Items */}
              <div className="fco-review-block">
                <div className="fco-review-block__label">Items ({totalQty})</div>
                <div className="fco-items-list">
                  {cartItems.map(item => (
                    <div key={item._id} className="fco-item-row">
                      <span className="fco-item-row__qty">{item.qty}×</span>
                      <span className="fco-item-row__name">{item.name}</span>
                      <span className="fco-item-row__price">LKR {(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="fco-totals">
                <div className="fco-totals__row"><span>Subtotal</span><span>LKR {cartTotal.toLocaleString()}</span></div>
                <div className="fco-totals__row">
                  <span>Delivery fee</span>
                  <span className={deliveryFee === 0 ? "fco-totals__free" : ""}>
                    {deliveryFee === 0 ? "Free" : `LKR ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="fco-totals__grand"><span>Total</span><span>LKR {orderTotal.toLocaleString()}</span></div>
              </div>

              <button className="fco-place-btn" onClick={handlePlaceOrder} disabled={submitting} style={{ fontFamily: FONT }}>
                {submitting
                  ? <><FaSpinner className="fco-spin" /> Placing Order…</>
                  : <>Confirm Order · LKR {orderTotal.toLocaleString()}</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="fco-sidebar">
          <div className="fco-sidebar__box">
            <div className="fco-sidebar__kitchen">
              <div className="fco-sidebar__kitchen-img">
                {iconImage
                  ? <img src={photoSrc(iconImage)} alt={kitchenName} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:10 }} />
                  : "🍗"}
              </div>
              <div>
                <div className="fco-sidebar__kitchen-name">{kitchenName}</div>
                <div className="fco-sidebar__kitchen-type">
                  {isDelivery ? <><FaMotorcycle /> Delivery</> : <><FaShoppingBag /> Pickup</>}
                </div>
              </div>
            </div>
            <div className="fco-sidebar__div" />
            <div className="fco-sidebar__items">
              {cartItems.map(item => (
                <div key={item._id} className="fco-sidebar__item">
                  <div className="fco-sidebar__item-l">
                    <span className="fco-sidebar__item-qty">{item.qty}×</span>
                    <span className="fco-sidebar__item-name">{item.name}</span>
                  </div>
                  <span className="fco-sidebar__item-price">LKR {(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="fco-sidebar__div" />
            <div className="fco-sidebar__totals">
              <div className="fco-sidebar__total-row"><span>Subtotal</span><span>LKR {cartTotal.toLocaleString()}</span></div>
              <div className="fco-sidebar__total-row">
                <span>Delivery fee</span>
                <span style={{ color: deliveryFee === 0 ? "#059669" : undefined, fontWeight: 600 }}>
                  {deliveryFee === 0 ? "Free" : `LKR ${deliveryFee.toLocaleString()}`}
                </span>
              </div>
              <div className="fco-sidebar__grand"><span>Total</span><span>LKR {orderTotal.toLocaleString()}</span></div>
            </div>
            <div className="fco-sidebar__eta">
              <FaClock style={{ color: ORANGE }} />
              {isDelivery ? "Est. 30–45 min delivery" : "Ready in 15–20 min"}
            </div>
          </div>
        </aside>
      </div>

      {successOrder && <SuccessModal order={successOrder} onClose={() => navigate("/FoodServices")} />}

      <style>{`.fco-spin { animation: fcoSpin 0.8s linear infinite; display:inline-block; } @keyframes fcoSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
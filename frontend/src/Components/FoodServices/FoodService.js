import { useState, useEffect, useRef } from "react";
import {
  FaAirbnb, FaBars, FaUser, FaSearch,
  FaFacebookF, FaTwitter, FaInstagram,
  FaCog, FaSignOutAlt, FaEnvelope,
  FaMotorcycle, FaShoppingBag, FaPen,
} from "react-icons/fa";
import "./FoodService.css";

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const PINK = "#FF385C";
const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const BG = {
  bg1: "linear-gradient(135deg,#fff5f0,#fde8e8)",
  bg2: "linear-gradient(135deg,#fff8e1,#fef3c7)",
  bg3: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
  bg4: "linear-gradient(135deg,#f0f9ff,#dbeafe)",
  bg5: "linear-gradient(135deg,#fdf4ff,#f3e8ff)",
  bg6: "linear-gradient(135deg,#fff7ed,#fed7aa)",
};

const TAG_STYLE = {
  Spicy:          { color: "#b91c1c", background: "#fff1f2", border: "1px solid #fecaca" },
  Vegetarian:     { color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0" },
  Vegan:          { color: "#166534", background: "#dcfce7", border: "1px solid #86efac" },
  "Gluten-Free":  { color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a" },
};
const TAG_ICON = { Spicy: "🌶", Vegetarian: "🥦", Vegan: "🌱", "Gluten-Free": "🌾" };

const CAT_ICON = { Breakfast: "🍳", Lunch: "🥗", Dinner: "🍗", Snacks: "🌶", Drinks: "🥤", Dessert: "🍮" };
const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];

const STAR_HINTS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

// ─────────────────────────────────────────
// DATA
// ─────────────────────────────────────────
const INITIAL_REVIEWS = [
  { id: 1, name: "Jesse",    years: 7,  stars: 5, date: "December 2025", color: "#1a1a2e", text: "This tiny home was so cozy — a perfect little hideaway. Everything from check-in to check-out was easy and clearly explained. The roast chicken was absolutely divine! Would definitely recommend to anyone visiting the area." },
  { id: 2, name: "Jennifer", years: 5,  stars: 5, date: "December 2025", color: "#6a3093", text: "Amazing deal! Such a cosy little place! Perfect when you just need somewhere to stay for the night! Samantha was a lovely and helpful host. Would definitely come back next time I'm in town!" },
  { id: 3, name: "Max",      years: 1,  stars: 5, date: "December 2025", color: "#11998e", text: "Easy check-in. Very peaceful and a relaxed neighbourhood. Very good value for money. The roast chicken was tender and juicy with an amazing spice blend. No oil, no MSG — you can really taste the difference." },
  { id: 4, name: "Martin",   years: 12, stars: 4, date: "December 2025", color: "#c94b4b", text: "Very convenient, characterful place and great value. Samantha replied to messages very quickly so my short stay went smoothly. I'd stay there again if I'm travelling through the area." },
  { id: 5, name: "Priya",    years: 3,  stars: 5, date: "November 2025", color: "#f7971e", text: "Best roast chicken in Malabe, hands down! The full chicken was so well marinated and the homemade spicy sauce is incredible. Delivery was fast and everything was still warm. Will 100% be ordering again!" },
  { id: 6, name: "Kasun",    years: 4,  stars: 5, date: "November 2025", color: "#1d4350", text: "Ordered the bite pack and it was absolutely fire! Loved the spicy onion salad on the side. The no oil, no MSG claim is very real — it tastes so clean and natural. Five stars without hesitation!" },
];

const MENU_DATA = [
  { id: 1,  name: "Roast Chicken Full",                  emoji: "🍗", description: "Well marinated Rotisserie Chicken full – comes with Spicy onion salad and Homemade spicy sauce. (Before roasting 1.1–1.2kg) · NO OIL OR MSG ADDED.",              price: 2699, category: "Dinner",   dietaryTags: ["Spicy"],                          isAvailable: true,  prepTime: 30, availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "94% (168)", bg: "bg1" },
  { id: 2,  name: "Roast Chicken Half",                  emoji: "🍖", description: "Well marinated Rotisserie Chicken Half – comes with Spicy onion salad and Homemade spicy sauce. Wrapped in Aluminium Foil. NO OIL OR MSG ADDED.",                   price: 1399, category: "Dinner",   dietaryTags: ["Spicy"],                          isAvailable: true,  prepTime: 20, availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "90% (120)", bg: "bg2" },
  { id: 3,  name: "Half Chicken Bite Pack",              emoji: "🌶", description: "Roast chicken half (with bones) cut into small pieces, mixed with onion, green chillies and spicy sauce. Packed in Aluminium foil sheet. NO OIL OR MSG ADDED.",    price: 1399, category: "Snacks",   dietaryTags: ["Spicy"],                          isAvailable: true,  prepTime: 15, availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "93% (83)",  bg: "bg3" },
  { id: 4,  name: "Full Chicken Bite Pack",              emoji: "🔥", description: "Roast chicken full (with bones) cut into small pieces, mixed with onion, green chillies and spicy sauce. Packed in Aluminium foil sheet. NO OIL OR MSG ADDED.",     price: 2699, category: "Snacks",   dietaryTags: ["Spicy"],                          isAvailable: true,  prepTime: 30, availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "95% (83)",  bg: "bg4" },
  { id: 5,  name: "Shredded Chicken – Half Portion",    emoji: "🥢", description: "Half roast chicken shredded, mixed with onion salad, green chilis and spicy sauce. Packed in Aluminium foil tray. Selection: Spicy or Medium Spicy.",               price: 1399, category: "Dinner",   dietaryTags: ["Spicy", "Gluten-Free"],           isAvailable: true,  prepTime: 20, availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "90% (10)",  bg: "bg5" },
  { id: 6,  name: "Shredded Chicken (Boneless) – Full", emoji: "🥩", description: "Full roast chicken shredded, mixed with onion salad and spicy sauce. Packed in Aluminium foil tray or cardboard box.",                                               price: 2699, category: "Dinner",   dietaryTags: ["Gluten-Free"],                    isAvailable: true,  prepTime: 30, availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "87% (8)",   bg: "bg6" },
  { id: 7,  name: "Egg Hoppers",                        emoji: "🥚", description: "Classic Sri Lankan egg hoppers made with fermented rice batter, topped with a soft-set egg. Served with coconut sambol and seeni sambol.",                          price: 350,  category: "Breakfast", dietaryTags: ["Vegetarian"],                     isAvailable: true,  prepTime: 10, availableHours: { open: "07:00 AM", close: "11:00 AM" },                      bg: "bg2" },
  { id: 8,  name: "String Hoppers with Curry",          emoji: "🍜", description: "Soft, steamed rice-flour noodle patties served with rich dhal curry and coconut milk gravy. A hearty Sri Lankan breakfast staple.",                                  price: 420,  category: "Breakfast", dietaryTags: ["Vegan", "Gluten-Free"],           isAvailable: true,  prepTime: 12, availableHours: { open: "07:00 AM", close: "11:00 AM" },                      bg: "bg3" },
  { id: 9,  name: "Coconut Sambol",                     emoji: "🥥", description: "Freshly made coconut sambol with green chillies, red onion and lime juice. Available only during breakfast hours.",                                                   price: 199,  category: "Breakfast", dietaryTags: ["Vegan", "Vegetarian", "Gluten-Free"], isAvailable: false, prepTime: 10, availableHours: { open: "07:00 AM", close: "11:00 AM" },                      bg: "bg2" },
  { id: 10, name: "Chicken Rice Plate",                 emoji: "🍛", description: "Tender roast chicken pieces on fragrant yellow rice with spicy onion salad, papadum, and our signature sauce.",                                                       price: 950,  category: "Lunch",     dietaryTags: ["Spicy", "Gluten-Free"],           isAvailable: true,  prepTime: 15, availableHours: { open: "11:00 AM", close: "03:00 PM" }, rating: "88% (45)", bg: "bg1" },
  { id: 11, name: "Chicken Kottu",                      emoji: "🥘", description: "Chopped roti tossed on a griddle with shredded roast chicken, eggs, vegetables, and spices. The iconic Sri Lankan street food experience.",                          price: 850,  category: "Lunch",     dietaryTags: ["Spicy"],                          isAvailable: true,  prepTime: 20, availableHours: { open: "11:00 AM", close: "03:00 PM" }, rating: "91% (62)", bg: "bg4" },
  { id: 12, name: "King Coconut Water",                 emoji: "🥥", description: "Fresh chilled king coconut water, naturally sweet and hydrating. Served in the shell or in a chilled cup.",                                                           price: 280,  category: "Drinks",    dietaryTags: ["Vegan", "Gluten-Free"],           isAvailable: true,  prepTime: 2,  availableHours: { open: "04:00 PM", close: "10:40 PM" },                      bg: "bg3" },
  { id: 13, name: "Soft Drink (Can)",                   emoji: "🥤", description: "Your choice of chilled soft drink — Coca-Cola, Sprite, or Fanta. Perfect pairing with spicy roast chicken.",                                                         price: 250,  category: "Drinks",    dietaryTags: ["Vegan"],                          isAvailable: true,  prepTime: 1,  availableHours: { open: "04:00 PM", close: "10:40 PM" },                      bg: "bg4" },
  { id: 14, name: "Mineral Water (500ml)",              emoji: "💧", description: "500ml chilled mineral water. Stay cool and refreshed alongside your meal.",                                                                                            price: 100,  category: "Drinks",    dietaryTags: ["Vegan", "Gluten-Free"],           isAvailable: true,  prepTime: 1,  availableHours: { open: "04:00 PM", close: "10:40 PM" },                      bg: "bg5" },
  { id: 15, name: "Watalappam",                         emoji: "🍮", description: "Classic Sri Lankan spiced custard pudding made with coconut milk, jaggery, eggs, cardamom, and nutmeg. Rich, creamy, and aromatic.",                                 price: 380,  category: "Dessert",   dietaryTags: ["Vegetarian", "Gluten-Free"],      isAvailable: true,  prepTime: 5,  availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "92% (28)", bg: "bg6" },
  { id: 16, name: "Curd & Treacle",                     emoji: "🍯", description: "Traditional Sri Lankan buffalo curd with thick kithul palm treacle. Tangy, sweet, and deeply satisfying.",                                                            price: 320,  category: "Dessert",   dietaryTags: ["Vegetarian", "Gluten-Free"],      isAvailable: true,  prepTime: 3,  availableHours: { open: "04:00 PM", close: "10:40 PM" }, rating: "89% (19)", bg: "bg2" },
  { id: 17, name: "Spicy Onion Salad",                  emoji: "🥗", description: "Fresh onion salad tossed with green chillies and house spicy dressing.",                                                                                              price: 299,  category: "Snacks",    dietaryTags: ["Vegan", "Spicy", "Gluten-Free"],  isAvailable: true,  prepTime: 5,  availableHours: { open: "04:00 PM", close: "10:40 PM" },                      bg: "bg3" },
  { id: 18, name: "Homemade Spicy Sauce (Extra)",       emoji: "🌶", description: "Extra portion of our signature homemade spicy sauce.",                                                                                                                 price: 150,  category: "Snacks",    dietaryTags: ["Vegan", "Spicy", "Gluten-Free"],  isAvailable: true,  prepTime: 2,  availableHours: { open: "04:00 PM", close: "10:40 PM" },                      bg: "bg1" },
];

// Random avatar color pool
const AVATAR_COLORS = ["#1a1a2e","#6a3093","#11998e","#c94b4b","#f7971e","#1d4350","#0f3460","#e94560","#533483","#2b5876"];

// ─────────────────────────────────────────
// DIETARY TAG CHIP
// ─────────────────────────────────────────
function DietTag({ tag }) {
  return (
    <span className="fs-diet-tag" style={TAG_STYLE[tag]}>
      {TAG_ICON[tag]} {tag}
    </span>
  );
}

// ─────────────────────────────────────────
// STAR RATER
// ─────────────────────────────────────────
function StarRater({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="fs-star-rater">
      <div className="fs-star-rater__label">Your Rating</div>
      <div className="fs-star-rater__stars">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={`fs-star-rater__star${display >= n ? " fs-star-rater__star--active" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          >⭐</button>
        ))}
      </div>
      <div className="fs-star-rater__hint">{display ? STAR_HINTS[display] : "Tap a star to rate"}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// REVIEW MODAL
// ─────────────────────────────────────────
function ReviewModal({ onClose, onSubmit }) {
  const [name,    setName]    = useState("");
  const [stars,   setStars]   = useState(0);
  const [text,    setText]    = useState("");
  const MAX = 400;

  const canSubmit = name.trim().length > 0 && stars > 0 && text.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), stars, text: text.trim() });
  };

  return (
    <div
      className="fs-review-modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="fs-review-modal">
        {/* Header */}
        <div className="fs-review-modal__header">
          <div>
            <div className="fs-review-modal__title">Leave a Review</div>
            <div className="fs-review-modal__subtitle">Red Roosters Roast Chicken · Malabe</div>
          </div>
          <button className="fs-review-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="fs-review-modal__body">
          {/* Star rater */}
          <StarRater value={stars} onChange={setStars} />

          {/* Name */}
          <div className="fs-review-field">
            <div className="fs-review-field__label">Your Name</div>
            <input
              className="fs-review-field__input"
              type="text"
              placeholder="e.g. Kasun"
              value={name}
              maxLength={40}
              onChange={e => setName(e.target.value)}
              style={{ fontFamily: FONT }}
            />
          </div>

          {/* Review text */}
          <div className="fs-review-field">
            <div className="fs-review-field__label">Your Review</div>
            <textarea
              className="fs-review-field__textarea"
              placeholder="Tell others about your experience — the food, delivery speed, flavour… (min 10 characters)"
              value={text}
              maxLength={MAX}
              onChange={e => setText(e.target.value)}
              style={{ fontFamily: FONT }}
            />
            <div className="fs-review-field__char-count">{text.length} / {MAX}</div>
          </div>

          {/* Submit */}
          <button
            className="fs-review-submit-btn"
            disabled={!canSubmit}
            onClick={handleSubmit}
            style={{ fontFamily: FONT }}
          >
            <FaPen style={{ fontSize: 13 }} />
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MENU ITEM ROW
// ─────────────────────────────────────────
function MenuItemRow({ item, onOpen, onAdd, isLast }) {
  const unavail = item.isAvailable === false;

  return (
    <div
      onClick={() => !unavail && onOpen(item)}
      className={[
        "fs-menu-item",
        isLast       ? "fs-menu-item--last"        : "",
        unavail      ? "fs-menu-item--unavailable"  : "",
      ].join(" ")}
    >
      <div className="fs-menu-item__info">
        <div className="fs-menu-item__name">
          {item.name}
          {unavail && <span className="fs-menu-item__unavail-badge">○ Unavailable</span>}
        </div>
        {item.dietaryTags?.length > 0 && (
          <div className="fs-menu-item__tags">
            {item.dietaryTags.map(t => <DietTag key={t} tag={t} />)}
          </div>
        )}
        <div className="fs-menu-item__description">{item.description}</div>
        <div className="fs-menu-item__meta">
          <span className="fs-menu-item__meta-text">⏱ {item.prepTime} min prep</span>
          <span className="fs-menu-item__meta-text">🕐 {item.availableHours?.open} – {item.availableHours?.close}</span>
        </div>
        <div className="fs-menu-item__price-row">
          <span className="fs-menu-item__price">LKR {item.price.toLocaleString()}.00</span>
          {item.rating && <span className="fs-menu-item__rating"><span style={{ color: "#038a3a" }}>👍</span> {item.rating}</span>}
        </div>
      </div>
      <div
        className="fs-menu-item__image"
        style={{ background: BG[item.bg] || BG.bg1 }}
      >
        {item.emoji}
        {!unavail && (
          <button
            className="fs-menu-item__add-btn"
            onClick={e => { e.stopPropagation(); onAdd(item); }}
          >+</button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// ORDER TYPE TOGGLE
// ─────────────────────────────────────────
function OrderTypeToggle({ value, onChange }) {
  return (
    <div className="fs-order-toggle">
      {[
        { key: "delivery", label: "Delivery", icon: <FaMotorcycle style={{ fontSize: 13 }} /> },
        { key: "pickup",   label: "Pickup",   icon: <FaShoppingBag style={{ fontSize: 12 }} /> },
      ].map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`fs-order-toggle__btn${value === key ? " fs-order-toggle__btn--active" : ""}`}
          style={{ fontFamily: FONT }}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
function FoodService() {
  const [activeTab,      setActiveTab]      = useState("food");
  const [activeNav,      setActiveNav]      = useState(CATEGORIES[0]);
  const [cart,           setCart]           = useState({});
  const [modal,          setModal]          = useState(null);
  const [modalQty,       setModalQty]       = useState(1);
  const [toast,          setToast]          = useState({ show: false, msg: "" });
  const [expanded,       setExpanded]       = useState({});
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [orderType,      setOrderType]      = useState("delivery");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviews,         setReviews]        = useState(INITIAL_REVIEWS);

  const sectionRefs = useRef({});
  const toastTimer  = useRef(null);
  const dropdownRef = useRef(null);

  // ── cart ──────────────────────────────
  const addToCart = (item) => {
    setCart(prev => ({ ...prev, [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 } }));
    showToast(`Added "${item.name}" to cart`);
  };
  const changeQty = (id, delta) => {
    setCart(prev => {
      const qty = (prev[id]?.qty || 0) + delta;
      if (qty <= 0) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: { ...prev[id], qty } };
    });
  };
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  // ── toast ─────────────────────────────
  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ show: false, msg: "" }), 2400);
  };

  // ── modal ─────────────────────────────
  const openModal    = (item) => { setModal(item); setModalQty(1); };
  const closeModal   = ()     => setModal(null);
  const addFromModal = () => {
    for (let i = 0; i < modalQty; i++) addToCart(modal);
    closeModal();
  };

  // ── scroll spy ────────────────────────
  useEffect(() => {
    const ids = CATEGORIES.map(c => `cat-${c}`);
    const onScroll = () => {
      let cur = `cat-${CATEGORIES[0]}`;
      ids.forEach(id => {
        const el = sectionRefs.current[id];
        if (el && el.getBoundingClientRect().top < 140) cur = id;
      });
      setActiveNav(cur.replace("cat-", ""));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── close dropdown on outside click ───
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── delivery fee ──────────────────────
  const deliveryFee = orderType === "delivery" ? 150 : 0;
  const orderTotal  = cartTotal + deliveryFee;

  // ── review submit ─────────────────────
  const handleReviewSubmit = ({ name, stars, text }) => {
    const now  = new Date();
    const date = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const newReview = {
      id: Date.now(),
      name,
      years: 0,
      stars,
      date,
      color,
      text,
      isNew: true,
    };
    setReviews(prev => [newReview, ...prev]);
    setShowReviewModal(false);
    showToast("Thanks for your review! 🎉");
  };

  // ─────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT, background: "#fff", color: "#1b1b1b", fontSize: 14, lineHeight: 1.5 }}>

      {/* ══ NAVBAR ══ */}
      <nav className="fs-nav">
        <div className="fs-nav__left">
          <a href="#" className="fs-nav__logo"><FaAirbnb /> Bodima</a>
          <div className="fs-nav__tabs">
            {[
              { key: "boardings",   label: "Boardings" },
              { key: "food",        label: "Food Services" },
              { key: "experiences", label: "Online Experiences" },
            ].map(({ key, label }) => {
              const active = activeTab === key;
              return (
                <a
                  key={key}
                  href="#"
                  onClick={e => { e.preventDefault(); setActiveTab(key); }}
                  className={`fs-nav__tab${active ? " fs-nav__tab--active" : ""}`}
                >
                  {label}
                  {active && <span className="fs-nav__tab-underline" />}
                </a>
              );
            })}
          </div>
        </div>

        <div className="fs-nav__right">
          <button className="fs-nav__host-btn" style={{ fontFamily: FONT }}>Become a Host</button>
          <div className="fs-nav__icon-btn"><FaUser /></div>
          <div ref={dropdownRef} className="fs-dropdown">
            <div className="fs-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}>
              <FaBars />
            </div>
            {showDropdown && (
              <div className="fs-dropdown__menu">
                {[
                  { icon: <FaUser style={{ opacity: 0.75, fontSize: 15 }} />,     label: "Profile" },
                  { icon: <FaEnvelope style={{ opacity: 0.75, fontSize: 15 }} />, label: "Messages" },
                ].map(({ icon, label }) => (
                  <div key={label} className="fs-dropdown__item">{icon} {label}</div>
                ))}
                <div className="fs-dropdown__divider" />
                <div className="fs-dropdown__item"><FaCog style={{ opacity: 0.75, fontSize: 15 }} /> Settings</div>
                <div className="fs-dropdown__item fs-dropdown__item--danger"><FaSignOutAlt style={{ opacity: 0.75, fontSize: 15 }} /> Logout</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div className="fs-hero">
        <div className="fs-hero__dots" />
        <div className="fs-hero__gradient" />
        <span className="fs-hero__emoji">🍗</span>
      </div>

      {/* ══ PAGE WRAPPER ══ */}
      <div className="fs-wrapper">
        {/* Restaurant header */}
        <div className="fs-restaurant-header">
          <div className="fs-restaurant-header__logo">🍗</div>
          <div className="fs-restaurant-header__info">
            <h1 className="fs-restaurant-header__title">Red Roosters Roast Chicken - Malabe</h1>
            <div className="fs-restaurant-header__meta">
              <span style={{ fontWeight: 600, color: "#1b1b1b" }}>⭐ 4.6</span>
              {["(600+ ratings)", "Sri Lankan", "Fried Chicken", "Wraps", "$"].map(t => (
                <span key={t} style={{ display: "contents" }}>
                  <span style={{ color: "#ccc" }}>•</span><span>{t}</span>
                </span>
              ))}
              <span style={{ color: "#ccc" }}>•</span>
              <span style={{ color: "#1b1b1b", textDecoration: "underline", cursor: "pointer", fontWeight: 500 }}>Info</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <span className="fs-restaurant-header__badge">
                <span className="fs-restaurant-header__status-dot" />
                <span style={{ color: "#038a3a", fontWeight: 600 }}>Open</span>
                <span style={{ color: "#545454" }}>· Closes 10:40 PM</span>
              </span>
            </div>
            <div className="fs-restaurant-header__address">📍 Kaduwela Road, Malabe, Western 10115</div>
          </div>
          <div className="fs-restaurant-header__actions">
            <button className="fs-restaurant-header__action-btn" style={{ fontSize: 16 }}>🤍</button>
            <button className="fs-restaurant-header__action-btn" style={{ fontSize: 14, fontWeight: 700 }}>•••</button>
          </div>
        </div>

        <div className="fs-divider" />

        {/* ══ 3-COLUMN BODY ══ */}
        <div className="fs-body-grid">

          {/* LEFT sidebar */}
          <nav className="fs-sidebar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => scrollTo(`cat-${cat}`)}
                className={`fs-sidebar__btn${activeNav === cat ? " fs-sidebar__btn--active" : ""}`}
                style={{ fontFamily: FONT }}
              >{CAT_ICON[cat]} {cat}</button>
            ))}
          </nav>

          {/* CENTRE menu */}
          <main>
            {CATEGORIES.map(cat => {
              const items = MENU_DATA.filter(i => i.category === cat);
              if (!items.length) return null;
              return (
                <section
                  key={cat}
                  className="fs-cat-section"
                  ref={el => sectionRefs.current[`cat-${cat}`] = el}
                >
                  <div className="fs-cat-section__title">{CAT_ICON[cat]} {cat}</div>
                  {items.map((item, idx) => (
                    <MenuItemRow
                      key={item.id} item={item}
                      isLast={idx === items.length - 1}
                      onOpen={openModal} onAdd={addToCart}
                    />
                  ))}
                </section>
              );
            })}
          </main>

          {/* RIGHT cart */}
          <aside className="fs-cart">
            <div className="fs-cart__box">
              <div className="fs-cart__header">
                <div className="fs-cart__title">
                  Your order
                  {cartCount > 0 && <span className="fs-cart__count-badge">{cartCount}</span>}
                </div>
                <div className="fs-cart__subtitle">Red Roosters Roast Chicken - Malabe</div>
                <OrderTypeToggle value={orderType} onChange={setOrderType} />
                <div className="fs-cart__hint">
                  {orderType === "delivery"
                    ? <><FaMotorcycle style={{ color: PINK }} /> Estimated delivery: 30–45 min</>
                    : <><FaShoppingBag style={{ color: PINK }} /> Ready for pickup in 15–20 min</>}
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div className="fs-cart__empty">
                  <div className="fs-cart__empty-icon">🛒</div>
                  <div className="fs-cart__empty-title">No items in your cart</div>
                  <div className="fs-cart__empty-text">Add items from the menu to get started</div>
                </div>
              ) : (
                <>
                  {cartItems.map(item => (
                    <div key={item.id} className="fs-cart__item">
                      <div className="fs-cart__item-name">{item.name}</div>
                      <div className="fs-cart__qty-controls">
                        <button className="fs-cart__qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                        <span className="fs-cart__qty-value">{item.qty}</span>
                        <button className="fs-cart__qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                      </div>
                      <div className="fs-cart__item-price">LKR {(item.price * item.qty).toLocaleString()}</div>
                    </div>
                  ))}
                  <div className="fs-cart__summary">
                    <div className="fs-cart__summary-row">
                      <span>Subtotal</span><span>LKR {cartTotal.toLocaleString()}</span>
                    </div>
                    {orderType === "delivery" && (
                      <div className="fs-cart__summary-row">
                        <span>Delivery fee</span><span style={{ fontWeight: 600 }}>LKR {deliveryFee.toLocaleString()}</span>
                      </div>
                    )}
                    {orderType === "pickup" && (
                      <div className="fs-cart__summary-row fs-cart__summary-row--pickup">
                        <span>🛍 Pickup discount</span><span>Free delivery</span>
                      </div>
                    )}
                    <div className="fs-cart__total-row">
                      <span>Total</span><span>LKR {orderTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="fs-cart__footer">
                <button
                  disabled={cartItems.length === 0}
                  className="fs-cart__checkout-btn"
                  style={{ fontFamily: FONT }}
                >
                  <span>{orderType === "delivery" ? "Go to checkout" : "Place pickup order"}</span>
                  {cartItems.length > 0 && <span style={{ fontSize: 14, opacity: 0.9 }}>LKR {orderTotal.toLocaleString()}</span>}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ══ REVIEWS ══ */}
      <section className="fs-reviews">
        <div className="fs-wrapper">
          <div className="fs-reviews__header">What guests are saying</div>
          <div className="fs-reviews__rating-row">
            <span className="fs-reviews__score">4.6</span>
            <div>
              <div style={{ fontSize: 18 }}>★★★★★</div>
              <div style={{ fontSize: 14, color: "#757575" }}>{reviews.length}+ ratings · December 2025</div>
            </div>
          </div>

          {/* ── Write a Review button ── */}
          <button
            className="fs-write-review-btn"
            style={{ fontFamily: FONT }}
            onClick={() => setShowReviewModal(true)}
          >
            <FaPen style={{ fontSize: 13 }} /> Write a Review
          </button>

          {/* Reviews grid */}
          <div className="fs-reviews__grid">
            {reviews.map((r, i) => (
              <div
                key={r.id}
                className={`fs-reviews__card${i < reviews.length - 2 ? " fs-reviews__card--border-bottom" : ""}`}
              >
                <div className={i % 2 === 0 ? "fs-reviews__card-inner-left" : "fs-reviews__card-inner-right"}>
                  <div className="fs-reviews__author">
                    <div className="fs-reviews__avatar" style={{ background: r.color }}>{r.name[0]}</div>
                    <div>
                      <div className="fs-reviews__author-name">
                        {r.name}
                        {r.isNew && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 700,
                            background: "#dcfce7", color: "#166534",
                            border: "1px solid #86efac",
                            padding: "2px 8px", borderRadius: 20,
                          }}>New</span>
                        )}
                      </div>
                      <div className="fs-reviews__author-years">
                        {r.years === 0 ? "New member" : `${r.years} year${r.years !== 1 ? "s" : ""} on Bodima`}
                      </div>
                    </div>
                  </div>
                  <div className="fs-reviews__stars-row">
                    <span>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                    <span style={{ color: "#ccc" }}>·</span>
                    <span className="fs-reviews__date">{r.date}</span>
                  </div>
                  <div className={`fs-reviews__text${expanded[r.id] ? "" : " fs-reviews__text--clamped"}`}>
                    {r.text}
                  </div>
                  <button
                    className="fs-reviews__toggle-btn"
                    style={{ fontFamily: FONT }}
                    onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
                  >{expanded[r.id] ? "Show less" : "Show more"}</button>
                </div>
              </div>
            ))}
          </div>
          <button className="fs-reviews__show-all-btn" style={{ fontFamily: FONT }}>
            Show all {reviews.length}+ reviews
          </button>
        </div>
      </section>

      {/* ══ MAP ══ */}
      <section className="fs-map">
        <div className="fs-wrapper">
          <div className="fs-map__title">📍 Where you'll find us</div>
          <div className="fs-map__address">Kaduwela Road, Malabe, Western Province 10115, Sri Lanka</div>
          <div className="fs-map__container">
            <iframe
              className="fs-map__iframe"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.9!2d79.9667!3d6.9020!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25700739b2285%3A0x5b4c4e2cc9bbe123!2sKaduwela%20Rd%2C%20Malabe%2C%20Sri%20Lanka!5e0!3m2!1sen!2slk!4v1708000000000!5m2!1sen!2slk"
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Red Roosters Location"
            />
            <div className="fs-map__card">
              <span style={{ fontSize: 24 }}>🍗</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#000" }}>Red Roosters Roast Chicken</div>
                <div style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>Kaduwela Road, Malabe, Western 10115</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="fs-footer">
        <div className="fs-footer__grid">
          {[
            { title: "Support",   links: ["Help Center", "Safety", "Cancellation Options", "Community Guideline"] },
            { title: "Community", links: ["Bodima Adventures", "New Features", "Tips for Hosts", "Careers"] },
            { title: "Host",      links: ["Host a home", "Host an experience", "Responsible hosting", "Community forum"] },
            { title: "About",     links: ["About Bodima", "Newsroom", "Investors", "Bodima Plus"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="fs-footer__col-title">{title}</h4>
              {links.map(l => <a key={l} href="#" className="fs-footer__link">{l}</a>)}
            </div>
          ))}
        </div>
        <div className="fs-footer__bottom">
          <div>
            <span>© 2026 Bodima, Inc. · </span>
            <a href="#" className="fs-footer__legal-link">Privacy · Terms · Sitemap</a>
          </div>
          <div className="fs-footer__socials">
            {[FaFacebookF, FaTwitter, FaInstagram].map((Icon, i) => (
              <a key={i} href="#" className="fs-footer__social-icon"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══ ITEM MODAL ══ */}
      {modal && (
        <div
          className="fs-item-modal-overlay"
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div className="fs-item-modal">
            <div className="fs-item-modal__hero" style={{ background: BG[modal.bg] || BG.bg1 }}>
              <button className="fs-item-modal__close" onClick={closeModal}>✕</button>
              {modal.emoji}
            </div>
            <div className="fs-item-modal__body">
              <div className="fs-item-modal__name">{modal.name}</div>
              {modal.dietaryTags?.length > 0 && (
                <div className="fs-item-modal__tags">
                  {modal.dietaryTags.map(t => <DietTag key={t} tag={t} />)}
                </div>
              )}
              <div className="fs-item-modal__desc">{modal.description}</div>
              <div className="fs-item-modal__details-grid">
                {[
                  { label: "⏱ Prep Time",       val: `${modal.prepTime} min` },
                  { label: "🏷 Category",        val: modal.category },
                  { label: "🕐 Available Hours", val: `${modal.availableHours?.open} – ${modal.availableHours?.close}` },
                  { label: "✅ Status",          val: modal.isAvailable !== false ? "● Available" : "○ Unavailable",
                    color: modal.isAvailable !== false ? "#038a3a" : "#999" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="fs-item-modal__detail-label">{label}</span>
                    <span className="fs-item-modal__detail-value" style={color ? { color } : {}}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="fs-item-modal__price-row">
                <span className="fs-item-modal__price">LKR {modal.price.toLocaleString()}.00</span>
                {modal.rating && <span style={{ fontSize: 13, color: "#757575" }}>👍 {modal.rating}</span>}
              </div>
              <div className="fs-item-modal__actions">
                <div className="fs-item-modal__qty-controls">
                  <button className="fs-item-modal__qty-btn" onClick={() => setModalQty(q => Math.max(1, q - 1))}>−</button>
                  <span className="fs-item-modal__qty-value">{modalQty}</span>
                  <button className="fs-item-modal__qty-btn" onClick={() => setModalQty(q => q + 1)}>+</button>
                </div>
                <button
                  disabled={modal.isAvailable === false}
                  className="fs-item-modal__add-btn"
                  onClick={addFromModal}
                  style={{ fontFamily: FONT }}
                >
                  <span>Add to order</span>
                  <span>LKR {(modal.price * modalQty).toLocaleString()}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ REVIEW MODAL ══ */}
      {showReviewModal && (
        <ReviewModal
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
        />
      )}

      {/* ══ TOAST ══ */}
      <div className={`fs-toast${toast.show ? " fs-toast--visible" : ""}`}>
        {toast.msg}
      </div>

    </div>
  );
}

export default FoodService;
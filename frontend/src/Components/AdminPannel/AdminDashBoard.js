import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers, FaHome, FaUtensils, FaShoppingBag,
  FaCreditCard, FaStar, FaCalendarAlt, FaChartBar, FaClock, FaUserCheck,
} from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const unwrap  = (r) => r?.data ?? r?.result ?? r;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleString("en-GB",     { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [adminUser,    setAdminUser]    = useState(null);
  const [stats,        setStats]        = useState({ totalUsers: 0, students: 0, hosts: 0, accommodations: 0, foodServices: 0, orders: 0 });
  const [recentUsers,  setRecentUsers]  = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    if (!userId) { navigate("/Login"); return; }
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => { if (!raw || unwrap(raw)?.role !== "admin") navigate("/Login"); })
      .catch(() => navigate("/Login"));
  }, [userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    const safe = async (res) => { try { return res.ok ? await res.json() : {}; } catch { return {}; } };
    Promise.all([
      fetch(`${API_BASE}/User`), fetch(`${API_BASE}/Accommodation`),
      fetch(`${API_BASE}/FoodService`), fetch(`${API_BASE}/FoodOrder`),
      fetch(`${API_BASE}/User/${userId}`),
    ])
      .then(r => Promise.all(r.map(safe)))
      .then(([uR, aR, fR, oR, adR]) => {
        const users  = Array.isArray(unwrap(uR)) ? unwrap(uR) : [];
        const acc    = Array.isArray(unwrap(aR)) ? unwrap(aR) : [];
        const fs     = Array.isArray(unwrap(fR)) ? unwrap(fR) : [];
        const orders = Array.isArray(unwrap(oR)) ? unwrap(oR) : [];
        setAdminUser(unwrap(adR));
        setStats({ totalUsers: users.length, students: users.filter(u => u.role === "student").length, hosts: users.filter(u => u.role === "host").length, accommodations: acc.length, foodServices: fs.length, orders: orders.length });
        const top5 = a => [...a].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).slice(0, 5);
        setRecentUsers(top5(users));
        setRecentOrders(top5(orders));
      })
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="ad-page"><AdminNavBar activeHref="/AdminDashBoard" />
      <div className="ad-loading"><div className="ad-spinner" /><p>Loading dashboard…</p></div>
    </div>
  );
  if (error) return (
    <div className="ad-page"><AdminNavBar activeHref="/AdminDashbBard" />
      <div className="ad-loading">
        <p style={{ color: "#dc2626" }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Retry</button>
      </div>
    </div>
  );

  const STATS = [
    { icon: <FaUsers />,      cls: "purple", num: stats.totalUsers,     label: "Total Users",    sub: `${stats.students} students · ${stats.hosts} hosts` },
    { icon: <FaHome />,       cls: "amber",  num: stats.accommodations, label: "Accommodations", sub: "Registered listings" },
    { icon: <FaUtensils />,   cls: "green",  num: stats.foodServices,   label: "Food Services",  sub: "Kitchen listings" },
    { icon: <FaShoppingBag />,cls: "blue",   num: stats.orders,         label: "Food Orders",    sub: "All time orders" },
  ];
  const QUICK = [
    { icon: <FaUsers      style={{ color: "#7c3aed" }} />, label: "Users",         href: "/AdminUsers"    },
    { icon: <FaHome       style={{ color: "#d97706" }} />, label: "Listings",      href: "/AdminListings" },
    { icon: <FaUtensils   style={{ color: "#16a34a" }} />, label: "Food Services", href: "/AdminListings" },
    { icon: <FaCreditCard style={{ color: "#2563eb" }} />, label: "Payments",      href: "/AdminPayments" },
    { icon: <FaStar       style={{ color: "#be185d" }} />, label: "Reviews",       href: "/AdminReviews"  },
    { icon: <FaCalendarAlt style={{ color: "#7c3aed"}} />, label: "Bookings",     href: "/AdminBookings" },
  ];

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminDashBoard" />
      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content">
          <p className="ad-banner__greeting">Welcome back</p>
          <h1 className="ad-banner__title">{adminUser?.name ?? "Admin"} 👋</h1>
          <p className="ad-banner__sub">Here's what's happening on Unisewana today.</p>
        </div>
      </div>

      <div className="ad-container">
        <div className="ad-stats-grid">
          {STATS.map((s, i) => (
            <div key={i} className="ad-stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`ad-stat-icon ad-stat-icon--${s.cls}`}>{s.icon}</div>
              <div className="ad-stat-num">{s.num}</div>
              <div className="ad-stat-label">{s.label}</div>
              <div className="ad-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="ad-content-grid" style={{ marginBottom: 20 }}>
          <div className="ad-card">
            <div className="ad-card__header">
              <h3 className="ad-card__title"><FaChartBar style={{ color: "#7c3aed" }} /> Quick Actions</h3>
            </div>
            <div className="ad-actions-grid">
              {QUICK.map((a, i) => (
                <button key={i} className="ad-action-btn" onClick={() => navigate(a.href)}>
                  <span className="ad-action-btn__icon">{a.icon}</span>
                  <span className="ad-action-btn__label">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ad-card">
            <div className="ad-card__header">
              <h3 className="ad-card__title"><FaUserCheck style={{ color: "#7c3aed" }} /> Recent Users</h3>
              <button className="ad-card__link" onClick={() => navigate("/AdminUsers")}>View all →</button>
            </div>
            {recentUsers.length === 0 ? <div className="ad-empty">No users yet</div> : (
              <table className="ad-table">
                <thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
                <tbody>
                  {recentUsers.map(u => (
                    <tr key={u._id}>
                      <td><div className="ad-cell-name">{u.name}</div><div className="ad-cell-sub">{u.email}</div></td>
                      <td><span className={`ad-badge ad-badge--${u.role}`}>{u.role}</span></td>
                      <td className="ad-cell-muted">{fmtDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="ad-card ad-card--full">
          <div className="ad-card__header">
            <h3 className="ad-card__title"><FaClock style={{ color: "#7c3aed" }} /> Recent Food Orders</h3>
            <button className="ad-card__link" onClick={() => navigate("/AdminOrders")}>View all →</button>
          </div>
          {recentOrders.length === 0 ? <div className="ad-empty">No orders yet</div> : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead><tr><th>Order ID</th><th>Type</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o._id}>
                      <td className="ad-cell-mono">#{o._id?.slice(-6).toUpperCase()}</td>
                      <td style={{ textTransform: "capitalize" }}>{o.orderType || "—"}</td>
                      <td className="ad-cell-muted">{o.itemCount ?? o.items?.length ?? "—"} item(s)</td>
                      <td className="ad-cell-amount">LKR {o.total?.toLocaleString()}</td>
                      <td><span className={`ad-badge ad-badge--${o.status}`}>{o.status}</span></td>
                      <td className="ad-cell-muted">{fmtTime(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
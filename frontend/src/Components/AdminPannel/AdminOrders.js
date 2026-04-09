import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaShoppingBag, FaSearch, FaEye, FaTrash,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaTruck, FaBoxOpen,
} from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const fmtTime = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_META = {
  pending:   { icon: <FaHourglassHalf /> },
  accepted:  { icon: <FaTruck /> },
  completed: { icon: <FaCheckCircle /> },
  cancelled: { icon: <FaTimesCircle /> },
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders]         = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [typeFilter, setType]       = useState("all");
  const [selected, setSelected]     = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("CurrentUserId");
    if (!userId) { navigate("/Login"); return; }

    fetch(`${API_BASE}/FoodOrder`)
      .then(r => r.ok ? r.json() : Promise.reject("fetch failed"))
      .then(raw => {
        const data = raw?.data ?? raw?.result ?? raw;
        const arr  = Array.isArray(data) ? data : [];
        setOrders(arr);
        setFiltered(arr);
      })
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    let arr = [...orders];
    if (statusFilter !== "all") arr = arr.filter(o => o.status === statusFilter);
    if (typeFilter !== "all")   arr = arr.filter(o => o.orderType === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(o =>
        o._id?.toLowerCase().includes(q) ||
        o.student?.name?.toLowerCase().includes(q) ||
        o.student?.email?.toLowerCase().includes(q) ||
        o.foodService?.kitchenName?.toLowerCase().includes(q)
      );
    }
    setFiltered(arr);
  }, [search, statusFilter, typeFilter, orders]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      await fetch(`${API_BASE}/FoodOrder/${id}`, { method: "DELETE" });
      setOrders(prev => prev.filter(o => o._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch {
      alert("Delete failed.");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const r = await fetch(`${API_BASE}/FoodOrder/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
        if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
      }
    } catch {
      alert("Status update failed.");
    }
  };

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === "pending").length,
    accepted:  orders.filter(o => o.status === "accepted").length,
    completed: orders.filter(o => o.status === "completed").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  const totalRevenue = orders
    .filter(o => o.status === "completed")
    .reduce((s, o) => s + (o.total || 0), 0);

  if (loading) return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminOrders" />
      <div className="ad-loading">
        <div className="ad-spinner" />
        <p>Loading orders…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminOrders" />
      <div className="ad-loading">
        <p style={{ color: "var(--ad-red)" }}>{error}</p>
        <button onClick={() => window.location.reload()} className="ad-modal__btn ad-modal__btn--primary" style={{ width: 120, marginTop: 8 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminOrders" />

      {/* ── Banner ── */}
      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="ad-banner__greeting">Admin Panel</p>
            <h1 className="ad-banner__title">
              <FaShoppingBag style={{ fontSize: 26 }} /> Food Orders
            </h1>
            <p className="ad-banner__sub">Track and manage all food orders across the platform</p>
          </div>
          {/* Revenue pill */}
          <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "12px 20px", textAlign: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginBottom: 2 }}>Completed Revenue</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>LKR {totalRevenue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="ad-container">

        {/* ── Stat cards ── */}
        <div className="ad-stats-grid">
          {[
            { label: "Total Orders", count: counts.all,       cls: "purple" },
            { label: "Pending",      count: counts.pending,   cls: "amber"  },
            { label: "Accepted",     count: counts.accepted,  cls: "blue"   },
            { label: "Completed",    count: counts.completed, cls: "green"  },
            { label: "Cancelled",    count: counts.cancelled, cls: "red"    },
          ].map(s => (
            <div key={s.label} className="ad-stat-card">
              <div className={`ad-stat-icon ad-stat-icon--${s.cls}`}>
                <FaShoppingBag />
              </div>
              <div className="ad-stat-num">{s.count}</div>
              <div className="ad-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="ad-card" style={{ marginBottom: 20, padding: "14px 20px" }}>
          <div className="ad-toolbar">
            <div className="ad-search-wrap" style={{ flex: 1 }}>
              <FaSearch className="ad-search-icon" />
              <input
                className="ad-search-input"
                style={{ width: "100%" }}
                placeholder="Search by order ID, student, kitchen…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="ad-select" value={statusFilter} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select className="ad-select" value={typeFilter} onChange={e => setType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
              <option value="dine-in">Dine-in</option>
            </select>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="ad-card">
          <div className="ad-card__header">
            <h3 className="ad-card__title">
              <FaBoxOpen style={{ color: "var(--ad-purple)" }} />
              Orders ({filtered.length})
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="ad-empty">
              <FaShoppingBag style={{ fontSize: 32, color: "#d1d5db", marginBottom: 8 }} />
              <p>No orders found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Student</th>
                    <th>Kitchen</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const meta = STATUS_META[o.status] ?? STATUS_META.pending;
                    return (
                      <tr key={o._id}>
                        <td className="ad-cell-mono">#{o._id?.slice(-6).toUpperCase()}</td>
                        <td>
                          <div className="ad-cell-name">{o.student?.name ?? "—"}</div>
                          <div className="ad-cell-sub">{o.student?.email ?? ""}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{o.foodService?.kitchenName ?? "—"}</td>
                        <td>
                          <span className="ad-badge ad-badge--inactive" style={{ textTransform: "capitalize" }}>
                            {o.orderType ?? "—"}
                          </span>
                        </td>
                        <td className="ad-cell-muted">{o.itemCount ?? o.items?.length ?? "—"} item(s)</td>
                        <td className="ad-cell-amount">LKR {o.total?.toLocaleString() ?? "—"}</td>
                        <td>
                          <span className={`ad-badge ad-badge--${o.status}`}>
                            {meta.icon}&nbsp;{o.status}
                          </span>
                        </td>
                        <td className="ad-cell-muted">{fmtTime(o.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button className="ad-btn-sm ad-btn-sm--purple" title="View" onClick={() => setSelected(o)}>
                              <FaEye />
                            </button>
                            {o.status === "pending" && (
                              <button className="ad-btn-sm ad-btn-sm--blue" title="Accept"
                                onClick={() => handleStatusChange(o._id, "accepted")}>
                                <FaTruck />
                              </button>
                            )}
                            {o.status === "accepted" && (
                              <button className="ad-btn-sm ad-btn-sm--success" title="Complete"
                                onClick={() => handleStatusChange(o._id, "completed")}>
                                <FaCheckCircle />
                              </button>
                            )}
                            {(o.status === "pending" || o.status === "accepted") && (
                              <button className="ad-btn-sm ad-btn-sm--danger" title="Cancel"
                                onClick={() => handleStatusChange(o._id, "cancelled")}>
                                <FaTimesCircle />
                              </button>
                            )}
                            <button className="ad-btn-sm ad-btn-sm--danger" title="Delete"
                              onClick={() => handleDelete(o._id)}>
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="ad-overlay" onClick={() => setSelected(null)}>
          <div
            className="ad-modal"
            style={{ maxWidth: 500, padding: 0, overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="ad-card__header" style={{ padding: "20px 24px", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
              <h3 className="ad-card__title" style={{ fontSize: 17 }}>Order Details</h3>
              <button className="ad-card__link" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ padding: "8px 24px 16px" }}>
              <ModalRow label="Order ID"     value={`#${selected._id?.slice(-6).toUpperCase()}`} mono />
              <ModalRow label="Status"       value={<span className={`ad-badge ad-badge--${selected.status}`}>{selected.status}</span>} />
              <ModalRow label="Type"         value={selected.orderType ?? "—"} />
              <ModalRow label="Student"      value={selected.student?.name ?? "—"} />
              <ModalRow label="Kitchen"      value={selected.foodService?.kitchenName ?? "—"} />
              <ModalRow label="Items"        value={`${selected.itemCount ?? selected.items?.length ?? "—"} item(s)`} />
              <ModalRow label="Subtotal"     value={`LKR ${selected.subtotal?.toLocaleString() ?? "—"}`} />
              <ModalRow label="Delivery Fee" value={`LKR ${selected.deliveryFee?.toLocaleString() ?? "0"}`} />
              <ModalRow label="Total"        value={`LKR ${selected.total?.toLocaleString() ?? "—"}`} />
              {selected.notes && <ModalRow label="Notes" value={selected.notes} />}
              <ModalRow label="Created" value={fmtTime(selected.createdAt)} />

              {selected.items?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ad-purple)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Items</div>
                  {selected.items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--ad-soft)" }}>
                      <span>{item.name ?? item.itemName ?? `Item ${idx + 1}`} × {item.quantity ?? 1}</span>
                      <span style={{ fontWeight: 600 }}>LKR {((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "0 24px 24px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {selected.status === "pending" && (
                <button className="ad-modal__btn ad-modal__btn--primary"
                  onClick={() => handleStatusChange(selected._id, "accepted")}>
                  Accept
                </button>
              )}
              {selected.status === "accepted" && (
                <button className="ad-modal__btn ad-modal__btn--primary"
                  onClick={() => handleStatusChange(selected._id, "completed")}>
                  Mark Completed
                </button>
              )}
              {(selected.status === "pending" || selected.status === "accepted") && (
                <button className="ad-modal__btn ad-modal__btn--danger"
                  onClick={() => handleStatusChange(selected._id, "cancelled")}>
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--ad-soft)" }}>
      <span style={{ fontSize: 13, color: "var(--ad-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? "monospace" : "inherit", textAlign: "right", maxWidth: "65%" }}>{value}</span>
    </div>
  );
}
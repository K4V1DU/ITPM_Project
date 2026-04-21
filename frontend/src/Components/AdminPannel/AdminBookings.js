import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCheckCircle, FaTimesCircle, FaHourglassHalf,
  FaSearch, FaTrash, FaEye,
} from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';

const API_BASE = "http://localhost:8000";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_META = {
  pending:   { color: "#d97706", bg: "#fef3c7", icon: <FaHourglassHalf /> },
  confirmed: { color: "#16a34a", bg: "#dcfce7", icon: <FaCheckCircle /> },
  cancelled: { color: "#dc2626", bg: "#fee2e2", icon: <FaTimesCircle /> },
  rejected:  { color: "#dc2626", bg: "#fee2e2", icon: <FaTimesCircle /> },
};

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem("CurrentUserId");
    if (!userId) { navigate("/Login"); return; }

    fetch(`${API_BASE}/Booking`)
      .then(r => r.ok ? r.json() : Promise.reject("fetch failed"))
      .then(raw => {
        const data = raw?.data ?? raw?.result ?? raw;
        const arr  = Array.isArray(data) ? data : [];
        setBookings(arr);
        setFiltered(arr);
      })
      .catch(() => setError("Failed to load bookings."))
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    let arr = [...bookings];
    if (statusFilter !== "all") arr = arr.filter(b => b.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(b =>
        b.student?.name?.toLowerCase().includes(q) ||
        b.student?.email?.toLowerCase().includes(q) ||
        b.accommodation?.title?.toLowerCase().includes(q) ||
        b._id?.toLowerCase().includes(q)
      );
    }
    setFiltered(arr);
  }, [search, statusFilter, bookings]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this booking?")) return;
    try {
      await fetch(`${API_BASE}/Booking/${id}`, { method: "DELETE" });
      setBookings(prev => prev.filter(b => b._id !== id));
    } catch {
      alert("Delete failed.");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const r = await fetch(`${API_BASE}/Booking/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (r.ok) {
        const updated = await r.json();
        const newData  = updated?.data ?? updated;
        setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newData.status } : b));
        if (selected?._id === id) setSelected(prev => ({ ...prev, status: newData.status }));
      }
    } catch {
      alert("Status update failed.");
    }
  };

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter(b => b.status === "pending").length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    cancelled: bookings.filter(b => b.status === "cancelled" || b.status === "rejected").length,
  };

  if (loading) return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminBookings" />
      <div className="ad-loading">
        <div className="ad-spinner" />
        <p>Loading bookings…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminBookings" />
      <div className="ad-loading">
        <p style={{ color: "var(--ad-red)" }}>{error}</p>
        <button onClick={() => window.location.reload()} className="ad-modal__btn ad-modal__btn--primary" style={{ width: 120, marginTop: 8 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminBookings" />

      {/* ── Banner ── */}
      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content">
          <p className="ad-banner__greeting">Admin Panel</p>
          <h1 className="ad-banner__title">
            <FaCalendarAlt style={{ fontSize: 26 }} /> Bookings
          </h1>
          <p className="ad-banner__sub">Manage all accommodation visit requests</p>
        </div>
      </div>

      <div className="ad-container">

        {/* ── Stat cards ── */}
        <div className="ad-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {[
            { key: "all",       label: "All Bookings", count: counts.all,       cls: "purple" },
            { key: "pending",   label: "Pending",      count: counts.pending,   cls: "amber"  },
            { key: "confirmed", label: "Confirmed",    count: counts.confirmed, cls: "green"  },
            { key: "cancelled", label: "Cancelled",    count: counts.cancelled, cls: "red"    },
          ].map(p => (
            <div
              key={p.key}
              className="ad-stat-card"
              onClick={() => setStatus(p.key)}
              style={{
                cursor: "pointer",
                border: statusFilter === p.key ? "2px solid var(--ad-purple)" : undefined,
                outline: statusFilter === p.key ? "none" : undefined,
              }}
            >
              <div className={`ad-stat-icon ad-stat-icon--${p.cls}`}>
                <FaCalendarAlt />
              </div>
              <div className="ad-stat-num">{p.count}</div>
              <div className="ad-stat-label">{p.label}</div>
            </div>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div className="ad-card" style={{ marginBottom: 20, padding: "14px 20px" }}>
          <div className="ad-toolbar">
            <div className="ad-search-wrap" style={{ flex: 1 }}>
              <FaSearch className="ad-search-icon" />
              <input
                className="ad-search-input"
                style={{ width: "100%" }}
                placeholder="Search by student name, email, accommodation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="ad-select"
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="ad-card">
          <div className="ad-card__header">
            <h3 className="ad-card__title">
              <FaCalendarAlt style={{ color: "var(--ad-purple)" }} />
              Bookings ({filtered.length})
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="ad-empty">
              <FaCalendarAlt style={{ fontSize: 32, color: "#d1d5db", marginBottom: 8 }} />
              <p>No bookings found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Student</th>
                    <th>Accommodation</th>
                    <th>Visit Date</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const meta = STATUS_META[b.status] ?? STATUS_META.pending;
                    return (
                      <tr key={b._id}>
                        <td className="ad-cell-mono">#{b._id?.slice(-6).toUpperCase()}</td>
                        <td>
                          <div className="ad-cell-name">{b.student?.name ?? "—"}</div>
                          <div className="ad-cell-sub">{b.student?.email ?? ""}</div>
                        </td>
                        <td>
                          <div className="ad-cell-name">{b.accommodation?.title ?? "—"}</div>
                          <div className="ad-cell-sub">{b.accommodation?.city ?? ""}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>{fmtDate(b.visitDate)}</div>
                          <div className="ad-cell-sub">{b.visitTime ?? ""}</div>
                        </td>
                        <td>
                          <span className={`ad-badge ad-badge--${b.status}`}>
                            {meta.icon}&nbsp;{b.status}
                          </span>
                        </td>
                        <td className="ad-cell-muted">{fmtTime(b.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="ad-btn-sm ad-btn-sm--purple" title="View details" onClick={() => setSelected(b)}>
                              <FaEye />
                            </button>
                            {b.status === "pending" && (
                              <>
                                <button className="ad-btn-sm ad-btn-sm--success" title="Confirm"
                                  onClick={() => handleStatusChange(b._id, "confirmed")}>
                                  <FaCheckCircle />
                                </button>
                                <button className="ad-btn-sm ad-btn-sm--danger" title="Cancel"
                                  onClick={() => handleStatusChange(b._id, "cancelled")}>
                                  <FaTimesCircle />
                                </button>
                              </>
                            )}
                            <button className="ad-btn-sm ad-btn-sm--danger" title="Delete"
                              onClick={() => handleDelete(b._id)}>
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
          <div className="ad-modal" style={{ maxWidth: 480, padding: 0, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div className="ad-card__header" style={{ padding: "20px 24px" }}>
              <h3 className="ad-card__title" style={{ fontSize: 17 }}>Booking Details</h3>
              <button className="ad-card__link" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ padding: "8px 24px 16px" }}>
              <ModalRow label="Booking ID"    value={`#${selected._id?.slice(-6).toUpperCase()}`} mono />
              <ModalRow label="Status"        value={<span className={`ad-badge ad-badge--${selected.status}`}>{selected.status}</span>} />
              <ModalRow label="Student"       value={selected.student?.name ?? "—"} />
              <ModalRow label="Email"         value={selected.student?.email ?? "—"} />
              <ModalRow label="Accommodation" value={selected.accommodation?.title ?? "—"} />
              <ModalRow label="Visit Date"    value={fmtDate(selected.visitDate)} />
              <ModalRow label="Visit Time"    value={selected.visitTime ?? "—"} />
              <ModalRow label="Message"       value={selected.message || "No message"} />
              <ModalRow label="Created"       value={fmtTime(selected.createdAt)} />
            </div>
            {selected.status === "pending" && (
              <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
                <button className="ad-modal__btn ad-modal__btn--primary"
                  onClick={() => handleStatusChange(selected._id, "confirmed")}>
                  ✓ Confirm
                </button>
                <button className="ad-modal__btn ad-modal__btn--danger"
                  onClick={() => handleStatusChange(selected._id, "cancelled")}>
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--ad-soft)" }}>
      <span style={{ fontSize: 13, color: "var(--ad-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? "monospace" : "inherit", textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}
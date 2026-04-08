import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaTrash, FaUser, FaCheckCircle, FaUsers } from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';


const API_BASE = "http://localhost:8000";
const unwrap   = (r) => r?.data ?? r?.result ?? r;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

function DeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div className="ad-overlay" onClick={onCancel}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <h3>Delete User</h3>
        <p>Delete <strong>{name}</strong>? This cannot be undone.</p>
        <div className="ad-modal__btns">
          <button className="ad-modal__btn ad-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="ad-modal__btn ad-modal__btn--danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [deleteModal, setDeleteModal] = useState(null);
  const [toast,       setToast]       = useState(null);

  useEffect(() => { if (!userId) navigate("/Login"); }, [userId, navigate]);

  useEffect(() => {
    fetch(`${API_BASE}/User`)
      .then(r => r.ok ? r.json() : {})
      .then(raw => {
        const list = Array.isArray(unwrap(raw)) ? unwrap(raw) : [];
        setUsers(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await fetch(`${API_BASE}/User/${deleteModal.id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u._id !== deleteModal.id));
      showToast("User deleted successfully.");
    } catch { showToast("Failed to delete user.", "error"); }
    setDeleteModal(null);
  };

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = { all: users.length, student: users.filter(u => u.role === "student").length, host: users.filter(u => u.role === "host").length, admin: users.filter(u => u.role === "admin").length };

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminUsers" />
      {toast    && <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>}
      {deleteModal && <DeleteModal name={deleteModal.name} onConfirm={handleDelete} onCancel={() => setDeleteModal(null)} />}

      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content">
          <p className="ad-banner__greeting">Admin Panel</p>
          <h1 className="ad-banner__title"><FaUsers style={{ fontSize: 22 }} /> User Management</h1>
          <p className="ad-banner__sub">{counts.all} total users registered on the platform</p>
        </div>
      </div>

      <div className="ad-container">
        <div className="ad-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { label: "All Users", num: counts.all,     cls: "purple" },
            { label: "Students",  num: counts.student, cls: "amber"  },
            { label: "Hosts",     num: counts.host,    cls: "green"  },
            { label: "Admins",    num: counts.admin,   cls: "blue"   },
          ].map((s, i) => (
            <div key={i} className="ad-stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`ad-stat-icon ad-stat-icon--${s.cls}`}><FaUsers /></div>
              <div className="ad-stat-num">{s.num}</div>
              <div className="ad-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="ad-card">
          <div className="ad-card__header">
            <h3 className="ad-card__title"><FaUser style={{ color: "#7c3aed" }} /> All Users</h3>
            <div className="ad-toolbar">
              <div className="ad-search-wrap">
                <FaSearch className="ad-search-icon" />
                <input className="ad-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email…" />
              </div>
              <select className="ad-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="host">Hosts</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ad-empty"><div className="ad-spinner" style={{ margin: "0 auto 12px" }} /><p>Loading users…</p></div>
          ) : filtered.length === 0 ? (
            <div className="ad-empty">No users found</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead>
                  <tr><th>User</th><th>Username</th><th>Role</th><th>Phone</th><th>Verified</th><th>Joined</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div className="ad-cell-name">{u.name}</div>
                        <div className="ad-cell-sub">{u.email}</div>
                      </td>
                      <td className="ad-cell-muted">@{u.username || "—"}</td>
                      <td><span className={`ad-badge ad-badge--${u.role}`}>{u.role}</span></td>
                      <td className="ad-cell-muted">{u.phone || "—"}</td>
                      <td>
                        {u.isVerified?.email
                          ? <FaCheckCircle style={{ color: "#16a34a" }} />
                          : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td className="ad-cell-muted">{fmtDate(u.createdAt)}</td>
                      <td>
                        {u._id !== userId && (
                          <button className="ad-btn-sm ad-btn-sm--danger"
                            onClick={() => setDeleteModal({ id: u._id, name: u.name })}>
                            <FaTrash style={{ fontSize: 10 }} /> Delete
                          </button>
                        )}
                      </td>
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
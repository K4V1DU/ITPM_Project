import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaTrash, FaUser, FaCheckCircle, FaUsers, FaFilePdf } from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE = process.env.REACT_APP_API_BASE_URL;
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

  const counts = {
    all:     users.length,
    student: users.filter(u => u.role === "student").length,
    host:    users.filter(u => u.role === "host").length,
    admin:   users.filter(u => u.role === "admin").length,
  };

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const roleLabel = roleFilter === "all" ? "All Roles" : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1) + "s";
    const now       = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.setFillColor(109, 40, 217);          // purple
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 54, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("User Management Report", 40, 30);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Filter: ${roleLabel}   |   Total: ${filtered.length} user(s)   |   Generated: ${now}`, 40, 46);

    // ── Table ───────────────────────────────────────────────────────────────
    const ROLE_COLORS = {
      student: [251, 191,  36],   // amber
      host:    [ 34, 197,  94],   // green
      admin:   [ 59, 130, 246],   // blue
    };

    autoTable(doc, {
      startY: 68,
      head: [["#", "Name", "Email", "Username", "Role", "Phone", "Verified", "Joined"]],
      body: filtered.map((u, i) => [
        i + 1,
        u.name     || "—",
        u.email    || "—",
        u.username ? `@${u.username}` : "—",
        u.role     || "—",
        u.phone    || "—",
        u.isVerified?.email ? "✔ Yes" : "No",
        fmtDate(u.createdAt),
      ]),
      styles: {
        fontSize:  9,
        cellPadding: 6,
        font: "helvetica",
        valign: "middle",
      },
      headStyles: {
        fillColor:  [109, 40, 217],
        textColor:  [255, 255, 255],
        fontStyle:  "bold",
        halign:     "left",
      },
      alternateRowStyles: { fillColor: [245, 243, 255] },   // light purple tint
      columnStyles: {
        0: { halign: "center", cellWidth: 28 },              // #
        4: { halign: "center", cellWidth: 60 },              // Role
        6: { halign: "center", cellWidth: 56 },              // Verified
      },
      // Colour the Role cell dynamically
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 4) {
          const role  = data.cell.raw?.toLowerCase();
          const color = ROLE_COLORS[role];
          if (color) {
            data.cell.styles.textColor  = color;
            data.cell.styles.fontStyle  = "bold";
          }
        }
        if (data.section === "body" && data.column.index === 6) {
          data.cell.styles.textColor = data.cell.raw === "✔ Yes" ? [22, 163, 74] : [156, 163, 175];
        }
      },
      // ── Footer on every page ──────────────────────────────────────────────
      didDrawPage(data) {
        const pageWidth  = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth / 2, pageHeight - 14,
          { align: "center" }
        );
        doc.text(
          "Admin Panel — Confidential",
          pageWidth - 40, pageHeight - 14,
          { align: "right" }
        );
      },
    });

    const fileName = `users_${roleFilter}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    showToast(`PDF exported: ${fileName}`);
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminUsers" />
      {toast      && <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>}
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
                <input
                  className="ad-search-input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, email…"
                />
              </div>
              <select
                className="ad-select"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
              >
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="host">Hosts</option>
                <option value="admin">Admins</option>
              </select>

              {/* ── Export PDF button ── */}
              <button
                className="ad-btn-sm"
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            "6px",
                  backgroundColor:"#7c3aed",
                  color:          "#fff",
                  border:         "none",
                  borderRadius:   "8px",
                  padding:        "8px 14px",
                  cursor:         "pointer",
                  fontWeight:     600,
                  fontSize:       "13px",
                  whiteSpace:     "nowrap",
                }}
                onClick={handleExportPDF}
                disabled={filtered.length === 0}
              >
                <FaFilePdf style={{ fontSize: 13 }} />
                Export PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="ad-empty">
              <div className="ad-spinner" style={{ margin: "0 auto 12px" }} />
              <p>Loading users…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ad-empty">No users found</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>User</th><th>Username</th><th>Role</th>
                    <th>Phone</th><th>Verified</th><th>Joined</th><th>Action</th>
                  </tr>
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
                          <button
                            className="ad-btn-sm ad-btn-sm--danger"
                            onClick={() => setDeleteModal({ id: u._id, name: u.name })}
                          >
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
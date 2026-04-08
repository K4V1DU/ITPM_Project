import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaUtensils, FaSearch, FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';

const API_BASE  = "http://localhost:8000";
const unwrap    = (r) => r?.data ?? r?.result ?? r;
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const isExpired = (d) => d && new Date(d) < new Date();

function DeleteModal({ title, onConfirm, onCancel }) {
  return (
    <div className="ad-overlay" onClick={onCancel}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <h3>Delete Listing</h3>
        <p>Delete <strong>"{title}"</strong>? This cannot be undone.</p>
        <div className="ad-modal__btns">
          <button className="ad-modal__btn ad-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="ad-modal__btn ad-modal__btn--danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// Helper — is a listing considered "active"?
const isActive = (item) => item.isAvailable && !isExpired(item.expireDate);

export default function AdminListings() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [tab,            setTab]            = useState("accommodation");
  const [accommodations, setAccommodations] = useState([]);
  const [foodServices,   setFoodServices]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");   // ← new
  const [deleteModal,    setDeleteModal]    = useState(null);
  const [toast,          setToast]          = useState(null);

  useEffect(() => { if (!userId) navigate("/Login"); }, [userId, navigate]);

  useEffect(() => {
    Promise.all([fetch(`${API_BASE}/Accommodation`), fetch(`${API_BASE}/FoodService`)])
      .then(([aRes, fRes]) => Promise.all([aRes.ok ? aRes.json() : {}, fRes.ok ? fRes.json() : {}]))
      .then(([aRaw, fRaw]) => {
        setAccommodations(Array.isArray(unwrap(aRaw)) ? unwrap(aRaw) : []);
        setFoodServices(Array.isArray(unwrap(fRaw))   ? unwrap(fRaw) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const endpoint = tab === "accommodation" ? "Accommodation" : "FoodService";
    try {
      await fetch(`${API_BASE}/${endpoint}/${deleteModal.id}`, { method: "DELETE" });
      if (tab === "accommodation") setAccommodations(p => p.filter(a => a._id !== deleteModal.id));
      else                          setFoodServices(p   => p.filter(f => f._id !== deleteModal.id));
      showToast("Listing deleted.");
    } catch { showToast("Failed to delete.", "error"); }
    setDeleteModal(null);
  };

  // Reset search + status when switching tabs
  const handleTabSwitch = (key) => {
    setTab(key);
    setSearch("");
    setStatusFilter("all");
  };

  // Shared status filter helper
  const applyStatusFilter = (item) => {
    if (statusFilter === "all")      return true;
    if (statusFilter === "active")   return  isActive(item);
    if (statusFilter === "inactive") return !isActive(item);
    return true;
  };

  const filteredAcc = accommodations.filter(a =>
    applyStatusFilter(a) &&
    (!search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.address?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredFs = foodServices.filter(f =>
    applyStatusFilter(f) &&
    (!search || f.kitchenName?.toLowerCase().includes(search.toLowerCase()) || f.address?.toLowerCase().includes(search.toLowerCase()))
  );

  // Status counts for current tab (shown beside dropdown label)
  const currentList = tab === "accommodation" ? accommodations : foodServices;
  const statusCounts = {
    all:      currentList.length,
    active:   currentList.filter(isActive).length,
    inactive: currentList.filter(i => !isActive(i)).length,
  };

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminListings" />
      {toast       && <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>}
      {deleteModal && <DeleteModal title={deleteModal.title} onConfirm={handleDelete} onCancel={() => setDeleteModal(null)} />}

      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content">
          <p className="ad-banner__greeting">Admin Panel</p>
          <h1 className="ad-banner__title"><FaHome style={{ fontSize: 22 }} /> Listings Management</h1>
          <p className="ad-banner__sub">{accommodations.length} accommodations · {foodServices.length} food services</p>
        </div>
      </div>

      <div className="ad-container">
        {/* Tab switcher */}
        <div className="ad-tab-switch">
          {[
            { key: "accommodation", label: "Accommodations", icon: <FaHome /> },
            { key: "food",          label: "Food Services",  icon: <FaUtensils /> },
          ].map(t => (
            <button
              key={t.key}
              className={`ad-tab-switch__btn${tab === t.key ? " ad-tab-switch__btn--active" : ""}`}
              onClick={() => handleTabSwitch(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="ad-card">
          <div className="ad-card__header">
            <h3 className="ad-card__title">
              {tab === "accommodation"
                ? <><FaHome     style={{ color: "#7c3aed" }} /> Accommodations ({filteredAcc.length})</>
                : <><FaUtensils style={{ color: "#7c3aed" }} /> Food Services ({filteredFs.length})</>}
            </h3>

            {/* ── Toolbar: search + status filter ── */}
            <div className="ad-toolbar">
              <div className="ad-search-wrap">
                <FaSearch className="ad-search-icon" />
                <input
                  className="ad-search-input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search title, address…"
                />
              </div>

              {/* Status dropdown */}
              <select
                className="ad-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status ({statusCounts.all})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="inactive">Inactive ({statusCounts.inactive})</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ad-empty">
              <div className="ad-spinner" style={{ margin: "0 auto 12px" }} />
              <p>Loading…</p>
            </div>

          ) : tab === "accommodation" ? (
            filteredAcc.length === 0 ? (
              <div className="ad-empty">No accommodations found</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Title</th><th>Type</th><th>Price / mo</th>
                      <th>Gender</th><th>Status</th><th>Expires</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAcc.map(a => (
                      <tr key={a._id}>
                        <td>
                          <div className="ad-cell-name">{a.title}</div>
                          <div className="ad-cell-sub">{a.address}</div>
                        </td>
                        <td className="ad-cell-muted">{a.accommodationType || "—"}</td>
                        <td className="ad-cell-amount">LKR {a.pricePerMonth?.toLocaleString()}</td>
                        <td className="ad-cell-muted">{a.genderPreference || "Any"}</td>
                        <td>
                          {isActive(a)
                            ? <span className="ad-badge ad-badge--active">Active</span>
                            : <span className="ad-badge ad-badge--expired">Inactive</span>}
                        </td>
                        <td className="ad-cell-muted">{fmtDate(a.expireDate)}</td>
                        <td>
                          <button
                            className="ad-btn-sm ad-btn-sm--danger"
                            onClick={() => setDeleteModal({ id: a._id, title: a.title })}
                          >
                            <FaTrash style={{ fontSize: 10 }} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )

          ) : (
            filteredFs.length === 0 ? (
              <div className="ad-empty">No food services found</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Kitchen Name</th><th>Type</th><th>Delivery</th>
                      <th>Pickup</th><th>Status</th><th>Expires</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFs.map(f => (
                      <tr key={f._id}>
                        <td>
                          <div className="ad-cell-name">{f.kitchenName}</div>
                          <div className="ad-cell-sub">{f.address}</div>
                        </td>
                        <td className="ad-cell-muted">{f.serviceType || "—"}</td>
                        <td>
                          {f.deliveryAvailable
                            ? <FaCheckCircle style={{ color: "#16a34a" }} />
                            : <FaTimesCircle style={{ color: "#dc2626" }} />}
                        </td>
                        <td>
                          {f.pickupAvailable
                            ? <FaCheckCircle style={{ color: "#16a34a" }} />
                            : <FaTimesCircle style={{ color: "#dc2626" }} />}
                        </td>
                        <td>
                          {isActive(f)
                            ? <span className="ad-badge ad-badge--active">Active</span>
                            : <span className="ad-badge ad-badge--expired">Inactive</span>}
                        </td>
                        <td className="ad-cell-muted">{fmtDate(f.expireDate)}</td>
                        <td>
                          <button
                            className="ad-btn-sm ad-btn-sm--danger"
                            onClick={() => setDeleteModal({ id: f._id, title: f.kitchenName })}
                          >
                            <FaTrash style={{ fontSize: 10 }} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
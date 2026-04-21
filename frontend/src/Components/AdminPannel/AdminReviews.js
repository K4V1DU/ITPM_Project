import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaTrash, FaSearch, FaRegStar } from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';

const API_BASE = "http://localhost:8000";
const unwrap   = (r) => r?.data ?? r?.result ?? r;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Stars({ rating = 0 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i =>
        i <= rating
          ? <FaStar    key={i} style={{ color: "#f59e0b", fontSize: 13 }} />
          : <FaRegStar key={i} style={{ color: "#d1d5db", fontSize: 13 }} />
      )}
    </span>
  );
}

function DeleteModal({ comment, onConfirm, onCancel }) {
  return (
    <div className="ad-overlay" onClick={onCancel}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <h3>Delete Review</h3>
        <p>
          Delete this review? This cannot be undone.
          {comment && <span style={{ display: "block", marginTop: 8, padding: "8px 12px", background: "#f5f3ff", borderRadius: 8, fontStyle: "italic", fontSize: 13 }}>"{comment.slice(0, 80)}{comment.length > 80 ? "…" : ""}"</span>}
        </p>
        <div className="ad-modal__btns">
          <button className="ad-modal__btn ad-modal__btn--cancel" onClick={onCancel}>Cancel</button>
          <button className="ad-modal__btn ad-modal__btn--danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [reviews,      setReviews]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [deleteModal,  setDeleteModal]  = useState(null);
  const [toast,        setToast]        = useState(null);

  useEffect(() => { if (!userId) navigate("/Login"); }, [userId, navigate]);

  useEffect(() => {
    fetch(`${API_BASE}/Review`)
      .then(r => r.ok ? r.json() : {})
      .then(raw => {
        const list = Array.isArray(unwrap(raw)) ? unwrap(raw) : [];
        setReviews(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await fetch(`${API_BASE}/Review/${deleteModal.id}`, { method: "DELETE" });
      setReviews(prev => prev.filter(r => r._id !== deleteModal.id));
      showToast("Review deleted.");
    } catch { showToast("Failed to delete.", "error"); }
    setDeleteModal(null);
  };

  const filtered = reviews.filter(r => {
    const matchRating = ratingFilter === "all" || String(r.rating) === ratingFilter;
    const matchSearch = !search ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.reviewer?.name?.toLowerCase().includes(search.toLowerCase());
    return matchRating && matchSearch;
  });

  const ratingCounts = [5,4,3,2,1].map(n => ({ star: n, count: reviews.filter(r => r.rating === n).length }));
  const avgRating    = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : "—";

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminReviews" />
      {toast       && <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>}
      {deleteModal && <DeleteModal comment={deleteModal.comment} onConfirm={handleDelete} onCancel={() => setDeleteModal(null)} />}

      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content">
          <p className="ad-banner__greeting">Admin Panel</p>
          <h1 className="ad-banner__title"><FaStar style={{ fontSize: 22 }} /> Review Moderation</h1>
          <p className="ad-banner__sub">{reviews.length} total reviews · Average rating {avgRating} / 5</p>
        </div>
      </div>

      <div className="ad-container">
        {/* Rating distribution — click to filter */}
        <div className="ad-stats-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {ratingCounts.map(({ star, count }) => (
            <div key={star} className="ad-stat-card"
              style={{ cursor: "pointer", outline: ratingFilter === String(star) ? "2px solid #7c3aed" : "none" }}
              onClick={() => setRatingFilter(ratingFilter === String(star) ? "all" : String(star))}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                {Array.from({ length: star }).map((_, i) => <FaStar key={i} style={{ color: "#f59e0b", fontSize: 13 }} />)}
              </div>
              <div className="ad-stat-num">{count}</div>
              <div className="ad-stat-label">{star} Star{star !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>

        <div className="ad-card">
          <div className="ad-card__header">
            <h3 className="ad-card__title"><FaStar style={{ color: "#7c3aed" }} /> All Reviews ({filtered.length})</h3>
            <div className="ad-toolbar">
              <div className="ad-search-wrap">
                <FaSearch className="ad-search-icon" />
                <input className="ad-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviewer, comment…" />
              </div>
              <select className="ad-select" value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
                <option value="all">All ratings</option>
                {[5,4,3,2,1].map(n => <option key={n} value={String(n)}>{n} Star</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ad-empty"><div className="ad-spinner" style={{ margin: "0 auto 12px" }} /><p>Loading reviews…</p></div>
          ) : filtered.length === 0 ? (
            <div className="ad-empty">No reviews found</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead><tr><th>Reviewer</th><th>Rating</th><th>Comment</th><th>For</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r._id}>
                      <td>
                        <div className="ad-cell-name">{r.reviewer?.name || "Anonymous"}</div>
                        <div className="ad-cell-sub">{r.reviewer?.email || ""}</div>
                      </td>
                      <td><Stars rating={r.rating} /></td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {r.comment || "—"}
                        </div>
                      </td>
                      <td>
                        {r.accommodation && <span className="ad-badge ad-badge--pending" style={{ marginRight: 4 }}>Accommodation</span>}
                        {r.foodService   && <span className="ad-badge ad-badge--verified" style={{ marginRight: 4 }}>Food</span>}
                        {r.host          && <span className="ad-badge ad-badge--admin">Host</span>}
                      </td>
                      <td className="ad-cell-muted">{fmtDate(r.createdAt)}</td>
                      <td>
                        <button className="ad-btn-sm ad-btn-sm--danger"
                          onClick={() => setDeleteModal({ id: r._id, comment: r.comment })}>
                          <FaTrash style={{ fontSize: 10 }} /> Delete
                        </button>
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
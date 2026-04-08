import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCreditCard, FaSearch, FaCheckCircle, FaTimesCircle, FaFileImage } from "react-icons/fa";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import './AdminDashBoard.css';

const API_BASE = "http://localhost:8000";
const unwrap   = (r) => r?.data ?? r?.result ?? r;
const fmtTime  = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function ReceiptModal({ paymentId, onClose }) {
  const [src,     setSrc]     = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API_BASE}/Payment/${paymentId}/receipt-image`)
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => setSrc(URL.createObjectURL(blob)))
      .catch(() => setSrc(null))
      .finally(() => setLoading(false));
  }, [paymentId]);
  return (
    <div className="ad-overlay" onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 500, width: "90%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontFamily: "DM Sans,sans-serif" }}>
          <strong style={{ fontSize: 16 }}>Payment Receipt</strong>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
        </div>
        {loading ? <div style={{ textAlign: "center", padding: 40 }}><div className="ad-spinner" style={{ margin: "0 auto" }} /></div>
          : src   ? <img src={src} alt="Receipt" style={{ width: "100%", borderRadius: 8 }} />
          : <p style={{ color: "#aaa", textAlign: "center", padding: 40 }}>No receipt image available</p>}
      </div>
    </div>
  );
}

export default function AdminPayments() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [payments,     setPayments]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [receiptModal, setReceiptModal] = useState(null);
  const [toast,        setToast]        = useState(null);

  useEffect(() => { if (!userId) navigate("/Login"); }, [userId, navigate]);

  const fetchPayments = () => {
    setLoading(true);
    // Try admin-all endpoint first, fall back to host query
    fetch(`${API_BASE}/Payment/admin/all`)
      .then(r => r.ok ? r.json() : fetch(`${API_BASE}/Payment/my?hostId=${userId}`).then(r2 => r2.json()))
      .then(raw => {
        const list = Array.isArray(unwrap(raw)) ? unwrap(raw)
          : Array.isArray(raw?.payments) ? raw.payments : [];
        setPayments(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchPayments(); }, []);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleVerify = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/Payment/${id}/admin-verify`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "verified" }) });
      if (res.ok) {
        setPayments(p => p.map(x => x._id === id ? { ...x, status: "verified" } : x));
        showToast("Payment verified.");
      } else { showToast("Verify failed — check your API endpoint.", "error"); }
    } catch { showToast("Failed to verify payment.", "error"); }
  };

  const handleReject = async (id) => {
    try {
      await fetch(`${API_BASE}/Payment/${id}/cancel`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
      setPayments(p => p.map(x => x._id === id ? { ...x, status: "cancelled" } : x));
      showToast("Payment rejected.");
    } catch { showToast("Failed to reject.", "error"); }
  };

  const filtered = payments.filter(p => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch = !search || p.referenceCode?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalRevenue = payments.filter(p => p.status === "verified").reduce((s, p) => s + (p.amount || 0), 0);
  const counts = { all: payments.length, manual_requested: payments.filter(p => p.status === "manual_requested").length, pending: payments.filter(p => p.status === "pending").length, verified: payments.filter(p => p.status === "verified").length };

  return (
    <div className="ad-page">
      <AdminNavBar activeHref="/AdminPayments" />
      {toast        && <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>}
      {receiptModal && <ReceiptModal paymentId={receiptModal} onClose={() => setReceiptModal(null)} />}

      <div className="ad-banner">
        <div className="ad-banner__noise" />
        <div className="ad-banner__content">
          <p className="ad-banner__greeting">Admin Panel</p>
          <h1 className="ad-banner__title"><FaCreditCard style={{ fontSize: 22 }} /> Payment Management</h1>
          <p className="ad-banner__sub">{counts.manual_requested} pending manual review · LKR {totalRevenue.toLocaleString()} verified revenue</p>
        </div>
      </div>

      <div className="ad-container">
        <div className="ad-stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { label: "Total",         num: counts.all,              cls: "purple" },
            { label: "Manual Review", num: counts.manual_requested, cls: "amber"  },
            { label: "Pending",       num: counts.pending,          cls: "blue"   },
            { label: "Verified",      num: counts.verified,         cls: "green"  },
          ].map((s, i) => (
            <div key={i} className="ad-stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`ad-stat-icon ad-stat-icon--${s.cls}`}><FaCreditCard /></div>
              <div className="ad-stat-num">{s.num}</div>
              <div className="ad-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="ad-card">
          <div className="ad-card__header">
            <h3 className="ad-card__title"><FaCreditCard style={{ color: "#7c3aed" }} /> All Payments</h3>
            <div className="ad-toolbar">
              <div className="ad-search-wrap">
                <FaSearch className="ad-search-icon" />
                <input className="ad-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ref code…" />
              </div>
              <select className="ad-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="manual_requested">Manual Review</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="created">Created</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ad-empty"><div className="ad-spinner" style={{ margin: "0 auto 12px" }} /><p>Loading payments…</p></div>
          ) : filtered.length === 0 ? (
            <div className="ad-empty">No payments found</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="ad-table">
                <thead><tr><th>Reference</th><th>Plan</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p._id}>
                      <td className="ad-cell-mono">{p.referenceCode || "—"}</td>
                      <td className="ad-cell-muted">{p.plan?.toUpperCase() || "—"}</td>
                      <td className="ad-cell-amount">LKR {p.amount?.toLocaleString()}</td>
                      <td className="ad-cell-muted" style={{ textTransform: "capitalize" }}>{p.listingType || "—"}</td>
                      <td><span className={`ad-badge ad-badge--${p.status}`}>{p.status}</span></td>
                      <td className="ad-cell-muted">{fmtTime(p.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button className="ad-btn-sm ad-btn-sm--purple" onClick={() => setReceiptModal(p._id)}>
                            <FaFileImage style={{ fontSize: 10 }} /> Receipt
                          </button>
                          {(p.status === "manual_requested" || p.status === "pending") && (
                            <>
                              <button className="ad-btn-sm ad-btn-sm--success" onClick={() => handleVerify(p._id)}>
                                <FaCheckCircle style={{ fontSize: 10 }} /> Approve
                              </button>
                              <button className="ad-btn-sm ad-btn-sm--danger" onClick={() => handleReject(p._id)}>
                                <FaTimesCircle style={{ fontSize: 10 }} /> Reject
                              </button>
                            </>
                          )}
                        </div>
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
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Message.css";
import {
  FaAirbnb, FaUser, FaBars, FaSignOutAlt, FaEnvelope,
  FaFacebookF, FaTwitter, FaInstagram,
  FaSearch, FaCheck, FaCalendarAlt, FaClock, FaHome,
  FaPaperPlane, FaTimes, FaSpinner, FaInbox, FaFilter,
  FaEllipsisV, FaTrash, FaCheckCircle, FaTimesCircle,
  FaReply, FaCheckDouble, FaExclamationCircle, FaUserTie,
  FaGraduationCap, FaBuilding, FaBell,
} from "react-icons/fa";

const API_BASE  = "http://localhost:8000";
const FONT      = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const AV_COLORS = ["#1a1a2e","#6a3093","#11998e","#c94b4b","#f7971e","#1d4350","#0f3460","#e94560","#533483","#2b5876"];

// ─── Pure helpers ─────────────────────────────────────────────────────────
const unwrap      = r  => r?.data ?? r?.result ?? r;
const avColor     = n  => AV_COLORS[(n ?? "?").charCodeAt(0) % AV_COLORS.length];
const resolveImg  = img => {
  if (!img) return null;
  if (/^[a-f\d]{24}$/i.test(img)) return `${API_BASE}/Photo/${img}`;
  if (img.startsWith("http")) return img;
  return `${API_BASE}/Photo/${img}`;
};
const timeAgo = d => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 7) return `${dy}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric", year:"numeric" }) : "—";

// ─── Shared sub-components ────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls = { Pending:"pending", Accepted:"accepted", Rejected:"rejected" }[status] ?? "pending";
  return <span className={`msg-badge msg-badge--${cls}`}>{status ?? "Pending"}</span>;
}

function Skel({ w="100%", h=16, r=8, mb=0 }) {
  return <div style={{ width:w, height:h, borderRadius:r, marginBottom:mb,
    background:"linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
    backgroundSize:"200% 100%", animation:"msgSkel 1.4s ease infinite" }} />;
}

function Avatar({ name="?", img, size=40, style={} }) {
  const [err, setErr] = useState(false);
  const src = resolveImg(img);
  return (
    <div className="msg-av" style={{ width:size, height:size, background:avColor(name), ...style }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} />
        : <span style={{ fontSize: size * 0.4 }}>{name[0]?.toUpperCase() ?? "?"}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────
const Messages = () => {
  const navigate = useNavigate();

  // ── Core state ─────────────────────────────────────────────────────────
  const [currentUser,   setCurrentUser]   = useState(null);
  const [userLoading,   setUserLoading]   = useState(true);
  const [requests,      setRequests]      = useState([]);
  const [filtered,      setFiltered]      = useState([]);
  const [reqLoading,    setReqLoading]    = useState(true);
  const [selected,      setSelected]      = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────
  const [replyText,     setReplyText]     = useState("");
  const [replying,      setReplying]      = useState(false);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("All");
  const [showFilter,    setShowFilter]    = useState(false);
  const [showDropdown,  setShowDropdown]  = useState(false);
  const [actionMenuId,  setActionMenuId]  = useState(null);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [toast,         setToast]         = useState({ show:false, msg:"", type:"info" });

  const dropdownRef = useRef(null);
  const filterRef   = useRef(null);
  const actionRef   = useRef(null);
  const toastTimer  = useRef(null);

  const userId   = localStorage.getItem("CurrentUserId");
  const userRole = currentUser?.role ?? null;   // "host" | "student" | null
  const isHost    = userRole === "host";
  const isStudent = userRole === "student";

  // ── Fetch current user (determines role) ──────────────────────────────
  useEffect(() => {
    if (!userId) { setUserLoading(false); return; }
    fetch(`${API_BASE}/User/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(raw => raw && setCurrentUser(unwrap(raw)))
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  // ── Fetch requests once role is known ─────────────────────────────────
  useEffect(() => {
    if (userLoading || !userId || !currentUser) return;
    setReqLoading(true);
    axios.get(`${API_BASE}/contact`)
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        // Filter to only THIS user's requests based on role
        const mine = all.filter(r => {
          const hid = r.hostId?._id ?? r.hostId;
          const sid = r.studentId?._id ?? r.studentId;
          if (isHost)    return String(hid) === String(userId);
          if (isStudent) return String(sid) === String(userId);
          return false;
        });
        const sorted = mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRequests(sorted);
      })
      .catch(() => showToast("Could not load messages", "error"))
      .finally(() => setReqLoading(false));
  }, [userLoading, currentUser]);

  // ── Filter / search ───────────────────────────────────────────────────
  useEffect(() => {
    let list = [...requests];
    if (filterStatus !== "All") list = list.filter(r => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      // host searches by student name; student searches by accommodation / host name
      list = list.filter(r =>
        (r.studentId?.name       ?? "").toLowerCase().includes(q) ||
        (r.hostId?.name          ?? "").toLowerCase().includes(q) ||
        (r.accommodationId?.title ?? "").toLowerCase().includes(q) ||
        (r.message               ?? "").toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [search, filterStatus, requests]);

  // ── Outside click ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (filterRef.current   && !filterRef.current.contains(e.target))   setShowFilter(false);
      if (actionRef.current   && !actionRef.current.contains(e.target))   setActionMenuId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────
  const showToast = (msg, type = "info") => {
    setToast({ show:true, msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ show:false, msg:"", type:"info" }), 2800);
  };

  // ── Host: send reply ───────────────────────────────────────────────────
  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setReplying(true);
    try {
      const res = await axios.put(`${API_BASE}/contact/${selected._id}`, {
        reply: replyText.trim(), repliedAt: new Date().toISOString(),
      });
      const updated = res.data?.data ?? res.data;
      patch(selected._id, updated);
      setReplyText("");
      showToast("Reply sent!", "success");
    } catch { showToast("Failed to send reply", "error"); }
    finally { setReplying(false); }
  };

  // ── Host: update status ────────────────────────────────────────────────
  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await axios.put(`${API_BASE}/contact/${id}`, { status });
      const updated = res.data?.data ?? res.data;
      patch(id, updated);
      setActionMenuId(null);
      showToast(`Request ${status.toLowerCase()}`, "success");
    } catch { showToast("Failed to update status", "error"); }
    finally { setUpdatingId(null); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    try {
      await axios.delete(`${API_BASE}/contact/${id}`);
      setRequests(prev => prev.filter(r => r._id !== id));
      if (selected?._id === id) setSelected(null);
      setActionMenuId(null);
      showToast("Deleted", "success");
    } catch { showToast("Failed to delete", "error"); }
  };

  // ── Helper: patch a single request in both lists ───────────────────────
  const patch = (id, updated) => {
    setRequests(prev => prev.map(r => r._id === id ? { ...r, ...updated } : r));
    setSelected(prev => prev?._id === id ? { ...prev, ...updated } : prev);
  };

  // ── Derived counts ─────────────────────────────────────────────────────
  const pendingCount  = requests.filter(r => r.status === "Pending").length;
  const acceptedCount = requests.filter(r => r.status === "Accepted").length;

  // ─────────────────────────────────────────────────────────────────────
  // Sidebar list item — shared between host & student views
  // ─────────────────────────────────────────────────────────────────────
  const SidebarItem = ({ req }) => {
    const isActive  = selected?._id === req._id;
    const isPending = req.status === "Pending";

    // For the sidebar card, show the OTHER party's info
    const otherName = isHost
      ? (req.studentId?.name ?? "Student")
      : (req.hostId?.name    ?? "Host");
    const otherImg  = isHost
      ? req.studentId?.profileImage
      : req.hostId?.profileImage;
    const accTitle = req.accommodationId?.title ?? "Accommodation";

    return (
      <div
        className={`msg-item${isActive ? " msg-item--active" : ""}${isPending ? " msg-item--unread" : ""}`}
        onClick={() => { setSelected(req); setReplyText(""); }}
      >
        <div className="msg-item__av-wrap">
          <Avatar name={otherName} img={otherImg} size={44} />
          {isPending && <span className="msg-item__dot" />}
        </div>
        <div className="msg-item__body">
          <div className="msg-item__top">
            <span className="msg-item__name">{otherName}</span>
            <span className="msg-item__time">{timeAgo(req.createdAt)}</span>
          </div>
          <div className="msg-item__acc"><FaHome size={10} /> {accTitle}</div>
          <div className="msg-item__preview">{req.message || "No message"}</div>
          <StatusBadge status={req.status} />
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // Detail pane content — different per role
  // ─────────────────────────────────────────────────────────────────────
  const DetailContent = () => {
    if (!selected) return (
      <div className="msg-detail__empty">
        <div className="msg-detail__empty-icon">
          {isHost ? <FaUserTie /> : <FaEnvelope />}
        </div>
        <div className="msg-detail__empty-title">Select a message</div>
        <div className="msg-detail__empty-sub">
          {isHost
            ? "Choose a visit request to review and respond"
            : "Select a conversation to view your request status and host reply"}
        </div>
      </div>
    );

    const studentName = selected.studentId?.name ?? "Student";
    const hostName    = selected.hostId?.name    ?? "Host";
    const otherName   = isHost ? studentName : hostName;
    const otherImg    = isHost ? selected.studentId?.profileImage : selected.hostId?.profileImage;
    const otherEmail  = isHost ? selected.studentId?.email : selected.hostId?.email;

    return (
      <>
        {/* ── Detail header ── */}
        <div className="msg-detail__hdr">
          <div className="msg-detail__hdr-left">
            <Avatar name={otherName} img={otherImg} size={48} />
            <div>
              <div className="msg-detail__name">{otherName}</div>
              <div className="msg-detail__email">
                <span className={`msg-detail__role-chip msg-detail__role-chip--${isHost ? "student" : "host"}`}>
                  {isHost ? <FaGraduationCap size={10} /> : <FaUserTie size={10} />}
                  {isHost ? "Student" : "Host"}
                </span>
                {otherEmail && <span style={{ marginLeft:6 }}>{otherEmail}</span>}
              </div>
            </div>
          </div>
          <div className="msg-detail__hdr-right">
            <StatusBadge status={selected.status} />
            {/* Host gets action menu; student gets read-only */}
            {isHost && (
              <div ref={actionRef} style={{ position:"relative" }}>
                <button className="msg-icon-btn" onClick={() => setActionMenuId(p => p === selected._id ? null : selected._id)}>
                  <FaEllipsisV size={14} />
                </button>
                {actionMenuId === selected._id && (
                  <div className="msg-action-menu">
                    {selected.status !== "Accepted" && (
                      <button className="msg-action-menu__item msg-action-menu__item--accept"
                        onClick={() => handleStatus(selected._id, "Accepted")} disabled={!!updatingId}>
                        {updatingId === selected._id ? <FaSpinner className="msg-spin" /> : <FaCheckCircle size={13} />} Accept
                      </button>
                    )}
                    {selected.status !== "Rejected" && (
                      <button className="msg-action-menu__item msg-action-menu__item--reject"
                        onClick={() => handleStatus(selected._id, "Rejected")} disabled={!!updatingId}>
                        {updatingId === selected._id ? <FaSpinner className="msg-spin" /> : <FaTimesCircle size={13} />} Decline
                      </button>
                    )}
                    <div className="msg-action-menu__div" />
                    <button className="msg-action-menu__item msg-action-menu__item--delete" onClick={() => handleDelete(selected._id)}>
                      <FaTrash size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
            {isStudent && (
              <button className="msg-icon-btn msg-icon-btn--danger" title="Delete request" onClick={() => handleDelete(selected._id)}>
                <FaTrash size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="msg-detail__body">

          {/* Visit info card */}
          <div className="msg-visit-card">
            <div className="msg-visit-card__title">Visit Request Details</div>
            <div className="msg-visit-card__grid">
              <div className="msg-visit-card__cell">
                <FaBuilding className="msg-visit-card__icon" />
                <div>
                  <div className="msg-visit-card__lbl">Accommodation</div>
                  <div className="msg-visit-card__val">{selected.accommodationId?.title ?? "—"}</div>
                </div>
              </div>
              <div className="msg-visit-card__cell">
                <FaCalendarAlt className="msg-visit-card__icon" />
                <div>
                  <div className="msg-visit-card__lbl">Visit Date</div>
                  <div className="msg-visit-card__val">{fmtDate(selected.visitDate) || selected.visitDate || "—"}</div>
                </div>
              </div>
              <div className="msg-visit-card__cell">
                <FaClock className="msg-visit-card__icon" />
                <div>
                  <div className="msg-visit-card__lbl">Visit Time</div>
                  <div className="msg-visit-card__val">{selected.visitTime || "—"}</div>
                </div>
              </div>
              <div className="msg-visit-card__cell">
                <FaCalendarAlt className="msg-visit-card__icon" />
                <div>
                  <div className="msg-visit-card__lbl">Sent</div>
                  <div className="msg-visit-card__val">{timeAgo(selected.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chat thread ── */}
          <div className="msg-chat">

            {/* Student's original message — always on LEFT */}
            <div className="msg-bubble msg-bubble--left">
              <div className="msg-bubble__who">
                <Avatar name={studentName} img={selected.studentId?.profileImage} size={24} />
                <span>{isStudent ? "You" : studentName}</span>
              </div>
              <div className="msg-bubble__text">
                {selected.message || <em style={{ opacity:0.5 }}>No message provided</em>}
              </div>
              <div className="msg-bubble__meta">{timeAgo(selected.createdAt)}</div>
            </div>

            {/* Status change notification */}
            {selected.status !== "Pending" && (
              <div className={`msg-status-notice msg-status-notice--${selected.status.toLowerCase()}`}>
                {selected.status === "Accepted"
                  ? <><FaCheckCircle size={13} /> Visit request accepted by host</>
                  : <><FaTimesCircle size={13} /> Visit request declined by host</>}
              </div>
            )}

            {/* Host reply — always on RIGHT */}
            {selected.reply && (
              <div className="msg-bubble msg-bubble--right">
                <div className="msg-bubble__who msg-bubble__who--right">
                  <span>{isHost ? "You" : hostName}</span>
                  <Avatar name={hostName} img={selected.hostId?.profileImage} size={24} style={{ marginLeft:6 }} />
                </div>
                <div className="msg-bubble__text">{selected.reply}</div>
                <div className="msg-bubble__meta msg-bubble__meta--right">
                  <FaCheckDouble size={10} /> {timeAgo(selected.repliedAt)}
                </div>
              </div>
            )}

            {/* Student sees "waiting for reply" if no reply yet */}
            {isStudent && !selected.reply && (
              <div className="msg-waiting">
                <FaBell size={12} />
                Waiting for host to reply…
              </div>
            )}
          </div>

          {/* ── Host: quick action buttons ── */}
          {isHost && selected.status === "Pending" && (
            <div className="msg-quick-actions">
              <button className="msg-quick-btn msg-quick-btn--accept"
                onClick={() => handleStatus(selected._id, "Accepted")} disabled={!!updatingId}>
                {updatingId ? <FaSpinner className="msg-spin" /> : <FaCheckCircle size={14} />} Accept Visit
              </button>
              <button className="msg-quick-btn msg-quick-btn--reject"
                onClick={() => handleStatus(selected._id, "Rejected")} disabled={!!updatingId}>
                {updatingId ? <FaSpinner className="msg-spin" /> : <FaTimesCircle size={14} />} Decline Visit
              </button>
            </div>
          )}

          {/* ── Student: status info box ── */}
          {isStudent && (
            <div className={`msg-student-status msg-student-status--${selected.status.toLowerCase()}`}>
              {selected.status === "Pending" && (
                <><FaBell size={13} /> <strong>Pending</strong> — Your request is awaiting host review</>
              )}
              {selected.status === "Accepted" && (
                <><FaCheckCircle size={13} /> <strong>Accepted!</strong> — The host has confirmed your visit</>
              )}
              {selected.status === "Rejected" && (
                <><FaTimesCircle size={13} /> <strong>Declined</strong> — The host is unavailable on that date</>
              )}
            </div>
          )}
        </div>

        {/* ── Reply box: HOST only ── */}
        {isHost && (
          <div className="msg-reply-box">
            <div className="msg-reply-box__hdr">
              <FaReply size={13} /> Reply to {studentName}
            </div>
            <textarea
              className="msg-reply-box__ta"
              placeholder={`Write your reply to ${studentName}… (Ctrl+Enter to send)`}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(); }}
              rows={3}
            />
            <div className="msg-reply-box__footer">
              <span className="msg-reply-box__hint">Ctrl + Enter to send</span>
              <button className="msg-reply-box__send" onClick={handleReply} disabled={!replyText.trim() || replying}>
                {replying ? <><FaSpinner className="msg-spin" /> Sending…</> : <><FaPaperPlane size={13} /> Send Reply</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Student: no reply box (read-only) ── */}
        {isStudent && (
          <div className="msg-student-footer">
            <FaEnvelope size={13} />
            Replies from the host will appear here
          </div>
        )}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="msg-root" style={{ fontFamily: FONT }}>

      {/* NAVBAR */}
      <nav className="msg-nav">
        <div className="msg-nav__left">
          <a href="/" className="msg-nav__logo"><FaAirbnb /> Bodima</a>
        </div>
        <div className="msg-nav__tabs">
          {[["Boardings","/Boardings"],["Food Services","/Foods"],["Orders","/Orders"]].map(([l,h]) => (
            <a key={l} href={h} className="msg-nav__tab">{l}</a>
          ))}
        </div>
        <div className="msg-nav__right">
          {/* Role indicator pill */}
          {!userLoading && currentUser && (
            <div className={`msg-nav__role-pill msg-nav__role-pill--${userRole}`}>
              {isHost ? <FaUserTie size={10} /> : <FaGraduationCap size={10} />}
              {isHost ? "Host View" : "Student View"}
            </div>
          )}
          <div className="msg-nav__avatar">
            {currentUser?.profileImage
              ? <img src={resolveImg(currentUser.profileImage)} alt="me" className="msg-nav__avatar-img" />
              : <FaUser className="msg-nav__avatar-icon" />}
          </div>
          <div ref={dropdownRef} className="msg-dd-wrap">
            <button className="msg-nav__icon-btn" onClick={() => setShowDropdown(p => !p)}><FaBars /></button>
            {showDropdown && (
              <div className="msg-dd">
                {currentUser && (
                  <>
                    <div className="msg-dd__user">
                      <span className="msg-dd__name">{currentUser.name ?? "User"}</span>
                      <span className="msg-dd__email">{currentUser.email ?? ""}</span>
                      <span className={`msg-dd__role msg-dd__role--${userRole}`}>{userRole}</span>
                    </div>
                    <div className="msg-dd__div" />
                  </>
                )}
                <div className="msg-dd__item" onClick={() => { setShowDropdown(false); navigate("/Profile"); }}><FaUser /> Profile</div>
                <div className="msg-dd__item" onClick={() => { setShowDropdown(false); navigate("/Messages"); }}><FaEnvelope /> Messages</div>
                <div className="msg-dd__div" />
                <div className="msg-dd__item msg-dd__item--danger" onClick={() => { localStorage.removeItem("CurrentUserId"); navigate("/Login"); }}><FaSignOutAlt /> Logout</div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* PAGE */}
      <div className="msg-page">

        {/* SIDEBAR */}
        <aside className="msg-sidebar">

          {/* Header */}
          <div className="msg-sidebar__hdr">
            <div className="msg-sidebar__hdr-top">
              <div className="msg-sidebar__title">
                {isHost
                  ? <><FaUserTie className="msg-sidebar__title-icon msg-sidebar__title-icon--host" /> Visit Requests</>
                  : <><FaGraduationCap className="msg-sidebar__title-icon msg-sidebar__title-icon--student" /> My Requests</>}
                {pendingCount > 0 && <span className="msg-unread-pill">{pendingCount}</span>}
              </div>
              <div ref={filterRef} style={{ position:"relative" }}>
                <button className="msg-filter-btn" onClick={() => setShowFilter(p => !p)}>
                  <FaFilter size={12} />
                  {filterStatus !== "All" && <span className="msg-filter-dot" />}
                </button>
                {showFilter && (
                  <div className="msg-filter-menu">
                    {["All","Pending","Accepted","Rejected"].map(s => (
                      <button key={s} className={`msg-filter-item${filterStatus===s?" active":""}`}
                        onClick={() => { setFilterStatus(s); setShowFilter(false); }}>
                        {s === "All" ? "All Messages" : s}
                        {filterStatus === s && <FaCheck size={10} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats row — different per role */}
            {!reqLoading && requests.length > 0 && (
              <div className="msg-stats-row">
                <div className="msg-stat">
                  <span className="msg-stat__n">{requests.length}</span>
                  <span className="msg-stat__l">Total</span>
                </div>
                <div className="msg-stat">
                  <span className="msg-stat__n msg-stat__n--pending">{pendingCount}</span>
                  <span className="msg-stat__l">Pending</span>
                </div>
                <div className="msg-stat">
                  <span className="msg-stat__n msg-stat__n--accepted">{acceptedCount}</span>
                  <span className="msg-stat__l">Accepted</span>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="msg-search">
              <FaSearch className="msg-search__icon" />
              <input className="msg-search__input"
                placeholder={isHost ? "Search by student, accommodation…" : "Search by accommodation, host…"}
                value={search}
                onChange={e => setSearch(e.target.value)} />
              {search && <button className="msg-search__clear" onClick={() => setSearch("")}><FaTimes size={11} /></button>}
            </div>
          </div>

          {/* List */}
          <div className="msg-list">
            {reqLoading || userLoading ? (
              Array.from({length:5}).map((_,i) => (
                <div key={i} className="msg-list-skel">
                  <Skel w={44} h={44} r={22} />
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                    <Skel h={14} w="60%" /><Skel h={12} w="85%" /><Skel h={11} w="40%" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="msg-empty-list">
                <FaInbox size={28} />
                <span>{search || filterStatus !== "All" ? "No results" : isHost ? "No visit requests yet" : "You haven't sent any requests yet"}</span>
              </div>
            ) : (
              filtered.map(req => <SidebarItem key={req._id} req={req} />)
            )}
          </div>
        </aside>

        {/* DETAIL */}
        <main className="msg-detail">
          <DetailContent />
        </main>
      </div>

      {/* FOOTER */}
      <footer className="msg-footer">
        <div className="msg-footer__inner">
          <div className="msg-footer__left">
            <span>© 2026 Bodima, Inc.</span>
            <span className="msg-footer__dot">·</span>
            <a href="#" className="msg-footer__link">Privacy</a>
            <span className="msg-footer__dot">·</span>
            <a href="#" className="msg-footer__link">Terms</a>
          </div>
          <div className="msg-footer__socials">
            {[FaFacebookF,FaTwitter,FaInstagram].map((Icon,i) => (
              <a key={i} href="#" className="msg-footer__social"><Icon /></a>
            ))}
          </div>
        </div>
      </footer>

      {/* TOAST */}
      <div className={`msg-toast msg-toast--${toast.type}${toast.show ? " msg-toast--visible" : ""}`}>
        {toast.type === "success" && <FaCheckCircle size={13} />}
        {toast.type === "error"   && <FaTimesCircle size={13} />}
        {toast.type === "info"    && <FaExclamationCircle size={13} />}
        {toast.msg}
      </div>

      <style>{`
        @keyframes msgSkel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .msg-spin { animation: msgSpinKf .7s linear infinite; display:inline-block; }
        @keyframes msgSpinKf { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Messages;
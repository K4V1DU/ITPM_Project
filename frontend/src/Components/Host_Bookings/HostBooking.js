import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaHome,
  FaSpinner,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaPhone,
  FaClock,
  FaTimesCircle,
  FaSearch,
  FaSyncAlt,
  FaBookmark,
  FaBoxOpen,
  FaExternalLinkAlt,
  FaCalendarAlt,
  FaBed,
  FaEnvelope,
  FaCommentAlt,
} from "react-icons/fa";
import HostNavbar from "../NavBar/Host_NavBar/HostNavbar";
import Footer from "../NavBar/Footer/Footer";
import "./HostBooking.css";

const API_BASE = "http://localhost:8000";
// ✅ FIX 1: correct base path — matches router.js mount point
const BOOKING_API = `${API_BASE}/Booking`;
const ORANGE = "#FF6B2B";

// ─── Notification helper — fire-and-forget ────────────────────────────────────
async function sendNotification({ recipient, type, title, message, link, refId, refType }) {
  try {
    await fetch(`${API_BASE}/Notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, type, title, message, link, refId, refType }),
    });
  } catch { /* silent */ }
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS = {
  pending: {
    bg: "#fff7ed", text: "#c2410c", dot: ORANGE, border: "#fcd9c4", label: "Pending",
  },
  confirmed: {
    bg: "#f7f7f7", text: "#1b1b1b", dot: "#1b1b1b", border: "#e2e2e2", label: "Confirmed",
  },
  completed: {
    bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", border: "#bbf7d0", label: "Completed",
  },
  cancelled: {
    bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444", border: "#fecaca", label: "Cancelled",
  },
};

// ─────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────
function ConfirmModal({ action, onConfirm, onCancel, loading }) {
  const isConfirm  = action === "confirmed";
  const isComplete = action === "completed";
  const isCancel   = action === "cancelled";
  return (
    <div className="hb-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="hb-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`hb-modal__icon-wrap hb-modal__icon-wrap--${isCancel ? "danger" : "primary"}`}>
          {isCancel ? <FaTimesCircle /> : <FaCheckCircle />}
        </div>
        <h3 className="hb-modal__title">
          {isConfirm ? "Confirm Booking" : isComplete ? "Mark as Completed" : "Cancel Booking"}
        </h3>
        <p className="hb-modal__desc">
          {isConfirm
            ? "Confirm this booking? The student will be notified their visit is approved."
            : isComplete
            ? "Mark this booking as completed? This confirms the visit has taken place."
            : "Cancel this booking? This action cannot be undone and the student will be notified."}
        </p>
        <div className="hb-modal__btns">
          <button className="hb-modal__btn hb-modal__btn--ghost" onClick={onCancel} disabled={loading}>
            Back
          </button>
          <button
            className={`hb-modal__btn hb-modal__btn--${isCancel ? "danger" : isComplete ? "dark" : "primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className="hb-spin" />
            ) : isConfirm ? "Confirm" : isComplete ? "Mark Completed" : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span className="hb-badge" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span className="hb-badge__dot" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────
// LEFT: BOOKING ROW
// ─────────────────────────────────────────
function BookingRow({ booking, selected, onClick }) {
  // ✅ FIX 2: real fields from Booking model — visitDate & visitTime, not checkIn/checkOut
  const name = booking.student?.name ?? "Student";
  const s    = STATUS[booking.status] ?? STATUS.pending;

  return (
    <div
      className={`hb-row${selected ? " hb-row--active" : ""}`}
      style={{ borderLeftColor: selected ? ORANGE : s.dot }}
      onClick={onClick}
    >
      <div className="hb-row__icon">
        <FaHome />
      </div>
      <div className="hb-row__body">
        <div className="hb-row__top">
          <span className="hb-row__name">{name}</span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="hb-row__meta">
          <span>
            <FaCalendarAlt style={{ fontSize: 9 }} />{" "}
            {formatDate(booking.visitDate)}
          </span>
          <span className="hb-sep">·</span>
          <span>{booking.visitTime ?? "—"}</span>
          <span className="hb-sep">·</span>
          <span className="hb-row__time">
            <FaClock style={{ fontSize: 9 }} /> {timeAgo(booking.createdAt)}
          </span>
        </div>
        {booking.accommodation?.name && (
          <div className="hb-row__property">
            <FaBed style={{ fontSize: 9 }} /> {booking.accommodation.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// RIGHT: BOOKING DETAIL PANEL
// ─────────────────────────────────────────
function BookingDetail({ booking, onAction, actionLoading }) {
  if (!booking) {
    return (
      <div className="hb-detail hb-detail--empty">
        <FaBookmark className="hb-detail__empty-icon" />
        <p className="hb-detail__empty-text">Select a booking to view details</p>
      </div>
    );
  }

  const student    = booking.student ?? {};
  const name       = student.name ?? "Student";
  const phone      = student.phone ?? null;
  const profileImg = student.profileImage
    ? `${API_BASE}/Photo/${student.profileImage}`
    : null;
  const busy = actionLoading === booking._id;

  // Map — only if accommodation has coordinates
  const lat      = booking.accommodation?.location?.coordinates?.[1];
  const lng      = booking.accommodation?.location?.coordinates?.[0];
  const showMap  = lat && lng;
  const mapSrc   = showMap ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed` : null;
  const mapsLink = showMap ? `https://www.google.com/maps?q=${lat},${lng}` : null;

  return (
    <div className="hb-detail">
      {/* ── Header ── */}
      <div className="hb-detail__header">
        <div className="hb-detail__booking-id">
          <span className="hb-detail__booking-id__text">
            Booking ID&nbsp;&nbsp;{booking._id}
          </span>
        </div>

        <div className="hb-detail__header-row">
          <div className="hb-detail__customer">
            <div className="hb-detail__avatar">
              {profileImg ? (
                <img
                  src={profileImg}
                  alt={name}
                  className="hb-detail__avatar-img"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="hb-detail__customer-info">
              <div className="hb-detail__customer-name">{name}</div>
              {student.email && (
                <a href={`mailto:${student.email}`} className="hb-detail__email">
                  <FaEnvelope style={{ fontSize: 10 }} /> {student.email}
                </a>
              )}
              {phone ? (
                <a href={`tel:${phone}`} className="hb-detail__phone">
                  <FaPhone style={{ fontSize: 10 }} /> {phone}
                </a>
              ) : (
                <span className="hb-detail__no-phone">No phone number</span>
              )}
            </div>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="hb-detail__header-divider" />

        <div className="hb-detail__header-meta">
          <span className="hb-header-meta__item">
            <FaBed style={{ fontSize: 11 }} />
            {booking.accommodation?.name ?? "Property"}
          </span>
          <span className="hb-sep">·</span>
          <span className="hb-header-meta__item">
            <FaClock style={{ fontSize: 10 }} />
            {timeAgo(booking.createdAt)}
          </span>
          <span className="hb-sep">·</span>
          <span className="hb-header-meta__item hb-header-meta__item--visit">
            <FaCalendarAlt style={{ fontSize: 11 }} />
            {formatDate(booking.visitDate)}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="hb-detail__body">

        {/* ✅ FIX 3: visitDate + visitTime cards instead of checkIn/checkOut/rooms/pricing */}
        <div className="hb-detail__section">
          <div className="hb-detail__section-label">Visit Details</div>
          <div className="hb-dates-grid">
            <div className="hb-date-card">
              <div className="hb-date-card__label">
                <FaCalendarAlt className="hb-date-card__icon" /> Visit Date
              </div>
              <div className="hb-date-card__value">{formatDate(booking.visitDate)}</div>
              <div className="hb-date-card__sub">Scheduled visit day</div>
            </div>
            <div className="hb-date-arrow">·</div>
            <div className="hb-date-card">
              <div className="hb-date-card__label">
                <FaClock className="hb-date-card__icon hb-date-card__icon--time" /> Visit Time
              </div>
              <div className="hb-date-card__value">{booking.visitTime ?? "—"}</div>
              <div className="hb-date-card__sub">Preferred arrival time</div>
            </div>
          </div>
        </div>

        {/* MESSAGE FROM STUDENT */}
        {booking.message && (
          <div className="hb-detail__section">
            <div className="hb-detail__section-label hb-detail__section-label--msg">
              <FaCommentAlt className="hb-msg-icon" /> Message from Student
            </div>
            <div className="hb-detail__notes">{booking.message}</div>
          </div>
        )}

        {/* ACTIONS */}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <div className="hb-detail__actions">
            {booking.status === "pending" && (
              <>
                <button
                  className="hb-action hb-action--primary"
                  onClick={() => onAction(booking, "confirmed")}
                  disabled={busy}
                >
                  {busy ? <FaSpinner className="hb-spin" /> : <FaCheckCircle />}{" "}
                  Confirm Booking
                </button>
                <button
                  className="hb-action hb-action--ghost"
                  onClick={() => onAction(booking, "cancelled")}
                  disabled={busy}
                >
                  <FaTimesCircle /> Cancel
                </button>
              </>
            )}
            {booking.status === "confirmed" && (
              <>
                <button
                  className="hb-action hb-action--primary"
                  onClick={() => onAction(booking, "completed")}
                  disabled={busy}
                >
                  {busy ? <FaSpinner className="hb-spin" /> : <FaCheckCircle />}{" "}
                  Mark Completed
                </button>
                <button
                  className="hb-action hb-action--ghost"
                  onClick={() => onAction(booking, "cancelled")}
                  disabled={busy}
                >
                  <FaTimesCircle /> Cancel
                </button>
              </>
            )}
          </div>
        )}

        {/* MAP — always last */}
        {showMap && mapSrc && (
          <div className="hb-detail__section hb-detail__section--map">
            <div className="hb-detail__section-label">Property Location</div>
            <div className="hb-map-wrap">
              <iframe
                className="hb-map-iframe"
                src={mapSrc}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property location"
              />
              <div className="hb-map-card">
                <FaMapMarkerAlt style={{ color: ORANGE, fontSize: 16 }} />
                <div>
                  <div className="hb-map-card__name">
                    {booking.accommodation?.name ?? "Property"}
                  </div>
                  <div className="hb-map-card__sub">Accommodation address</div>
                </div>
              </div>
            </div>
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hb-map-link"
              >
                <FaExternalLinkAlt style={{ fontSize: 11 }} /> Open in Google Maps
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────
export default function HostBooking() {
  const navigate = useNavigate();
  const userId   = localStorage.getItem("CurrentUserId");

  const [bookings,        setBookings]        = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusFilter,    setStatusFilter]    = useState("all");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [confirmModal,    setConfirmModal]    = useState(null);
  const [actionLoading,   setActionLoading]   = useState(null);
  const [lastRefresh,     setLastRefresh]     = useState(Date.now());
  const [toast,           setToast]           = useState({ show: false, msg: "" });
  const [error,           setError]           = useState(null);
  const toastRef = useRef(null);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ show: false, msg: "" }), 2600);
  };

  useEffect(() => {
    if (!userId) navigate("/Login");
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingBookings(true);
    setError(null);

    // ✅ FIX 1: /host/:hostId  — matches router.get("/host/:hostId", getHostBookings)
    fetch(`${BOOKING_API}/host/${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw) => {
        // Controller returns { success: true, data: [...] }
        const arr    = Array.isArray(raw?.data) ? raw.data : [];
        const sorted = arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(sorted);
        setSelectedBooking((prev) =>
          prev ? sorted.find((b) => b._id === prev._id) ?? sorted[0] : sorted[0]
        );
      })
      .catch((err) => {
        if (err === 404) { setBookings([]); return; }
        setError("Failed to load bookings. Please try again.");
      })
      .finally(() => setLoadingBookings(false));
  }, [userId, lastRefresh]);

  const handleAction = (booking, action) => setConfirmModal({ booking, action });

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { booking, action } = confirmModal;
    setActionLoading(booking._id);
    try {
      // ✅ FIX 2: PUT /:id  — matches router.put("/:id", updateBookingStatus)
      const res = await fetch(`${BOOKING_API}/${booking._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error();

      setBookings((prev) =>
        prev.map((b) => (b._id === booking._id ? { ...b, status: action } : b))
      );
      setSelectedBooking((prev) =>
        prev?._id === booking._id ? { ...prev, status: action } : prev
      );
      showToast(
        action === "confirmed"   ? "Booking confirmed."
        : action === "completed" ? "Booking marked as completed."
        : "Booking cancelled."
      );

      // ── Notify student ────────────────────────────────────────────────────
      const studentId = booking.student?._id ?? booking.student ?? null;
      const propName  = booking.accommodation?.name ?? "the property";
      const notifMap  = {
        confirmed: { title: "Booking Confirmed", message: `Your booking at ${propName} has been confirmed.` },
        completed: { title: "Visit Completed",   message: `Your visit to ${propName} has been marked as completed.` },
        cancelled: { title: "Booking Cancelled", message: `Your booking at ${propName} has been cancelled by the host.` },
      };
      const notif = notifMap[action];
      if (studentId && notif) {
        sendNotification({
          recipient: studentId,
          type: "booking_status",
          title: notif.title,
          message: notif.message,
          link: "/StudentBookings",
          refId: booking._id,
          refType: "Booking",
        });
      }
    } catch {
      showToast("Failed to update booking. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  // ✅ FIX 4: search on actual fields — visitDate, visitTime, message (not rooms[])
  const filteredBookings = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (b.student?.name       ?? "").toLowerCase().includes(q) ||
      (b.accommodation?.name ?? "").toLowerCase().includes(q) ||
      (b.message             ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const TABS = ["all", "pending", "confirmed", "completed", "cancelled"];

  return (
    <div className="hb-page">
      <HostNavbar activeHref="/HostBooking" />

      <div className="hb-wrapper">
        {/* ── Title ── */}
        <div className="hb-titlebar">
          <div className="hb-titlebar__left">
            <h1 className="hb-titlebar__title">Bookings</h1>
            <span className="hb-titlebar__count">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button className="hb-btn-refresh" onClick={() => setLastRefresh(Date.now())}>
            <FaSyncAlt /> Refresh
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="hb-tabs">
          {TABS.map((s) => (
            <button
              key={s}
              className={`hb-tab${statusFilter === s ? " hb-tab--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All Bookings" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="hb-tab__count">
                {s === "all" ? bookings.length : bookings.filter((b) => b.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Split ── */}
        <div className="hb-split">
          {/* LEFT */}
          <div className="hb-split__left">
            <div className="hb-search-wrap">
              <FaSearch className="hb-search-icon" />
              <input
                className="hb-search"
                type="text"
                placeholder="Search guest, property or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {error ? (
              <div className="hb-empty">
                <FaTimesCircle className="hb-empty__icon" style={{ color: "#dc2626" }} />
                <p>{error}</p>
                <button className="hb-btn-refresh" onClick={() => setLastRefresh(Date.now())}>
                  <FaSyncAlt /> Retry
                </button>
              </div>
            ) : loadingBookings ? (
              <div className="hb-skeletons">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="hb-skeleton">
                    <div className="hb-skeleton__circle" />
                    <div className="hb-skeleton__lines">
                      <div className="hb-skeleton__line hb-skeleton__line--med" />
                      <div className="hb-skeleton__line hb-skeleton__line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="hb-empty">
                <FaBoxOpen className="hb-empty__icon" />
                <p>
                  {searchQuery
                    ? "No bookings match your search."
                    : bookings.length === 0
                    ? "No bookings yet."
                    : "No bookings for this filter."}
                </p>
              </div>
            ) : (
              <div className="hb-list">
                {filteredBookings.map((booking) => (
                  <BookingRow
                    key={booking._id}
                    booking={booking}
                    selected={selectedBooking?._id === booking._id}
                    onClick={() => setSelectedBooking(booking)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="hb-split__right">
            <BookingDetail
              booking={selectedBooking}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          </div>
        </div>
      </div>

      <Footer />

      {confirmModal && (
        <ConfirmModal
          action={confirmModal.action}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
          loading={actionLoading === confirmModal.booking._id}
        />
      )}

      <div className={`hb-toast${toast.show ? " hb-toast--visible" : ""}`}>
        {toast.msg}
      </div>
    </div>
  );
}
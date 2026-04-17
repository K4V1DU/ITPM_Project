import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavBar from '../NavBar/Admin_NavBar/AdminNavBar';
import { useToast } from "../Overlays/ToastMessages/ToastContext";
import './AdminPayments.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const unwrap   = (r) => r?.data ?? r?.result ?? r;

/* ── Helpers ─────────────────────────────────────────────────── */
const photoUrl    = (id)  => id  ? `${API_BASE}/Photo/${id}` : null;
const fmtTime     = (d)   => d   ? new Date(d).toLocaleString("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit"
}) : "—";
const fmtCurrency = (n)   => `LKR ${Number(n || 0).toLocaleString()}`;

const fmtStr = (val) => {
  if (val == null) return "—";
  if (typeof val === "object") {
    if (val.open !== undefined || val.close !== undefined)
      return `${val.open ?? ""}–${val.close ?? ""}`;
    return JSON.stringify(val);
  }
  return String(val);
};

const pickId = (...candidates) => {
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (typeof value._id === "string") return value._id;
      if (typeof value.id === "string") return value.id;
      if (typeof value.userId === "string") return value.userId;
      if (typeof value.hostId === "string") return value.hostId;
    }
  }
  return null;
};

/* ── Inline SVG Icons ─────────────────────────────────────────── */
const IconCard      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconSearch    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconCheck     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconX         = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const IconImage     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconUser      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconHome      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconFood      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const IconPhone     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.59 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconMail      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IconPin       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconChevDown  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconChevUp    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
const IconClock     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconNote      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IconHash      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IconTag       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconList      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconDollar    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const IconShield    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconCalendar  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconMessage   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconBell      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;

/* ─── Notification Helper ────────────────────────────────────────────────── */
const sendNotification = async ({ recipient, type, title, message, link, refId, refType }) => {
  if (!recipient) return;
  try {
    await fetch(`${API_BASE}/Notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient, type, title, message, link: link || null, refId: refId || null, refType: refType || "Payment" }),
    });
  } catch {
    // Notification failure should never break the main flow
  }
};

/* ─── Receipt Modal ──────────────────────────────────────────────────────── */
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
    <div className="ap-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div className="ap-modal__header">
          <span>Payment Receipt</span>
          <button onClick={onClose} className="ap-modal__close" aria-label="Close">×</button>
        </div>
        {loading
          ? <div className="ap-modal__loading"><div className="ap-spinner" /></div>
          : src
            ? <img src={src} alt="Receipt" className="ap-modal__img" />
            : <p className="ap-modal__empty">No receipt image available</p>
        }
      </div>
    </div>
  );
}

/* ─── Owner Card ─────────────────────────────────────────────────────────── */
function OwnerCard({ host, onContactHost }) {
  if (!host) return <span className="ap-text-muted">No owner data</span>;
  const avatarSrc = photoUrl(host.profileImage);

  const addrStr = host.address
    ? typeof host.address === "object"
        ? `${host.address.street || ""} ${host.address.city || ""}`.trim()
        : host.address
    : null;

  const hostId = host._id || host.id;

  return (
    <div className="ap-owner-card">
      <div className="ap-owner-card__avatar">
        {avatarSrc
          ? <img src={avatarSrc} alt={host.name || host.username} onError={e => { e.target.style.display='none'; }} />
          : <IconUser />
        }
      </div>
      <div className="ap-owner-card__info">
        <div className="ap-owner-card__name">{fmtStr(host.name || host.username)}</div>
        {host.role  && <div className="ap-owner-card__role">{fmtStr(host.role)}</div>}
        {host.email && <div className="ap-owner-card__detail"><IconMail  />{fmtStr(host.email)}</div>}
        {host.phone && <div className="ap-owner-card__detail"><IconPhone />{fmtStr(host.phone)}</div>}
        {addrStr    && <div className="ap-owner-card__detail"><IconPin />{addrStr}</div>}
        {host.about && <div className="ap-owner-card__about">{fmtStr(host.about)}</div>}

        {/* ── Contact Host Button ── */}
        {hostId && onContactHost && (
          <button
            className="ap-btn ap-btn--contact"
            onClick={() => onContactHost(hostId)}
            title={`Send message to ${host.name || host.username}`}
          >
            <span className="ap-btn__icon"><IconMessage /></span>
            <span className="ap-btn__label">Contact Host</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Listing Card  –  Same icon-left / details-right layout as OwnerCard ── */
function ListingCard({ listing, listingType }) {
  if (!listing) return <span className="ap-text-muted">No listing data</span>;

  const isFood  = listingType === "food";
  const isAccom = listingType === "accommodation";

  const iconImgId = isFood
    ? listing.iconImage
    : (listing.images?.[0] ?? null);
  const imgSrc = photoUrl(iconImgId);

  const addrStr = listing.address
    ? typeof listing.address === "object"
        ? `${listing.address.street || ""} ${listing.address.city || ""}`.trim()
        : listing.address
    : null;

  const listingId   = listing._id || listing.id;
  const listingName = listing.kitchenName || listing.title || "Unnamed Listing";

  return (
    <div className="ap-listing-card">
      <div className="ap-listing-card__main-row">
        <div className="ap-listing-card__icon-wrap">
          {imgSrc
            ? <img src={imgSrc} alt="Listing" className="ap-listing-card__icon-img" onError={e => { e.target.style.display = 'none'; }} />
            : <span className="ap-listing-card__icon-placeholder">
                {isFood ? <IconFood /> : <IconHome />}
              </span>
          }
        </div>

        <div className="ap-listing-card__info">
          <div className="ap-listing-card__title">{fmtStr(listingName)}</div>

          <div className="ap-listing-card__type-badge">
            {isFood  ? <><IconFood />  Food Service</>
            : isAccom ? <><IconHome /> Accommodation</>
            : fmtStr(listingType)}
          </div>

          {addrStr && (
            <div className="ap-listing-card__detail"><IconPin />{addrStr}</div>
          )}

          {isFood && listing.operatingHours != null && (
            <div className="ap-listing-card__detail"><IconClock />{fmtStr(listing.operatingHours)}</div>
          )}

          {isAccom && listing.pricePerMonth != null && (
            <div className="ap-listing-card__detail ap-listing-card__detail--price">
              <IconDollar />{fmtCurrency(listing.pricePerMonth)} / mo
            </div>
          )}

          <div className="ap-listing-card__detail">
            <span className="ap-listing-avail">
              <span className={`ap-avail-dot ${listing.isAvailable ? "ap-avail-dot--on" : "ap-avail-dot--off"}`} />
              {listing.isAvailable ? "Available" : "Unavailable"}
            </span>
          </div>

          {listing.expireDate && (
            <div className="ap-listing-card__detail">
              <IconCalendar />Expires {fmtTime(listing.expireDate)}
            </div>
          )}

          {listingId && (
            <div className="ap-listing-card__detail ap-listing-card__detail--id">
              <IconHash />{fmtStr(listingId)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Payment Info Panel ─────────────────────────────────────────────────── */
function PaymentInfoPanel({ p }) {
  return (
    <div className="ap-info-grid">
      <div className="ap-info-item">
        <div className="ap-info-item__label"><IconHash /> Reference</div>
        <div className="ap-info-item__value ap-mono">{fmtStr(p.referenceCode)}</div>
      </div>
      <div className="ap-info-item">
        <div className="ap-info-item__label"><IconTag /> Plan</div>
        <div className="ap-info-item__value">
          <span className="ap-plan-badge">{p.plan?.toUpperCase() || "—"}</span>
        </div>
      </div>
      <div className="ap-info-item">
        <div className="ap-info-item__label"><IconDollar /> Amount</div>
        <div className="ap-info-item__value ap-info-item__value--amount">{fmtCurrency(p.amount)}</div>
      </div>
      <div className="ap-info-item">
        <div className="ap-info-item__label"><IconList /> Type</div>
        <div className="ap-info-item__value" style={{ textTransform: "capitalize" }}>{fmtStr(p.listingType)}</div>
      </div>
      <div className="ap-info-item">
        <div className="ap-info-item__label"><IconShield /> Status</div>
        <div className="ap-info-item__value">
          <span className={`ap-badge ap-badge--${p.status}`}>{p.status?.replace("_", " ")}</span>
        </div>
      </div>
      <div className="ap-info-item">
        <div className="ap-info-item__label"><IconCalendar /> Created</div>
        <div className="ap-info-item__value ap-mono">{fmtTime(p.createdAt)}</div>
      </div>
      {p.receiptUploadedAt && (
        <div className="ap-info-item">
          <div className="ap-info-item__label"><IconImage /> Receipt Uploaded</div>
          <div className="ap-info-item__value ap-mono">{fmtTime(p.receiptUploadedAt)}</div>
        </div>
      )}
      {p.verifiedAt && (
        <div className="ap-info-item">
          <div className="ap-info-item__label"><IconCheck /> Verified At</div>
          <div className="ap-info-item__value ap-mono">{fmtTime(p.verifiedAt)}</div>
        </div>
      )}
      {p.rejectedAt && (
        <div className="ap-info-item">
          <div className="ap-info-item__label"><IconX /> Rejected At</div>
          <div className="ap-info-item__value ap-mono">{fmtTime(p.rejectedAt)}</div>
        </div>
      )}
      {p.paymentMethod && (
        <div className="ap-info-item">
          <div className="ap-info-item__label"><IconCard /> Method</div>
          <div className="ap-info-item__value" style={{ textTransform: "capitalize" }}>{fmtStr(p.paymentMethod)}</div>
        </div>
      )}
      {p.stripeSessionId && (
        <div className="ap-info-item ap-info-item--full">
          <div className="ap-info-item__label"><IconHash /> Stripe Session</div>
          <div className="ap-info-item__value ap-mono ap-mono--sm">{fmtStr(p.stripeSessionId)}</div>
        </div>
      )}
      {p._id && (
        <div className="ap-info-item ap-info-item--full">
          <div className="ap-info-item__label"><IconHash /> Payment ID</div>
          <div className="ap-info-item__value ap-mono ap-mono--sm">{fmtStr(p._id)}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Expandable Row ─────────────────────────────────────────────────────── */
function PaymentRow({ p, onReceipt, onVerify, onReject, onContactHost }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className={`ap-row ${expanded ? "ap-row--expanded" : ""}`}>
        <td className="ap-cell-mono">{fmtStr(p.referenceCode)}</td>
        <td><span className="ap-plan-badge">{p.plan?.toUpperCase() || "—"}</span></td>
        <td className="ap-cell-amount">{fmtCurrency(p.amount)}</td>
        <td className="ap-cell-muted" style={{ textTransform: "capitalize" }}>{fmtStr(p.listingType)}</td>
        <td>
          <span className={`ap-badge ap-badge--${p.status}`}>
            {p.status?.replace("_", " ")}
          </span>
        </td>
        <td className="ap-cell-muted">{fmtTime(p.createdAt)}</td>
        <td>
          <div className="ap-actions">
            <button
              className="ap-btn ap-btn--purple"
              onClick={() => onReceipt(p._id)}
              title="View Receipt"
            >
              <span className="ap-btn__icon"><IconImage /></span>
              <span className="ap-btn__label">Receipt</span>
            </button>

            {p.status === "manual_requested" && (
              <>
                <button
                  className="ap-btn ap-btn--success"
                  onClick={() => onVerify(p._id)}
                  title="Approve Payment"
                >
                  <span className="ap-btn__icon"><IconCheck /></span>
                  <span className="ap-btn__label">Approve</span>
                </button>
                <button
                  className="ap-btn ap-btn--danger"
                  onClick={() => onReject(p._id)}
                  title="Reject Payment"
                >
                  <span className="ap-btn__icon"><IconX /></span>
                  <span className="ap-btn__label">Reject</span>
                </button>
              </>
            )}

            <button
              className={`ap-btn ap-btn--toggle ${expanded ? "ap-btn--active" : "ap-btn--ghost"}`}
              onClick={() => setExpanded(v => !v)}
              title={expanded ? "Collapse" : "Expand Details"}
            >
              <span className="ap-btn__icon">
                {expanded ? <IconChevUp /> : <IconChevDown />}
              </span>
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="ap-detail-row">
          <td colSpan={7}>
            <div className="ap-detail-panel">

              {/* ── Payment Info ── */}
              <div className="ap-detail-section ap-detail-section--full">
                <div className="ap-detail-section__title">
                  <IconCard /> Payment Details
                </div>
                <PaymentInfoPanel p={p} />
              </div>

              <div className="ap-detail-divider ap-detail-divider--h" />

              {/* ── Owner + Listing side by side ── */}
              <div className="ap-detail-cols">
                <div className="ap-detail-section">
                  <div className="ap-detail-section__title">
                    <IconUser /> Owner Details
                  </div>
                  <OwnerCard host={p.host} onContactHost={onContactHost} />
                </div>

                <div className="ap-detail-divider ap-detail-divider--v" />

                <div className="ap-detail-section">
                  <div className="ap-detail-section__title">
                    {p.listingType === "food" ? <IconFood /> : <IconHome />} Listing Details
                  </div>
                  <ListingCard listing={p.listing} listingType={p.listingType} />
                </div>
              </div>

              {p.adminNote && (
                <>
                  <div className="ap-detail-divider ap-detail-divider--h" />
                  <div className="ap-detail-section ap-detail-section--full">
                    <div className="ap-detail-section__title"><IconNote /> Admin Note</div>
                    <div className="ap-admin-note">{fmtStr(p.adminNote)}</div>
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AdminPayments() {
  const navigate = useNavigate();
  const { toast: pushToast } = useToast();
  const userId   = localStorage.getItem("CurrentUserId");

  const [payments,     setPayments]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [receiptModal, setReceiptModal] = useState(null);

  useEffect(() => { if (!userId) navigate("/Login"); }, [userId, navigate]);

  const fetchPayments = () => {
    setLoading(true);
    fetch(`${API_BASE}/Payment/all?limit=100`)
      .then(r => r.ok
        ? r.json()
        : fetch(`${API_BASE}/Payment/my?hostId=${userId}`).then(r2 => r2.json())
      )
      .then(raw => {
        const list = Array.isArray(raw?.payments) ? raw.payments
          : Array.isArray(unwrap(raw)) ? unwrap(raw) : [];
        setPayments(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, []);

  const showToast = (msg, type = "success") => {
    pushToast(msg, type);
  };

  /* ── Approve ─────────────────────────────────────────────────────────── */
  const handleVerify = async (id) => {
    const payment = payments.find(p => p._id === id);
    try {
      const res  = await fetch(`${API_BASE}/Payment/${id}/approve-manual`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: userId, adminNote: "Manually approved by admin." })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const approvedPayment = data.payment;
        const updatedExpireDate = approvedPayment?.newExpireDate;
        const updatedDays = approvedPayment?.daysAdded;
        setPayments(p => p.map(x => x._id === id ? {
          ...x,
          status: "verified",
          newExpireDate: updatedExpireDate ?? x.newExpireDate,
          daysAdded: updatedDays ?? x.daysAdded,
          listing: x.listing
            ? {
                ...x.listing,
                expireDate: updatedExpireDate ?? x.listing.expireDate,
                isAvailable: true,
              }
            : x.listing,
        } : x));
        showToast("Payment approved and listing activated.");

        // ── Send notification to host ──
        const hostId = pickId(payment?.host, payment?.hostId, payment?.ownerId, payment?.userId);
        if (hostId) {
          await sendNotification({
            recipient: hostId,
            type:      "payment_verified",
            title:     "Payment Approved ✓",
            message:   `Your ${payment.plan?.toUpperCase() || ""} plan payment of ${fmtCurrency(payment.amount)} has been approved. Your listing is now active.`,
            link:      "/MyListings",
            refId:     id,
            refType:   "Payment",
          });
        }
      } else {
        showToast(data.message || "Approval failed.", "error");
      }
    } catch {
      showToast("Failed to verify payment.", "error");
    }
  };

  /* ── Reject ──────────────────────────────────────────────────────────── */
  const handleReject = async (id) => {
    const payment = payments.find(p => p._id === id);
    const reason  = window.prompt("Enter a reason for rejection:");
    if (!reason) return;
    try {
      const res  = await fetch(`${API_BASE}/Payment/${id}/reject-manual`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: userId, adminNote: reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayments(p => p.map(x => x._id === id ? { ...x, status: "rejected", adminNote: reason } : x));
        showToast("Payment rejected.");

        // ── Send notification to host ──
        const hostId = pickId(payment?.host, payment?.hostId, payment?.ownerId, payment?.userId);
        if (hostId) {
          await sendNotification({
            recipient: hostId,
            type:      "payment_rejected",
            title:     "Payment Rejected",
            message:   `Your ${payment.plan?.toUpperCase() || ""} plan payment of ${fmtCurrency(payment.amount)} was rejected. Reason: ${reason}`,
            link:      "/MyPayments",
            refId:     id,
            refType:   "Payment",
          });
        }
      } else {
        showToast(data.message || "Rejection failed.", "error");
      }
    } catch {
      showToast("Failed to reject payment.", "error");
    }
  };

  /* ── Contact Host ────────────────────────────────────────────────────── */
  const handleContactHost = async (hostId) => {
    try {
      const res  = await fetch(`${API_BASE}/message/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: userId, receiverId: hostId }),
      });
      const data = await res.json();
      if (data.success && data.data?._id) {
        navigate("/Messages", { state: { openConversationId: data.data._id } });
      } else {
        showToast("Could not open conversation.", "error");
      }
    } catch {
      showToast("Failed to contact host.", "error");
    }
  };

  /* ── Filters ─────────────────────────────────────────────────────────── */
  const filtered = payments.filter(p => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchType   = typeFilter   === "all" || p.listingType === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || p.referenceCode?.toLowerCase().includes(q)
      || p._id?.toLowerCase().includes(q)
      || p.host?.name?.toLowerCase().includes(q)
      || p.host?.username?.toLowerCase().includes(q)
      || p.host?.email?.toLowerCase().includes(q)
      || (p.listing?.kitchenName || p.listing?.title || "").toLowerCase().includes(q)
      || p.plan?.toLowerCase().includes(q)
      || p.status?.toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
  });

  const verifiedTotal = payments
    .filter(p => p.status === "verified")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pendingReview = payments.filter(p => p.status === "manual_requested").length;

  const counts = {
    all:              payments.length,
    manual_requested: pendingReview,
    pending:          payments.filter(p => p.status === "pending").length,
    verified:         payments.filter(p => p.status === "verified").length,
  };

  return (
    <div className="ap-page">
      <AdminNavBar activeHref="/AdminPayments" />

      {/* Receipt Modal */}
      {receiptModal && (
        <ReceiptModal paymentId={receiptModal} onClose={() => setReceiptModal(null)} />
      )}

      {/* ── Banner ── */}
      <div className="ap-banner">
        <div className="ap-banner__noise" />
        <div className="ap-banner__bubble" />

        <div className="ap-banner__content">
          <p className="ap-banner__label">Admin Panel</p>
          <h1 className="ap-banner__title">
            <span className="ap-banner__title-icon"><IconCard /></span>
            Payment Management
          </h1>
          <p className="ap-banner__sub">
            <strong>{pendingReview}</strong> pending manual review
            &nbsp;·&nbsp;
            <strong>{fmtCurrency(verifiedTotal)}</strong> verified revenue
          </p>
        </div>
      </div>

      <div className="ap-container">

        {/* ── Stats ── */}
        <div className="ap-stats-grid">
          {[
            { label: "Total Payments", num: counts.all,              cls: "slate", icon: <IconCard />    },
            { label: "Manual Review",  num: counts.manual_requested, cls: "amber", icon: <IconImage />   },
            { label: "Pending",        num: counts.pending,          cls: "blue",  icon: <IconClock />   },
            { label: "Verified",       num: counts.verified,         cls: "green", icon: <IconCheck />   },
          ].map((s, i) => (
            <div key={i} className="ap-stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className={`ap-stat-icon ap-stat-icon--${s.cls}`}>{s.icon}</div>
              <div className="ap-stat-num">{s.num}</div>
              <div className="ap-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="ap-card">
          <div className="ap-card__header">
            <h3 className="ap-card__title">
              <span className="ap-card__title-icon"><IconCard /></span>
              All Payments
            </h3>

            <div className="ap-toolbar">
              <div className="ap-search-wrap">
                <span className="ap-search-icon"><IconSearch /></span>
                <input
                  className="ap-search-input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search ref, owner, listing, plan…"
                />
              </div>

              <select className="ap-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="food">Food</option>
                <option value="accommodation">Accommodation</option>
              </select>

              <select className="ap-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="manual_requested">Manual Review</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="created">Created</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ap-empty">
              <div className="ap-spinner" />
              <p>Loading payments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ap-empty">
              <span className="ap-empty-icon"><IconCard /></span>
              <p>No payments found</p>
            </div>
          ) : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <PaymentRow
                      key={p._id}
                      p={p}
                      onReceipt={setReceiptModal}
                      onVerify={handleVerify}
                      onReject={handleReject}
                      onContactHost={handleContactHost}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="ap-card__footer">
            Showing {filtered.length} of {payments.length} payments
          </div>
        </div>

      </div>
    </div>
  );
}
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from "@react-google-maps/api";
import { useNavigate, useParams } from "react-router-dom";
import {
  Trash2, RefreshCw, X, ChevronRight, ChevronLeft,
  Home, UtensilsCrossed, Coffee, Croissant, Truck, ShoppingBag,
  MapPin, Crosshair, Upload, Leaf, Flame, Wheat, Sprout,
  CheckCircle, Loader2, Image as ImageIcon, Plus, Store, Clock,
  AlertCircle, PenLine,
} from "lucide-react";
import axios from "axios";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_MAPS_API_KEY = "AIzaSyDKKnxSMEUkZyZiLT83DXCJhR4eplblzKA";
const BASE_URL = "http://localhost:8000";
const SLIIT_LOCATION = { lat: 6.9147, lng: 79.9727 };
const LIBRARIES = ["places"];
const mapContainerStyle = { width: "100%", height: "420px", borderRadius: "10px" };
const defaultOptions = {
  zoomControl: true, mapTypeControl: false, scaleControl: false,
  streetViewControl: false, rotateControl: false, fullscreenControl: true,
  mapTypeId: "roadmap",
};

const DIETARY_TAGS = [
  { key: "Vegetarian", icon: Leaf,   color: "#e67e22", bg: "#fff4ec", border: "#e67e22" },
  { key: "Vegan",      icon: Sprout, color: "#e67e22", bg: "#fff4ec", border: "#e67e22" },
  { key: "Spicy",      icon: Flame,  color: "#1c1c1e", bg: "#f3f4f6", border: "#1c1c1e" },
  { key: "Gluten-Free",icon: Wheat,  color: "#1c1c1e", bg: "#f3f4f6", border: "#1c1c1e" },
];

const MENU_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Dessert"];

const SERVICE_TYPES = [
  { key: "Home Kitchen", icon: Home,            desc: "Cook from home" },
  { key: "Restaurant",   icon: UtensilsCrossed, desc: "Dine-in & takeout" },
  { key: "Cafe",         icon: Coffee,          desc: "Coffee & light bites" },
  { key: "Bakery",       icon: Croissant,       desc: "Baked goods" },
];

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hour   = h % 12 === 0 ? 12 : h % 12;
      const minute = m === 0 ? "00" : "30";
      const period = h < 12 ? "AM" : "PM";
      opts.push(`${hour.toString().padStart(2, "0")}:${minute} ${period}`);
    }
  }
  return opts;
})();

const timeIdx = (t) => TIME_OPTIONS.indexOf(t);

const clampTime = (t, opOpen, opClose) => {
  const i = timeIdx(t), lo = timeIdx(opOpen), hi = timeIdx(opClose);
  if (i < lo) return opOpen;
  if (i > hi) return opClose;
  return t;
};

const clampMenuItemsToHours = (opOpen, opClose, items) =>
  items.map(item => {
    let iOpen = clampTime(item.AvailableHours.open, opOpen, opClose);
    if (timeIdx(iOpen) >= timeIdx(opClose)) iOpen = opOpen;
    let iClose = clampTime(item.AvailableHours.close, opOpen, opClose);
    if (timeIdx(iClose) <= timeIdx(iOpen)) iClose = opClose;
    return { ...item, AvailableHours: { open: iOpen, close: iClose } };
  });

const emptyMenuItem = () => ({
  _id: null, name: "", description: "", price: "", category: "Lunch",
  dietaryTags: [], AvailableHours: { open: "08:00 AM", close: "08:00 PM" },
  isAvailable: true, prepTime: 15,
  imagePreview: null, imageFile: null, imageId: null, imageUploading: false,
  isNew: true,
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; color: #1c1c1e; -webkit-font-smoothing: antialiased; }
  .efs-root { min-height: 100vh; background: #f5f5f5; }

  /* ── Top Bar ── */
  .efs-topbar {
    background: #fff; border-bottom: 1px solid #e8e8e8; position: sticky; top: 0; z-index: 100;
    padding: 0 32px; height: 58px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .efs-topbar-brand { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: #1c1c1e; letter-spacing: -0.2px; }
  .efs-topbar-brand-dot { width: 30px; height: 30px; background: #e67e22; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; }
  .efs-topbar-brand span { color: #e67e22; }
  .efs-topbar-center {
    position: absolute; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 600; color: #888;
  }
  .efs-topbar-center-dot { width: 6px; height: 6px; border-radius: 50%; background: #e67e22; }
  .efs-exit-btn {
    display: flex; align-items: center; gap: 6px;
    background: #f5f5f5; border: 1px solid #e8e8e8;
    color: #444; padding: 7px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .efs-exit-btn:hover { background: #1c1c1e; color: #fff; border-color: #1c1c1e; }

  /* ── Progress Bar ── */
  .efs-progress-wrapper { background: #fff; border-bottom: 1px solid #ebebeb; padding: 0 32px; }
  .efs-progress-steps { max-width: 680px; margin: 0 auto; display: flex; align-items: center; padding: 20px 0; }
  .efs-progress-step { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1; }
  .efs-progress-bubble {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; font-family: 'DM Mono', monospace;
    border: 2.5px solid #e0e0e0; background: #fff; color: #bbb;
    transition: all 0.3s ease; box-shadow: 0 0 0 5px #f5f5f5;
  }
  .efs-progress-step.active .efs-progress-bubble { border-color: #e67e22; background: #e67e22; color: #fff; box-shadow: 0 0 0 5px rgba(230,126,34,0.14); }
  .efs-progress-step.done  .efs-progress-bubble { border-color: #1c1c1e; background: #1c1c1e; color: #fff; box-shadow: 0 0 0 5px rgba(28,28,30,0.07); }
  .efs-progress-label { font-size: 11px; font-weight: 600; color: #bbb; text-transform: uppercase; letter-spacing: 0.7px; white-space: nowrap; transition: color 0.3s; }
  .efs-progress-step.active .efs-progress-label { color: #e67e22; }
  .efs-progress-step.done  .efs-progress-label { color: #1c1c1e; }
  .efs-progress-line { flex: 1; height: 2.5px; background: #e8e8e8; margin-bottom: 28px; border-radius: 2px; overflow: hidden; position: relative; }
  .efs-progress-line-fill { position: absolute; left: 0; top: 0; height: 100%; background: #1c1c1e; transition: width 0.4s ease; border-radius: 2px; }

  /* ── Layout ── */
  .efs-layout { max-width: 740px; margin: 0 auto; padding: 32px 24px 60px; }

  /* ── Loading / Error ── */
  .efs-state-screen {
    max-width: 740px; margin: 80px auto; padding: 0 24px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; text-align: center;
    background: #fff; border-radius: 16px; border: 1px solid #ebebeb;
    padding: 60px 40px; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  }
  .efs-state-screen p { font-size: 14px; color: #888; }
  .efs-state-screen p.err { color: #c0392b; font-weight: 500; }

  /* ── Card ── */
  .efs-card { background: #fff; border-radius: 16px; border: 1px solid #ebebeb; padding: 36px 32px; margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
  .efs-card-title { font-size: 21px; font-weight: 700; color: #1c1c1e; margin-bottom: 4px; letter-spacing: -0.3px; }
  .efs-card-subtitle { font-size: 13px; color: #999; margin-bottom: 28px; }

  /* ── Form Elements ── */
  .efs-field { margin-bottom: 22px; }
  .efs-label { display: block; font-size: 13px; font-weight: 600; color: #1c1c1e; margin-bottom: 8px; }
  .efs-label span { font-weight: 400; color: #bbb; margin-left: 4px; }
  .efs-hint { font-size: 12px; color: #aaa; margin-top: 5px; display: block; }
  .efs-input, .efs-textarea, .efs-select {
    width: 100%; padding: 11px 14px; font-size: 14px; font-family: 'DM Sans', sans-serif;
    border: 1.5px solid #e8e8e8; border-radius: 9px; outline: none;
    color: #1c1c1e; background: #fafafa; transition: border-color 0.15s, box-shadow 0.15s; -webkit-appearance: none;
  }
  .efs-input:focus, .efs-textarea:focus, .efs-select:focus { border-color: #e67e22; background: #fff; box-shadow: 0 0 0 3px rgba(230,126,34,0.12); }
  .efs-textarea { resize: vertical; min-height: 88px; line-height: 1.55; }
  .efs-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; background-color: #fafafa; padding-right: 34px; }
  .efs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .efs-field-footer { display: flex; justify-content: flex-end; margin-top: 5px; }
  .efs-char-count { font-size: 11px; font-family: 'DM Mono', monospace; color: #ddd; }
  .efs-char-count.warn { color: #e67e22; }
  .efs-divider { height: 1px; background: #f0f0f0; margin: 24px 0; }

  /* ── Service Type Grid ── */
  .efs-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .efs-type-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 10px; border-radius: 11px; border: 1.5px solid #e8e8e8; background: #fafafa; cursor: pointer; transition: all 0.15s; text-align: center; }
  .efs-type-card:hover { border-color: #e67e22; background: #fff4ec; }
  .efs-type-card.selected { border-color: #e67e22; background: #fff4ec; box-shadow: 0 0 0 3px rgba(230,126,34,0.14); }
  .efs-type-icon { width: 38px; height: 38px; border-radius: 9px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #888; transition: all 0.15s; }
  .efs-type-card.selected .efs-type-icon { background: #e67e22; color: #fff; }
  .efs-type-name { font-size: 12px; font-weight: 700; color: #1c1c1e; }
  .efs-type-desc { font-size: 11px; color: #aaa; line-height: 1.3; }

  /* ── Time Picker ── */
  .efs-time-row { display: flex; align-items: flex-end; gap: 10px; }
  .efs-time-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .efs-time-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #aaa; }
  .efs-time-divider { display: flex; align-items: center; padding-bottom: 11px; color: #ccc; }

  /* ── Service Options ── */
  .efs-option-row { display: flex; gap: 12px; }
  .efs-option-card { flex: 1; display: flex; align-items: center; gap: 12px; padding: 15px 16px; border-radius: 11px; border: 1.5px solid #e8e8e8; background: #fafafa; cursor: pointer; transition: all 0.15s; }
  .efs-option-card:hover { border-color: #e67e22; }
  .efs-option-card.active { border-color: #e67e22; background: #fff4ec; }
  .efs-option-icon-box { width: 38px; height: 38px; border-radius: 9px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #888; flex-shrink: 0; transition: all 0.15s; }
  .efs-option-card.active .efs-option-icon-box { background: #e67e22; color: #fff; }
  .efs-option-name { flex: 1; font-size: 14px; font-weight: 600; color: #1c1c1e; }
  .efs-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .efs-badge.on  { background: #fff4ec; color: #e67e22; border: 1px solid rgba(230,126,34,0.3); }
  .efs-badge.off { background: #f3f3f3; color: #aaa; border: 1px solid #e8e8e8; }

  /* ── Map ── */
  .efs-map-wrapper { border-radius: 10px; overflow: hidden; border: 1px solid #e8e8e8; margin-bottom: 12px; }
  .efs-map-loading { height: 420px; border-radius: 10px; border: 1px solid #e8e8e8; margin-bottom: 12px; background: #fafafa; display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 14px; font-weight: 500; color: #888; }
  .efs-map-error { height: 420px; border-radius: 10px; border: 1px solid #e8e8e8; margin-bottom: 12px; background: #fafafa; display: flex; align-items: center; justify-content: center; gap: 16px; font-size: 14px; color: #1c1c1e; padding: 24px; }
  .efs-map-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .efs-map-btn { display: flex; align-items: center; gap: 7px; background: #fff; border: 1.5px solid #e8e8e8; color: #1c1c1e; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .efs-map-btn:hover { background: #fff4ec; border-color: #e67e22; color: #e67e22; }

  /* ── Upload Zones ── */
  .efs-upload-zone { border: 1.5px dashed #d8d8d8; border-radius: 10px; padding: 30px 20px; text-align: center; cursor: pointer; background: #fafafa; transition: all 0.15s; }
  .efs-upload-zone:hover { border-color: #e67e22; background: #fff4ec; }
  .efs-upload-icon { width: 44px; height: 44px; border-radius: 10px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #aaa; margin: 0 auto 10px; }
  .efs-upload-text { font-size: 13px; font-weight: 600; color: #1c1c1e; }
  .efs-upload-hint { font-size: 12px; color: #aaa; margin-top: 4px; }
  .efs-photo-preview { position: relative; display: block; }
  .efs-preview-icon { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; border: 3px solid #e8e8e8; }
  .efs-preview-bg { width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; display: block; }
  .efs-photo-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
  .efs-icon-btn { width: 32px; height: 32px; border-radius: 7px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s, transform 0.1s; backdrop-filter: blur(6px); }
  .efs-icon-btn:hover { opacity: 0.85; transform: scale(1.07); }
  .efs-icon-btn.del { background: rgba(28,28,30,0.85); color: #fff; }
  .efs-icon-btn.upd { background: rgba(230,126,34,0.9); color: #fff; }

  /* ── Menu Cards ── */
  .efs-menu-card { background: #fafafa; border: 1px solid #ebebeb; border-radius: 13px; padding: 24px; margin-bottom: 14px; }
  .efs-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f0f0f0; }
  .efs-menu-header-left { display: flex; align-items: center; gap: 10px; }
  .efs-menu-num { width: 28px; height: 28px; border-radius: 7px; background: #e67e22; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; font-family: 'DM Mono', monospace; }
  .efs-menu-title { font-size: 15px; font-weight: 600; color: #1c1c1e; }
  .efs-item-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; letter-spacing: 0.3px; }
  .efs-item-badge.existing { background: #f0f0f0; color: #888; border: 1px solid #e8e8e8; }
  .efs-item-badge.new { background: #fff4ec; color: #e67e22; border: 1px solid rgba(230,126,34,0.3); }
  .efs-remove-btn { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e8e8e8; color: #aaa; padding: 6px 13px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .efs-remove-btn:hover { background: #1c1c1e; color: #fff; border-color: #1c1c1e; }

  .efs-item-img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 9px; display: block; }
  .efs-img-uploading { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 13px; gap: 8px; }

  /* ── Dietary Tags ── */
  .efs-tags-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .efs-tag-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1.5px solid; font-family: inherit; }
  .efs-tag-check { font-size: 11px; font-weight: 700; }

  /* ── Availability Toggle ── */
  .efs-avail { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; border: 1.5px solid; user-select: none; transition: all 0.15s; }
  .efs-avail.on  { background: #fff4ec; color: #e67e22; border-color: rgba(230,126,34,0.3); }
  .efs-avail.off { background: #f5f5f5; color: #aaa; border-color: #e8e8e8; }
  .efs-avail-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .efs-avail.on  .efs-avail-dot { background: #e67e22; }
  .efs-avail.off .efs-avail-dot { background: #ccc; }

  .efs-add-item-btn { width: 100%; padding: 14px; background: #fff; border: 1.5px dashed #d8d8d8; border-radius: 11px; color: #aaa; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; font-family: inherit; margin-bottom: 20px; }
  .efs-add-item-btn:hover { background: #fff4ec; border-color: #e67e22; color: #e67e22; }

  /* ── Delete notice ── */
  .efs-delete-notice { display: flex; align-items: center; gap: 10px; background: #fff4ec; border: 1px solid rgba(230,126,34,0.3); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #c0641a; font-weight: 500; }

  /* ── Review / Summary ── */
  .efs-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 12px; }
  .efs-summary-table { width: 100%; border-collapse: collapse; }
  .efs-summary-table tr { border-bottom: 1px solid #f0f0f0; }
  .efs-summary-table tr:last-child { border-bottom: none; }
  .efs-summary-table td { padding: 10px 0; font-size: 13px; vertical-align: top; }
  .efs-summary-table td:first-child { color: #999; width: 38%; }
  .efs-summary-table td:last-child { font-weight: 600; color: #1c1c1e; text-align: right; }

  /* ── Food Service Preview Card ── */
  .efs-service-card { border-radius: 14px; overflow: hidden; border: 1px solid #e8e8e8; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.07); margin-bottom: 28px; }
  .efs-service-card-cover { width: 100%; height: 155px; object-fit: cover; display: block; }
  .efs-service-card-cover-placeholder { width: 100%; height: 155px; background: linear-gradient(135deg, #1c1c1e 0%, #2e2e2e 100%); display: flex; align-items: center; justify-content: center; }
  .efs-service-card-body { padding: 0 18px 18px; position: relative; }
  .efs-service-card-avatar {
    position: absolute; top: -50px; left: 18px;
    width: 108px; height: 108px; border-radius: 50%;
    border: 4px solid #fff; overflow: hidden; background: #e67e22;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
  }
  .efs-service-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .efs-service-card-info { padding-top: 68px; }
  .efs-service-card-name { font-size: 17px; font-weight: 800; color: #1c1c1e; letter-spacing: -0.3px; margin-bottom: 4px; }
  .efs-service-card-meta { font-size: 12px; color: #999; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .efs-service-card-meta span { display: flex; align-items: center; gap: 5px; }
  .efs-service-card-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .efs-chip { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .efs-chip.orange { background: #fff4ec; color: #e67e22; border: 1px solid rgba(230,126,34,0.25); }
  .efs-chip.dark   { background: #f3f3f3; color: #1c1c1e; border: 1px solid #e8e8e8; }

  /* ── Menu Preview Rows ── */
  .efs-menu-preview-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .efs-menu-preview-row:last-child { border-bottom: none; }
  .efs-menu-preview-thumb { width: 42px; height: 42px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
  .efs-menu-preview-noimg { width: 42px; height: 42px; background: #f3f3f3; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #ccc; flex-shrink: 0; }
  .efs-menu-preview-name { flex: 1; font-weight: 600; color: #1c1c1e; }
  .efs-menu-preview-cat { background: #f3f3f3; color: #888; padding: 3px 9px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .efs-menu-preview-price { font-weight: 700; color: #e67e22; font-family: 'DM Mono', monospace; min-width: 90px; text-align: right; }
  .efs-menu-preview-new { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; background: #fff4ec; color: #e67e22; border: 1px solid rgba(230,126,34,0.3); }

  /* ── Checkboxes ── */
  .efs-check-label { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #444; cursor: pointer; padding: 8px 0; line-height: 1.5; }
  .efs-check-label input[type=checkbox] { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; cursor: pointer; accent-color: #e67e22; }

  /* ── Save Progress ── */
  .efs-save-bar { display: flex; align-items: center; gap: 12px; background: #fff4ec; border: 1px solid rgba(230,126,34,0.3); border-radius: 10px; padding: 13px 16px; margin-bottom: 16px; font-size: 13px; font-weight: 500; color: #c0641a; }
  .efs-spin { animation: efs-spin 0.8s linear infinite; flex-shrink: 0; }
  @keyframes efs-spin { to { transform: rotate(360deg); } }

  /* ── Nav Buttons ── */
  .efs-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f0f0f0; gap: 12px; }
  .efs-btn-secondary { display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid #e8e8e8; color: #444; padding: 10px 22px; border-radius: 9px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .efs-btn-secondary:hover:not(:disabled) { background: #1c1c1e; color: #fff; border-color: #1c1c1e; }
  .efs-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
  .efs-btn-primary { display: flex; align-items: center; gap: 6px; background: #e67e22; color: #fff; border: none; padding: 10px 28px; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; margin-left: auto; font-family: inherit; }
  .efs-btn-primary:hover:not(:disabled) { background: #d35400; transform: translateY(-1px); }
  .efs-btn-primary:disabled { background: #ccc; cursor: not-allowed; }
  .efs-btn-save { display: flex; align-items: center; gap: 6px; background: #1c1c1e; color: #fff; border: none; padding: 10px 28px; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; margin-left: auto; font-family: inherit; }
  .efs-btn-save:hover:not(:disabled) { background: #e67e22; transform: translateY(-1px); }
  .efs-btn-save:disabled { background: #ccc; cursor: not-allowed; }
  .efs-btn-back { display: flex; align-items: center; gap: 6px; background: #e67e22; color: #fff; border: none; padding: 10px 22px; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .efs-type-grid { grid-template-columns: 1fr 1fr; }
    .efs-option-row { flex-direction: column; }
    .efs-row { grid-template-columns: 1fr; }
    .efs-time-row { flex-direction: column; gap: 8px; }
    .efs-time-divider { display: none; }
    .efs-card { padding: 22px 16px; }
    .efs-menu-card { padding: 16px; }
    .efs-progress-wrapper { padding: 0 12px; }
    .efs-topbar-center { display: none; }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
function EditFoodService() {
  const navigate       = useNavigate();
  const { id }         = useParams();
  const updatePhotoRef = useRef(null);
  const menuImageRefs  = useRef([]);

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [isLoading,    setIsLoading]    = useState(true);
  const [loadError,    setLoadError]    = useState(null);
  const [currentStep,  setCurrentStep]  = useState(1);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  // Step 1
  const [kitchenName,       setKitchenName]       = useState("");
  const [description,       setDescription]       = useState("");
  const [serviceType,       setServiceType]       = useState("Home Kitchen");
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable,   setPickupAvailable]   = useState(true);
  const [operatingHours,    setOperatingHours]    = useState({ open: "08:00 AM", close: "10:00 PM" });

  // Step 2
  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [map,                 setMap]                 = useState(null);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  // Step 3
  const [iconPreview,   setIconPreview]   = useState(null);
  const [iconFile,      setIconFile]      = useState(null);
  const [iconImageId,   setIconImageId]   = useState(null);
  const [bgPreview,     setBgPreview]     = useState(null);
  const [bgFile,        setBgFile]        = useState(null);
  const [bgImageId,     setBgImageId]     = useState(null);
  const [updatingField, setUpdatingField] = useState(null);

  // Step 4
  const [menuItems,      setMenuItems]      = useState([emptyMenuItem()]);
  const [deletedItemIds, setDeletedItemIds] = useState([]);

  // Step 5
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  // ── Load existing data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) { setLoadError("No food service ID provided."); setIsLoading(false); return; }

    const fetchData = async () => {
      try {
        const fsRes = await axios.get(`${BASE_URL}/Foodservice/${id}`);
        const fs    = fsRes.data.data;

        setKitchenName(fs.kitchenName || "");
        setDescription(fs.description || "");
        setServiceType(fs.serviceType || "Home Kitchen");
        setDeliveryAvailable(fs.deliveryAvailable ?? true);
        setPickupAvailable(fs.pickupAvailable ?? true);
        if (fs.operatingHours) setOperatingHours(fs.operatingHours);

        if (fs.location?.coordinates) {
          const [lng, lat] = fs.location.coordinates;
          setSelectedLocation({ lat, lng });
          setHasSelectedLocation(true);
        }
        setAddress(fs.address || "");

        const photoUrl = (pid) => `${BASE_URL}/photo/${pid}`;

        if (fs.iconImage)       { setIconPreview(photoUrl(fs.iconImage));       setIconImageId(fs.iconImage); }
        if (fs.BackgroundImage) { setBgPreview(photoUrl(fs.BackgroundImage));   setBgImageId(fs.BackgroundImage); }

        if (fs.menu && fs.menu.length > 0) {
          const items = await Promise.all(
            fs.menu.map(async (itemId) => {
              const miRes = await axios.get(`${BASE_URL}/menuitem/${itemId}`);
              const mi    = miRes.data.data;
              return {
                _id:            mi._id,
                name:           mi.name || "",
                description:    mi.description || "",
                price:          mi.price?.toString() || "",
                category:       mi.category || "Lunch",
                dietaryTags:    mi.dietaryTags || [],
                AvailableHours: mi.AvailableHours || { open: "08:00 AM", close: "08:00 PM" },
                isAvailable:    mi.isAvailable ?? true,
                prepTime:       mi.prepTime || 15,
                imagePreview:   mi.image ? photoUrl(mi.image) : null,
                imageFile:      null,
                imageId:        mi.image || null,
                imageUploading: false,
                isNew:          false,
              };
            })
          );
          const opOpen  = fs.operatingHours?.open  || "08:00 AM";
          const opClose = fs.operatingHours?.close || "10:00 PM";
          setMenuItems(clampMenuItemsToHours(opOpen, opClose, items));
          menuImageRefs.current = items.map(() => null);
        }
        setIsLoading(false);
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load food service data. Please try again.");
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleExit = () => navigate("/Listings");

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!kitchenName.trim())      return alert("Kitchen name cannot be empty.");
      if (kitchenName.length > 60)  return alert("Kitchen name cannot exceed 60 characters.");
      if (!description.trim())      return alert("Description cannot be empty.");
      if (description.length > 300) return alert("Description cannot exceed 300 characters.");
      if (!deliveryAvailable && !pickupAvailable) return alert("Enable at least Delivery or Pickup.");
    }
    if (currentStep === 2) {
      if (!hasSelectedLocation) return alert("Please pin your kitchen location on the map.");
      if (!address.trim())      return alert("Please enter your address.");
    }
    if (currentStep === 3) {
      if (!iconImageId && !iconFile) return alert("Please upload a kitchen icon image.");
      if (!bgImageId && !bgFile)     return alert("Please upload a kitchen background image.");
    }
    if (currentStep === 4) {
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        if (!it.name.trim()) return alert(`Item ${i + 1}: Name required.`);
        const p = Number(it.price);
        if (!it.price || p < 100 || p > 10000) return alert(`Item ${i + 1}: Price must be LKR 100–10,000.`);
        if (Number(it.prepTime) < 1 || Number(it.prepTime) > 120) return alert(`Item ${i + 1}: Prep time 1–120 min.`);
      }
    }
    setCurrentStep(s => s + 1);
  };

  const handlePreviousStep = () => setCurrentStep(s => s - 1);

  // ── Menu helpers ──────────────────────────────────────────────────────────
  const addMenuItem    = () => { setMenuItems(p => [...p, emptyMenuItem()]); menuImageRefs.current.push(null); };
  const removeMenuItem = (i) => {
    if (menuItems.length === 1) return alert("At least one menu item required.");
    const item = menuItems[i];
    if (item._id && !item.isNew) setDeletedItemIds(prev => [...prev, item._id]);
    setMenuItems(p => p.filter((_, idx) => idx !== i));
    menuImageRefs.current.splice(i, 1);
  };
  const updateMenuItem      = (i, f, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],[f]:v}; return u; });
  const updateMenuItemHours = (i, t, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],AvailableHours:{...u[i].AvailableHours,[t]:v}}; return u; });
  const toggleDietaryTag    = (i, tag)  => setMenuItems(p => { const u=[...p], cur=u[i].dietaryTags; u[i]={...u[i],dietaryTags:cur.includes(tag)?cur.filter(t=>t!==tag):[...cur,tag]}; return u; });
  const setItemField        = (i, flds) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],...flds}; return u; });

  // ── Menu item images ──────────────────────────────────────────────────────
  const handleMenuItemImageSelect = (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    setItemField(i, { imagePreview: URL.createObjectURL(file), imageFile: file });
    e.target.value = null;
  };
  const handleMenuItemImageDelete = (i) => setItemField(i, { imagePreview: null, imageFile: null, imageId: null });
  const triggerMenuItemUpdate = (i) => {
    const inp = document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange = e => handleMenuItemImageSelect(i, e); inp.click();
  };

  // ── Kitchen photos ────────────────────────────────────────────────────────
  const handleIconSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIconPreview(URL.createObjectURL(file)); setIconFile(file); e.target.value = null;
  };
  const handleBgSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBgPreview(URL.createObjectURL(file)); setBgFile(file); e.target.value = null;
  };
  const handleUpdateKitchenPhoto = (e) => {
    const file = e.target.files[0]; if (!file || !updatingField) return;
    const preview = URL.createObjectURL(file);
    if (updatingField === "icon") { setIconPreview(preview); setIconFile(file); }
    else                          { setBgPreview(preview);   setBgFile(file); }
    setUpdatingField(null); e.target.value = null;
  };
  const handleDeleteKitchenPhoto = (field) => {
    if (field === "icon") { setIconPreview(null); setIconFile(null); setIconImageId(null); }
    else                  { setBgPreview(null);   setBgFile(null);   setBgImageId(null); }
  };
  const triggerKitchenUpdate = (field) => { setUpdatingField(field); updatePhotoRef.current.click(); };

  // ── Map ───────────────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);
  const onMapClick = event => {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status === "OK" && results[0]) setAddress(results[0].formatted_address);
    });
  };
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status === "OK" && results[0]) setAddress(results[0].formatted_address);
      });
      if (map) { map.panTo(loc); map.setZoom(17); }
    });
  };
  const handleSLIITLocation = () => {
    setSelectedLocation(SLIIT_LOCATION); setHasSelectedLocation(true);
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Save (upload new files, then update) ─────────────────────────────────
  const handleSaveListing = async () => {
    if (!hasSelectedLocation)                          return alert("Please pin your kitchen location.");
    if (!iconPreview || (!iconImageId && !iconFile))   return alert("Please upload a kitchen icon image.");
    if (!bgPreview   || (!bgImageId   && !bgFile))     return alert("Please upload a kitchen background image.");
    if (!isVerified || !isAgreed)                      return alert("Please confirm accuracy and agree to terms.");

    setIsSaving(true);
    try {
      let finalIconId = iconImageId;
      if (iconFile) {
        setSaveProgress("Uploading kitchen icon...");
        const fd = new FormData(); fd.append("photo", iconFile);
        finalIconId = (await axios.post(`${BASE_URL}/Photo`, fd)).data.data._id;
      }
      let finalBgId = bgImageId;
      if (bgFile) {
        setSaveProgress("Uploading cover image...");
        const fd = new FormData(); fd.append("photo", bgFile);
        finalBgId = (await axios.post(`${BASE_URL}/Photo`, fd)).data.data._id;
      }

      setSaveProgress("Updating food service...");
      await axios.put(`${BASE_URL}/Foodservice/${id}`, {
        kitchenName, description, address,
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        operatingHours, serviceType, deliveryAvailable, pickupAvailable,
        iconImage: finalIconId, BackgroundImage: finalBgId,
      });

      if (deletedItemIds.length > 0) {
        setSaveProgress("Removing deleted menu items...");
        await Promise.all(deletedItemIds.map(itemId => axios.delete(`${BASE_URL}/menuitem/${itemId}`)));
      }

      const menuItemIds = [];
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        setSaveProgress(`Saving menu item ${i + 1} of ${menuItems.length}...`);

        let imageId = it.imageId;
        if (it.imageFile) {
          const fd = new FormData(); fd.append("photo", it.imageFile);
          const r = await axios.post(`${BASE_URL}/Photo`, fd);
          if (r.data.success) imageId = r.data.data._id;
        }

        const payload = {
          foodServiceId: id, name: it.name, description: it.description,
          price: Number(it.price), category: it.category,
          dietaryTags: it.dietaryTags, AvailableHours: it.AvailableHours,
          isAvailable: it.isAvailable, prepTime: Number(it.prepTime),
          ...(imageId && { image: imageId }),
        };

        if (it.isNew || !it._id) {
          const miRes = await axios.post(`${BASE_URL}/menuitem`, payload);
          menuItemIds.push(miRes.data.data._id);
        } else {
          await axios.put(`${BASE_URL}/menuitem/${it._id}`, payload);
          menuItemIds.push(it._id);
        }
      }

      setSaveProgress("Linking menu to food service...");
      await axios.put(`${BASE_URL}/Foodservice/${id}`, { menu: menuItemIds });

      alert("Food service updated successfully!");
      navigate("/Listings");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || "Something went wrong."));
    } finally { setIsSaving(false); setSaveProgress(""); }
  };

  const STEPS = [
    { num: 1, label: "Details" }, { num: 2, label: "Location" },
    { num: 3, label: "Photos"  }, { num: 4, label: "Menu"     },
    { num: 5, label: "Review"  },
  ];

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="efs-root">
      <style>{styles}</style>
      <div className="efs-topbar">
        <div className="efs-topbar-brand">
          <div className="efs-topbar-brand-dot"><Store size={15} /></div>
          Food<span>Service</span>
        </div>
        <button className="efs-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>
      <div className="efs-state-screen" style={{ marginTop: 60 }}>
        <Loader2 size={32} className="efs-spin" color="#e67e22" />
        <p>Loading food service data...</p>
      </div>
    </div>
  );

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError) return (
    <div className="efs-root">
      <style>{styles}</style>
      <div className="efs-topbar">
        <div className="efs-topbar-brand">
          <div className="efs-topbar-brand-dot"><Store size={15} /></div>
          Food<span>Service</span>
        </div>
        <button className="efs-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>
      <div className="efs-state-screen" style={{ marginTop: 60 }}>
        <AlertCircle size={32} color="#c0392b" />
        <p className="err">{loadError}</p>
        <button className="efs-btn-back" onClick={handleExit}>Go Back</button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="efs-root">
      <style>{styles}</style>

      {/* Top Bar */}
      <div className="efs-topbar">
        <div className="efs-topbar-brand">
          <div className="efs-topbar-brand-dot"><Store size={15} /></div>
          Food<span>Service</span>
        </div>
        <div className="efs-topbar-center">
          <PenLine size={13} />
          <span>Editing listing</span>
          <div className="efs-topbar-center-dot" />
          <span style={{ color: "#1c1c1e", fontWeight: 700 }}>{kitchenName || "…"}</span>
        </div>
        <button className="efs-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>

      {/* Progress Bar */}
      <div className="efs-progress-wrapper">
        <div className="efs-progress-steps">
          {STEPS.map((step, idx) => {
            const done   = currentStep > step.num;
            const active = currentStep === step.num;
            return (
              <React.Fragment key={step.num}>
                <div className={`efs-progress-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
                  <div className="efs-progress-bubble">
                    {done ? <CheckCircle size={16} /> : step.num}
                  </div>
                  <span className="efs-progress-label">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="efs-progress-line">
                    <div className="efs-progress-line-fill" style={{ width: done ? "100%" : "0%" }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="efs-layout">

        {/* ── STEP 1 ── */}
        {currentStep === 1 && (
          <div className="efs-card">
            <div className="efs-card-title">Kitchen details</div>
            <div className="efs-card-subtitle">Update your basic information</div>

            <div className="efs-field">
              <label className="efs-label">Kitchen name <span>*</span></label>
              <input className="efs-input" type="text" value={kitchenName}
                onChange={e => setKitchenName(e.target.value)}
                placeholder="e.g. Mama's Home Kitchen" maxLength={60} />
              <div className="efs-field-footer">
                <span className={`efs-char-count ${kitchenName.length > 50 ? "warn" : ""}`}>{kitchenName.length}/60</span>
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Description <span>*</span></label>
              <textarea className="efs-textarea" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what makes your kitchen special..." maxLength={300} />
              <div className="efs-field-footer">
                <span className={`efs-char-count ${description.length > 250 ? "warn" : ""}`}>{description.length}/300</span>
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Service type <span>*</span></label>
              <div className="efs-type-grid">
                {SERVICE_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.key} type="button"
                      className={`efs-type-card ${serviceType === t.key ? "selected" : ""}`}
                      onClick={() => setServiceType(t.key)}>
                      <div className="efs-type-icon"><Icon size={18} /></div>
                      <span className="efs-type-name">{t.key}</span>
                      <span className="efs-type-desc">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Operating hours <span>*</span></label>
              <div className="efs-time-row">
                <div className="efs-time-group">
                  <span className="efs-time-label">Opens</span>
                  <select className="efs-select" value={operatingHours.open}
                    onChange={e => {
                      const newOpen = e.target.value;
                      const openIdx = TIME_OPTIONS.indexOf(newOpen);
                      const closeIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                      const newClose = closeIdx > openIdx ? operatingHours.close : TIME_OPTIONS[openIdx + 1] || TIME_OPTIONS[openIdx];
                      setOperatingHours({ open: newOpen, close: newClose });
                      setMenuItems(prev => clampMenuItemsToHours(newOpen, newClose, prev));
                    }}>
                    {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="efs-time-divider"><ChevronRight size={16} /></div>
                <div className="efs-time-group">
                  <span className="efs-time-label">Closes</span>
                  <select className="efs-select" value={operatingHours.close}
                    onChange={e => {
                      const newClose = e.target.value;
                      setOperatingHours(p => ({ ...p, close: newClose }));
                      setMenuItems(prev => clampMenuItemsToHours(operatingHours.open, newClose, prev));
                    }}>
                    {TIME_OPTIONS.filter(t => TIME_OPTIONS.indexOf(t) > TIME_OPTIONS.indexOf(operatingHours.open))
                      .map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="efs-field">
              <label className="efs-label">Service options <span>*</span></label>
              <div className="efs-option-row">
                <button type="button" className={`efs-option-card ${deliveryAvailable ? "active" : ""}`}
                  onClick={() => setDeliveryAvailable(p => !p)}>
                  <div className="efs-option-icon-box"><Truck size={18} /></div>
                  <span className="efs-option-name">Delivery</span>
                  <span className={`efs-badge ${deliveryAvailable ? "on" : "off"}`}>{deliveryAvailable ? "On" : "Off"}</span>
                </button>
                <button type="button" className={`efs-option-card ${pickupAvailable ? "active" : ""}`}
                  onClick={() => setPickupAvailable(p => !p)}>
                  <div className="efs-option-icon-box"><ShoppingBag size={18} /></div>
                  <span className="efs-option-name">Pickup</span>
                  <span className={`efs-badge ${pickupAvailable ? "on" : "off"}`}>{pickupAvailable ? "On" : "Off"}</span>
                </button>
              </div>
            </div>

            <div className="efs-nav">
              <div />
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {currentStep === 2 && (
          <div className="efs-card">
            <div className="efs-card-title">Kitchen location</div>
            <div className="efs-card-subtitle">Click the map to update your kitchen's position</div>

            {mapLoadError ? (
              <div className="efs-map-error">
                <MapPin size={22} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Map failed to load</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>Check your internet connection and reload.</div>
                </div>
              </div>
            ) : !mapIsLoaded ? (
              <div className="efs-map-loading">
                <Loader2 size={22} className="efs-spin" />
                <span>Loading map...</span>
              </div>
            ) : (
              <div className="efs-map-wrapper">
                <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                  zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                  <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                </GoogleMap>
              </div>
            )}

            <div className="efs-map-actions">
              <button className="efs-map-btn" onClick={handleSLIITLocation}><MapPin size={14} /> SLIIT University</button>
              <button className="efs-map-btn" onClick={handleUseCurrentLocation}><Crosshair size={14} /> Use my location</button>
            </div>

            <div className="efs-field">
              <label className="efs-label">Address <span>*</span></label>
              <textarea className="efs-textarea" rows="2" value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Full address..." />
            </div>

            <div className="efs-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {currentStep === 3 && (
          <div className="efs-card">
            <div className="efs-card-title">Kitchen photos</div>
            <div className="efs-card-subtitle">New photos are uploaded when you save changes</div>

            <input type="file" accept="image/*" ref={updatePhotoRef} style={{ display: "none" }} onChange={handleUpdateKitchenPhoto} />

            <div className="efs-field">
              <label className="efs-label">Icon image <span>*</span></label>
              <span className="efs-hint">Displayed as a circle — your kitchen's profile picture</span>
              {!iconPreview ? (
                <div className="efs-upload-zone" onClick={() => document.getElementById("efs-icon-upload").click()}>
                  <input type="file" accept="image/*" id="efs-icon-upload" style={{ display: "none" }} onChange={handleIconSelect} />
                  <div className="efs-upload-icon"><Upload size={18} /></div>
                  <div className="efs-upload-text">Click to upload icon</div>
                  <div className="efs-upload-hint">PNG, JPG up to 5MB</div>
                </div>
              ) : (
                <div className="efs-photo-preview">
                  <img src={iconPreview} alt="icon" className="efs-preview-icon" />
                  <div className="efs-photo-actions">
                    <button type="button" className="efs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("icon")}><Trash2 size={13} /></button>
                    <button type="button" className="efs-icon-btn upd" onClick={() => triggerKitchenUpdate("icon")}><RefreshCw size={13} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="efs-divider" />

            <div className="efs-field">
              <label className="efs-label">Cover / Background image <span>*</span></label>
              <span className="efs-hint">Wide banner showcasing your kitchen or signature dish</span>
              {!bgPreview ? (
                <div className="efs-upload-zone" onClick={() => document.getElementById("efs-bg-upload").click()}>
                  <input type="file" accept="image/*" id="efs-bg-upload" style={{ display: "none" }} onChange={handleBgSelect} />
                  <div className="efs-upload-icon"><ImageIcon size={18} /></div>
                  <div className="efs-upload-text">Click to upload cover image</div>
                  <div className="efs-upload-hint">PNG, JPG — recommended 1200×400</div>
                </div>
              ) : (
                <div className="efs-photo-preview">
                  <img src={bgPreview} alt="bg" className="efs-preview-bg" />
                  <div className="efs-photo-actions">
                    <button type="button" className="efs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("bg")}><Trash2 size={13} /></button>
                    <button type="button" className="efs-icon-btn upd" onClick={() => triggerKitchenUpdate("bg")}><RefreshCw size={13} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="efs-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 4 ── */}
        {currentStep === 4 && (
          <div>
            <div className="efs-card" style={{ marginBottom: 16 }}>
              <div className="efs-card-title">Edit menu</div>
              <div className="efs-card-subtitle">Update, remove, or add new items</div>
            </div>

            {menuItems.map((item, index) => (
              <div key={index} className="efs-menu-card">
                <div className="efs-menu-header">
                  <div className="efs-menu-header-left">
                    <div className="efs-menu-num">{String(index + 1).padStart(2, "0")}</div>
                    <span className="efs-menu-title">{item.name || "Untitled item"}</span>
                    <span className={`efs-item-badge ${item.isNew ? "new" : "existing"}`}>
                      {item.isNew ? "New" : "Existing"}
                    </span>
                  </div>
                  <button type="button" className="efs-remove-btn" onClick={() => removeMenuItem(index)}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Item photo</label>
                  {!item.imagePreview ? (
                    <div className="efs-upload-zone" style={{ padding: "18px 20px" }}
                      onClick={() => menuImageRefs.current[index]?.click()}>
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        ref={el => (menuImageRefs.current[index] = el)}
                        onChange={e => handleMenuItemImageSelect(index, e)} />
                      <div className="efs-upload-icon" style={{ width: 34, height: 34, marginBottom: 6 }}><Upload size={15} /></div>
                      <div className="efs-upload-text" style={{ fontSize: 13 }}>Upload item photo</div>
                    </div>
                  ) : (
                    <div className="efs-photo-preview">
                      <img src={item.imagePreview} alt={`item-${index}`} className="efs-item-img" />
                      <div className="efs-photo-actions">
                        <button type="button" className="efs-icon-btn del" onClick={() => handleMenuItemImageDelete(index)}><Trash2 size={13} /></button>
                        <button type="button" className="efs-icon-btn upd" onClick={() => triggerMenuItemUpdate(index)}><RefreshCw size={13} /></button>
                      </div>
                      {item.imageUploading && <div className="efs-img-uploading"><Loader2 size={16} className="efs-spin" /> Uploading...</div>}
                    </div>
                  )}
                </div>

                <div className="efs-row">
                  <div className="efs-field">
                    <label className="efs-label">Item name <span>*</span></label>
                    <input className="efs-input" type="text" value={item.name}
                      onChange={e => updateMenuItem(index, "name", e.target.value)}
                      placeholder="e.g. Grilled Chicken Rice" />
                  </div>
                  <div className="efs-field">
                    <label className="efs-label">Category <span>*</span></label>
                    <select className="efs-select" value={item.category}
                      onChange={e => updateMenuItem(index, "category", e.target.value)}>
                      {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Description</label>
                  <input className="efs-input" type="text" value={item.description}
                    onChange={e => updateMenuItem(index, "description", e.target.value)}
                    placeholder="Brief description of the dish..." />
                </div>

                <div className="efs-row">
                  <div className="efs-field">
                    <label className="efs-label">Price (LKR) <span>* 100–10,000</span></label>
                    <input className="efs-input" type="number" value={item.price}
                      onChange={e => updateMenuItem(index, "price", e.target.value)}
                      onBlur={e => {
                        const v = Number(e.target.value);
                        if (e.target.value === "") return;
                        if (v < 100)   updateMenuItem(index, "price", "100");
                        else if (v > 10000) updateMenuItem(index, "price", "10000");
                      }}
                      min="100" max="10000" placeholder="350" />
                  </div>
                  <div className="efs-field">
                    <label className="efs-label">Prep time <span>* 1–120 mins</span></label>
                    <input className="efs-input" type="number" value={item.prepTime}
                      onChange={e => updateMenuItem(index, "prepTime", e.target.value)}
                      onBlur={e => {
                        const v = Number(e.target.value);
                        if (e.target.value === "") return;
                        if (v < 1)   updateMenuItem(index, "prepTime", "1");
                        else if (v > 120) updateMenuItem(index, "prepTime", "120");
                      }}
                      min="1" max="120" />
                  </div>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Available hours</label>
                  <div className="efs-time-row">
                    <div className="efs-time-group">
                      <span className="efs-time-label">From</span>
                      <select className="efs-select" value={item.AvailableHours.open}
                        onChange={e => {
                          const newOpen = e.target.value;
                          const openIdx = TIME_OPTIONS.indexOf(newOpen);
                          const closeIdx = TIME_OPTIONS.indexOf(item.AvailableHours.close);
                          const opCloseIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                          updateMenuItemHours(index, "open", newOpen);
                          if (closeIdx <= openIdx) updateMenuItemHours(index, "close", TIME_OPTIONS[Math.min(openIdx + 1, opCloseIdx)]);
                        }}>
                        {TIME_OPTIONS.filter(t => { const i = TIME_OPTIONS.indexOf(t); return i >= timeIdx(operatingHours.open) && i < timeIdx(operatingHours.close); })
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="efs-time-divider"><ChevronRight size={16} /></div>
                    <div className="efs-time-group">
                      <span className="efs-time-label">Until</span>
                      <select className="efs-select" value={item.AvailableHours.close}
                        onChange={e => updateMenuItemHours(index, "close", e.target.value)}>
                        {TIME_OPTIONS.filter(t => { const i = TIME_OPTIONS.indexOf(t); return i > timeIdx(item.AvailableHours.open) && i <= timeIdx(operatingHours.close); })
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="efs-field">
                  <label className="efs-label">Dietary tags</label>
                  <div className="efs-tags-row">
                    {DIETARY_TAGS.map(tag => {
                      const active = item.dietaryTags.includes(tag.key);
                      const Icon = tag.icon;
                      return (
                        <button key={tag.key} type="button" className="efs-tag-btn"
                          style={{ background: active ? tag.bg : "#f5f5f5", color: active ? tag.color : "#aaa", borderColor: active ? tag.border : "#e8e8e8", fontWeight: active ? 600 : 400 }}
                          onClick={() => toggleDietaryTag(index, tag.key)}>
                          <Icon size={13} />
                          <span>{tag.key}</span>
                          {active && <span className="efs-tag-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="efs-field">
                  <div className={`efs-avail ${item.isAvailable ? "on" : "off"}`}
                    onClick={() => updateMenuItem(index, "isAvailable", !item.isAvailable)}>
                    <div className="efs-avail-dot" />
                    <span>{item.isAvailable ? "Currently available" : "Not available"}</span>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" className="efs-add-item-btn" onClick={addMenuItem}>
              <Plus size={16} /> Add another menu item
            </button>

            <div className="efs-nav" style={{ background: "#fff", borderRadius: 14, padding: "16px 24px", border: "1px solid #ebebeb" }}>
              <button className="efs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
              <button className="efs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ── STEP 5 ── */}
        {currentStep === 5 && (
          <div className="efs-card">
            <div className="efs-card-title">Review & save</div>
            <div className="efs-card-subtitle">Confirm everything looks right before saving changes</div>

            {/* Listing preview card */}
            <div className="efs-section-label" style={{ marginBottom: 14 }}>Listing preview</div>
            <div className="efs-service-card">
              {bgPreview
                ? <img src={bgPreview} alt="cover" className="efs-service-card-cover" />
                : <div className="efs-service-card-cover-placeholder"><ImageIcon size={28} color="#555" /></div>
              }
              <div className="efs-service-card-body">
                <div className="efs-service-card-avatar">
                  {iconPreview
                    ? <img src={iconPreview} alt="icon" />
                    : <Store size={40} color="#fff" />
                  }
                </div>
                <div className="efs-service-card-info">
                  <div className="efs-service-card-name">{kitchenName || "Your Kitchen Name"}</div>
                  <div className="efs-service-card-meta">
                    <span><Clock size={12} /> {operatingHours.open} – {operatingHours.close}</span>
                    <span><MapPin size={12} /> {address ? address.split(",")[0] : "Location not set"}</span>
                  </div>
                  <div className="efs-service-card-chips">
                    <span className="efs-chip orange">{serviceType}</span>
                    {deliveryAvailable && <span className="efs-chip dark">Delivery</span>}
                    {pickupAvailable   && <span className="efs-chip dark">Pickup</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="efs-divider" />

            {/* Kitchen details */}
            <div style={{ marginBottom: 24 }}>
              <div className="efs-section-label">Kitchen details</div>
              <table className="efs-summary-table">
                <tbody>
                  {[
                    ["Name",     kitchenName],
                    ["Type",     serviceType],
                    ["Hours",    `${operatingHours.open} – ${operatingHours.close}`],
                    ["Delivery", deliveryAvailable ? "Yes" : "No"],
                    ["Pickup",   pickupAvailable   ? "Yes" : "No"],
                    ["Address",  address],
                  ].map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="efs-divider" />

            {/* Menu preview */}
            <div style={{ marginBottom: 24 }}>
              <div className="efs-section-label">Menu — {menuItems.length} item(s){deletedItemIds.length > 0 ? `, ${deletedItemIds.length} to be removed` : ""}</div>
              {deletedItemIds.length > 0 && (
                <div className="efs-delete-notice">
                  <Trash2 size={14} /> {deletedItemIds.length} item(s) will be permanently deleted on save.
                </div>
              )}
              {menuItems.map((item, i) => (
                <div key={i} className="efs-menu-preview-row">
                  {item.imagePreview
                    ? <img src={item.imagePreview} alt={item.name} className="efs-menu-preview-thumb" />
                    : <div className="efs-menu-preview-noimg"><UtensilsCrossed size={16} /></div>}
                  <span className="efs-menu-preview-name">{item.name || `Item ${i + 1}`}</span>
                  <span className="efs-menu-preview-cat">{item.category}</span>
                  {item.isNew && <span className="efs-menu-preview-new">New</span>}
                  <span className="efs-menu-preview-price">LKR {Number(item.price || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="efs-divider" />

            {/* Confirmation */}
            <div style={{ marginBottom: 20 }}>
              <div className="efs-section-label">Confirmation</div>
              <label className="efs-check-label">
                <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                I confirm all updated information is accurate and up to date.
              </label>
              <label className="efs-check-label" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                I agree to the Terms of Service. New images will be uploaded on save.
              </label>
            </div>

            {isSaving && saveProgress && (
              <div className="efs-save-bar">
                <Loader2 size={16} className="efs-spin" />
                <span>{saveProgress}</span>
              </div>
            )}

            <div className="efs-nav">
              <button className="efs-btn-secondary" onClick={handlePreviousStep} disabled={isSaving}>
                <ChevronLeft size={15} /> Previous
              </button>
              <button className="efs-btn-save" onClick={handleSaveListing} disabled={isSaving || !isVerified || !isAgreed}>
                {isSaving
                  ? <><Loader2 size={15} className="efs-spin" /> Saving...</>
                  : <><CheckCircle size={15} /> Save changes</>
                }
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EditFoodService;
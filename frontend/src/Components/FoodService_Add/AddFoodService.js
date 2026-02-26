import React, { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import {
  Trash2, RefreshCw, X, ChevronRight, ChevronLeft,
  Home, UtensilsCrossed, Coffee, Croissant, Truck, ShoppingBag,
  MapPin, Crosshair, Upload, Leaf, Flame, Wheat, Sprout,
  CheckCircle, Loader2, Image as ImageIcon, Plus, Store, Clock,
} from "lucide-react";
import axios from "axios";

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

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
};

const emptyMenuItem = () => ({
  name: "", description: "", price: "", category: "Lunch",
  dietaryTags: [],
  AvailableHours: { open: "08:00 AM", close: "08:00 PM" },
  isAvailable: true, prepTime: 15,
  imagePreview: null, imageFile: null, imageId: null, imageUploading: false,
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #f5f5f5; color: #1c1c1e; -webkit-font-smoothing: antialiased; }
  .afs-root { min-height: 100vh; background: #f5f5f5; }

  /* ── Top Bar (white - form) ── */
  .afs-topbar {
    background: #fff; border-bottom: 1px solid #e8e8e8; position: sticky; top: 0; z-index: 100;
    padding: 0 32px; height: 58px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .afs-topbar-brand { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700; color: #1c1c1e; letter-spacing: -0.2px; }
  .afs-topbar-brand-dot { width: 30px; height: 30px; background: #e67e22; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #fff; }
  .afs-topbar-brand span { color: #e67e22; }
  .afs-exit-btn {
    display: flex; align-items: center; gap: 6px;
    background: #f5f5f5; border: 1px solid #e8e8e8;
    color: #444; padding: 7px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .afs-exit-btn:hover { background: #1c1c1e; color: #fff; border-color: #1c1c1e; }

  /* ── Top Bar (black - landing) ── */
  .afs-topbar.dark { background: #1c1c1e; border-bottom: none; }
  .afs-topbar.dark .afs-topbar-brand { color: #fff; }
  .afs-topbar.dark .afs-exit-btn {
    background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.75);
  }
  .afs-topbar.dark .afs-exit-btn:hover { background: rgba(255,255,255,0.18); color: #fff; border-color: rgba(255,255,255,0.3); }

  /* ── Polished Horizontal Progress Bar ── */
  .afs-progress-wrapper { background: #fff; border-bottom: 1px solid #ebebeb; padding: 0 32px; }
  .afs-progress-steps {
    max-width: 680px; margin: 0 auto;
    display: flex; align-items: center;
    padding: 20px 0;
  }
  .afs-progress-step { display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 1; }
  .afs-progress-bubble {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; font-family: 'DM Mono', monospace;
    border: 2.5px solid #e0e0e0; background: #fff; color: #bbb;
    transition: all 0.3s ease;
    box-shadow: 0 0 0 5px #f5f5f5;
  }
  .afs-progress-step.active .afs-progress-bubble {
    border-color: #e67e22; background: #e67e22; color: #fff;
    box-shadow: 0 0 0 5px rgba(230,126,34,0.14);
  }
  .afs-progress-step.done .afs-progress-bubble {
    border-color: #1c1c1e; background: #1c1c1e; color: #fff;
    box-shadow: 0 0 0 5px rgba(28,28,30,0.07);
  }
  .afs-progress-label { font-size: 11px; font-weight: 600; color: #bbb; text-transform: uppercase; letter-spacing: 0.7px; white-space: nowrap; transition: color 0.3s; }
  .afs-progress-step.active .afs-progress-label { color: #e67e22; }
  .afs-progress-step.done  .afs-progress-label { color: #1c1c1e; }
  .afs-progress-line {
    flex: 1; height: 2.5px; background: #e8e8e8; margin-bottom: 28px;
    border-radius: 2px; overflow: hidden; position: relative;
  }
  .afs-progress-line-fill {
    position: absolute; left: 0; top: 0; height: 100%;
    background: #1c1c1e; transition: width 0.4s ease;
    border-radius: 2px;
  }

  /* ── Layout ── */
  .afs-layout { max-width: 740px; margin: 0 auto; padding: 32px 24px 60px; }

  /* ── Card ── */
  .afs-card { background: #fff; border-radius: 16px; border: 1px solid #ebebeb; padding: 36px 32px; margin-bottom: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
  .afs-card-title { font-size: 21px; font-weight: 700; color: #1c1c1e; margin-bottom: 4px; letter-spacing: -0.3px; }
  .afs-card-subtitle { font-size: 13px; color: #999; margin-bottom: 28px; }

  /* ── Form Elements ── */
  .afs-field { margin-bottom: 22px; }
  .afs-label { display: block; font-size: 13px; font-weight: 600; color: #1c1c1e; margin-bottom: 8px; }
  .afs-label span { font-weight: 400; color: #bbb; margin-left: 4px; }
  .afs-hint { font-size: 12px; color: #aaa; margin-top: 5px; display: block; }
  .afs-input, .afs-textarea, .afs-select {
    width: 100%; padding: 11px 14px; font-size: 14px; font-family: 'DM Sans', sans-serif;
    border: 1.5px solid #e8e8e8; border-radius: 9px; outline: none;
    color: #1c1c1e; background: #fafafa; transition: border-color 0.15s, box-shadow 0.15s; -webkit-appearance: none;
  }
  .afs-input:focus, .afs-textarea:focus, .afs-select:focus {
    border-color: #e67e22; background: #fff; box-shadow: 0 0 0 3px rgba(230,126,34,0.12);
  }
  .afs-textarea { resize: vertical; min-height: 88px; line-height: 1.55; }
  .afs-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; background-color: #fafafa; padding-right: 34px; }
  .afs-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .afs-field-footer { display: flex; justify-content: flex-end; margin-top: 5px; }
  .afs-char-count { font-size: 11px; font-family: 'DM Mono', monospace; color: #ddd; }
  .afs-char-count.warn { color: #e67e22; }
  .afs-divider { height: 1px; background: #f0f0f0; margin: 24px 0; }

  /* ── Service Type Grid ── */
  .afs-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .afs-type-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 10px; border-radius: 11px; border: 1.5px solid #e8e8e8; background: #fafafa; cursor: pointer; transition: all 0.15s; text-align: center; }
  .afs-type-card:hover { border-color: #e67e22; background: #fff4ec; }
  .afs-type-card.selected { border-color: #e67e22; background: #fff4ec; box-shadow: 0 0 0 3px rgba(230,126,34,0.14); }
  .afs-type-icon { width: 38px; height: 38px; border-radius: 9px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #888; transition: all 0.15s; }
  .afs-type-card.selected .afs-type-icon { background: #e67e22; color: #fff; }
  .afs-type-name { font-size: 12px; font-weight: 700; color: #1c1c1e; }
  .afs-type-desc { font-size: 11px; color: #aaa; line-height: 1.3; }

  /* ── Time Picker ── */
  .afs-time-row { display: flex; align-items: flex-end; gap: 10px; }
  .afs-time-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .afs-time-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #aaa; }
  .afs-time-divider { display: flex; align-items: center; padding-bottom: 11px; color: #ccc; }

  /* ── Service Options ── */
  .afs-option-row { display: flex; gap: 12px; }
  .afs-option-card { flex: 1; display: flex; align-items: center; gap: 12px; padding: 15px 16px; border-radius: 11px; border: 1.5px solid #e8e8e8; background: #fafafa; cursor: pointer; transition: all 0.15s; }
  .afs-option-card:hover { border-color: #e67e22; }
  .afs-option-card.active { border-color: #e67e22; background: #fff4ec; }
  .afs-option-icon-box { width: 38px; height: 38px; border-radius: 9px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #888; flex-shrink: 0; transition: all 0.15s; }
  .afs-option-card.active .afs-option-icon-box { background: #e67e22; color: #fff; }
  .afs-option-name { flex: 1; font-size: 14px; font-weight: 600; color: #1c1c1e; }
  .afs-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .afs-badge.on  { background: #fff4ec; color: #e67e22; border: 1px solid rgba(230,126,34,0.3); }
  .afs-badge.off { background: #f3f3f3; color: #aaa; border: 1px solid #e8e8e8; }

  /* ── Map ── */
  .afs-map-wrapper { border-radius: 10px; overflow: hidden; border: 1px solid #e8e8e8; margin-bottom: 12px; }
  .afs-map-loading {
    height: 420px; border-radius: 10px; border: 1px solid #e8e8e8; margin-bottom: 12px;
    background: #fafafa; display: flex; align-items: center; justify-content: center;
    gap: 12px; font-size: 14px; font-weight: 500; color: #888;
  }
  .afs-map-error {
    height: 420px; border-radius: 10px; border: 1px solid #e8e8e8; margin-bottom: 12px;
    background: #fafafa; display: flex; align-items: center; justify-content: center;
    gap: 16px; font-size: 14px; color: #1c1c1e; padding: 24px;
  }
  .afs-map-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .afs-map-btn { display: flex; align-items: center; gap: 7px; background: #fff; border: 1.5px solid #e8e8e8; color: #1c1c1e; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .afs-map-btn:hover { background: #fff4ec; border-color: #e67e22; color: #e67e22; }

  /* ── Upload Zones ── */
  .afs-upload-zone { border: 1.5px dashed #d8d8d8; border-radius: 10px; padding: 30px 20px; text-align: center; cursor: pointer; background: #fafafa; transition: all 0.15s; }
  .afs-upload-zone:hover { border-color: #e67e22; background: #fff4ec; }
  .afs-upload-icon { width: 44px; height: 44px; border-radius: 10px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #aaa; margin: 0 auto 10px; }
  .afs-upload-text { font-size: 13px; font-weight: 600; color: #1c1c1e; }
  .afs-upload-hint { font-size: 12px; color: #aaa; margin-top: 4px; }
  .afs-photo-preview { position: relative; display: block; }
  .afs-preview-icon { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; border: 3px solid #e8e8e8; }
  .afs-preview-bg { width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; display: block; }
  .afs-photo-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
  .afs-icon-btn { width: 32px; height: 32px; border-radius: 7px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.15s, transform 0.1s; backdrop-filter: blur(6px); }
  .afs-icon-btn:hover { opacity: 0.85; transform: scale(1.07); }
  .afs-icon-btn.del { background: rgba(28,28,30,0.85); color: #fff; }
  .afs-icon-btn.upd { background: rgba(230,126,34,0.9); color: #fff; }

  /* ── Menu Cards ── */
  .afs-menu-card { background: #fafafa; border: 1px solid #ebebeb; border-radius: 13px; padding: 24px; margin-bottom: 14px; }
  .afs-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #f0f0f0; }
  .afs-menu-header-left { display: flex; align-items: center; gap: 10px; }
  .afs-menu-num { width: 28px; height: 28px; border-radius: 7px; background: #e67e22; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; font-family: 'DM Mono', monospace; }
  .afs-menu-title { font-size: 15px; font-weight: 600; color: #1c1c1e; }
  .afs-remove-btn { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e8e8e8; color: #aaa; padding: 6px 13px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .afs-remove-btn:hover { background: #1c1c1e; color: #fff; border-color: #1c1c1e; }

  /* ── Dietary Tags ── */
  .afs-tags-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .afs-tag-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1.5px solid; font-family: inherit; }
  .afs-tag-check { font-size: 11px; font-weight: 700; }

  /* ── Availability Toggle ── */
  .afs-avail { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 9px; cursor: pointer; font-size: 13px; font-weight: 600; border: 1.5px solid; user-select: none; transition: all 0.15s; }
  .afs-avail.on  { background: #fff4ec; color: #e67e22; border-color: rgba(230,126,34,0.3); }
  .afs-avail.off { background: #f5f5f5; color: #aaa; border-color: #e8e8e8; }
  .afs-avail-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .afs-avail.on  .afs-avail-dot { background: #e67e22; }
  .afs-avail.off .afs-avail-dot { background: #ccc; }

  .afs-item-img { width: 100%; max-height: 160px; object-fit: cover; border-radius: 9px; display: block; }
  .afs-img-uploading { position: absolute; inset: 0; background: rgba(0,0,0,0.4); border-radius: 9px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 13px; gap: 8px; }

  .afs-add-item-btn { width: 100%; padding: 14px; background: #fff; border: 1.5px dashed #d8d8d8; border-radius: 11px; color: #aaa; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.15s; font-family: inherit; margin-bottom: 20px; }
  .afs-add-item-btn:hover { background: #fff4ec; border-color: #e67e22; color: #e67e22; }

  /* ── Review / Summary ── */
  .afs-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 12px; }
  .afs-summary-table { width: 100%; border-collapse: collapse; }
  .afs-summary-table tr { border-bottom: 1px solid #f0f0f0; }
  .afs-summary-table tr:last-child { border-bottom: none; }
  .afs-summary-table td { padding: 10px 0; font-size: 13px; vertical-align: top; }
  .afs-summary-table td:first-child { color: #999; width: 38%; }
  .afs-summary-table td:last-child { font-weight: 600; color: #1c1c1e; text-align: right; }

  /* ── Food Service Preview Card (review page) ── */
  .afs-service-card { border-radius: 14px; overflow: hidden; border: 1px solid #e8e8e8; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.07); margin-bottom: 28px; }
  .afs-service-card-cover { width: 100%; height: 155px; object-fit: cover; display: block; }
  .afs-service-card-cover-placeholder { width: 100%; height: 155px; background: linear-gradient(135deg, #1c1c1e 0%, #2e2e2e 100%); display: flex; align-items: center; justify-content: center; }
  .afs-service-card-body { padding: 0 18px 18px; position: relative; }
  .afs-service-card-avatar {
    position: absolute; top: -50px; left: 18px;
    width: 108px; height: 108px; border-radius: 50%;
    border: 4px solid #fff; overflow: hidden;
    background: #e67e22;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
  }
  .afs-service-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .afs-service-card-info { padding-top: 68px; }
  .afs-service-card-name { font-size: 17px; font-weight: 800; color: #1c1c1e; letter-spacing: -0.3px; margin-bottom: 4px; }
  .afs-service-card-meta { font-size: 12px; color: #999; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  .afs-service-card-meta span { display: flex; align-items: center; gap: 5px; }
  .afs-service-card-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .afs-chip { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }
  .afs-chip.orange { background: #fff4ec; color: #e67e22; border: 1px solid rgba(230,126,34,0.25); }
  .afs-chip.dark   { background: #f3f3f3; color: #1c1c1e; border: 1px solid #e8e8e8; }

  /* ── Menu Preview Rows ── */
  .afs-menu-preview-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .afs-menu-preview-row:last-child { border-bottom: none; }
  .afs-menu-preview-thumb { width: 42px; height: 42px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
  .afs-menu-preview-noimg { width: 42px; height: 42px; background: #f3f3f3; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #ccc; flex-shrink: 0; }
  .afs-menu-preview-name { flex: 1; font-weight: 600; color: #1c1c1e; }
  .afs-menu-preview-cat { background: #f3f3f3; color: #888; padding: 3px 9px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .afs-menu-preview-price { font-weight: 700; color: #e67e22; font-family: 'DM Mono', monospace; min-width: 90px; text-align: right; }

  /* ── Checkboxes ── */
  .afs-check-label { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #444; cursor: pointer; padding: 8px 0; line-height: 1.5; }
  .afs-check-label input[type=checkbox] { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; cursor: pointer; accent-color: #e67e22; }

  /* ── Save Progress ── */
  .afs-save-bar { display: flex; align-items: center; gap: 12px; background: #fff4ec; border: 1px solid rgba(230,126,34,0.3); border-radius: 10px; padding: 13px 16px; margin-bottom: 16px; font-size: 13px; font-weight: 500; color: #c0641a; }
  .afs-spin { animation: afs-spin 0.8s linear infinite; flex-shrink: 0; }
  @keyframes afs-spin { to { transform: rotate(360deg); } }

  /* ── Navigation Buttons ── */
  .afs-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding-top: 20px; border-top: 1px solid #f0f0f0; gap: 12px; }
  .afs-btn-secondary { display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid #e8e8e8; color: #444; padding: 10px 22px; border-radius: 9px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .afs-btn-secondary:hover:not(:disabled) { background: #1c1c1e; color: #fff; border-color: #1c1c1e; }
  .afs-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
  .afs-btn-primary { display: flex; align-items: center; gap: 6px; background: #e67e22; color: #fff; border: none; padding: 10px 28px; border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; margin-left: auto; font-family: inherit; }
  .afs-btn-primary:hover:not(:disabled) { background: #d35400; transform: translateY(-1px); }
  .afs-btn-primary:disabled { background: #ccc; cursor: not-allowed; }
  .afs-btn-save { display: flex; align-items: center; gap: 6px; background: #1c1c1e; color: #fff; border: none; padding: 10px 28px; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; margin-left: auto; font-family: inherit; }
  .afs-btn-save:hover:not(:disabled) { background: #e67e22; transform: translateY(-1px); }
  .afs-btn-save:disabled { background: #ccc; cursor: not-allowed; }

  /* ════════════════════════════════════════
     LANDING PAGE
  ════════════════════════════════════════ */
  .afs-landing { min-height: calc(100vh - 58px); display: flex; flex-direction: column; }

  /* Hero */
  .afs-hero { position: relative; height: 500px; overflow: hidden; }
  .afs-hero-bg {
    position: absolute; inset: 0;
    background-image: url('/images/foodbg1.png');
    background-size: cover; background-position: center;
    transform: scale(1.04);
  }
  .afs-hero-overlay { position: absolute; inset: 0; background: linear-gradient(160deg, rgba(28, 28, 30, 0.23) 0%, rgba(28, 28, 30, 0.5) 100%); }
  .afs-hero-content {
    position: relative; z-index: 2; height: 100%;
    max-width: 740px; margin: 0 auto; padding: 0 32px;
    display: flex; flex-direction: column; justify-content: center;
    padding-top: 30px;
  }
  .afs-hero-title { font-size: 52px; font-weight: 800; color: #fff; line-height: 1.08; letter-spacing: -1.5px; margin-bottom: 16px; }
  .afs-hero-title em { color: #e67e22; font-style: normal; }
  .afs-hero-sub { font-size: 16px; color: rgba(255,255,255,0.6); line-height: 1.65; max-width: 480px; margin-bottom: 36px; }
  .afs-hero-cta {
    display: inline-flex; align-items: center; gap: 10px;
    background: #e67e22; color: #fff; border: none;
    padding: 15px 36px; font-size: 15px; font-weight: 700; border-radius: 11px;
    cursor: pointer; transition: all 0.2s; font-family: inherit; width: fit-content;
    box-shadow: 0 6px 24px rgba(230,126,34,0.45);
  }
  .afs-hero-cta:hover { background: #d35400; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(230,126,34,0.5); }

  /* Stats strip */
  .afs-stats-strip { background: #1c1c1e; }
  .afs-stats-inner { max-width: 740px; margin: 0 auto; padding: 0 32px; display: flex; }
  .afs-stat { flex: 1; padding: 20px 0; display: flex; align-items: center; gap: 14px; border-right: 1px solid rgba(255,255,255,0.08); }
  .afs-stat:last-child { border-right: none; }
  .afs-stat-icon { width: 38px; height: 38px; border-radius: 9px; background: rgba(230,126,34,0.2); display: flex; align-items: center; justify-content: center; color: #e67e22; flex-shrink: 0; }
  .afs-stat-num { font-size: 19px; font-weight: 800; color: #fff; font-family: 'DM Mono', monospace; }
  .afs-stat-label { font-size: 12px; color: rgba(255,255,255,0.45); }

  /* How it works */
  .afs-how { flex: 1; background: #f5f5f5; padding: 52px 32px 60px; }
  .afs-how-inner { max-width: 740px; margin: 0 auto; }
  .afs-how-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #bbb; margin-bottom: 8px; }
  .afs-how-heading { font-size: 28px; font-weight: 800; color: #1c1c1e; letter-spacing: -0.5px; margin-bottom: 32px; }
  .afs-how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .afs-how-card { background: #fff; border-radius: 16px; border: 1px solid #ebebeb; overflow: hidden; transition: box-shadow 0.2s, transform 0.2s; box-shadow: 0 1px 5px rgba(0,0,0,0.04); }
  .afs-how-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09); transform: translateY(-3px); }
  .afs-how-img { width: 100%; height: 120px; object-fit: cover; display: block; }
  .afs-how-body { padding: 18px 18px 20px; }
  .afs-how-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 7px; background: #e67e22; color: #fff; font-size: 12px; font-weight: 800; font-family: 'DM Mono', monospace; margin-bottom: 10px; }
  .afs-how-title { font-size: 14px; font-weight: 700; color: #1c1c1e; margin-bottom: 5px; }
  .afs-how-desc { font-size: 12px; color: #999; line-height: 1.55; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .afs-type-grid { grid-template-columns: 1fr 1fr; }
    .afs-option-row { flex-direction: column; }
    .afs-row { grid-template-columns: 1fr; }
    .afs-time-row { flex-direction: column; gap: 8px; }
    .afs-time-divider { display: none; }
    .afs-hero-title { font-size: 34px; }
    .afs-hero { height: 420px; }
    .afs-how-grid { grid-template-columns: 1fr; }
    .afs-stats-inner { flex-direction: column; }
    .afs-stat { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 14px 0; }
    .afs-card { padding: 22px 16px; }
    .afs-menu-card { padding: 16px; }
    .afs-progress-wrapper { padding: 0 12px; }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
function AddFoodService() {
  const navigate       = useNavigate();
  const updatePhotoRef = useRef(null);
  const menuImageRefs  = useRef([]);

  const [currentStep,  setCurrentStep]  = useState(1);
  const [showForm,     setShowForm]     = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  const [kitchenName,       setKitchenName]       = useState("");
  const [description,       setDescription]       = useState("");
  const [serviceType,       setServiceType]       = useState("Home Kitchen");
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable,   setPickupAvailable]   = useState(true);
  const [operatingHours,    setOperatingHours]    = useState({ open: "08:00 AM", close: "10:00 PM" });

  const [selectedLocation,    setSelectedLocation]    = useState(SLIIT_LOCATION);
  const [address,             setAddress]             = useState("");
  const [map,                 setMap]                 = useState(null);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);

  const [iconPreview,   setIconPreview]   = useState(null);
  const [iconFile,      setIconFile]      = useState(null);
  const [iconImageId,   setIconImageId]   = useState(null);
  const [bgPreview,     setBgPreview]     = useState(null);
  const [bgFile,        setBgFile]        = useState(null);
  const [bgImageId,     setBgImageId]     = useState(null);
  const [updatingField, setUpdatingField] = useState(null);

  const [menuItems, setMenuItems] = useState([emptyMenuItem()]);
  const [isVerified, setIsVerified] = useState(false);
  const [isAgreed,   setIsAgreed]   = useState(false);

  const { isLoaded: mapIsLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleExit       = () => navigate("/Listings");
  const handleGetStarted = () => setShowForm(true);

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
      if (!iconFile && !iconImageId) return alert("Please upload a kitchen icon image.");
      if (!bgFile && !bgImageId)     return alert("Please upload a kitchen background image.");
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
    setMenuItems(p => p.filter((_, idx) => idx !== i));
    menuImageRefs.current.splice(i, 1);
  };
  const updateMenuItem      = (i, f, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],[f]:v}; return u; });
  const updateMenuItemHours = (i, t, v) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],AvailableHours:{...u[i].AvailableHours,[t]:v}}; return u; });
  const toggleDietaryTag    = (i, tag)  => setMenuItems(p => { const u=[...p], cur=u[i].dietaryTags; u[i]={...u[i],dietaryTags:cur.includes(tag)?cur.filter(t=>t!==tag):[...cur,tag]}; return u; });
  const setItemField        = (i, flds) => setMenuItems(p => { const u=[...p]; u[i]={...u[i],...flds}; return u; });

  // ── Menu item images (deferred) ───────────────────────────────────────────
  const handleMenuItemImageSelect = (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    setItemField(i, { imagePreview: URL.createObjectURL(file), imageFile: file, imageId: null });
    e.target.value = null;
  };
  const handleMenuItemImageDelete = (i) => setItemField(i, { imagePreview: null, imageFile: null, imageId: null });
  const triggerMenuItemUpdate = (i) => {
    const inp = document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange = e => handleMenuItemImageSelect(i, e); inp.click();
  };

  // ── Kitchen photos (deferred) ──────────────────────────────────────────────
  const handleIconSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIconPreview(URL.createObjectURL(file)); setIconFile(file); setIconImageId(null); e.target.value=null;
  };
  const handleBgSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setBgPreview(URL.createObjectURL(file)); setBgFile(file); setBgImageId(null); e.target.value=null;
  };
  const handleUpdateKitchenPhoto = (e) => {
    const file = e.target.files[0]; if (!file || !updatingField) return;
    const preview = URL.createObjectURL(file);
    if (updatingField==="icon") { setIconPreview(preview); setIconFile(file); setIconImageId(null); }
    else                        { setBgPreview(preview);   setBgFile(file);   setBgImageId(null); }
    setUpdatingField(null); e.target.value=null;
  };
  const handleDeleteKitchenPhoto = (field) => {
    if (field==="icon") { setIconPreview(null); setIconFile(null); setIconImageId(null); }
    else                { setBgPreview(null);   setBgFile(null);   setBgImageId(null); }
  };
  const triggerKitchenUpdate = (field) => { setUpdatingField(field); updatePhotoRef.current.click(); };

  // ── Map ───────────────────────────────────────────────────────────────────
  const onMapLoad  = useCallback(m => setMap(m), []);
  const onMapClick = event => {
    const loc = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setSelectedLocation(loc); setHasSelectedLocation(true);
    new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
      if (status==="OK" && results[0]) setAddress(results[0].formatted_address);
    });
  };
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelectedLocation(loc); setHasSelectedLocation(true);
      new window.google.maps.Geocoder().geocode({ location: loc }, (results, status) => {
        if (status==="OK" && results[0]) setAddress(results[0].formatted_address);
      });
      if (map) { map.panTo(loc); map.setZoom(17); }
    });
  };
  const handleSLIITLocation = () => {
    setSelectedLocation(SLIIT_LOCATION); setHasSelectedLocation(true);
    if (map) { map.panTo(SLIIT_LOCATION); map.setZoom(17); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveListing = async () => {
    if (!hasSelectedLocation)                        return alert("Please pin your kitchen location.");
    if (!iconPreview || (!iconFile && !iconImageId)) return alert("Please upload a kitchen icon image.");
    if (!bgPreview   || (!bgFile   && !bgImageId))   return alert("Please upload a kitchen background image.");
    if (!isVerified || !isAgreed)                    return alert("Please confirm accuracy and agree to terms.");

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
      setSaveProgress("Creating food service...");
      const fsRes = await axios.post(`${BASE_URL}/Foodservice`, {
        owner: localStorage.getItem("CurrentUserId"),
        kitchenName, description, address,
        location: { type: "Point", coordinates: [selectedLocation.lng, selectedLocation.lat] },
        operatingHours, serviceType, deliveryAvailable, pickupAvailable,
        iconImage: finalIconId, BackgroundImage: finalBgId,
        isAvailable: true, expireDate: getYesterday(),
      });
      const foodServiceId = fsRes.data.data._id;
      const menuItemIds = [];
      for (let i = 0; i < menuItems.length; i++) {
        const it = menuItems[i];
        setSaveProgress(`Saving menu item ${i+1} of ${menuItems.length}...`);
        let imageId = it.imageId;
        if (it.imageFile) {
          const fd = new FormData(); fd.append("photo", it.imageFile);
          const r = await axios.post(`${BASE_URL}/Photo`, fd);
          if (r.data.success) imageId = r.data.data._id;
        }
        const miRes = await axios.post(`${BASE_URL}/menuitem`, {
          foodServiceId, name: it.name, description: it.description,
          price: Number(it.price), category: it.category,
          dietaryTags: it.dietaryTags, AvailableHours: it.AvailableHours,
          isAvailable: it.isAvailable, prepTime: Number(it.prepTime),
          ...(imageId && { image: imageId }),
        });
        menuItemIds.push(miRes.data.data._id);
      }
      setSaveProgress("Finalising...");
      await axios.put(`${BASE_URL}/Foodservice/${foodServiceId}`, { menu: menuItemIds });
      alert(`Food service listed with ${menuItemIds.length} menu item(s)!`);
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="afs-root">
      <style>{styles}</style>

      {/* Top Bar */}
      <div className={`afs-topbar ${!showForm ? "dark" : ""}`}>
        <div className="afs-topbar-brand">
          <div className="afs-topbar-brand-dot"><Store size={15} /></div>
          Food<span>Service</span>
        </div>
        <button className="afs-exit-btn" onClick={handleExit}><X size={14} /> Exit</button>
      </div>

      {/* ── LANDING ── */}
      {!showForm && (
        <div className="afs-hero" style={{ height: "calc(100vh - 58px)" }}>
          <div className="afs-hero-bg" />
          <div className="afs-hero-overlay" />
          <div className="afs-hero-content">
            <h1 className="afs-hero-title">Share your food.<br /><em>Grow your business.</em></h1>
            <p className="afs-hero-sub">List your kitchen, set your menu, and start receiving orders from your community. Takes only a few minutes.</p>
            <button className="afs-hero-cta" onClick={handleGetStarted}>
              Get started <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <>
          {/* Progress bar */}
          <div className="afs-progress-wrapper">
            <div className="afs-progress-steps">
              {STEPS.map((step, idx) => {
                const done   = currentStep > step.num;
                const active = currentStep === step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div className={`afs-progress-step ${active?"active":""} ${done?"done":""}`}>
                      <div className="afs-progress-bubble">
                        {done ? <CheckCircle size={16} /> : step.num}
                      </div>
                      <span className="afs-progress-label">{step.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="afs-progress-line">
                        <div className="afs-progress-line-fill" style={{ width: done ? "100%" : "0%" }} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="afs-layout">

            {/* ── STEP 1 ── */}
            {currentStep === 1 && (
              <div className="afs-card">
                <div className="afs-card-title">Tell us about your kitchen</div>
                <div className="afs-card-subtitle">Basic information customers will see on your listing</div>

                <div className="afs-field">
                  <label className="afs-label">Kitchen name <span>*</span></label>
                  <input className="afs-input" type="text" value={kitchenName}
                    onChange={e => setKitchenName(e.target.value)}
                    placeholder="e.g. Mama's Home Kitchen" maxLength={60} />
                  <div className="afs-field-footer">
                    <span className={`afs-char-count ${kitchenName.length > 50 ? "warn" : ""}`}>{kitchenName.length}/60</span>
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Description <span>*</span></label>
                  <textarea className="afs-textarea" value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe what makes your kitchen special..." maxLength={300} />
                  <div className="afs-field-footer">
                    <span className={`afs-char-count ${description.length > 250 ? "warn" : ""}`}>{description.length}/300</span>
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Service type <span>*</span></label>
                  <div className="afs-type-grid">
                    {SERVICE_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.key} type="button"
                          className={`afs-type-card ${serviceType === t.key ? "selected" : ""}`}
                          onClick={() => setServiceType(t.key)}>
                          <div className="afs-type-icon"><Icon size={18} /></div>
                          <span className="afs-type-name">{t.key}</span>
                          <span className="afs-type-desc">{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Operating hours <span>*</span></label>
                  <div className="afs-time-row">
                    <div className="afs-time-group">
                      <span className="afs-time-label">Opens</span>
                      <select className="afs-select" value={operatingHours.open}
                        onChange={e => {
                          const newOpen = e.target.value;
                          const openIdx = TIME_OPTIONS.indexOf(newOpen);
                          const closeIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                          const newClose = closeIdx > openIdx ? operatingHours.close : TIME_OPTIONS[openIdx + 1] || TIME_OPTIONS[openIdx];
                          setOperatingHours({ open: newOpen, close: newClose });
                          setMenuItems(prev => prev.map(item => {
                            const iOpen  = clampTime(item.AvailableHours.open,  newOpen, newClose);
                            const iClose = clampTime(item.AvailableHours.close, newOpen, newClose);
                            return { ...item, AvailableHours: { open: iOpen, close: timeIdx(iClose) > timeIdx(iOpen) ? iClose : newClose } };
                          }));
                        }}>
                        {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="afs-time-divider"><ChevronRight size={16} /></div>
                    <div className="afs-time-group">
                      <span className="afs-time-label">Closes</span>
                      <select className="afs-select" value={operatingHours.close}
                        onChange={e => {
                          const newClose = e.target.value;
                          setOperatingHours(p => ({ ...p, close: newClose }));
                          setMenuItems(prev => prev.map(item => {
                            const iOpen  = clampTime(item.AvailableHours.open,  operatingHours.open, newClose);
                            const iClose = clampTime(item.AvailableHours.close, operatingHours.open, newClose);
                            return { ...item, AvailableHours: { open: iOpen, close: timeIdx(iClose) > timeIdx(iOpen) ? iClose : newClose } };
                          }));
                        }}>
                        {TIME_OPTIONS.filter(t => TIME_OPTIONS.indexOf(t) > TIME_OPTIONS.indexOf(operatingHours.open))
                          .map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Service options <span>*</span></label>
                  <div className="afs-option-row">
                    <button type="button" className={`afs-option-card ${deliveryAvailable ? "active" : ""}`}
                      onClick={() => setDeliveryAvailable(p => !p)}>
                      <div className="afs-option-icon-box"><Truck size={18} /></div>
                      <span className="afs-option-name">Delivery</span>
                      <span className={`afs-badge ${deliveryAvailable ? "on" : "off"}`}>{deliveryAvailable ? "On" : "Off"}</span>
                    </button>
                    <button type="button" className={`afs-option-card ${pickupAvailable ? "active" : ""}`}
                      onClick={() => setPickupAvailable(p => !p)}>
                      <div className="afs-option-icon-box"><ShoppingBag size={18} /></div>
                      <span className="afs-option-name">Pickup</span>
                      <span className={`afs-badge ${pickupAvailable ? "on" : "off"}`}>{pickupAvailable ? "On" : "Off"}</span>
                    </button>
                  </div>
                </div>

                <div className="afs-nav">
                  <div />
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {currentStep === 2 && (
              <div className="afs-card">
                <div className="afs-card-title">Set your kitchen location</div>
                <div className="afs-card-subtitle">Click the map to pin your exact position</div>

                {mapLoadError ? (
                  <div className="afs-map-error">
                    <MapPin size={22} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Map failed to load</div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>Check your internet connection and reload the page.</div>
                    </div>
                  </div>
                ) : !mapIsLoaded ? (
                  <div className="afs-map-loading">
                    <Loader2 size={22} className="afs-spin" />
                    <span>Loading map...</span>
                  </div>
                ) : (
                  <div className="afs-map-wrapper">
                    <GoogleMap mapContainerStyle={mapContainerStyle} center={selectedLocation}
                      zoom={16} options={defaultOptions} onLoad={onMapLoad} onClick={onMapClick}>
                      <Marker position={selectedLocation} draggable onDragEnd={onMapClick} />
                    </GoogleMap>
                  </div>
                )}

                <div className="afs-map-actions">
                  <button className="afs-map-btn" onClick={handleSLIITLocation}><MapPin size={14} /> SLIIT University</button>
                  <button className="afs-map-btn" onClick={handleUseCurrentLocation}><Crosshair size={14} /> Use my location</button>
                </div>

                <div className="afs-field">
                  <label className="afs-label">Address <span>*</span></label>
                  <textarea className="afs-textarea" rows="2" value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Full address will appear after clicking the map, or type manually..." />
                </div>

                <div className="afs-nav">
                  <button className="afs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {currentStep === 3 && (
              <div className="afs-card">
                <div className="afs-card-title">Kitchen photos</div>
                <div className="afs-card-subtitle">Photos are uploaded when you save your listing</div>

                <input type="file" accept="image/*" ref={updatePhotoRef} style={{ display:"none" }} onChange={handleUpdateKitchenPhoto} />

                <div className="afs-field">
                  <label className="afs-label">Icon image <span>*</span></label>
                  <span className="afs-hint">Displayed as a circle — your kitchen's profile picture</span>
                  {!iconPreview ? (
                    <div className="afs-upload-zone" onClick={() => document.getElementById("icon-upload").click()}>
                      <input type="file" accept="image/*" id="icon-upload" style={{ display:"none" }} onChange={handleIconSelect} />
                      <div className="afs-upload-icon"><Upload size={18} /></div>
                      <div className="afs-upload-text">Click to upload icon</div>
                      <div className="afs-upload-hint">PNG, JPG up to 5MB</div>
                    </div>
                  ) : (
                    <div className="afs-photo-preview">
                      <img src={iconPreview} alt="icon" className="afs-preview-icon" />
                      <div className="afs-photo-actions">
                        <button type="button" className="afs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("icon")}><Trash2 size={13} /></button>
                        <button type="button" className="afs-icon-btn upd" onClick={() => triggerKitchenUpdate("icon")}><RefreshCw size={13} /></button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="afs-divider" />

                <div className="afs-field">
                  <label className="afs-label">Cover / Background image <span>*</span></label>
                  <span className="afs-hint">Wide banner showcasing your kitchen or signature dish</span>
                  {!bgPreview ? (
                    <div className="afs-upload-zone" onClick={() => document.getElementById("bg-upload").click()}>
                      <input type="file" accept="image/*" id="bg-upload" style={{ display:"none" }} onChange={handleBgSelect} />
                      <div className="afs-upload-icon"><ImageIcon size={18} /></div>
                      <div className="afs-upload-text">Click to upload cover image</div>
                      <div className="afs-upload-hint">PNG, JPG — recommended 1200×400</div>
                    </div>
                  ) : (
                    <div className="afs-photo-preview">
                      <img src={bgPreview} alt="bg" className="afs-preview-bg" />
                      <div className="afs-photo-actions">
                        <button type="button" className="afs-icon-btn del" onClick={() => handleDeleteKitchenPhoto("bg")}><Trash2 size={13} /></button>
                        <button type="button" className="afs-icon-btn upd" onClick={() => triggerKitchenUpdate("bg")}><RefreshCw size={13} /></button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="afs-nav">
                  <button className="afs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 4 ── */}
            {currentStep === 4 && (
              <div>
                <div className="afs-card" style={{ marginBottom: 16 }}>
                  <div className="afs-card-title">Build your menu</div>
                  <div className="afs-card-subtitle">Add the dishes and items you'll be offering</div>
                </div>

                {menuItems.map((item, index) => (
                  <div key={index} className="afs-menu-card">
                    <div className="afs-menu-header">
                      <div className="afs-menu-header-left">
                        <div className="afs-menu-num">{String(index + 1).padStart(2, "0")}</div>
                        <span className="afs-menu-title">{item.name || "Untitled item"}</span>
                      </div>
                      <button type="button" className="afs-remove-btn" onClick={() => removeMenuItem(index)}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Item photo</label>
                      {!item.imagePreview ? (
                        <div className="afs-upload-zone" style={{ padding:"18px 20px" }}
                          onClick={() => menuImageRefs.current[index]?.click()}>
                          <input type="file" accept="image/*" style={{ display:"none" }}
                            ref={el => (menuImageRefs.current[index] = el)}
                            onChange={e => handleMenuItemImageSelect(index, e)} />
                          <div className="afs-upload-icon" style={{ width:34, height:34, marginBottom:6 }}><Upload size={15} /></div>
                          <div className="afs-upload-text" style={{ fontSize:13 }}>Upload item photo</div>
                        </div>
                      ) : (
                        <div className="afs-photo-preview">
                          <img src={item.imagePreview} alt={`item-${index}`} className="afs-item-img" />
                          <div className="afs-photo-actions">
                            <button type="button" className="afs-icon-btn del" onClick={() => handleMenuItemImageDelete(index)}><Trash2 size={13} /></button>
                            <button type="button" className="afs-icon-btn upd" onClick={() => triggerMenuItemUpdate(index)}><RefreshCw size={13} /></button>
                          </div>
                          {item.imageUploading && <div className="afs-img-uploading"><Loader2 size={16} className="afs-spin" /> Uploading...</div>}
                        </div>
                      )}
                    </div>

                    <div className="afs-row">
                      <div className="afs-field">
                        <label className="afs-label">Item name <span>*</span></label>
                        <input className="afs-input" type="text" value={item.name}
                          onChange={e => updateMenuItem(index, "name", e.target.value)}
                          placeholder="e.g. Grilled Chicken Rice" />
                      </div>
                      <div className="afs-field">
                        <label className="afs-label">Category <span>*</span></label>
                        <select className="afs-select" value={item.category}
                          onChange={e => updateMenuItem(index, "category", e.target.value)}>
                          {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Description</label>
                      <input className="afs-input" type="text" value={item.description}
                        onChange={e => updateMenuItem(index, "description", e.target.value)}
                        placeholder="Brief description of the dish..." />
                    </div>

                    <div className="afs-row">
                      <div className="afs-field">
                        <label className="afs-label">Price (LKR) <span>* 100–10,000</span></label>
                        <input className="afs-input" type="number" value={item.price}
                          onChange={e => updateMenuItem(index, "price", e.target.value)}
                          onBlur={e => {
                            const v = Number(e.target.value);
                            if (e.target.value === "") return;
                            if (v < 100)   updateMenuItem(index, "price", "100");
                            else if (v > 10000) updateMenuItem(index, "price", "10000");
                          }}
                          min="100" max="10000" placeholder="350" />
                      </div>
                      <div className="afs-field">
                        <label className="afs-label">Prep time <span>* 1–120 mins</span></label>
                        <input className="afs-input" type="number" value={item.prepTime}
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

                    <div className="afs-field">
                      <label className="afs-label">Available hours</label>
                      <div className="afs-time-row">
                        <div className="afs-time-group">
                          <span className="afs-time-label">From</span>
                          <select className="afs-select" value={item.AvailableHours.open}
                            onChange={e => {
                              const newOpen = e.target.value;
                              const openIdx = TIME_OPTIONS.indexOf(newOpen);
                              const closeIdx = TIME_OPTIONS.indexOf(item.AvailableHours.close);
                              const opCloseIdx = TIME_OPTIONS.indexOf(operatingHours.close);
                              updateMenuItemHours(index, "open", newOpen);
                              if (closeIdx <= openIdx) updateMenuItemHours(index, "close", TIME_OPTIONS[Math.min(openIdx + 1, opCloseIdx)]);
                            }}>
                            {TIME_OPTIONS.filter(t => { const i=TIME_OPTIONS.indexOf(t); return i>=timeIdx(operatingHours.open) && i<timeIdx(operatingHours.close); }).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="afs-time-divider"><ChevronRight size={16} /></div>
                        <div className="afs-time-group">
                          <span className="afs-time-label">Until</span>
                          <select className="afs-select" value={item.AvailableHours.close}
                            onChange={e => updateMenuItemHours(index, "close", e.target.value)}>
                            {TIME_OPTIONS.filter(t => { const i=TIME_OPTIONS.indexOf(t); return i>timeIdx(item.AvailableHours.open) && i<=timeIdx(operatingHours.close); }).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="afs-field">
                      <label className="afs-label">Dietary tags</label>
                      <div className="afs-tags-row">
                        {DIETARY_TAGS.map(tag => {
                          const active = item.dietaryTags.includes(tag.key);
                          const Icon = tag.icon;
                          return (
                            <button key={tag.key} type="button" className="afs-tag-btn"
                              style={{ background: active ? tag.bg : "#f5f5f5", color: active ? tag.color : "#aaa", borderColor: active ? tag.border : "#e8e8e8", fontWeight: active ? 600 : 400 }}
                              onClick={() => toggleDietaryTag(index, tag.key)}>
                              <Icon size={13} />
                              <span>{tag.key}</span>
                              {active && <span className="afs-tag-check">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="afs-field">
                      <div className={`afs-avail ${item.isAvailable ? "on" : "off"}`}
                        onClick={() => updateMenuItem(index, "isAvailable", !item.isAvailable)}>
                        <div className="afs-avail-dot" />
                        <span>{item.isAvailable ? "Currently available" : "Not available"}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button type="button" className="afs-add-item-btn" onClick={addMenuItem}>
                  <Plus size={16} /> Add another menu item
                </button>

                <div className="afs-nav" style={{ background:"#fff", borderRadius:14, padding:"16px 24px", border:"1px solid #ebebeb" }}>
                  <button className="afs-btn-secondary" onClick={handlePreviousStep}><ChevronLeft size={15} /> Previous</button>
                  <button className="afs-btn-primary" onClick={handleNextStep}>Next <ChevronRight size={15} /></button>
                </div>
              </div>
            )}

            {/* ── STEP 5 ── */}
            {currentStep === 5 && (
              <div className="afs-card">
                <div className="afs-card-title">Review & publish</div>
                <div className="afs-card-subtitle">Here's how your listing will look — images upload on save</div>

                {/* ── Live Food Service Preview Card ── */}
                <div className="afs-section-label" style={{ marginBottom: 14 }}>Listing preview</div>
                <div className="afs-service-card">
                  {/* Cover / Background */}
                  {bgPreview
                    ? <img src={bgPreview} alt="cover" className="afs-service-card-cover" />
                    : <div className="afs-service-card-cover-placeholder"><ImageIcon size={28} color="#555" /></div>
                  }
                  {/* Body */}
                  <div className="afs-service-card-body">
                    {/* Circle avatar icon */}
                    <div className="afs-service-card-avatar">
                      {iconPreview
                        ? <img src={iconPreview} alt="icon" />
                        : <Store size={40} color="#fff" />
                      }
                    </div>
                    <div className="afs-service-card-info">
                      <div className="afs-service-card-name">{kitchenName || "Your Kitchen Name"}</div>
                      <div className="afs-service-card-meta">
                        <span><Clock size={12} /> {operatingHours.open} – {operatingHours.close}</span>
                        <span><MapPin size={12} /> {address ? address.split(",")[0] : "Location not set"}</span>
                      </div>
                      <div className="afs-service-card-chips">
                        <span className="afs-chip orange">{serviceType}</span>
                        {deliveryAvailable && <span className="afs-chip dark">Delivery</span>}
                        {pickupAvailable   && <span className="afs-chip dark">Pickup</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="afs-divider" />

                {/* Kitchen details */}
                <div style={{ marginBottom: 24 }}>
                  <div className="afs-section-label">Kitchen details</div>
                  <table className="afs-summary-table">
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

                <div className="afs-divider" />

                {/* Menu preview */}
                <div style={{ marginBottom: 24 }}>
                  <div className="afs-section-label">Menu — {menuItems.length} item(s)</div>
                  {menuItems.map((item, i) => (
                    <div key={i} className="afs-menu-preview-row">
                      {item.imagePreview
                        ? <img src={item.imagePreview} alt={item.name} className="afs-menu-preview-thumb" />
                        : <div className="afs-menu-preview-noimg"><UtensilsCrossed size={16} /></div>}
                      <span className="afs-menu-preview-name">{item.name || `Item ${i + 1}`}</span>
                      <span className="afs-menu-preview-cat">{item.category}</span>
                      <span className="afs-menu-preview-price">LKR {Number(item.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="afs-divider" />

                {/* Confirmation checkboxes */}
                <div style={{ marginBottom: 20 }}>
                  <div className="afs-section-label">Confirmation</div>
                  <label className="afs-check-label">
                    <input type="checkbox" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                    I confirm all information provided is accurate and up to date.
                  </label>
                  <label className="afs-check-label" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={isAgreed} onChange={e => setIsAgreed(e.target.checked)} />
                    I agree to the Terms of Service. Images will be uploaded when I save.
                  </label>
                </div>

                {isSaving && saveProgress && (
                  <div className="afs-save-bar">
                    <Loader2 size={16} className="afs-spin" />
                    <span>{saveProgress}</span>
                  </div>
                )}

                <div className="afs-nav">
                  <button className="afs-btn-secondary" onClick={handlePreviousStep} disabled={isSaving}>
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button className="afs-btn-save" onClick={handleSaveListing} disabled={isSaving || !isVerified || !isAgreed}>
                    {isSaving
                      ? <><Loader2 size={15} className="afs-spin" /> Saving...</>
                      : <><CheckCircle size={15} /> Save listing</>
                    }
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

export default AddFoodService;
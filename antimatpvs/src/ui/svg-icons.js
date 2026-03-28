/**
 * Enterprise UI icons — inline SVG only (currentColor, no raster assets).
 */

function wrapSvg(inner, className = 'ui-icon') {
  return `<span class="${className}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${inner}</svg></span>`;
}

export const icons = {
  plus: wrapSvg('<path d="M12 5v14M5 12h14"/>'),
  close: wrapSvg('<path d="M18 6L6 18M6 6l12 12"/>'),
  move: wrapSvg('<path d="M12 2v4M8 6l4-4 4 4M12 22v-4m-4 4l4 4 4-4M2 12h4M6 8L2 12l4 4M22 12h-4m4 0l-4-4 4-4"/>'),
  rotate: wrapSvg('<path d="M21 12a9 9 0 11-3-7.1M21 3v6h-6"/>'),
  scale: wrapSvg('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
  layers: wrapSvg('<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>'),
  cog: wrapSvg('<circle cx="12" cy="12" r="3"/><path d="M12 1v1.6m0 18.8V22M4.2 4.2l1.1 1.1m13.4 13.4l1.1 1.1M1 12h1.7m18.6 0H23M4.2 19.8l1.1-1.1m13.4-13.4l1.1-1.1"/>'),
  save: wrapSvg('<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  code: wrapSvg('<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>'),
  trash: wrapSvg('<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>'),
  box: wrapSvg('<path d="M12 2l8 4v12l-8 4-8-4V6l8-4z"/><path d="M12 22V12M4 6l8 4 8-4"/>'),
  sphere: wrapSvg('<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/>'),
  cylinder: wrapSvg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><ellipse cx="12" cy="18" rx="7" ry="3"/>'),
  plane: wrapSvg('<path d="M4 16l16-6-6 6-2 6-3-5-5-3z"/>'),
  cone: wrapSvg('<path d="M12 3L4 20h16L12 3z"/><path d="M4 20h16"/>'),
  torus: wrapSvg('<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="5" ry="2"/>'),
  route: wrapSvg('<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 17c3-2 5-6 8-8"/>'),
  breadcrumbs: wrapSvg('<circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="18" r="1.5" fill="currentColor" stroke="none"/>'),
  navMesh: wrapSvg('<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/><path d="M6.5 6.5h0M17.5 6.5h0M6.5 17.5h0M17.5 17.5h0"/>'),
  file: wrapSvg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/>'),
  pencil: wrapSvg('<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
  download: wrapSvg('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  paperclip: wrapSvg('<path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>'),
  moreVertical: wrapSvg('<circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>'),
  mapPin: wrapSvg('<path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  livePreview: wrapSvg('<path d="M15 10l-4 3V7l4 3z" fill="currentColor" stroke="none"/><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>'),
  qrCode: wrapSvg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="19" y="14" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/><rect x="19" y="19" width="2" height="2"/>'),
  link: wrapSvg('<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7.1-7.1l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007.1 7.1l1.7-1.7"/>'),
};

/** Unsaved indicator (filled dot) */
export function iconDirty() {
  return '<span class="ui-icon ui-icon--fill ui-icon--dirty-dot" title="Unsaved changes"><svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="currentColor" stroke="none"/></svg></span>';
}

const FILE_BADGE = {
  ts: { bg: 'rgba(49,120,198,0.35)', stroke: '#5b9fd4', label: 'TS' },
  js: { bg: 'rgba(247,223,30,0.2)', stroke: '#e8d44d', label: 'JS' },
  html: { bg: 'rgba(227,76,38,0.25)', stroke: '#e8795a', label: 'H5' },
  css: { bg: 'rgba(38,77,228,0.25)', stroke: '#6b8cff', label: 'CSS' },
  navmesh: { bg: 'rgba(34,197,94,0.25)', stroke: '#4ade80', label: 'NM' },
  default: { bg: 'rgba(148,163,184,0.2)', stroke: '#94a3b8', label: '?' },
};

/**
 * File-type badge: compact SVG with monospace-style label (no external font in SVG for portability).
 */
export function fileTypeBadge(ext) {
  const b = FILE_BADGE[ext] || FILE_BADGE.default;
  return `<span class="ui-icon fexp-file-badge fexp-file-badge--${ext}" aria-hidden="true"><svg viewBox="0 0 22 22" width="22" height="22">
    <rect x="1.5" y="3" width="19" height="16" rx="3" fill="${b.bg}" stroke="${b.stroke}" stroke-width="1.25"/>
    <text x="11" y="13.5" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" font-family="var(--font-mono), ui-monospace, monospace">${b.label}</text>
  </svg></span>`;
}

const TREE_ICON = {
  box: icons.box,
  sphere: icons.sphere,
  cylinder: icons.cylinder,
  plane: icons.plane,
  cone: icons.cone,
  torus: icons.torus,
  route: icons.route,
  navBreadcrumbs: icons.breadcrumbs,
  navigationMesh: icons.navMesh,
};

export function treeObjectIcon(type) {
  return TREE_ICON[type] || icons.box;
}

const OBJECT_MENU_ICON = {
  box: icons.box,
  sphere: icons.sphere,
  cylinder: icons.cylinder,
  plane: icons.plane,
  cone: icons.cone,
  torus: icons.torus,
  route: icons.route,
  navBreadcrumbs: icons.breadcrumbs,
  navigationMesh: icons.navMesh,
};

export function toolbarObjectIcon(type) {
  return OBJECT_MENU_ICON[type] || icons.box;
}

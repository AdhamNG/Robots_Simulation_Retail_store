/**
 * Editor Toolbar — add objects, gizmo mode, nav mesh, delete.
 */
import {
  generateNavMesh,
  hasNavMesh,
  clearNavMeshVisualization,
} from '../ar/navigation-mesh.js';
import { icons, toolbarObjectIcon } from './svg-icons.js';

const OBJECT_TYPES = [
  { type: 'box',              label: 'Box' },
  { type: 'sphere',           label: 'Sphere' },
  { type: 'cylinder',         label: 'Cylinder' },
  { type: 'plane',            label: 'Plane' },
  { type: 'cone',             label: 'Cone' },
  { type: 'torus',            label: 'Torus' },
  { type: 'route',            label: 'Navigation Route' },
  { type: 'navBreadcrumbs',   label: 'Navigation Breadcrumbs' },
  { type: 'navigationMesh',   label: 'Navigation Mesh' },
];

/**
 * @param {HTMLElement} container
 * @param {object} callbacks
 * @param {(type:string)=>void} callbacks.onAddObject
 * @param {(mode:string)=>void} callbacks.onGizmoMode
 * @param {(mode:'material'|'wireframe'|'normals'|'uv')=>void} callbacks.onViewMode
 * @param {()=>void} callbacks.onDelete
 * @param {()=>void} callbacks.onToggleCode
 * @param {(msg:string)=>void} callbacks.setStatus
 * @param {()=>void} [callbacks.onSaveNavMeshToFiles]
 * @param {()=>{clientId:string,clientSecret:string,mapCode:string}|null} [callbacks.getCredentials]
 */
export function createToolbar(container, callbacks) {
  const bar = document.createElement('div');
  bar.className = 'tb-inner';

  const html = `
    <div class="tb-group tb-brand">
      <span class="tb-logo">NavMe</span>
      <span class="tb-logo-sub">Editor</span>
    </div>

    <div class="tb-divider"></div>

    <div class="tb-group">
      <div class="tb-dropdown" id="tb-add">
        <button class="tb-btn tb-btn-accent" id="tb-add-btn" type="button">
          ${icons.plus} Add
        </button>
        <div class="tb-dropdown-menu" id="tb-add-menu"></div>
      </div>
    </div>

    <div class="tb-divider"></div>

    <div class="tb-group" id="tb-gizmo-group">
      <button class="tb-btn tb-gizmo active" data-mode="translate" title="Translate (W)" type="button">
        ${icons.move} Move
      </button>
      <button class="tb-btn tb-gizmo" data-mode="rotate" title="Rotate (E)" type="button">
        ${icons.rotate} Rotate
      </button>
      <button class="tb-btn tb-gizmo" data-mode="scale" title="Scale (R)" type="button">
        ${icons.scale} Scale
      </button>
    </div>

    <div class="tb-divider"></div>

    <div class="tb-group">
      <select class="tb-select" id="tb-view-mode" title="Viewport render mode">
        <option value="material">Material</option>
        <option value="wireframe" selected>Wireframe</option>
        <option value="normals">Normals</option>
        <option value="uv">UV</option>
      </select>
    </div>

    <div class="tb-divider"></div>

    <div class="tb-group">
      <div class="tb-dropdown" id="tb-navmesh">
        <button class="tb-btn" id="tb-navmesh-btn" type="button">
          ${icons.layers} NavMesh
        </button>
        <div class="tb-dropdown-menu" id="tb-navmesh-menu">
          <button type="button" class="tb-dropdown-item" id="tb-navmesh-gen-item">
            ${icons.cog} Generate mesh
          </button>
          <button type="button" class="tb-dropdown-item" id="tb-navmesh-save-item" disabled>
            ${icons.save} Save to Files
          </button>
          <button type="button" class="tb-dropdown-item" id="tb-navmesh-clear-item" disabled>
            ${icons.close} Clear visualization
          </button>
        </div>
      </div>
    </div>

    <div class="tb-spacer"></div>

    <div class="tb-group">
      <button class="tb-btn tb-btn-accent" id="tb-live-preview" title="Open AR live preview on mobile" type="button">
        ${icons.livePreview} Live Preview
      </button>
    </div>

    <div class="tb-divider"></div>

    <div class="tb-group">
      <button class="tb-btn" id="tb-code-toggle" title="Toggle code editor" type="button">
        ${icons.code} Code
      </button>
    </div>

    <div class="tb-divider"></div>

    <div class="tb-group">
      <button class="tb-btn tb-btn-danger" id="tb-delete" disabled title="Delete selected (Del)" type="button">
        ${icons.trash} Delete
      </button>
    </div>
  `;

  bar.innerHTML = html;
  container.appendChild(bar);

  // Add object dropdown
  const addMenu = bar.querySelector('#tb-add-menu');
  OBJECT_TYPES.forEach(({ type, label }) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tb-dropdown-item';
    item.innerHTML = `${toolbarObjectIcon(type)} ${label}`;
    item.addEventListener('click', () => {
      callbacks.onAddObject(type);
      addMenu.classList.remove('open');
    });
    addMenu.appendChild(item);
  });

  const addBtn = bar.querySelector('#tb-add-btn');
  addBtn.addEventListener('click', () => {
    addMenu.classList.toggle('open');
  });

  const addWrap = bar.querySelector('#tb-add');
  const navMeshWrap = bar.querySelector('#tb-navmesh');
  const navMeshMenu = bar.querySelector('#tb-navmesh-menu');

  document.addEventListener('click', (e) => {
    if (!addWrap.contains(e.target)) {
      addMenu.classList.remove('open');
    }
    if (!navMeshWrap.contains(e.target)) {
      navMeshMenu.classList.remove('open');
    }
  });

  // Gizmo mode buttons
  const gizmoGroup = bar.querySelector('#tb-gizmo-group');
  gizmoGroup.querySelectorAll('.tb-gizmo').forEach((btn) => {
    btn.addEventListener('click', () => {
      gizmoGroup.querySelectorAll('.tb-gizmo').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      callbacks.onGizmoMode(btn.dataset.mode);
    });
  });

  // Keyboard shortcuts for gizmo modes
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'w' || e.key === 'W') { setGizmoActive('translate'); callbacks.onGizmoMode('translate'); }
    if (e.key === 'e' || e.key === 'E') { setGizmoActive('rotate'); callbacks.onGizmoMode('rotate'); }
    if (e.key === 'r' || e.key === 'R') { setGizmoActive('scale'); callbacks.onGizmoMode('scale'); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target.tagName !== 'INPUT') callbacks.onDelete();
    }
  });

  function setGizmoActive(mode) {
    gizmoGroup.querySelectorAll('.tb-gizmo').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  // Delete button
  const deleteBtn = bar.querySelector('#tb-delete');
  deleteBtn.addEventListener('click', () => callbacks.onDelete());

  // NavMesh buttons
  const viewModeSelect = bar.querySelector('#tb-view-mode');
  viewModeSelect.addEventListener('change', () => {
    callbacks.onViewMode(viewModeSelect.value);
  });

  const navMeshBtn = bar.querySelector('#tb-navmesh-btn');
  const navGenItem = bar.querySelector('#tb-navmesh-gen-item');
  const navSaveItem = bar.querySelector('#tb-navmesh-save-item');
  const navClearItem = bar.querySelector('#tb-navmesh-clear-item');

  navMeshBtn.addEventListener('click', () => {
    navMeshMenu.classList.toggle('open');
  });

  function refreshNavMeshMenuItems() {
    const ok = hasNavMesh();
    navSaveItem.disabled = !ok || !callbacks.onSaveNavMeshToFiles;
    navClearItem.disabled = !ok;
  }

  navGenItem.addEventListener('click', async () => {
    navMeshMenu.classList.remove('open');
    callbacks.setStatus('Generating nav mesh\u2026');
    navGenItem.disabled = true;
    navMeshBtn.disabled = true;
    try {
      const r = await generateNavMesh();
      callbacks.setStatus(r.success
        ? `Nav mesh ready (${r.durationMs.toFixed(0)} ms)`
        : (r.error || 'Generation failed'));
    } catch (e) {
      callbacks.setStatus(e?.message || String(e));
    }
    navGenItem.disabled = false;
    navMeshBtn.disabled = false;
    refreshNavMeshMenuItems();
  });

  navSaveItem.addEventListener('click', () => {
    navMeshMenu.classList.remove('open');
    if (callbacks.onSaveNavMeshToFiles) {
      callbacks.onSaveNavMeshToFiles();
    }
  });

  navClearItem.addEventListener('click', () => {
    navMeshMenu.classList.remove('open');
    clearNavMeshVisualization();
    callbacks.setStatus('Nav mesh cleared');
    refreshNavMeshMenuItems();
  });

  refreshNavMeshMenuItems();

  const codeToggleBtn = bar.querySelector('#tb-code-toggle');
  codeToggleBtn.addEventListener('click', () => {
    if (callbacks.onToggleCode) {
      const visible = callbacks.onToggleCode();
      codeToggleBtn.classList.toggle('active', visible);
    }
  });

  // --- Live Preview ---
  const livePreviewBtn = bar.querySelector('#tb-live-preview');
  let previewModal = null;

  livePreviewBtn.addEventListener('click', () => {
    const creds = callbacks.getCredentials ? callbacks.getCredentials() : null;
    if (!creds) {
      callbacks.setStatus('No credentials — log in first');
      return;
    }
    showPreviewModal(creds);
  });

  function showPreviewModal(creds) {
    if (previewModal) { previewModal.remove(); previewModal = null; }

    const params = new URLSearchParams({
      cid: creds.clientId,
      cs: creds.clientSecret,
      map: creds.mapCode,
    });
    const previewUrl = `${location.origin}/preview.html?${params.toString()}`;

    const overlay = document.createElement('div');
    overlay.className = 'preview-modal-overlay';
    overlay.innerHTML = `
      <div class="preview-modal">
        <div class="preview-modal-header">
          <span class="preview-modal-title">${icons.livePreview} Live Preview</span>
          <button class="preview-modal-close" type="button">${icons.close}</button>
        </div>
        <div class="preview-modal-body">
          <p class="preview-modal-desc">Open this URL on your mobile device to view the AR experience. Point the camera at the mapped area to localize.</p>
          <div class="preview-modal-url-row">
            <input class="preview-modal-url" type="text" value="${previewUrl}" readonly />
            <button class="preview-modal-copy" type="button">${icons.link} Copy</button>
          </div>
          <div class="preview-modal-qr" id="preview-qr"></div>
          <p class="preview-modal-hint">Scan the QR code or copy the link. Use HTTPS on mobile for camera access. If VPS returns 403, add your dev URL (e.g. http://localhost:3000 or your LAN IP) to allowed domains in the MultiSet developer portal (CORS / domain whitelist).</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    previewModal = overlay;

    overlay.querySelector('.preview-modal-close').addEventListener('click', () => {
      overlay.remove();
      previewModal = null;
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); previewModal = null; }
    });

    const copyBtn = overlay.querySelector('.preview-modal-copy');
    const urlInput = overlay.querySelector('.preview-modal-url');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(previewUrl).then(() => {
        copyBtn.innerHTML = `${icons.link} Copied!`;
        setTimeout(() => { copyBtn.innerHTML = `${icons.link} Copy`; }, 2000);
      });
    });

    generateQRCode(previewUrl, overlay.querySelector('#preview-qr'));
  }

  function generateQRCode(url, container) {
    const size = 180;
    const svg = createQRSvg(url, size);
    container.innerHTML = svg;
  }

  function createQRSvg(text, size) {
    const modules = encodeQR(text);
    const moduleCount = modules.length;
    const cellSize = size / moduleCount;
    let paths = '';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          const x = (col * cellSize).toFixed(2);
          const y = (row * cellSize).toFixed(2);
          const s = cellSize.toFixed(2);
          paths += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#6ec8ff"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:#0a0c16;border-radius:8px;padding:8px">${paths}</svg>`;
  }

  function encodeQR(text) {
    const size = Math.max(21, Math.ceil(text.length / 2) + 21);
    const grid = Array.from({ length: size }, () => Array(size).fill(false));
    addFinderPattern(grid, 0, 0);
    addFinderPattern(grid, size - 7, 0);
    addFinderPattern(grid, 0, size - 7);
    const bytes = new TextEncoder().encode(text);
    let idx = 0;
    for (let col = size - 1; col >= 0; col -= 2) {
      if (col === 6) col = 5;
      for (let row = 0; row < size; row++) {
        for (let c = 0; c < 2; c++) {
          const x = col - c;
          if (x < 0 || grid[row][x]) continue;
          if (idx < bytes.length * 8) {
            const byteIndex = Math.floor(idx / 8);
            const bitIndex = 7 - (idx % 8);
            grid[row][x] = !!(bytes[byteIndex] & (1 << bitIndex));
            idx++;
          }
        }
      }
    }
    return grid;
  }

  function addFinderPattern(grid, row, col) {
    for (let r = 0; r < 7 && row + r < grid.length; r++) {
      for (let c = 0; c < 7 && col + c < grid[0].length; c++) {
        const outer = r === 0 || r === 6 || c === 0 || c === 6;
        const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[row + r][col + c] = outer || inner;
      }
    }
  }

  return {
    setDeleteEnabled(enabled) { deleteBtn.disabled = !enabled; },
    setCodeActive(active) { codeToggleBtn.classList.toggle('active', active); },
  };
}

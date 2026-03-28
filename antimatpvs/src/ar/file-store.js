/**
 * In-memory virtual file system for the editor.
 * Stores user-created files (TS, JS, HTML, CSS) and behavior files.
 * Each file has: id, name, ext, source, attachedTo (objectId or null).
 */

/** Virtual attachment target when no scene object is selected (viewport / scene-level scripts & overlay). */
export const SCENE_ATTACHMENT_ID = '__navme_scene__';

let nextFileId = 1;
const files = [];
let _onChange = null;

export function setOnChange(cb) { _onChange = cb; }
function fire() { if (_onChange) _onChange(); }

const TEMPLATES = {
  ts: `// New TypeScript file\n\nexport function init(): void {\n  // Your code here\n}\n`,
  js: `// New JavaScript file\n\nexport function init() {\n  // Your code here\n}\n`,
  html: `<!-- Drag this file onto the viewport (with an object selected) to show it on the scene. -->\n<!-- Optional: also attach a .css file for custom-overlay styles. -->\n<div class="custom-overlay" style="position:absolute;top:16px;left:16px;padding:12px 16px;color:#e0f8ff;background:rgba(0,20,32,.9);border:1px solid rgba(0,240,255,.35);border-radius:8px;">\n  <h2 style="margin:0 0 8px;font-size:1.1rem;">Hello from NavMe Editor</h2>\n  <p style="margin:0;font-size:12px;opacity:.85;">HTML overlay is active.</p>\n</div>\n`,
  css: `/* Applied only inside the viewport overlay (safe for the rest of the UI) */\n\n.custom-overlay {\n  position: absolute;\n  top: 16px;\n  left: 16px;\n  padding: 12px 16px;\n  color: #e0e8f0;\n  background: rgba(0, 16, 24, 0.85);\n  border: 1px solid rgba(0, 240, 255, 0.25);\n  border-radius: 8px;\n}\n`,
};

const LANG_MAP = { ts: 'typescript', js: 'javascript', html: 'html', css: 'css', navmesh: 'plaintext' };

function uint8ToBase64(u8) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToUint8Array(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Add or replace a .navmesh virtual file (binary stored as base64 in `source`).
 * @param {string} name  e.g. generated.navmesh
 * @param {Uint8Array} data
 */
export function upsertNavMeshVirtualFile(name, data) {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const b64 = uint8ToBase64(u8);
  const finalName = name.endsWith('.navmesh') ? name : `${name}.navmesh`;
  const existing = files.find((f) => f.ext === 'navmesh' && f.name === finalName);
  if (existing) {
    existing.source = b64;
    fire();
    return existing;
  }
  const file = {
    id: `file_${nextFileId++}`,
    name: finalName,
    ext: 'navmesh',
    source: b64,
    attachedTo: null,
  };
  files.push(file);
  fire();
  return file;
}

export function getMonacoLanguage(ext) {
  return LANG_MAP[ext] || 'plaintext';
}

/**
 * Create a new file.
 * @param {string} name  File name (including extension)
 * @param {'ts'|'js'|'html'|'css'} ext
 * @param {string} [source]  Optional initial content
 * @returns {object} file entry
 */
export function createFile(name, ext, source) {
  const id = `file_${nextFileId++}`;
  const file = {
    id,
    name,
    ext,
    source: source || TEMPLATES[ext] || '',
    attachedTo: null,
  };
  files.push(file);
  fire();
  return file;
}

export function getFile(id) {
  return files.find((f) => f.id === id) || null;
}

export function getFiles() {
  return files;
}

export function updateFileSource(id, source) {
  const f = files.find((f) => f.id === id);
  if (f) f.source = source;
}

export function renameFile(id, newName) {
  const f = files.find((x) => x.id === id);
  if (f) {
    f.name = newName;
    const m = newName.match(/\.(ts|js|html|css|navmesh)$/i);
    if (m) f.ext = m[1].toLowerCase();
    fire();
  }
}

/** Clone a file with a new id; does not copy attachment. */
export function duplicateFile(id) {
  const f = files.find((x) => x.id === id);
  if (!f) return null;
  const dot = f.name.lastIndexOf('.');
  const stem = dot >= 0 ? f.name.slice(0, dot) : f.name;
  const ext = f.ext;
  const newName = `${stem} copy.${ext}`;
  return createFile(newName, ext, f.source);
}

export function deleteFile(id) {
  const idx = files.findIndex((f) => f.id === id);
  if (idx !== -1) {
    files.splice(idx, 1);
    fire();
  }
}

export function attachFileToObject(fileId, objectId) {
  const f = files.find((f) => f.id === fileId);
  if (f) {
    f.attachedTo = objectId;
    fire();
  }
}

export function detachFile(fileId) {
  const f = files.find((f) => f.id === fileId);
  if (f) {
    f.attachedTo = null;
    fire();
  }
}

/** Clear attachment when a scene object is deleted. */
export function detachAllFromObject(objectId) {
  let changed = false;
  for (const f of files) {
    if (f.attachedTo === objectId) {
      f.attachedTo = null;
      changed = true;
    }
  }
  if (changed) fire();
}

export function getFilesForObject(objectId) {
  return files.filter((f) => f.attachedTo === objectId);
}

/**
 * Import a behavior entry (from scene-objects) into the file store so it appears in the explorer.
 */
export function importBehaviorAsFile(behaviorId, fileName, source, objectId) {
  const existing = files.find((f) => f.id === behaviorId);
  if (existing) {
    existing.source = source;
    if (objectId) existing.attachedTo = objectId;
    return existing;
  }
  const ext = fileName.endsWith('.ts') ? 'ts' : 'js';
  const file = {
    id: behaviorId,
    name: fileName,
    ext,
    source,
    attachedTo: objectId,
  };
  files.push(file);
  fire();
  return file;
}

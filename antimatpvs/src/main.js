/**
 * Main — Mattercraft-style 3D Scene Editor
 *
 * Flow: Login form -> Auth -> Init editor layout + 3D scene -> Download map -> Ready
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { renderForm } from './ui/form.js';
import { createStatusBar } from './ui/status.js';
import { getM2MToken } from './services/multiset-auth.js';
import { downloadMapMesh } from './services/multiset-mesh.js';
import {
  initScene,
  addMesh,
  flyTo,
  setGizmoMode,
  setRenderMode,
  addAnimationCallback,
  resizeRendererToContainer,
  getCanvas,
} from './ar/scene.js';
import { generateNavMesh, getNavMeshExportBytes } from './ar/navigation-mesh.js';
import { createEditorLayout } from './ui/editor-layout.js';
import { createToolbar } from './ui/toolbar.js';
import { createSceneTree } from './ui/scene-tree.js';
import { createPropertiesPanel } from './ui/properties-panel.js';
import { createCodeEditor } from './ui/code-editor.js';
import { createFileExplorer } from './ui/file-explorer.js';
import { createViewportDomOverlay } from './ui/viewport-dom-overlay.js';
import { preloadBehaviorTranspiler } from './ar/behavior-runtime.js';
import * as fileStore from './ar/file-store.js';
import * as sceneObjects from './ar/scene-objects.js';
import { icons } from './ui/svg-icons.js';

const app = document.getElementById('app');

const editor = createEditorLayout(app);
const statusBar = createStatusBar(app);
const formUI = renderForm(app, onFormSubmit);

/** Assigned after `createFileExplorer`; used by toolbar + code editor callbacks. */
let fileExplorer;

/** Stored after login so Live Preview can build the URL. */
let _storedCredentials = null;

// --- Toolbar ---
const toolbar = createToolbar(editor.toolbarSlot, {
  onAddObject(type) {
    const entry = sceneObjects.addObject(type);
    if (entry) {
      editor.setStatus(`Added ${entry.name}`);
      flyTo(0, 0, 0);
    }
  },
  onGizmoMode(mode) {
    setGizmoMode(mode);
  },
  onViewMode(mode) {
    setRenderMode(mode);
    editor.setStatus(`View mode: ${mode}`);
  },
  onDelete() {
    const sel = sceneObjects.getSelected();
    if (sel) {
      const name = sel.name;
      sceneObjects.removeObject(sel.id);
      editor.setStatus(`Deleted ${name}`);
    }
  },
  onToggleCode() {
    const visible = editor.toggleCode();
    setTimeout(() => {
      codeEditor.layout();
      resizeRendererToContainer();
    }, 50);
    return visible;
  },
  setStatus(msg) {
    editor.setStatus(msg);
  },
  onSaveNavMeshToFiles() {
    const bytes = getNavMeshExportBytes();
    if (!bytes || !bytes.length) {
      editor.setStatus('No nav mesh to save — use NavMesh → Generate mesh first');
      return;
    }
    fileStore.upsertNavMeshVirtualFile('generated.navmesh', bytes);
    fileExplorer?.refresh();
    editor.setStatus('Saved generated.navmesh to Files');
  },
  getCredentials() {
    return _storedCredentials;
  },
});

function countAttachedFiles(objectId) {
  return fileStore.getFiles().filter((f) => f.attachedTo === objectId).length;
}

function refreshDomOverlay() {
  if (typeof refreshDomOverlay._fn === 'function') refreshDomOverlay._fn();
}
refreshDomOverlay._fn = null;

// --- Scene Tree ---
const sceneTree = createSceneTree(editor.treeSlot, {
  onSelect(id) {
    sceneObjects.selectObject(id);
  },
  getObjects() {
    return sceneObjects.getObjects();
  },
  getAttachmentHint(objectId) {
    const n = countAttachedFiles(objectId);
    return n ? ` ${icons.paperclip}<span class="attach-count">${n}</span>` : '';
  },
});

// --- Properties Panel ---
const propsPanel = createPropertiesPanel(editor.propertiesSlot, {
  onUpdate(id, prop, value) {
    sceneObjects.updateObjectProperty(id, prop, value);
    if (prop === 'name') sceneTree.refresh();
  },
  onDelete(id) {
    const entry = sceneObjects.getObjects().find((o) => o.id === id);
    const name = entry ? entry.name : 'object';
    sceneObjects.removeObject(id);
    editor.setStatus(`Deleted ${name}`);
  },
  onSelectRouteTarget(id, sub) {
    sceneObjects.selectRouteSubTarget(id, sub);
  },
  getEntry(id) {
    return sceneObjects.getObjects().find((o) => o.id === id) || null;
  },
  getObjects() {
    return sceneObjects.getObjects();
  },
  async onAddBehavior(id, name) {
    const beh = await sceneObjects.addBehavior(id, name);
    if (beh) {
      fileStore.importBehaviorAsFile(beh.behaviorId, beh.fileName, beh.source, id);
      fileExplorer.refresh();
      sceneTree.refresh();
      const err = beh.runtimeError ? ` — ${beh.runtimeError}` : '';
      editor.setStatus(`Created ${beh.fileName}${err}`);
      editor.showCode();
      await codeEditor.openFile(beh.behaviorId, beh.fileName, beh.source);
      setTimeout(() => {
        codeEditor.layout();
        resizeRendererToContainer();
      }, 50);
    }
    return beh;
  },
  onRemoveBehavior(id, behId) {
    codeEditor.closeFile(behId);
    sceneObjects.removeBehavior(id, behId);
    fileStore.detachFile(behId);
    fileExplorer.refresh();
  },
  onRedownloadBehavior(id, behId) {
    sceneObjects.redownloadBehavior(id, behId);
  },
  onEditBehavior(id, behId) {
    const beh = sceneObjects.getBehavior(id, behId);
    if (!beh) return;
    const file = fileStore.getFile(behId);
    const lang = file ? fileStore.getMonacoLanguage(file.ext) : 'typescript';
    editor.showCode();
    codeEditor.openFile(beh.behaviorId, beh.fileName, beh.source, lang);
    setTimeout(() => {
      codeEditor.layout();
      resizeRendererToContainer();
    }, 50);
  },
  async onNavMeshGenerate(_id) {
    editor.setStatus('Generating nav mesh\u2026');
    try {
      const r = await generateNavMesh();
      editor.setStatus(
        r.success ? `Nav mesh ready (${r.durationMs.toFixed(0)} ms)` : (r.error || 'Generation failed'),
      );
    } catch (e) {
      editor.setStatus(e?.message || String(e));
    }
  },
  onNavMeshSaveToFiles(id) {
    const bytes = getNavMeshExportBytes();
    if (!bytes || !bytes.length) {
      editor.setStatus('No nav mesh to save — use generate first');
      return;
    }
    const entry = sceneObjects.getObjects().find((o) => o.id === id);
    let base = entry?.name?.replace(/\.navmesh$/i, '') || 'navmesh';
    base = base.replace(/[^\w.\-]+/g, '_').replace(/^_+|_+$/g, '') || `navmesh_${String(id).slice(-6)}`;
    fileStore.upsertNavMeshVirtualFile(`${base}.navmesh`, bytes);
    fileExplorer.refresh();
    editor.setStatus(`Saved ${base}.navmesh to Files`);
  },
});

function syncBehaviorFileName(fileId, newName) {
  for (const obj of sceneObjects.getObjects()) {
    const b = obj.behaviors?.find((x) => x.behaviorId === fileId);
    if (b) b.fileName = newName;
  }
  const sl = sceneObjects.getSceneLevelBehavior(fileId);
  if (sl) sl.fileName = newName;
}

// --- Code Editor ---
const codeEditor = createCodeEditor(editor.codeSlot, {
  onDirtyChange() {
    if (fileExplorer) fileExplorer.refresh();
  },
  async onSave(fileId, source) {
    fileStore.updateFileSource(fileId, source);

    const sceneBeh = sceneObjects.getSceneLevelBehavior(fileId);
    if (sceneBeh) {
      sceneBeh.source = source;
      const r = await sceneObjects.updateSceneLevelBehaviorSource(fileId, source);
      if (r?.runtimeError) {
        editor.setStatus(`Save: runtime error — ${r.runtimeError}`);
      } else {
        editor.setStatus('File saved');
      }
      refreshDomOverlay();
      fileExplorer.refresh();
      sceneTree.refresh();
      return;
    }

    const objs = sceneObjects.getObjects();
    for (const obj of objs) {
      if (obj.behaviors && obj.behaviors.find((b) => b.behaviorId === fileId)) {
        const beh = obj.behaviors.find((b) => b.behaviorId === fileId);
        if (beh) beh.source = source;
        const r = await sceneObjects.updateBehaviorSource(obj.id, fileId, source);
        if (r?.runtimeError) {
          editor.setStatus(`Save: runtime error — ${r.runtimeError}`);
        } else {
          editor.setStatus('File saved');
        }
        refreshDomOverlay();
        fileExplorer.refresh();
        sceneTree.refresh();
        return;
      }
    }
    editor.setStatus('File saved');
    refreshDomOverlay();
    fileExplorer.refresh();
    sceneTree.refresh();
  },
  onDownload(behaviorId, fileName, source) {
    const f = fileStore.getFile(behaviorId);
    const ext = f?.ext || 'ts';
    const types = {
      ts: 'text/typescript;charset=utf-8',
      js: 'text/javascript;charset=utf-8',
      html: 'text/html;charset=utf-8',
      css: 'text/css;charset=utf-8',
    };
    const blob = new Blob([source], { type: types[ext] || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    editor.setStatus(`Downloaded ${fileName}`);
  },
});

// --- File Explorer ---
fileExplorer = createFileExplorer(editor.filesSlot, {
  getFiles() {
    return fileStore.getFiles();
  },
  getObjectLabel(objectId) {
    if (objectId === fileStore.SCENE_ATTACHMENT_ID) return 'Scene';
    const obj = sceneObjects.getObjects().find((o) => o.id === objectId);
    return obj ? obj.name : objectId;
  },
  onCreateFile(name, ext) {
    const file = fileStore.createFile(name, ext);
    editor.setStatus(`Created ${file.name}`);
    editor.showCode();
    codeEditor.openFile(file.id, file.name, file.source, fileStore.getMonacoLanguage(file.ext));
    setTimeout(() => {
      codeEditor.layout();
      resizeRendererToContainer();
    }, 50);
  },
  onOpenFile(fileId) {
    const file = fileStore.getFile(fileId);
    if (!file) return;
    if (file.ext === 'navmesh') {
      const approxBytes = Math.round((file.source?.length || 0) * 0.75);
      editor.setStatus(
        `${file.name} — binary nav mesh (~${approxBytes.toLocaleString()} bytes). Use NavMesh → Save to Files after generating to update.`,
      );
      return;
    }
    editor.showCode();
    codeEditor.openFile(file.id, file.name, file.source, fileStore.getMonacoLanguage(file.ext));
    setTimeout(() => {
      codeEditor.layout();
      resizeRendererToContainer();
    }, 50);
  },
  onDeleteFile(fileId) {
    const file = fileStore.getFile(fileId);
    if (!file) return;
    codeEditor.closeFile(fileId);
    if (file.attachedTo) {
      if (file.attachedTo === fileStore.SCENE_ATTACHMENT_ID) {
        sceneObjects.removeSceneLevelBehavior(fileId);
      } else {
        sceneObjects.removeBehavior(file.attachedTo, fileId);
      }
    }
    fileStore.deleteFile(fileId);
    editor.setStatus(`Deleted ${file.name}`);
    refreshDomOverlay();
    sceneTree.refresh();
  },
  isFileDirty(fileId) {
    return codeEditor.isFileDirty(fileId);
  },
  async onSaveFile(fileId) {
    if (!codeEditor.hasOpenFile(fileId)) {
      editor.setStatus('Open the file in the editor to save changes');
      return;
    }
    await codeEditor.saveFile(fileId);
  },
  onDownloadFile(fileId) {
    const file = fileStore.getFile(fileId);
    if (!file) return;
    if (file.ext === 'navmesh') {
      const u8 = fileStore.base64ToUint8Array(file.source);
      const blob = new Blob([u8], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      editor.setStatus(`Downloaded ${file.name}`);
      return;
    }
    const src = codeEditor.hasOpenFile(fileId) ? codeEditor.getSource(fileId) : file.source;
    const types = {
      ts: 'text/typescript;charset=utf-8',
      js: 'text/javascript;charset=utf-8',
      html: 'text/html;charset=utf-8',
      css: 'text/css;charset=utf-8',
    };
    const blob = new Blob([src ?? ''], { type: types[file.ext] || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    editor.setStatus(`Downloaded ${file.name}`);
  },
  onRenameFile(fileId) {
    const file = fileStore.getFile(fileId);
    if (!file) return;
    const next = window.prompt('Rename file (include extension):', file.name);
    if (next == null || !String(next).trim()) return;
    const name = String(next).trim();
    const wasOpen = codeEditor.hasOpenFile(fileId);
    const src = wasOpen ? codeEditor.getSource(fileId) : file.source;
    fileStore.renameFile(fileId, name);
    syncBehaviorFileName(fileId, name);
    if (wasOpen) {
      codeEditor.closeFile(fileId);
      const f = fileStore.getFile(fileId);
      if (f) {
        void codeEditor.openFile(f.id, f.name, src ?? '', fileStore.getMonacoLanguage(f.ext));
        setTimeout(() => {
          codeEditor.layout();
          resizeRendererToContainer();
        }, 50);
      }
    }
    const sel = sceneObjects.getSelected();
    if (sel) propsPanel.showObject(sel, sceneObjects.getSelectedSubTarget());
    editor.setStatus(`Renamed to ${name}`);
    fileExplorer.refresh();
  },
  onDuplicateFile(fileId) {
    const copy = fileStore.duplicateFile(fileId);
    if (!copy) return;
    editor.setStatus(`Created ${copy.name}`);
    if (copy.ext === 'navmesh') {
      fileExplorer.refresh();
      return;
    }
    editor.showCode();
    void codeEditor.openFile(copy.id, copy.name, copy.source, fileStore.getMonacoLanguage(copy.ext));
    setTimeout(() => {
      codeEditor.layout();
      resizeRendererToContainer();
    }, 50);
    fileExplorer.refresh();
  },
});

// --- Viewport DOM overlay (HTML/CSS attached files) ---
const viewport = editor.viewport;
const domOverlay = createViewportDomOverlay(viewport);
refreshDomOverlay._fn = () => {
  domOverlay.refresh(() => fileStore.getFiles());
};

const dropOverlay = document.createElement('div');
dropOverlay.className = 'viewport-drop-overlay hidden';
dropOverlay.innerHTML = 'Drop file on viewport<br><small style="font-size:11px;opacity:.75">No selection = attach to Scene · With selection = that object · TS/JS = behavior · HTML/CSS = overlay</small>';
viewport.appendChild(dropOverlay);

async function handleViewportFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropOverlay.classList.add('hidden');

  let fileId = e.dataTransfer.getData('text/plain');
  if (!fileId) fileId = e.dataTransfer.getData('application/x-navme-file');
  const file = fileStore.getFile(fileId);
  if (!file) {
    editor.setStatus('Drop failed — drag a file from the FILES list');
    return;
  }

  if (file.ext === 'navmesh') {
    editor.setStatus('Nav mesh files stay in Files — they cannot attach to the viewport');
    return;
  }

  const sel = sceneObjects.getSelected();
  const targetId = sel ? sel.id : fileStore.SCENE_ATTACHMENT_ID;
  const prevAttached = file.attachedTo ?? null;

  fileStore.attachFileToObject(fileId, targetId);

  if (prevAttached && prevAttached !== targetId) {
    if (prevAttached === fileStore.SCENE_ATTACHMENT_ID) {
      sceneObjects.removeSceneLevelBehavior(fileId);
    } else {
      sceneObjects.removeBehavior(prevAttached, fileId);
    }
  }

  if (file.ext === 'ts' || file.ext === 'js') {
    const className = file.name.replace(/\.[^.]+$/, '');
    if (sel) {
      if (!sel.behaviors) sel.behaviors = [];
      const already = sel.behaviors.find((b) => b.behaviorId === fileId);
      if (!already) {
        sel.behaviors.push({
          behaviorId: fileId,
          name: className,
          className,
          fileName: file.name,
          source: file.source,
        });
      }
      editor.setStatus(`Attached ${file.name} to ${sel.name} (TS/JS behavior — add navmeOnInterval to run in editor)`);
      void sceneObjects.updateBehaviorSource(sel.id, fileId, file.source);
    } else {
      await sceneObjects.attachSceneLevelBehavior({
        behaviorId: fileId,
        name: className,
        className,
        fileName: file.name,
        source: file.source,
      });
      editor.setStatus(`Attached ${file.name} to Scene (TS/JS — scene root; add navmeOnInterval to run in editor)`);
    }
  } else if (file.ext === 'html' || file.ext === 'css') {
    const where = sel ? sel.name : 'Scene';
    editor.setStatus(`Attached ${file.name} to ${where} — viewport overlay`);
  } else {
    const where = sel ? sel.name : 'Scene';
    editor.setStatus(`Attached ${file.name} to ${where}`);
  }

  refreshDomOverlay();
  fileExplorer.refresh();
  sceneTree.refresh();
  sceneObjects.notifySceneChange();
}

function wireFileDropOnCanvas() {
  const canvas = getCanvas();
  if (!canvas || canvas.dataset.navmeFileDropWired === '1') return;
  canvas.dataset.navmeFileDropWired = '1';

  canvas.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('hidden');
  });
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    dropOverlay.classList.remove('hidden');
  });
  canvas.addEventListener('dragleave', (e) => {
    if (!viewport.contains(e.relatedTarget)) dropOverlay.classList.add('hidden');
  });
  canvas.addEventListener('drop', handleViewportFileDrop);
}

// --- Wire scene-objects callbacks ---
sceneObjects.setOnSelect((entry, subTarget) => {
  propsPanel.showObject(entry, subTarget);
  sceneTree.setSelected(entry ? entry.id : null);
  toolbar.setDeleteEnabled(!!entry);
});

sceneObjects.setOnTransform((_id, data, subTarget) => {
  propsPanel.updateTransform(data, subTarget);
});

sceneObjects.setOnChange(() => {
  sceneTree.refresh();
  fileExplorer.refresh();
  refreshDomOverlay();
  propsPanel.refreshRouteTargets();
});

// --- Form submit ---
async function onFormSubmit(creds) {
  formUI.disable();
  statusBar.show('Authenticating\u2026', 'loading');

  try {
    _storedCredentials = { clientId: creds.clientId, clientSecret: creds.clientSecret, mapCode: creds.mapCode };
    const authResult = await getM2MToken(creds.clientId, creds.clientSecret);
    const token = authResult.token;

    statusBar.show('Loading editor\u2026', 'loading');
    formUI.hide();
    editor.show();
    preloadBehaviorTranspiler();
    initScene(editor.viewport);
    wireFileDropOnCanvas();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => resizeRendererToContainer());
      ro.observe(editor.viewport);
    }

    // Init scene objects (click-to-select etc.) after scene is ready
    sceneObjects.init();
    addAnimationCallback(() => sceneObjects.tick());
    refreshDomOverlay();

    statusBar.show('Downloading map mesh\u2026', 'loading');
    const glbBuffer = await downloadMapMesh(token, creds.mapCode);

    if (!glbBuffer) {
      statusBar.show('No GLB found \u2014 empty scene ready', 'success');
      editor.setStatus('No map loaded \u2014 add objects to the scene');
      setTimeout(() => statusBar.hide(), 3000);
      return;
    }

    statusBar.show('Rendering map\u2026', 'loading');
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(glbBuffer, '', resolve, reject);
    });

    addMesh(gltf.scene);
    statusBar.show('Map loaded \u2713', 'success');
    editor.setStatus('Map loaded \u2014 use + Add to place objects');
    setTimeout(() => statusBar.hide(), 2500);
  } catch (err) {
    console.error(err);
    statusBar.show(err.message, 'error');
    formUI.enable();
  }
}

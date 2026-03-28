/**
 * Code Editor — Monaco Editor panel with file tabs for behavior scripts.
 * Monaco is bundled (same-origin) so browser tracking prevention does not block storage/workers.
 */
import './monaco-setup.js';
import * as monaco from 'monaco-editor';
import { icons, iconDirty } from './svg-icons.js';

monaco.editor.defineTheme('navme-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '4a5568', fontStyle: 'italic' },
    { token: 'keyword', foreground: '8b5cf6' },
    { token: 'string', foreground: '00ff88' },
    { token: 'number', foreground: 'ffaa00' },
    { token: 'type', foreground: '00f0ff' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#e0e8f0',
    'editorLineNumber.foreground': '#4a5568',
    'editorCursor.foreground': '#00f0ff',
    'editor.selectionBackground': '#264f78',
    'editor.lineHighlightBackground': '#0d0d1a',
  },
});

monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});

/**
 * @param {HTMLElement} container  The .editor-code slot
 * @param {object} callbacks
 * @param {(behaviorId:string, source:string)=>void|Promise<void>} callbacks.onSave
 * @param {(behaviorId:string, fileName:string, source:string)=>void} callbacks.onDownload
 * @param {()=>void} [callbacks.onDirtyChange]  Fired when any open file's dirty state may have changed
 */
export function createCodeEditor(container, callbacks) {
  const tabsBar = document.createElement('div');
  tabsBar.className = 'code-tabs-bar';

  const editorWrap = document.createElement('div');
  editorWrap.className = 'code-editor-wrap';

  const actionsBar = document.createElement('div');
  actionsBar.className = 'code-editor-actions';
  actionsBar.innerHTML = `
    <button class="code-action-btn primary" id="ce-save" title="Save changes to memory">Save</button>
    <button class="code-action-btn" id="ce-download" title="Download .ts file">Download .ts</button>
    <button class="code-action-btn" id="ce-close-tab" title="Close current tab">Close Tab</button>
    <span class="code-action-label" id="ce-status"></span>
  `;

  container.appendChild(tabsBar);
  container.appendChild(editorWrap);
  container.appendChild(actionsBar);

  const saveBtn = actionsBar.querySelector('#ce-save');
  const downloadBtn = actionsBar.querySelector('#ce-download');
  const closeTabBtn = actionsBar.querySelector('#ce-close-tab');
  const statusLabel = actionsBar.querySelector('#ce-status');

  /** @type {Map<string, { behaviorId:string, fileName:string, source:string, savedSource:string, model:any, viewState:any }>} */
  const openFiles = new Map();
  let activeFileId = null;
  let editorInstance = null;
  let editorCreated = false;

  function notifyDirty() {
    if (callbacks.onDirtyChange) callbacks.onDirtyChange();
  }

  function isFileDirty(fid) {
    const file = openFiles.get(fid);
    if (!file) return false;
    return file.model.getValue() !== file.savedSource;
  }

  function initEditorIfNeeded() {
    if (editorCreated) return;
    editorCreated = true;
    editorInstance = monaco.editor.create(editorWrap, {
      theme: 'navme-dark',
      language: 'typescript',
      fontSize: 13,
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true },
      padding: { top: 8, bottom: 8 },
    });
  }

  function renderTabs() {
    tabsBar.innerHTML = '';
    for (const [fid, file] of openFiles) {
      const tab = document.createElement('button');
      tab.className = 'code-tab' + (fid === activeFileId ? ' active' : '');
      const dirty = isFileDirty(fid);
      tab.innerHTML = `
        ${dirty ? iconDirty() : ''}
        <span class="code-tab-name">${file.fileName}</span>
        <span class="code-tab-close" data-fid="${fid}">${icons.close}</span>
      `;
      tab.addEventListener('click', (e) => {
        if (e.target.closest('.code-tab-close')) return;
        switchToFile(fid);
      });
      tab.querySelector('.code-tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeFile(fid);
      });
      tabsBar.appendChild(tab);
    }
  }

  function switchToFile(fid) {
    if (!openFiles.has(fid)) return;

    if (activeFileId && editorInstance) {
      const prev = openFiles.get(activeFileId);
      if (prev) {
        prev.source = editorInstance.getValue();
        prev.viewState = editorInstance.saveViewState();
      }
    }

    activeFileId = fid;
    const file = openFiles.get(fid);

    if (editorInstance) {
      editorInstance.setModel(file.model);
      if (file.viewState) editorInstance.restoreViewState(file.viewState);
      editorInstance.focus();
    }

    statusLabel.textContent = file.fileName;
    renderTabs();
    notifyDirty();
  }

  async function saveFileInternal(fid) {
    const file = openFiles.get(fid);
    if (!file) return false;
    initEditorIfNeeded();
    const val = file.model.getValue();
    file.source = val;
    if (callbacks.onSave) await Promise.resolve(callbacks.onSave(file.behaviorId, val));
    file.savedSource = val;
    notifyDirty();
    renderTabs();
    if (activeFileId === fid) {
      statusLabel.textContent = `${file.fileName} \u2014 saved`;
    }
    return true;
  }

  function closeFile(fid) {
    const file = openFiles.get(fid);
    if (!file) return;

    if (file.model) file.model.dispose();
    openFiles.delete(fid);

    if (activeFileId === fid) {
      const remaining = [...openFiles.keys()];
      if (remaining.length > 0) {
        switchToFile(remaining[remaining.length - 1]);
      } else {
        activeFileId = null;
        if (editorInstance) editorInstance.setModel(null);
        statusLabel.textContent = '';
      }
    }
    renderTabs();
    notifyDirty();
  }

  saveBtn.addEventListener('click', async () => {
    if (!activeFileId) return;
    await saveFileInternal(activeFileId);
  });

  downloadBtn.addEventListener('click', () => {
    if (!activeFileId || !editorInstance) return;
    const file = openFiles.get(activeFileId);
    if (!file) return;
    file.source = editorInstance.getValue();
    if (callbacks.onDownload) callbacks.onDownload(file.behaviorId, file.fileName, file.source);
    statusLabel.textContent = `${file.fileName} — downloaded`;
  });

  closeTabBtn.addEventListener('click', () => {
    if (activeFileId) closeFile(activeFileId);
  });

  return {
    /**
     * Open a behavior file in the code editor. Creates a tab if not already open.
     */
    async openFile(fileId, fileName, source, language) {
      initEditorIfNeeded();

      if (openFiles.has(fileId)) {
        switchToFile(fileId);
        return;
      }

      const lang = language || 'typescript';
      const model = monaco.editor.createModel(source, lang);
      openFiles.set(fileId, {
        behaviorId: fileId,
        fileName,
        source,
        savedSource: source,
        model,
        viewState: null,
      });
      model.onDidChangeContent(() => notifyDirty());

      switchToFile(fileId);
    },

    /** @returns {Promise<boolean>} */
    saveFile(fileId) {
      return saveFileInternal(fileId);
    },

    isFileDirty(fileId) {
      return isFileDirty(fileId);
    },

    hasOpenFile(fileId) {
      return openFiles.has(fileId);
    },

    closeFile(behaviorId) {
      closeFile(behaviorId);
    },

    updateFileName(behaviorId, fileName) {
      const file = openFiles.get(behaviorId);
      if (file) {
        file.fileName = fileName;
        renderTabs();
      }
    },

    getSource(behaviorId) {
      const file = openFiles.get(behaviorId);
      if (!file) return null;
      file.source = file.model.getValue();
      return file.source;
    },

    hasOpenFiles() {
      return openFiles.size > 0;
    },

    layout() {
      if (editorInstance) editorInstance.layout();
    },
  };
}

/**
 * File Explorer — virtual files, create row, drag to viewport, ⋮ menu (save / download / delete / rename / duplicate).
 */
import { icons, fileTypeBadge, iconDirty } from './svg-icons.js';

const EXT_OPTIONS = [
  { ext: 'ts', label: 'TypeScript (.ts)' },
  { ext: 'js', label: 'JavaScript (.js)' },
  { ext: 'html', label: 'HTML (.html)' },
  { ext: 'css', label: 'CSS (.css)' },
];

let activeDropdownEl = null;
let activeDropdownClose = null;

function closeActiveDropdown() {
  if (activeDropdownClose) {
    document.removeEventListener('mousedown', activeDropdownClose, true);
    activeDropdownClose = null;
  }
  if (activeDropdownEl) {
    activeDropdownEl.remove();
    activeDropdownEl = null;
  }
}

/**
 * @param {HTMLElement} container
 * @param {object} callbacks
 * @param {()=>Array} callbacks.getFiles
 * @param {(name:string, ext:string)=>object} callbacks.onCreateFile
 * @param {(fileId:string)=>void} callbacks.onOpenFile
 * @param {(fileId:string)=>void} callbacks.onDeleteFile
 * @param {(fileId:string)=>boolean} [callbacks.isFileDirty]
 * @param {(fileId:string)=>void|Promise<void>} [callbacks.onSaveFile]
 * @param {(fileId:string)=>void} [callbacks.onDownloadFile]
 * @param {(fileId:string)=>void} [callbacks.onRenameFile]
 * @param {(fileId:string)=>void} [callbacks.onDuplicateFile]
 * @param {(objectId:string)=>string} [callbacks.getObjectLabel]
 */
export function createFileExplorer(container, callbacks) {
  const panel = document.createElement('div');
  panel.className = 'fexp-panel';

  panel.innerHTML = `
    <div class="fexp-header">
      <span>FILES</span>
      <button type="button" class="fexp-add-btn" id="fexp-add" title="New file">${icons.plus}</button>
    </div>
    <div class="fexp-new hidden" id="fexp-new-form">
      <label class="fexp-name-label" for="fexp-new-name">File name</label>
      <input type="text" class="fexp-name-input" id="fexp-new-name" placeholder="e.g. overlay or overlay.html" spellcheck="false" autocomplete="off" />
      <div class="fexp-new-row">
        <select class="fexp-ext-select" id="fexp-new-ext" aria-label="File type"></select>
        <button type="button" class="fexp-create-btn" id="fexp-new-create">Create</button>
        <button type="button" class="fexp-cancel-btn" id="fexp-new-cancel" title="Cancel">${icons.close}</button>
      </div>
    </div>
    <div class="fexp-list" id="fexp-list"></div>
  `;

  container.appendChild(panel);

  const addBtn = panel.querySelector('#fexp-add');
  const newForm = panel.querySelector('#fexp-new-form');
  const nameInput = panel.querySelector('#fexp-new-name');
  const extSelect = panel.querySelector('#fexp-new-ext');
  const createBtn = panel.querySelector('#fexp-new-create');
  const cancelBtn = panel.querySelector('#fexp-new-cancel');
  const listEl = panel.querySelector('#fexp-list');

  EXT_OPTIONS.forEach(({ ext, label }) => {
    const opt = document.createElement('option');
    opt.value = ext;
    opt.textContent = label;
    extSelect.appendChild(opt);
  });

  addBtn.addEventListener('click', () => {
    newForm.classList.toggle('hidden');
    if (!newForm.classList.contains('hidden')) {
      nameInput.value = '';
      nameInput.focus();
    }
  });

  cancelBtn.addEventListener('click', () => {
    newForm.classList.add('hidden');
  });

  function doCreate() {
    const raw = nameInput.value.trim();
    if (!raw) return;
    const ext = extSelect.value;
    const name = raw.includes('.') ? raw : `${raw}.${ext}`;
    callbacks.onCreateFile(name, ext);
    newForm.classList.add('hidden');
    refresh();
  }

  createBtn.addEventListener('click', doCreate);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doCreate();
  });

  function openFileMenu(anchorBtn, file) {
    closeActiveDropdown();

    const dd = document.createElement('div');
    dd.className = 'fexp-dropdown';
    dd.setAttribute('role', 'menu');

    const dirty = callbacks.isFileDirty ? callbacks.isFileDirty(file.id) : false;
    const items = [
      { key: 'save', label: 'Save', disabled: !dirty || !callbacks.onSaveFile },
      { key: 'download', label: 'Download', disabled: !callbacks.onDownloadFile },
      { key: 'rename', label: 'Rename', disabled: !callbacks.onRenameFile },
      { key: 'duplicate', label: 'Duplicate', disabled: !callbacks.onDuplicateFile },
      { key: 'delete', label: 'Delete', danger: true, disabled: !callbacks.onDeleteFile },
    ];

    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fexp-menu-item' + (item.danger ? ' danger' : '');
      btn.textContent = item.label;
      btn.disabled = !!item.disabled;
      btn.setAttribute('role', 'menuitem');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeActiveDropdown();
        if (item.disabled) return;
        switch (item.key) {
          case 'save':
            if (callbacks.onSaveFile) await Promise.resolve(callbacks.onSaveFile(file.id));
            break;
          case 'download':
            callbacks.onDownloadFile(file.id);
            break;
          case 'rename':
            callbacks.onRenameFile(file.id);
            break;
          case 'duplicate':
            callbacks.onDuplicateFile(file.id);
            break;
          case 'delete':
            callbacks.onDeleteFile(file.id);
            break;
          default:
            break;
        }
        refresh();
      });
      dd.appendChild(btn);
    });

    document.body.appendChild(dd);
    activeDropdownEl = dd;
    dd.style.position = 'fixed';
    dd.style.zIndex = '10000';
    const pad = 4;
    const place = () => {
      const rect = anchorBtn.getBoundingClientRect();
      const w = dd.offsetWidth;
      const h = dd.offsetHeight;
      let left = rect.right - w;
      if (left < pad) left = pad;
      if (left + w > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - w - pad);
      }
      let top = rect.bottom + pad;
      if (top + h > window.innerHeight - pad) {
        top = Math.max(pad, rect.top - h - pad);
      }
      dd.style.left = `${left}px`;
      dd.style.top = `${top}px`;
    };
    requestAnimationFrame(() => requestAnimationFrame(place));

    activeDropdownClose = (ev) => {
      if (dd.contains(ev.target) || anchorBtn.contains(ev.target)) return;
      closeActiveDropdown();
    };
    document.addEventListener('mousedown', activeDropdownClose, true);
  }

  function refresh() {
    closeActiveDropdown();
    const files = callbacks.getFiles();
    listEl.innerHTML = '';

    if (files.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fexp-empty';
      empty.textContent = 'No files yet';
      listEl.appendChild(empty);
      return;
    }

    files.forEach((file) => {
      const row = document.createElement('div');
      row.className = 'fexp-item';
      row.draggable = true;
      row.dataset.fileId = file.id;

      const icon = fileTypeBadge(file.ext);
      let attachSuffix = '';
      if (file.attachedTo) {
        const objLabel = callbacks.getObjectLabel ? callbacks.getObjectLabel(file.attachedTo) : '';
        attachSuffix = objLabel
          ? ` \u2192 ${objLabel}`
          : ' \u2713 attached';
      }

      const dirty = callbacks.isFileDirty ? callbacks.isFileDirty(file.id) : false;
      const displayLine = `${file.name}${attachSuffix}`;

      row.innerHTML = `
        <span class="fexp-icon" aria-hidden="true">${icon}</span>
        <span class="fexp-name-wrap">
          ${dirty ? iconDirty() : ''}
          <span class="fexp-name" title="${escapeAttr(displayLine)}"></span>
        </span>
        <button type="button" class="fexp-kebab" data-fid="${file.id}" title="File actions" aria-label="File actions" aria-haspopup="menu">${icons.moreVertical}</button>
      `;
      row.querySelector('.fexp-name').textContent = displayLine;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.fexp-kebab')) return;
        callbacks.onOpenFile(file.id);
      });

      const kebab = row.querySelector('.fexp-kebab');
      kebab.addEventListener('click', (e) => {
        e.stopPropagation();
        openFileMenu(kebab, file);
      });

      row.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', file.id);
        e.dataTransfer.setData('application/x-navme-file', file.id);
        e.dataTransfer.effectAllowed = 'copyLink';
      });

      listEl.appendChild(row);
    });
  }

  refresh();

  return { refresh };
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

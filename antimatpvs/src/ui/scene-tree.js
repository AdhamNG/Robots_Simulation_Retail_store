/**
 * Scene Tree — left panel showing the object hierarchy.
 */
import { icons, treeObjectIcon } from './svg-icons.js';

/**
 * @param {HTMLElement} container
 * @param {object} callbacks
 * @param {(id:string)=>void} callbacks.onSelect
 * @param {()=>import('../ar/scene-objects.js').default[]} callbacks.getObjects
 * @param {(objectId:string)=>string} [callbacks.getAttachmentHint]  e.g. " \u{1F4CE}2"
 */
export function createSceneTree(container, callbacks) {
  const panel = document.createElement('div');
  panel.className = 'tree-panel';

  panel.innerHTML = `
    <div class="tree-header">SCENE</div>
    <div class="tree-section">
      <div class="tree-item tree-item-map" id="tree-map">
        <span class="tree-icon">${icons.layers}</span>
        <span class="tree-label">Map Mesh</span>
      </div>
    </div>
    <div class="tree-divider"></div>
    <div class="tree-section-header">OBJECTS</div>
    <div class="tree-list" id="tree-list"></div>
  `;

  container.appendChild(panel);

  const listEl = panel.querySelector('#tree-list');
  let selectedId = null;

  function refresh() {
    const objects = callbacks.getObjects();
    listEl.innerHTML = '';

    if (objects.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tree-empty';
      empty.textContent = 'No objects yet. Use + Add to create one.';
      listEl.appendChild(empty);
      return;
    }

    objects.forEach((obj) => {
      const item = document.createElement('div');
      item.className = `tree-item${obj.id === selectedId ? ' active' : ''}`;
      item.dataset.id = obj.id;
      const attachHint = callbacks.getAttachmentHint ? callbacks.getAttachmentHint(obj.id) : '';
      item.innerHTML = `
        <span class="tree-icon">${treeObjectIcon(obj.type)}</span>
        <span class="tree-label">${obj.name}${attachHint}</span>
      `;
      item.addEventListener('click', () => {
        callbacks.onSelect(obj.id);
      });
      listEl.appendChild(item);
    });
  }

  function setSelected(id) {
    selectedId = id;
    listEl.querySelectorAll('.tree-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  }

  refresh();

  return { refresh, setSelected };
}

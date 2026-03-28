/**
 * Editor Layout Shell — CSS Grid with toolbar, scene tree, viewport, code editor, properties, status bar.
 */

export function createEditorLayout(container) {
  const el = document.createElement('div');
  el.className = 'editor hidden';
  el.id = 'editor';

  el.innerHTML = `
    <div class="editor-toolbar" id="editor-toolbar"></div>
    <div class="editor-left" id="editor-left">
      <div class="editor-tree" id="editor-tree"></div>
      <div class="editor-files" id="editor-files"></div>
    </div>
    <div class="editor-center" id="editor-center">
      <div class="editor-viewport" id="editor-viewport"></div>
      <div class="editor-code hidden" id="editor-code"></div>
    </div>
    <div class="editor-properties" id="editor-properties"></div>
    <div class="editor-status" id="editor-status">Ready</div>
  `;

  container.appendChild(el);

  const codePanel = el.querySelector('#editor-code');
  let codeVisible = false;

  return {
    element: el,
    viewport: el.querySelector('#editor-viewport'),
    toolbarSlot: el.querySelector('#editor-toolbar'),
    treeSlot: el.querySelector('#editor-tree'),
    filesSlot: el.querySelector('#editor-files'),
    propertiesSlot: el.querySelector('#editor-properties'),
    codeSlot: codePanel,
    statusEl: el.querySelector('#editor-status'),
    show() { el.classList.remove('hidden'); },
    hide() { el.classList.add('hidden'); },
    setStatus(msg) { el.querySelector('#editor-status').textContent = msg; },
    toggleCode() {
      codeVisible = !codeVisible;
      codePanel.classList.toggle('hidden', !codeVisible);
      return codeVisible;
    },
    showCode() {
      codeVisible = true;
      codePanel.classList.remove('hidden');
    },
    hideCode() {
      codeVisible = false;
      codePanel.classList.add('hidden');
    },
    get isCodeVisible() { return codeVisible; },
  };
}

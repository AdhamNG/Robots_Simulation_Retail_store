/**
 * Properties Panel — right panel inspector for the selected 3D object or route.
 */
import { icons } from './svg-icons.js';

/**
 * @param {HTMLElement} container
 * @param {object} callbacks
 * @param {(id:string, prop:string, value:any)=>void} callbacks.onUpdate
 * @param {(id:string)=>void} callbacks.onDelete
 * @param {(id:string, sub:string)=>void} callbacks.onSelectRouteTarget
 * @param {()=>Array<any>} callbacks.getObjects
 * @param {(id:string, name:string)=>object} callbacks.onAddBehavior
 * @param {(id:string, behId:string)=>void} callbacks.onRemoveBehavior
 * @param {(id:string, behId:string)=>void} callbacks.onRedownloadBehavior
 * @param {(id:string, behId:string)=>void} callbacks.onEditBehavior
 * @param {(id:string)=>void} [callbacks.onNavMeshGenerate]
 * @param {(id:string)=>void} [callbacks.onNavMeshSaveToFiles]
 */
export function createPropertiesPanel(container, callbacks) {
  const panel = document.createElement('div');
  panel.className = 'props-panel';

  panel.innerHTML = `
    <div class="props-header">PROPERTIES</div>
    <div class="props-empty" id="props-empty">Select an object to view its properties</div>

    <!-- Standard object body -->
    <div class="props-body hidden" id="props-body">
      <div class="props-section">
        <label class="props-label">Name</label>
        <input type="text" class="props-input props-name" id="prop-name" />
      </div>

      <div class="props-section">
        <label class="props-label">Position</label>
        <div class="props-xyz">
          <div class="props-field">
            <span class="props-axis props-axis-x">X</span>
            <input type="number" step="any" id="prop-pos-x" />
          </div>
          <div class="props-field">
            <span class="props-axis props-axis-y">Y</span>
            <input type="number" step="any" id="prop-pos-y" />
          </div>
          <div class="props-field">
            <span class="props-axis props-axis-z">Z</span>
            <input type="number" step="any" id="prop-pos-z" />
          </div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Rotation (\u00B0)</label>
        <div class="props-xyz">
          <div class="props-field">
            <span class="props-axis props-axis-x">X</span>
            <input type="number" step="any" id="prop-rot-x" />
          </div>
          <div class="props-field">
            <span class="props-axis props-axis-y">Y</span>
            <input type="number" step="any" id="prop-rot-y" />
          </div>
          <div class="props-field">
            <span class="props-axis props-axis-z">Z</span>
            <input type="number" step="any" id="prop-rot-z" />
          </div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Scale</label>
        <div class="props-xyz">
          <div class="props-field">
            <span class="props-axis props-axis-x">X</span>
            <input type="number" step="any" id="prop-scl-x" />
          </div>
          <div class="props-field">
            <span class="props-axis props-axis-y">Y</span>
            <input type="number" step="any" id="prop-scl-y" />
          </div>
          <div class="props-field">
            <span class="props-axis props-axis-z">Z</span>
            <input type="number" step="any" id="prop-scl-z" />
          </div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Color</label>
        <div class="props-color-row">
          <input type="color" id="prop-color" class="props-color-picker" />
          <input type="text" id="prop-color-hex" class="props-input props-color-hex" />
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Visible</label>
        <label class="props-toggle">
          <input type="checkbox" id="prop-visible" checked />
          <span class="props-toggle-slider"></span>
        </label>
      </div>

      <div class="props-section props-actions">
        <button class="props-btn-delete" id="prop-delete">Delete Object</button>
      </div>
    </div>

    <!-- Route-specific body -->
    <div class="props-body hidden" id="props-route-body">
      <div class="props-section">
        <label class="props-label">Name</label>
        <input type="text" class="props-input props-name" id="prop-route-name" />
      </div>

      <div class="props-section">
        <label class="props-label props-label-accent">Active Target</label>
        <div class="props-route-tabs">
          <button class="props-route-tab active" id="rt-tab-origin">Origin (Camera)</button>
          <button class="props-route-tab" id="rt-tab-dest">Destination</button>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Origin Position</label>
        <div class="props-xyz">
          <div class="props-field"><span class="props-axis props-axis-x">X</span><input type="number" step="any" id="prop-origin-x" /></div>
          <div class="props-field"><span class="props-axis props-axis-y">Y</span><input type="number" step="any" id="prop-origin-y" /></div>
          <div class="props-field"><span class="props-axis props-axis-z">Z</span><input type="number" step="any" id="prop-origin-z" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Destination Position</label>
        <div class="props-xyz">
          <div class="props-field"><span class="props-axis props-axis-x">X</span><input type="number" step="any" id="prop-dest-x" /></div>
          <div class="props-field"><span class="props-axis props-axis-y">Y</span><input type="number" step="any" id="prop-dest-y" /></div>
          <div class="props-field"><span class="props-axis props-axis-z">Z</span><input type="number" step="any" id="prop-dest-z" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Destination From Object</label>
        <select class="props-input" id="prop-dest-object">
          <option value="">Custom destination (manual)</option>
        </select>
      </div>

      <div class="props-section">
        <label class="props-label">Camera Y Offset</label>
        <div class="props-xyz">
          <div class="props-field" style="flex:1"><input type="number" step="any" id="prop-cam-offset" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Route Status</label>
        <div class="props-route-status" id="prop-route-status">-</div>
      </div>

      <div class="props-section">
        <label class="props-label">Visible</label>
        <label class="props-toggle">
          <input type="checkbox" id="prop-route-visible" checked />
          <span class="props-toggle-slider"></span>
        </label>
      </div>

      <div class="props-section">
        <button class="props-btn-action" id="prop-route-rebuild">Rebuild Route</button>
      </div>

      <div class="props-section props-actions">
        <button class="props-btn-delete" id="prop-route-delete">Delete Route</button>
      </div>
    </div>

    <!-- Navigation Breadcrumbs (separate object; curve = navigation route) -->
    <div class="props-body hidden" id="props-crumbs-body">
      <div class="props-section">
        <label class="props-label">Name</label>
        <input type="text" class="props-input props-name" id="prop-crumbs-name" />
      </div>

      <div class="props-section">
        <label class="props-label">Curve (Navigation Route)</label>
        <select class="props-input" id="prop-crumbs-curve">
          <option value="">None \u2014 select a route</option>
        </select>
      </div>

      <div class="props-section">
        <label class="props-label">Breadcrumb Gap</label>
        <div class="props-xyz">
          <div class="props-field" style="flex:1"><input type="number" step="0.05" min="0.05" id="prop-crumbs-gap" value="0.3" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Colors</label>
        <div class="props-color-row">
          <input type="color" id="prop-crumbs-base" class="props-color-picker" value="#000000" title="Base" />
          <input type="color" id="prop-crumbs-outline" class="props-color-picker" value="#ffffff" title="Outline" />
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Status</label>
        <div class="props-route-status" id="prop-crumbs-status">-</div>
      </div>

      <div class="props-section">
        <label class="props-label">Visible</label>
        <label class="props-toggle">
          <input type="checkbox" id="prop-crumbs-visible" checked />
          <span class="props-toggle-slider"></span>
        </label>
      </div>

      <div class="props-section props-actions">
        <button class="props-btn-delete" id="prop-crumbs-delete">Delete</button>
      </div>
    </div>

    <!-- Navigation Mesh node (ZComponent-style + behaviors) -->
    <div class="props-body hidden" id="props-navmesh-body">
      <div class="props-section props-navmesh-header">
        <span class="props-navmesh-title">NavigationMesh</span>
        <div class="props-navmesh-actions">
          <button type="button" class="props-btn-link" id="prop-nm-save">save</button>
          <button type="button" class="props-btn-link" id="prop-nm-generate">generate</button>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Name</label>
        <input type="text" class="props-input props-name" id="prop-nm-name" />
      </div>

      <div class="props-section">
        <label class="props-label">Position</label>
        <div class="props-xyz">
          <div class="props-field"><span class="props-axis props-axis-x">X</span><input type="number" step="any" id="prop-nm-pos-x" /></div>
          <div class="props-field"><span class="props-axis props-axis-y">Y</span><input type="number" step="any" id="prop-nm-pos-y" /></div>
          <div class="props-field"><span class="props-axis props-axis-z">Z</span><input type="number" step="any" id="prop-nm-pos-z" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Rotation (\u00B0)</label>
        <div class="props-xyz">
          <div class="props-field"><span class="props-axis props-axis-x">X</span><input type="number" step="any" id="prop-nm-rot-x" /></div>
          <div class="props-field"><span class="props-axis props-axis-y">Y</span><input type="number" step="any" id="prop-nm-rot-y" /></div>
          <div class="props-field"><span class="props-axis props-axis-z">Z</span><input type="number" step="any" id="prop-nm-rot-z" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Scale</label>
        <div class="props-xyz">
          <div class="props-field"><span class="props-axis props-axis-x">X</span><input type="number" step="any" id="prop-nm-scl-x" /></div>
          <div class="props-field"><span class="props-axis props-axis-y">Y</span><input type="number" step="any" id="prop-nm-scl-y" /></div>
          <div class="props-field"><span class="props-axis props-axis-z">Z</span><input type="number" step="any" id="prop-nm-scl-z" /></div>
        </div>
      </div>

      <div class="props-section">
        <label class="props-label">Set As Default</label>
        <select class="props-input" id="prop-nm-default">
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>

      <div class="props-section">
        <label class="props-label">Source</label>
        <input type="text" class="props-input" id="prop-nm-source" placeholder="asset path or id" />
      </div>

      <div class="props-section">
        <label class="props-label">Include Only Tags</label>
        <input type="text" class="props-input" id="prop-nm-include-tags" />
      </div>

      <div class="props-section">
        <label class="props-label">Exclude Tags</label>
        <div class="props-xyz">
          <div class="props-field" style="flex:1"><input type="text" class="props-input" id="prop-nm-exclude-a" placeholder="navmesh:exclude" /></div>
          <div class="props-field" style="flex:1"><input type="text" class="props-input" id="prop-nm-exclude-b" /></div>
        </div>
      </div>

      <div class="props-section props-row-checks">
        <label class="props-toggle props-toggle-inline">
          <input type="checkbox" id="prop-nm-design-preview" />
          <span class="props-toggle-slider"></span>
          <span class="props-check-label">Design Time Preview</span>
        </label>
        <label class="props-toggle props-toggle-inline">
          <input type="checkbox" id="prop-nm-runtime-preview" />
          <span class="props-toggle-slider"></span>
          <span class="props-check-label">Run Time Preview</span>
        </label>
      </div>

      <div class="props-section">
        <label class="props-label">Border Size</label>
        <input type="number" step="any" class="props-input" id="prop-nm-border" />
      </div>

      <div class="props-section">
        <label class="props-label">Walkable Climb</label>
        <input type="number" step="any" class="props-input" id="prop-nm-climb" />
      </div>

      <div class="props-section">
        <label class="props-label">Walkable Height</label>
        <input type="number" step="any" class="props-input" id="prop-nm-height" />
      </div>

      <div class="props-section">
        <label class="props-label">Visible</label>
        <label class="props-toggle">
          <input type="checkbox" id="prop-nm-visible" checked />
          <span class="props-toggle-slider"></span>
        </label>
      </div>

      <div class="props-section props-actions">
        <button class="props-btn-delete" id="prop-nm-delete">Delete Object</button>
      </div>
    </div>

    <!-- Shared Behaviors section (appears for ALL object types) -->
    <div class="props-body hidden" id="props-behaviors-body">
      <div class="props-section">
        <label class="props-label" style="display:flex;align-items:center;justify-content:space-between;">
          <span>BEHAVIORS</span>
          <button class="props-btn-small" id="prop-add-behavior" title="Add Custom Behavior">+ Add</button>
        </label>
      </div>
      <div class="props-behavior-list" id="prop-behavior-list"></div>
    </div>
  `;

  container.appendChild(panel);

  /* ---- Standard object refs ---- */
  const emptyEl = panel.querySelector('#props-empty');
  const bodyEl = panel.querySelector('#props-body');
  const nameInput = panel.querySelector('#prop-name');
  const posX = panel.querySelector('#prop-pos-x');
  const posY = panel.querySelector('#prop-pos-y');
  const posZ = panel.querySelector('#prop-pos-z');
  const rotX = panel.querySelector('#prop-rot-x');
  const rotY = panel.querySelector('#prop-rot-y');
  const rotZ = panel.querySelector('#prop-rot-z');
  const sclX = panel.querySelector('#prop-scl-x');
  const sclY = panel.querySelector('#prop-scl-y');
  const sclZ = panel.querySelector('#prop-scl-z');
  const colorPicker = panel.querySelector('#prop-color');
  const colorHex = panel.querySelector('#prop-color-hex');
  const visibleCb = panel.querySelector('#prop-visible');
  const deleteBtn = panel.querySelector('#prop-delete');

  /* ---- Route-specific refs ---- */
  const routeBody = panel.querySelector('#props-route-body');
  const routeName = panel.querySelector('#prop-route-name');
  const originX = panel.querySelector('#prop-origin-x');
  const originY = panel.querySelector('#prop-origin-y');
  const originZ = panel.querySelector('#prop-origin-z');
  const destX = panel.querySelector('#prop-dest-x');
  const destY = panel.querySelector('#prop-dest-y');
  const destZ = panel.querySelector('#prop-dest-z');
  const destObjectSelect = panel.querySelector('#prop-dest-object');
  const camOffset = panel.querySelector('#prop-cam-offset');
  const routeStatus = panel.querySelector('#prop-route-status');
  const routeVisibleCb = panel.querySelector('#prop-route-visible');
  const routeDeleteBtn = panel.querySelector('#prop-route-delete');
  const routeRebuildBtn = panel.querySelector('#prop-route-rebuild');
  const tabOrigin = panel.querySelector('#rt-tab-origin');
  const tabDest = panel.querySelector('#rt-tab-dest');

  const crumbsBody = panel.querySelector('#props-crumbs-body');
  const crumbsName = panel.querySelector('#prop-crumbs-name');
  const crumbsCurveSelect = panel.querySelector('#prop-crumbs-curve');
  const crumbsGap = panel.querySelector('#prop-crumbs-gap');
  const crumbsBase = panel.querySelector('#prop-crumbs-base');
  const crumbsOutline = panel.querySelector('#prop-crumbs-outline');
  const crumbsStatus = panel.querySelector('#prop-crumbs-status');
  const crumbsVisibleCb = panel.querySelector('#prop-crumbs-visible');
  const crumbsDeleteBtn = panel.querySelector('#prop-crumbs-delete');

  const navMeshBody = panel.querySelector('#props-navmesh-body');
  const nmSaveBtn = panel.querySelector('#prop-nm-save');
  const nmGenerateBtn = panel.querySelector('#prop-nm-generate');
  const nmName = panel.querySelector('#prop-nm-name');
  const nmPosX = panel.querySelector('#prop-nm-pos-x');
  const nmPosY = panel.querySelector('#prop-nm-pos-y');
  const nmPosZ = panel.querySelector('#prop-nm-pos-z');
  const nmRotX = panel.querySelector('#prop-nm-rot-x');
  const nmRotY = panel.querySelector('#prop-nm-rot-y');
  const nmRotZ = panel.querySelector('#prop-nm-rot-z');
  const nmSclX = panel.querySelector('#prop-nm-scl-x');
  const nmSclY = panel.querySelector('#prop-nm-scl-y');
  const nmSclZ = panel.querySelector('#prop-nm-scl-z');
  const nmDefault = panel.querySelector('#prop-nm-default');
  const nmSource = panel.querySelector('#prop-nm-source');
  const nmIncludeTags = panel.querySelector('#prop-nm-include-tags');
  const nmExcludeA = panel.querySelector('#prop-nm-exclude-a');
  const nmExcludeB = panel.querySelector('#prop-nm-exclude-b');
  const nmDesignPreview = panel.querySelector('#prop-nm-design-preview');
  const nmRuntimePreview = panel.querySelector('#prop-nm-runtime-preview');
  const nmBorder = panel.querySelector('#prop-nm-border');
  const nmClimb = panel.querySelector('#prop-nm-climb');
  const nmHeight = panel.querySelector('#prop-nm-height');
  const nmVisible = panel.querySelector('#prop-nm-visible');
  const nmDeleteBtn = panel.querySelector('#prop-nm-delete');

  const behaviorsBody = panel.querySelector('#props-behaviors-body');
  const addBehaviorBtn = panel.querySelector('#prop-add-behavior');
  const behaviorListEl = panel.querySelector('#prop-behavior-list');

  let currentId = null;
  let isRoute = false;
  let isCrumbs = false;
  let isNavMesh = false;

  /* ---- Standard wiring ---- */
  function wire(input, prop, extract) {
    input.addEventListener('input', () => {
      if (!currentId) return;
      callbacks.onUpdate(currentId, prop, extract());
    });
  }

  wire(nameInput, 'name', () => nameInput.value);
  wire(posX, 'position', () => ({ x: +posX.value, y: +posY.value, z: +posZ.value }));
  wire(posY, 'position', () => ({ x: +posX.value, y: +posY.value, z: +posZ.value }));
  wire(posZ, 'position', () => ({ x: +posX.value, y: +posY.value, z: +posZ.value }));
  wire(rotX, 'rotation', () => ({ x: +rotX.value, y: +rotY.value, z: +rotZ.value }));
  wire(rotY, 'rotation', () => ({ x: +rotX.value, y: +rotY.value, z: +rotZ.value }));
  wire(rotZ, 'rotation', () => ({ x: +rotX.value, y: +rotY.value, z: +rotZ.value }));
  wire(sclX, 'scale', () => ({ x: +sclX.value, y: +sclY.value, z: +sclZ.value }));
  wire(sclY, 'scale', () => ({ x: +sclX.value, y: +sclY.value, z: +sclZ.value }));
  wire(sclZ, 'scale', () => ({ x: +sclX.value, y: +sclY.value, z: +sclZ.value }));

  colorPicker.addEventListener('input', () => {
    if (!currentId) return;
    colorHex.value = colorPicker.value;
    callbacks.onUpdate(currentId, 'color', colorPicker.value);
  });
  colorHex.addEventListener('change', () => {
    if (!currentId) return;
    colorPicker.value = colorHex.value;
    callbacks.onUpdate(currentId, 'color', colorHex.value);
  });

  visibleCb.addEventListener('change', () => {
    if (!currentId) return;
    callbacks.onUpdate(currentId, 'visible', visibleCb.checked);
  });

  deleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    callbacks.onDelete(currentId);
  });

  /* ---- Route wiring ---- */
  routeName.addEventListener('input', () => {
    if (!currentId) return;
    callbacks.onUpdate(currentId, 'name', routeName.value);
  });

  function wireRouteOrigin() {
    if (!currentId) return;
    callbacks.onUpdate(currentId, 'origin', { x: +originX.value, y: +originY.value, z: +originZ.value });
  }
  function wireRouteDest() {
    if (!currentId) return;
    callbacks.onUpdate(currentId, 'destination', { x: +destX.value, y: +destY.value, z: +destZ.value });
  }

  originX.addEventListener('input', wireRouteOrigin);
  originY.addEventListener('input', wireRouteOrigin);
  originZ.addEventListener('input', wireRouteOrigin);
  destX.addEventListener('input', wireRouteDest);
  destY.addEventListener('input', wireRouteDest);
  destZ.addEventListener('input', wireRouteDest);

  destObjectSelect.addEventListener('change', () => {
    if (!currentId) return;
    const selectedObjectId = destObjectSelect.value;

    // Always update the binding (empty string = unbound)
    callbacks.onUpdate(currentId, 'destinationObjectId', selectedObjectId || null);

    if (!selectedObjectId) return;
    if (!callbacks.getObjects) return;
    const allObjects = callbacks.getObjects();
    const target = allObjects.find((o) => o.id === selectedObjectId);
    if (!target || target.type === 'route') return;

    const p = target.mesh.position;
    destX.value = p.x.toFixed(3);
    destY.value = p.y.toFixed(3);
    destZ.value = p.z.toFixed(3);
    wireRouteDest();
  });

  camOffset.addEventListener('input', () => {
    if (!currentId) return;
    callbacks.onUpdate(currentId, 'cameraOffsetY', +camOffset.value);
  });

  routeVisibleCb.addEventListener('change', () => {
    if (!currentId) return;
    callbacks.onUpdate(currentId, 'visible', routeVisibleCb.checked);
  });

  routeDeleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    callbacks.onDelete(currentId);
  });

  routeRebuildBtn.addEventListener('click', () => {
    if (!currentId) return;
    wireRouteOrigin();
    wireRouteDest();
  });

  crumbsName.addEventListener('input', () => {
    if (!currentId || !isCrumbs) return;
    callbacks.onUpdate(currentId, 'name', crumbsName.value);
  });

  crumbsCurveSelect.addEventListener('change', () => {
    if (!currentId || !isCrumbs) return;
    const rid = crumbsCurveSelect.value || null;
    callbacks.onUpdate(currentId, 'curveRouteId', rid);
    updateCrumbsStatus();
  });

  crumbsGap.addEventListener('input', () => {
    if (!currentId || !isCrumbs) return;
    const val = parseFloat(crumbsGap.value);
    if (val > 0) callbacks.onUpdate(currentId, 'breadcrumbGap', val);
    updateCrumbsStatus();
  });

  crumbsBase.addEventListener('input', () => {
    if (!currentId || !isCrumbs) return;
    callbacks.onUpdate(currentId, 'breadcrumbBaseColor', crumbsBase.value);
  });

  crumbsOutline.addEventListener('input', () => {
    if (!currentId || !isCrumbs) return;
    callbacks.onUpdate(currentId, 'breadcrumbOutlineColor', crumbsOutline.value);
  });

  crumbsVisibleCb.addEventListener('change', () => {
    if (!currentId || !isCrumbs) return;
    callbacks.onUpdate(currentId, 'visible', crumbsVisibleCb.checked);
  });

  crumbsDeleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    callbacks.onDelete(currentId);
  });

  nmName.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'name', nmName.value);
  });

  function wireNmPos() {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'position', { x: +nmPosX.value, y: +nmPosY.value, z: +nmPosZ.value });
  }
  function wireNmRot() {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'rotation', { x: +nmRotX.value, y: +nmRotY.value, z: +nmRotZ.value });
  }
  function wireNmScl() {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'scale', { x: +nmSclX.value, y: +nmSclY.value, z: +nmSclZ.value });
  }
  [nmPosX, nmPosY, nmPosZ].forEach((el) => el.addEventListener('input', wireNmPos));
  [nmRotX, nmRotY, nmRotZ].forEach((el) => el.addEventListener('input', wireNmRot));
  [nmSclX, nmSclY, nmSclZ].forEach((el) => el.addEventListener('input', wireNmScl));

  nmDefault.addEventListener('change', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { setAsDefault: nmDefault.value === 'true' });
  });

  nmSource.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { source: nmSource.value });
  });

  nmIncludeTags.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { includeOnlyTags: nmIncludeTags.value });
  });

  nmExcludeA.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { excludeTagLow: nmExcludeA.value });
  });

  nmExcludeB.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { excludeTagHigh: nmExcludeB.value });
  });

  nmDesignPreview.addEventListener('change', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { designTimePreview: nmDesignPreview.checked });
  });

  nmRuntimePreview.addEventListener('change', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { runTimePreview: nmRuntimePreview.checked });
  });

  nmBorder.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { borderSize: +nmBorder.value });
  });

  nmClimb.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { walkableClimb: +nmClimb.value });
  });

  nmHeight.addEventListener('input', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'navMeshSettings', { walkableHeight: +nmHeight.value });
  });

  nmVisible.addEventListener('change', () => {
    if (!currentId || !isNavMesh) return;
    callbacks.onUpdate(currentId, 'visible', nmVisible.checked);
  });

  nmDeleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    callbacks.onDelete(currentId);
  });

  nmSaveBtn.addEventListener('click', () => {
    if (!currentId || !callbacks.onNavMeshSaveToFiles) return;
    callbacks.onNavMeshSaveToFiles(currentId);
  });

  nmGenerateBtn.addEventListener('click', () => {
    if (!currentId || !callbacks.onNavMeshGenerate) return;
    callbacks.onNavMeshGenerate(currentId);
  });

  function updateCrumbsStatus() {
    if (!currentId || !isCrumbs || !callbacks.getEntry) return;
    const e = callbacks.getEntry(currentId);
    if (!e?.crumbs) return;
    const rid = e.crumbs.state.routeId;
    if (!rid) {
      crumbsStatus.textContent = 'No route selected';
      crumbsStatus.className = 'props-route-status invalid';
      return;
    }
    const re = callbacks.getObjects().find((o) => o.id === rid);
    if (!re?.route) {
      crumbsStatus.textContent = 'Route not found';
      crumbsStatus.className = 'props-route-status invalid';
      return;
    }
    const st = re.route.state;
    if (st.valid && st.pathPoints.length >= 2) {
      crumbsStatus.textContent = `Following ${re.name} \u2014 ${st.pathPoints.length} waypoints`;
      crumbsStatus.className = 'props-route-status valid';
    } else {
      crumbsStatus.textContent = `Route has no path: ${st.error || 'rebuild route or generate nav mesh'}`;
      crumbsStatus.className = 'props-route-status invalid';
    }
  }

  /* ---- Behaviors wiring ---- */
  addBehaviorBtn.addEventListener('click', async () => {
    if (!currentId) return;
    const name = prompt('Behavior name (e.g. MyBehavior):');
    if (!name || !name.trim()) return;
    if (callbacks.onAddBehavior) {
      await Promise.resolve(callbacks.onAddBehavior(currentId, name.trim()));
      refreshBehaviorList();
    }
  });

  function refreshBehaviorList() {
    behaviorListEl.innerHTML = '';
    if (!currentId || !callbacks.getEntry) return;
    const entry = callbacks.getEntry(currentId);
    if (!entry || !entry.behaviors || entry.behaviors.length === 0) {
      behaviorListEl.innerHTML = '<div class="props-behavior-empty">No behaviors attached</div>';
      return;
    }

    for (const beh of entry.behaviors) {
      const row = document.createElement('div');
      row.className = 'props-behavior-row';
      row.innerHTML = `
        <span class="props-behavior-icon">${icons.file}</span>
        <span class="props-behavior-name">${beh.className}</span>
        <span class="props-behavior-file">${beh.fileName}</span>
        <button type="button" class="props-behavior-btn-edit" title="Edit in code editor" data-bid="${beh.behaviorId}">${icons.pencil}</button>
        <button type="button" class="props-behavior-btn-dl" title="Re-download file" data-bid="${beh.behaviorId}">${icons.download}</button>
        <button type="button" class="props-behavior-btn-rm" title="Remove behavior" data-bid="${beh.behaviorId}">${icons.close}</button>
      `;
      row.querySelector('.props-behavior-btn-edit').addEventListener('click', () => {
        if (callbacks.onEditBehavior) callbacks.onEditBehavior(currentId, beh.behaviorId);
      });
      row.querySelector('.props-behavior-btn-dl').addEventListener('click', () => {
        if (callbacks.onRedownloadBehavior) callbacks.onRedownloadBehavior(currentId, beh.behaviorId);
      });
      row.querySelector('.props-behavior-btn-rm').addEventListener('click', () => {
        if (callbacks.onRemoveBehavior) callbacks.onRemoveBehavior(currentId, beh.behaviorId);
        refreshBehaviorList();
      });
      behaviorListEl.appendChild(row);
    }
  }

  tabOrigin.addEventListener('click', () => {
    tabOrigin.classList.add('active');
    tabDest.classList.remove('active');
    if (currentId && callbacks.onSelectRouteTarget) {
      callbacks.onSelectRouteTarget(currentId, 'origin');
    }
  });
  tabDest.addEventListener('click', () => {
    tabDest.classList.add('active');
    tabOrigin.classList.remove('active');
    if (currentId && callbacks.onSelectRouteTarget) {
      callbacks.onSelectRouteTarget(currentId, 'destination');
    }
  });

  /* ---- Public API ---- */

  function hideAll() {
    emptyEl.classList.add('hidden');
    bodyEl.classList.add('hidden');
    routeBody.classList.add('hidden');
    crumbsBody.classList.add('hidden');
    navMeshBody.classList.add('hidden');
    behaviorsBody.classList.add('hidden');
  }

  function refreshRouteTargets() {
    if (!callbacks.getObjects) return;
    const currentValue = destObjectSelect.value;
    const allObjects = callbacks.getObjects();
    const candidates = allObjects.filter(
      (o) => o.id !== currentId && o.type !== 'route' && o.type !== 'navBreadcrumbs' && o.type !== 'navigationMesh',
    );

    destObjectSelect.innerHTML = '<option value="">Custom destination (manual)</option>';
    for (const obj of candidates) {
      const opt = document.createElement('option');
      opt.value = obj.id;
      opt.textContent = obj.name;
      destObjectSelect.appendChild(opt);
    }

    if (candidates.some((o) => o.id === currentValue)) {
      destObjectSelect.value = currentValue;
    } else {
      destObjectSelect.value = '';
    }
  }

  function refreshCrumbsCurveSelect() {
    if (!callbacks.getObjects) return;
    const routes = callbacks.getObjects().filter((o) => o.type === 'route');

    let preferred = '';
    if (isCrumbs && currentId && callbacks.getEntry) {
      const e = callbacks.getEntry(currentId);
      if (e?.crumbs?.state?.routeId) preferred = e.crumbs.state.routeId;
    }
    if (!preferred && routes.some((o) => o.id === crumbsCurveSelect.value)) {
      preferred = crumbsCurveSelect.value;
    }

    crumbsCurveSelect.innerHTML = '<option value="">None \u2014 select a route</option>';
    for (const r of routes) {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      crumbsCurveSelect.appendChild(opt);
    }

    if (preferred && routes.some((o) => o.id === preferred)) {
      crumbsCurveSelect.value = preferred;
    }
  }

  function showObject(entry, subTarget) {
    hideAll();

    if (!entry) {
      currentId = null;
      isRoute = false;
      isCrumbs = false;
      isNavMesh = false;
      emptyEl.classList.remove('hidden');
      return;
    }

    currentId = entry.id;

    if (entry.type === 'navigationMesh' && entry.navMeshGroup) {
      isRoute = false;
      isCrumbs = false;
      isNavMesh = true;
      navMeshBody.classList.remove('hidden');

      nmName.value = entry.name;
      const g = entry.navMeshGroup;
      const p = g.position;
      nmPosX.value = p.x.toFixed(3);
      nmPosY.value = p.y.toFixed(3);
      nmPosZ.value = p.z.toFixed(3);
      const r = g.rotation;
      const toDeg = 180 / Math.PI;
      nmRotX.value = (r.x * toDeg).toFixed(1);
      nmRotY.value = (r.y * toDeg).toFixed(1);
      nmRotZ.value = (r.z * toDeg).toFixed(1);
      const s = g.scale;
      nmSclX.value = s.x.toFixed(3);
      nmSclY.value = s.y.toFixed(3);
      nmSclZ.value = s.z.toFixed(3);

      const st = entry.navMeshSettings;
      nmDefault.value = st.setAsDefault ? 'true' : 'false';
      nmSource.value = st.source || '';
      nmIncludeTags.value = st.includeOnlyTags ?? '0';
      nmExcludeA.value = st.excludeTagLow ?? '0';
      nmExcludeB.value = st.excludeTagHigh ?? '1';
      nmDesignPreview.checked = !!st.designTimePreview;
      nmRuntimePreview.checked = !!st.runTimePreview;
      nmBorder.value = String(st.borderSize ?? 0);
      nmClimb.value = String(st.walkableClimb ?? 0.3);
      nmHeight.value = String(st.walkableHeight ?? 2);
      nmVisible.checked = g.visible;

      behaviorsBody.classList.remove('hidden');
      refreshBehaviorList();
      return;
    }

    if (entry.type === 'route' && entry.route) {
      isRoute = true;
      isCrumbs = false;
      isNavMesh = false;
      routeBody.classList.remove('hidden');
      refreshRouteTargets();

      routeName.value = entry.name;

      const st = entry.route.state;
      originX.value = st.origin.x.toFixed(3);
      originY.value = st.origin.y.toFixed(3);
      originZ.value = st.origin.z.toFixed(3);
      destX.value = st.destination.x.toFixed(3);
      destY.value = st.destination.y.toFixed(3);
      destZ.value = st.destination.z.toFixed(3);
      camOffset.value = st.cameraOffsetY;

      routeStatus.textContent = st.valid ? `Valid \u2014 ${st.pathPoints.length} waypoints` : (st.error || 'No path');
      routeStatus.className = 'props-route-status ' + (st.valid ? 'valid' : 'invalid');
      routeVisibleCb.checked = entry.route.group.visible;

      // Restore destination object binding in dropdown
      if (st.destinationObjectId) {
        destObjectSelect.value = st.destinationObjectId;
      } else {
        destObjectSelect.value = '';
      }

      const sub = subTarget || 'origin';
      tabOrigin.classList.toggle('active', sub === 'origin');
      tabDest.classList.toggle('active', sub === 'destination');

      behaviorsBody.classList.remove('hidden');
      refreshBehaviorList();
      return;
    }

    if (entry.type === 'navBreadcrumbs' && entry.crumbs) {
      isRoute = false;
      isCrumbs = true;
      isNavMesh = false;
      crumbsBody.classList.remove('hidden');
      refreshCrumbsCurveSelect();

      crumbsName.value = entry.name;
      const st = entry.crumbs.state;
      if (st.routeId) {
        crumbsCurveSelect.value = st.routeId;
      } else {
        crumbsCurveSelect.value = '';
      }
      crumbsGap.value = String(st.gap);
      crumbsVisibleCb.checked = st.visible;

      const instanced = entry.crumbs.group.children.filter((c) => c.isInstancedMesh);
      if (instanced[0]?.material) {
        crumbsBase.value = '#' + instanced[0].material.color.getHexString();
      }
      if (instanced[1]?.material) {
        crumbsOutline.value = '#' + instanced[1].material.color.getHexString();
      }

      updateCrumbsStatus();

      behaviorsBody.classList.remove('hidden');
      refreshBehaviorList();
      return;
    }

    isRoute = false;
    isCrumbs = false;
    isNavMesh = false;
    bodyEl.classList.remove('hidden');

    nameInput.value = entry.name;

    const p = entry.mesh.position;
    posX.value = p.x.toFixed(3);
    posY.value = p.y.toFixed(3);
    posZ.value = p.z.toFixed(3);

    const r = entry.mesh.rotation;
    const toDeg = 180 / Math.PI;
    rotX.value = (r.x * toDeg).toFixed(1);
    rotY.value = (r.y * toDeg).toFixed(1);
    rotZ.value = (r.z * toDeg).toFixed(1);

    const s = entry.mesh.scale;
    sclX.value = s.x.toFixed(3);
    sclY.value = s.y.toFixed(3);
    sclZ.value = s.z.toFixed(3);

    colorPicker.value = entry.color || '#ffffff';
    colorHex.value = entry.color || '#ffffff';
    visibleCb.checked = entry.mesh.visible;

    behaviorsBody.classList.remove('hidden');
    refreshBehaviorList();
  }

  function updateTransform(data, subTarget) {
    if (isCrumbs) return;
    if (isNavMesh) {
      const pos = data.position;
      nmPosX.value = pos.x.toFixed(3);
      nmPosY.value = pos.y.toFixed(3);
      nmPosZ.value = pos.z.toFixed(3);
      nmRotX.value = data.rotation.x.toFixed(1);
      nmRotY.value = data.rotation.y.toFixed(1);
      nmRotZ.value = data.rotation.z.toFixed(1);
      nmSclX.value = data.scale.x.toFixed(3);
      nmSclY.value = data.scale.y.toFixed(3);
      nmSclZ.value = data.scale.z.toFixed(3);
      return;
    }
    if (isRoute) {
      const pos = data.position;
      if (subTarget === 'destination') {
        destX.value = pos.x.toFixed(3);
        destY.value = pos.y.toFixed(3);
        destZ.value = pos.z.toFixed(3);
      } else {
        originX.value = pos.x.toFixed(3);
        originY.value = pos.y.toFixed(3);
        originZ.value = pos.z.toFixed(3);
      }

      if (currentId) {
        const entry = callbacks.getEntry ? callbacks.getEntry(currentId) : null;
        if (entry && entry.route) {
          const st = entry.route.state;
          routeStatus.textContent = st.valid ? `Valid \u2014 ${st.pathPoints.length} waypoints` : (st.error || 'No path');
          routeStatus.className = 'props-route-status ' + (st.valid ? 'valid' : 'invalid');

          // Keep destination fields in sync with live binding
          destX.value = st.destination.x.toFixed(3);
          destY.value = st.destination.y.toFixed(3);
          destZ.value = st.destination.z.toFixed(3);
        }
      }
      return;
    }

    posX.value = data.position.x.toFixed(3);
    posY.value = data.position.y.toFixed(3);
    posZ.value = data.position.z.toFixed(3);
    rotX.value = data.rotation.x.toFixed(1);
    rotY.value = data.rotation.y.toFixed(1);
    rotZ.value = data.rotation.z.toFixed(1);
    sclX.value = data.scale.x.toFixed(3);
    sclY.value = data.scale.y.toFixed(3);
    sclZ.value = data.scale.z.toFixed(3);
  }

  function setRouteSubTarget(sub) {
    tabOrigin.classList.toggle('active', sub === 'origin');
    tabDest.classList.toggle('active', sub === 'destination');
  }

  function refreshAllDropdowns() {
    refreshRouteTargets();
    refreshCrumbsCurveSelect();
  }

  return { showObject, updateTransform, setRouteSubTarget, refreshRouteTargets: refreshAllDropdowns };
}

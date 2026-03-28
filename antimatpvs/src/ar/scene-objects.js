/**
 * Scene Objects Manager — add / remove / select 3D primitives.
 *
 * Provides a flat registry of user-added objects, click-to-select via raycasting,
 * and wires into the TransformControls gizmo from scene.js.
 */
import * as THREE from 'three';
import {
  getMultisetAnchor,
  getCamera,
  getCanvas,
  attachGizmo,
  detachGizmo,
  setGizmoTransformCallback,
  getTransformControls,
  getOrCreateSceneScriptRoot,
} from './scene.js';
import { createNavigationRoute } from './navigation-route.js';
import { createNavigationBreadcrumbs } from './navigation-breadcrumbs.js';
import { detachAllFromObject as detachVirtualFilesFromObject } from './file-store.js';
import { downloadBehaviorFile, generateBehaviorSource } from './behavior-generator.js';
import {
  startBehaviorRuntime,
  stopBehaviorRuntime,
  refreshBehaviorRuntime,
  startBehaviorRuntimeOnMesh,
  refreshBehaviorRuntimeOnMesh,
} from './behavior-runtime.js';

const OBJECT_FACTORIES = {
  box:      () => new THREE.BoxGeometry(1, 1, 1),
  sphere:   () => new THREE.SphereGeometry(0.5, 32, 32),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  plane:    () => new THREE.PlaneGeometry(2, 2),
  cone:     () => new THREE.ConeGeometry(0.5, 1, 32),
  torus:    () => new THREE.TorusGeometry(0.5, 0.2, 16, 48),
};

const DEFAULT_COLORS = {
  box:              '#4488ff',
  sphere:           '#ff6644',
  cylinder:         '#44cc88',
  plane:            '#cccc44',
  cone:             '#cc44cc',
  torus:            '#44cccc',
  route:            '#00aaff',
  navBreadcrumbs:   '#888888',
  navigationMesh:   '#22ff88',
};

const objects = [];
const nameCounts = {};
let nextId = 1;
let selectedId = null;

let _onSelect = null;
let _onTransform = null;
let _onChange = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function setOnSelect(cb) { _onSelect = cb; }
export function setOnTransform(cb) { _onTransform = cb; }
export function setOnChange(cb) { _onChange = cb; }

function fireChange() { if (_onChange) _onChange(); }

/** Notify listeners after external edits (e.g. file drop attaching to entry.behaviors). */
export function notifySceneChange() {
  fireChange();
}

function afterBehaviorRuntimeTick(entry) {
  fireChange();
  if (!selectedId || !entry || entry.id !== selectedId) return;
  if (entry.type === 'route' || entry.type === 'navBreadcrumbs') return;
  if (!_onTransform) return;
  if (entry.type === 'navigationMesh' && entry.navMeshGroup) {
    const g = entry.navMeshGroup;
    _onTransform(entry.id, {
      position: { x: g.position.x, y: g.position.y, z: g.position.z },
      rotation: {
        x: THREE.MathUtils.radToDeg(g.rotation.x),
        y: THREE.MathUtils.radToDeg(g.rotation.y),
        z: THREE.MathUtils.radToDeg(g.rotation.z),
      },
      scale: { x: g.scale.x, y: g.scale.y, z: g.scale.z },
    }, null);
    return;
  }
  if (!entry.mesh) return;
  _onTransform(entry.id, {
    position: { x: entry.mesh.position.x, y: entry.mesh.position.y, z: entry.mesh.position.z },
    rotation: {
      x: THREE.MathUtils.radToDeg(entry.mesh.rotation.x),
      y: THREE.MathUtils.radToDeg(entry.mesh.rotation.y),
      z: THREE.MathUtils.radToDeg(entry.mesh.rotation.z),
    },
    scale: { x: entry.mesh.scale.x, y: entry.mesh.scale.y, z: entry.mesh.scale.z },
  }, selectedSubTarget);
}

function autoName(type) {
  const labels = {
    route: 'Navigation Route',
    navBreadcrumbs: 'Navigation Breadcrumbs',
    navigationMesh: 'Navigation Mesh',
  };
  const label = labels[type] || (type.charAt(0).toUpperCase() + type.slice(1));
  nameCounts[type] = (nameCounts[type] || 0) + 1;
  return `${label} ${nameCounts[type]}`;
}

/**
 * Initialise: wire the gizmo transform callback from scene.js so we can
 * relay per-frame transform updates to the properties panel.
 */
export function init() {
  setGizmoTransformCallback((data) => {
    if (selectedId == null) return;

    const entry = objects.find((o) => o.id === selectedId);
    if (entry && entry.type === 'route' && entry.route) {
      const pos = data.position;
      if (selectedSubTarget === 'destination') {
        entry.route.setDestination(pos.x, pos.y, pos.z);
      } else {
        entry.route.setOrigin(pos.x, pos.y, pos.z);
      }
    }

    if (entry && entry.type === 'navigationMesh' && entry.navMeshGroup) {
      const g = entry.navMeshGroup;
      g.position.set(data.position.x, data.position.y, data.position.z);
      g.rotation.set(
        THREE.MathUtils.degToRad(data.rotation.x),
        THREE.MathUtils.degToRad(data.rotation.y),
        THREE.MathUtils.degToRad(data.rotation.z),
      );
      g.scale.set(data.scale.x, data.scale.y, data.scale.z);
    }

    if (_onTransform) {
      _onTransform(selectedId, data, selectedSubTarget);
    }
  });

  const canvas = getCanvas();
  if (canvas) {
    canvas.addEventListener('pointerdown', onPointerDown);
  }
}

function onPointerDown(event) {
  if (event.button !== 0) return;

  const tc = getTransformControls();
  if (tc && tc.dragging) return;

  const canvas = getCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, getCamera());

  const allTargets = [];
  for (const o of objects) {
    if (o.type === 'route' && o.route) {
      allTargets.push({ mesh: o.route.originMarker, entry: o, subTarget: 'origin' });
      allTargets.push({ mesh: o.route.destMarker, entry: o, subTarget: 'destination' });
    } else if (o.type === 'navBreadcrumbs' && o.mesh) {
      allTargets.push({ mesh: o.mesh, entry: o, subTarget: null });
    } else if (o.type === 'navigationMesh' && o.mesh) {
      allTargets.push({ mesh: o.mesh, entry: o, subTarget: null });
    } else {
      allTargets.push({ mesh: o.mesh, entry: o, subTarget: null });
    }
  }

  const hits = raycaster.intersectObjects(allTargets.map((t) => t.mesh), false);
  if (hits.length > 0) {
    const hitMesh = hits[0].object;
    const target = allTargets.find((t) => t.mesh === hitMesh);
    if (target) {
      selectObject(target.entry.id, target.subTarget);
      return;
    }
  }
}

export function addObject(type) {
  if (type === 'route') return addRoute();
  if (type === 'navBreadcrumbs') return addNavBreadcrumbs();
  if (type === 'navigationMesh') return addNavigationMesh();

  const factory = OBJECT_FACTORIES[type];
  if (!factory) return null;

  const geometry = factory();
  const color = DEFAULT_COLORS[type] || '#ffffff';
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);

  if (type === 'plane') {
    mesh.rotation.x = -Math.PI / 2;
  }

  const id = `obj_${nextId++}`;
  const name = autoName(type);
  mesh.name = name;
  mesh.userData.sceneObjectId = id;

  const anchor = getMultisetAnchor();
  if (anchor) anchor.add(mesh);

  const entry = { id, name, type, mesh, color, behaviors: [] };
  objects.push(entry);

  selectObject(id);
  fireChange();
  return entry;
}

function addRoute() {
  const route = createNavigationRoute();
  const id = `obj_${nextId++}`;
  const name = autoName('route');
  route.group.name = name;

  const entry = {
    id,
    name,
    type: 'route',
    mesh: route.originMarker,
    color: DEFAULT_COLORS.route,
    route,
    behaviors: [],
  };
  objects.push(entry);

  selectObject(id);
  fireChange();
  return entry;
}

function addNavBreadcrumbs() {
  const crumbs = createNavigationBreadcrumbs();
  const id = `obj_${nextId++}`;
  const name = autoName('navBreadcrumbs');
  crumbs.group.name = name;

  const entry = {
    id,
    name,
    type: 'navBreadcrumbs',
    mesh: crumbs.mesh,
    color: DEFAULT_COLORS.navBreadcrumbs,
    crumbs,
    behaviors: [],
  };
  objects.push(entry);

  selectObject(id);
  fireChange();
  return entry;
}

function addNavigationMesh() {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.28, 0);
  const material = new THREE.MeshStandardMaterial({
    color: DEFAULT_COLORS.navigationMesh,
    emissive: 0x0a3322,
    roughness: 0.45,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const marker = new THREE.Mesh(geometry, material);
  marker.name = 'NavigationMeshGizmo';
  group.add(marker);

  const id = `obj_${nextId++}`;
  const name = autoName('navigationMesh');
  group.name = name;
  marker.userData.sceneObjectId = id;

  const anchor = getMultisetAnchor();
  if (anchor) anchor.add(group);

  const navMeshSettings = {
    setAsDefault: true,
    source: '',
    includeOnlyTags: '0',
    excludeTagLow: '0',
    excludeTagHigh: '1',
    designTimePreview: true,
    runTimePreview: false,
    borderSize: 0,
    walkableClimb: 0.3,
    walkableHeight: 2,
  };

  const entry = {
    id,
    name,
    type: 'navigationMesh',
    mesh: marker,
    navMeshGroup: group,
    color: DEFAULT_COLORS.navigationMesh,
    navMeshSettings,
    behaviors: [],
  };
  objects.push(entry);

  selectObject(id);
  fireChange();
  return entry;
}

export function removeObject(id) {
  const idx = objects.findIndex((o) => o.id === id);
  if (idx === -1) return;
  const entry = objects[idx];

  detachVirtualFilesFromObject(id);

  if (selectedId === id) {
    detachGizmo();
    selectedId = null;
    if (_onSelect) _onSelect(null);
  }

  if (entry.behaviors) {
    for (const beh of entry.behaviors) stopBehaviorRuntime(beh);
  }

  if (entry.type === 'route' && entry.route) {
    const routeId = entry.id;
    for (const o of objects) {
      if (o.type === 'navBreadcrumbs' && o.crumbs?.state?.routeId === routeId) {
        o.crumbs.setRouteId(null);
        o.crumbs.refresh((rid) => objects.find((x) => x.id === rid) || null);
      }
    }
    entry.route.dispose();
  } else if (entry.type === 'navBreadcrumbs' && entry.crumbs) {
    entry.crumbs.dispose();
  } else if (entry.type === 'navigationMesh' && entry.navMeshGroup) {
    const anchor = getMultisetAnchor();
    if (anchor) anchor.remove(entry.navMeshGroup);
    entry.mesh?.geometry?.dispose();
    if (entry.mesh?.material) {
      if (Array.isArray(entry.mesh.material)) entry.mesh.material.forEach((m) => m.dispose());
      else entry.mesh.material.dispose();
    }
  } else {
    const anchor = getMultisetAnchor();
    if (anchor) anchor.remove(entry.mesh);
    entry.mesh.geometry?.dispose();
    if (entry.mesh.material) {
      if (Array.isArray(entry.mesh.material)) entry.mesh.material.forEach((m) => m.dispose());
      else entry.mesh.material.dispose();
    }
  }

  objects.splice(idx, 1);
  fireChange();
}

let selectedSubTarget = null;

export function selectObject(id, subTarget) {
  const entry = objects.find((o) => o.id === id);
  if (!entry) return;

  const sub = subTarget || (entry.type === 'route' ? 'origin' : null);

  if (id === selectedId && sub === selectedSubTarget) return;

  selectedId = id;
  selectedSubTarget = sub;

  if (entry.type === 'route' && entry.route) {
    const marker = sub === 'destination' ? entry.route.destMarker : entry.route.originMarker;
    attachGizmo(marker);
  } else if (entry.type === 'navBreadcrumbs') {
    detachGizmo();
  } else if (entry.type === 'navigationMesh' && entry.navMeshGroup) {
    attachGizmo(entry.navMeshGroup);
  } else {
    attachGizmo(entry.mesh);
  }
  if (_onSelect) _onSelect(entry, sub);
}

export function deselectAll() {
  detachGizmo();
  selectedId = null;
  selectedSubTarget = null;
  if (_onSelect) _onSelect(null, null);
}

export function getSelectedSubTarget() {
  return selectedSubTarget;
}

export function selectRouteSubTarget(id, sub) {
  selectObject(id, sub);
}

export function getSelected() {
  if (!selectedId) return null;
  return objects.find((o) => o.id === selectedId) || null;
}

export function getObjects() {
  return objects;
}

/**
 * Per-frame tick: syncs routes whose destination is bound to a scene object.
 */
export function tick() {
  const getById = (objId) => objects.find((o) => o.id === objId) || null;
  for (const entry of objects) {
    if (entry.type === 'route' && entry.route && entry.route.state.destinationObjectId) {
      const before = entry.route.state.destination.clone();
      entry.route.tick(getById);
      const after = entry.route.state.destination;
      if (!before.equals(after) && entry.id === selectedId && _onTransform) {
        const marker = selectedSubTarget === 'destination' ? entry.route.destMarker : entry.route.originMarker;
        _onTransform(entry.id, {
          position: { x: marker.position.x, y: marker.position.y, z: marker.position.z },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        }, selectedSubTarget);
      }
    }
  }

  for (const entry of objects) {
    if (entry.type === 'navBreadcrumbs' && entry.crumbs) {
      entry.crumbs.refresh(getById);
    }
  }
}

let nextBehaviorId = 1;

/** Behaviors attached to the scene (virtual target), not to a scene tree object. */
const sceneLevelBehaviors = [];

export async function attachSceneLevelBehavior(rec) {
  const root = getOrCreateSceneScriptRoot();
  if (!root) return;

  let beh = sceneLevelBehaviors.find((b) => b.behaviorId === rec.behaviorId);
  if (!beh) {
    beh = { ...rec };
    sceneLevelBehaviors.push(beh);
  } else {
    Object.assign(beh, rec);
  }
  await startBehaviorRuntimeOnMesh(root, beh, fireChange);
  fireChange();
}

export function removeSceneLevelBehavior(behaviorId) {
  const idx = sceneLevelBehaviors.findIndex((b) => b.behaviorId === behaviorId);
  if (idx === -1) return;
  stopBehaviorRuntime(sceneLevelBehaviors[idx]);
  sceneLevelBehaviors.splice(idx, 1);
  fireChange();
}

export async function updateSceneLevelBehaviorSource(behaviorId, source) {
  const beh = sceneLevelBehaviors.find((b) => b.behaviorId === behaviorId);
  if (!beh) return null;
  beh.source = source;
  const root = getOrCreateSceneScriptRoot();
  if (!root) return { runtimeError: 'Scene not ready' };
  await refreshBehaviorRuntimeOnMesh(root, beh, fireChange);
  return { runtimeError: beh.runtimeError || null };
}

export function getSceneLevelBehavior(behaviorId) {
  return sceneLevelBehaviors.find((b) => b.behaviorId === behaviorId) || null;
}

/**
 * Add a custom behavior to an object. Generates and downloads a .ts file.
 * @param {string} objectId
 * @param {string} behaviorName  Human-readable name
 * @returns {{ behaviorId: string, fileName: string, className: string }|null}
 */
export async function addBehavior(objectId, behaviorName) {
  const entry = objects.find((o) => o.id === objectId);
  if (!entry) return null;

  const source = generateBehaviorSource(behaviorName, entry.type);
  const className = behaviorName
    .replace(/[^a-zA-Z0-9]+/g, ' ').trim()
    .split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const fileName = `${className}.ts`;
  const behaviorId = `beh_${nextBehaviorId++}`;

  const beh = { behaviorId, name: behaviorName, className, fileName, source };
  if (!entry.behaviors) entry.behaviors = [];
  entry.behaviors.push(beh);

  await startBehaviorRuntime(entry, beh, () => afterBehaviorRuntimeTick(entry));

  fireChange();
  return beh;
}

/**
 * Remove a behavior from an object.
 */
export function removeBehavior(objectId, behaviorId) {
  const entry = objects.find((o) => o.id === objectId);
  if (!entry || !entry.behaviors) return;
  const idx = entry.behaviors.findIndex((b) => b.behaviorId === behaviorId);
  if (idx !== -1) {
    stopBehaviorRuntime(entry.behaviors[idx]);
    entry.behaviors.splice(idx, 1);
  }
  fireChange();
}

/**
 * Re-download an existing behavior file (uses stored source).
 */
export function redownloadBehavior(objectId, behaviorId) {
  const entry = objects.find((o) => o.id === objectId);
  if (!entry || !entry.behaviors) return;
  const beh = entry.behaviors.find((b) => b.behaviorId === behaviorId);
  if (!beh) return;
  const src = beh.source || generateBehaviorSource(beh.name, entry.type);
  const blob = new Blob([src], { type: 'text/typescript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = beh.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Update a behavior's stored source code.
 */
export async function updateBehaviorSource(objectId, behaviorId, source) {
  const entry = objects.find((o) => o.id === objectId);
  if (!entry || !entry.behaviors) return null;
  const beh = entry.behaviors.find((b) => b.behaviorId === behaviorId);
  if (beh) {
    beh.source = source;
    await refreshBehaviorRuntime(entry, beh, () => afterBehaviorRuntimeTick(entry));
    return { runtimeError: beh.runtimeError || null };
  }
  return null;
}

/**
 * Get a behavior entry from an object.
 */
export function getBehavior(objectId, behaviorId) {
  const entry = objects.find((o) => o.id === objectId);
  if (!entry || !entry.behaviors) return null;
  return entry.behaviors.find((b) => b.behaviorId === behaviorId) || null;
}

export function updateObjectProperty(id, prop, value) {
  const entry = objects.find((o) => o.id === id);
  if (!entry) return;

  if (entry.type === 'route' && entry.route) {
    switch (prop) {
      case 'name':
        entry.name = value;
        entry.route.group.name = value;
        break;
      case 'origin':
        entry.route.setOrigin(value.x, value.y, value.z);
        break;
      case 'destination':
        entry.route.setDestination(value.x, value.y, value.z);
        break;
      case 'destinationObjectId':
        entry.route.bindDestinationObject(value);
        if (value) {
          const target = objects.find((o) => o.id === value);
          if (target && target.mesh) {
            const p = target.mesh.position;
            entry.route.setDestination(p.x, p.y, p.z);
          }
        }
        break;
      case 'cameraOffsetY':
        entry.route.setCameraOffsetY(value);
        break;
      case 'visible':
        entry.route.group.visible = value;
        break;
    }
    fireChange();
    return;
  }

  if (entry.type === 'navigationMesh' && entry.navMeshGroup) {
    const g = entry.navMeshGroup;
    switch (prop) {
      case 'name':
        entry.name = value;
        g.name = value;
        break;
      case 'position':
        g.position.set(value.x, value.y, value.z);
        break;
      case 'rotation':
        g.rotation.set(
          THREE.MathUtils.degToRad(value.x),
          THREE.MathUtils.degToRad(value.y),
          THREE.MathUtils.degToRad(value.z),
        );
        break;
      case 'scale':
        g.scale.set(value.x, value.y, value.z);
        break;
      case 'visible':
        g.visible = value;
        break;
      case 'navMeshSettings':
        Object.assign(entry.navMeshSettings, value);
        break;
      default:
        break;
    }
    fireChange();
    return;
  }

  if (entry.type === 'navBreadcrumbs' && entry.crumbs) {
    switch (prop) {
      case 'name':
        entry.name = value;
        entry.crumbs.group.name = value;
        break;
      case 'curveRouteId':
        entry.crumbs.setRouteId(value || null);
        entry.crumbs.refresh((rid) => objects.find((x) => x.id === rid) || null);
        break;
      case 'breadcrumbGap':
        entry.crumbs.setGap(value);
        entry.crumbs.refresh((rid) => objects.find((x) => x.id === rid) || null);
        break;
      case 'breadcrumbBaseColor':
        entry.crumbs.setBreadcrumbColor(value, null);
        break;
      case 'breadcrumbOutlineColor':
        entry.crumbs.setBreadcrumbColor(null, value);
        break;
      case 'visible':
        entry.crumbs.setVisible(value);
        entry.crumbs.refresh((rid) => objects.find((x) => x.id === rid) || null);
        break;
    }
    fireChange();
    return;
  }

  switch (prop) {
    case 'name':
      entry.name = value;
      entry.mesh.name = value;
      break;
    case 'position':
      entry.mesh.position.set(value.x, value.y, value.z);
      break;
    case 'rotation':
      entry.mesh.rotation.set(
        THREE.MathUtils.degToRad(value.x),
        THREE.MathUtils.degToRad(value.y),
        THREE.MathUtils.degToRad(value.z),
      );
      break;
    case 'scale':
      entry.mesh.scale.set(value.x, value.y, value.z);
      break;
    case 'color':
      entry.color = value;
      if (entry.mesh.material && !Array.isArray(entry.mesh.material)) {
        entry.mesh.material.color.set(value);
      }
      break;
    case 'visible':
      entry.mesh.visible = value;
      break;
  }
  fireChange();
}

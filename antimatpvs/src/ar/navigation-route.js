/**
 * Navigation Route — computes a path on the nav mesh between origin and
 * destination, renders it as a colored 3D line, and places a camera helper
 * at the origin point.
 *
 * Mirrors ZComponent NavigationRoute behaviour: uses NavMeshQuery.computePath
 * to walk the nav mesh polygon corridor, then stitches line segments.
 *
 * Breadcrumbs are a separate scene object (navigation-breadcrumbs.js).
 */
import * as THREE from 'three';
import { NavMeshQuery } from 'recast-navigation';
import { getNavMesh } from './navigation-mesh.js';
import { getMultisetAnchor } from './scene.js';

const ROUTE_COLOR = 0x00aaff;
const ROUTE_WIDTH = 3;
const ORIGIN_COLOR = 0x00ff88;
const DEST_COLOR = 0xff3366;
const CAMERA_OFFSET_Y = -1.3;

function createMarker(color, radius = 0.25) {
  const geo = new THREE.SphereGeometry(radius, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.85 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 999;
  return mesh;
}

function createCameraHelper() {
  const group = new THREE.Group();
  group.name = 'RouteCameraHelper';

  const bodyGeo = new THREE.BoxGeometry(0.3, 0.2, 0.4);
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const lensGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.15, 8);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -0.27;
  group.add(lens);

  return group;
}

function computeNavPath(startVec, endVec) {
  const navMesh = getNavMesh();
  if (!navMesh) return null;

  const query = new NavMeshQuery(navMesh);

  const halfExtents = { x: 2, y: 4, z: 2 };
  const startResult = query.findClosestPoint(
    { x: startVec.x, y: startVec.y, z: startVec.z },
    { halfExtents },
  );
  const endResult = query.findClosestPoint(
    { x: endVec.x, y: endVec.y, z: endVec.z },
    { halfExtents },
  );

  if (!startResult.success || !endResult.success) return null;

  const pathResult = query.computePath(startResult.point, endResult.point);
  if (!pathResult.success || !pathResult.path || pathResult.path.length < 2) return null;

  return pathResult.path.map((p) => new THREE.Vector3(p.x, p.y, p.z));
}

export function createNavigationRoute() {
  const group = new THREE.Group();
  group.name = 'NavigationRoute';

  const originMarker = createMarker(ORIGIN_COLOR, 0.3);
  const destMarker = createMarker(DEST_COLOR, 0.3);
  const cameraHelper = createCameraHelper();

  group.add(originMarker);
  group.add(destMarker);
  group.add(cameraHelper);

  let routeLine = null;

  const state = {
    origin: new THREE.Vector3(0, 0, 0),
    destination: new THREE.Vector3(2, 0, 2),
    cameraOffsetY: CAMERA_OFFSET_Y,
    pathPoints: [],
    valid: false,
    error: null,
    destinationObjectId: null,
  };

  function rebuildLine() {
    if (routeLine) {
      group.remove(routeLine);
      routeLine.geometry?.dispose();
      routeLine.material?.dispose();
      routeLine = null;
    }

    originMarker.position.copy(state.origin);
    destMarker.position.copy(state.destination);
    cameraHelper.position.set(
      state.origin.x,
      state.origin.y - state.cameraOffsetY,
      state.origin.z,
    );

    const feetOrigin = new THREE.Vector3(
      state.origin.x,
      state.origin.y + state.cameraOffsetY,
      state.origin.z,
    );

    const pathPts = computeNavPath(feetOrigin, state.destination);

    if (!pathPts || pathPts.length < 2) {
      state.valid = false;
      state.error = 'No valid path on nav mesh';
      state.pathPoints = [];
      return;
    }

    state.pathPoints = pathPts;
    state.valid = true;
    state.error = null;

    const lineGeo = new THREE.BufferGeometry().setFromPoints(pathPts);
    const lineMat = new THREE.LineBasicMaterial({
      color: ROUTE_COLOR,
      linewidth: ROUTE_WIDTH,
      depthTest: false,
    });
    routeLine = new THREE.Line(lineGeo, lineMat);
    routeLine.renderOrder = 998;
    group.add(routeLine);
  }

  function addToScene() {
    const anchor = getMultisetAnchor();
    if (anchor) anchor.add(group);
  }

  function removeFromScene() {
    const anchor = getMultisetAnchor();
    if (anchor) anchor.remove(group);
  }

  function dispose() {
    removeFromScene();
    if (routeLine) {
      routeLine.geometry?.dispose();
      routeLine.material?.dispose();
    }
    originMarker.geometry?.dispose();
    originMarker.material?.dispose();
    destMarker.geometry?.dispose();
    destMarker.material?.dispose();
  }

  rebuildLine();
  addToScene();

  return {
    group,
    originMarker,
    destMarker,
    cameraHelper,
    get state() { return state; },

    setOrigin(x, y, z) {
      state.origin.set(x, y, z);
      rebuildLine();
    },
    setDestination(x, y, z) {
      state.destination.set(x, y, z);
      rebuildLine();
    },
    setCameraOffsetY(val) {
      state.cameraOffsetY = val;
      rebuildLine();
    },

    bindDestinationObject(objectId) {
      state.destinationObjectId = objectId || null;
    },

    tick(getObjectById) {
      if (!state.destinationObjectId) return;
      const entry = getObjectById(state.destinationObjectId);
      if (!entry || !entry.mesh) {
        state.destinationObjectId = null;
        return;
      }
      const p = entry.mesh.position;
      if (
        Math.abs(p.x - state.destination.x) > 0.001 ||
        Math.abs(p.y - state.destination.y) > 0.001 ||
        Math.abs(p.z - state.destination.z) > 0.001
      ) {
        state.destination.set(p.x, p.y, p.z);
        rebuildLine();
      }
    },

    rebuild: rebuildLine,
    dispose,
  };
}

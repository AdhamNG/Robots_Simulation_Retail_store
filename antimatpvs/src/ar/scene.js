/**
 * 3D Scene — Three.js viewer with OrbitControls + TransformControls gizmo.
 *
 * Hierarchy:
 *   Scene
 *   ├── AmbientLight / DirectionalLight / HemisphereLight
 *   ├── GridHelper (ground reference)
 *   ├── AxesHelper
 *   └── multisetAnchor (Group)
 *         ├── MapMesh (loaded GLB)
 *         └── user-added objects
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

let renderer, scene, camera, controls;
let transformControls;
let multisetAnchor;
let isInitialized = false;
let _container = null;
let currentRenderMode = 'wireframe';
let gridHelper = null;
let axesHelper = null;
/** Group under Scene for scene-level TS/JS behaviors (no user mesh required). */
let sceneScriptRoot = null;

let onGizmoTransform = null;
let _animationCallbacks = [];

/**
 * Register a callback fired every frame the gizmo moves, rotates, or scales its object.
 * @param {(data: {position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}}) => void} cb
 */
export function setGizmoTransformCallback(cb) {
  onGizmoTransform = cb;
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getCanvas() { return renderer ? renderer.domElement : null; }
export function getMultisetAnchor() { return multisetAnchor; }
export function getTransformControls() { return transformControls; }

/** Root Object3D used as `mesh` for behaviors attached to the scene (not to a primitive). */
export function getOrCreateSceneScriptRoot() {
  if (!scene) return null;
  if (!sceneScriptRoot) {
    sceneScriptRoot = new THREE.Group();
    sceneScriptRoot.name = 'NavMeSceneScripts';
    scene.add(sceneScriptRoot);
  }
  return sceneScriptRoot;
}

export function addAnimationCallback(cb) {
  if (typeof cb === 'function') _animationCallbacks.push(cb);
}

export function setOrbitEnabled(enabled) {
  if (controls) controls.enabled = enabled;
}

/**
 * Switch gizmo between translate / rotate / scale.
 * @param {'translate'|'rotate'|'scale'} mode
 */
export function setGizmoMode(mode) {
  if (!transformControls) return;
  transformControls.setMode(mode);
}

function createUvMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {},
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec2 uv = fract(vUv * 10.0);
        float grid = step(0.05, uv.x) * step(0.05, uv.y);
        vec3 base = vec3(vUv, 1.0 - vUv.x);
        vec3 color = mix(vec3(0.08), base, grid);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

function disposeGeneratedMaterial(mesh) {
  const gen = mesh.userData._mapViewGeneratedMaterial;
  if (!gen) return;
  if (Array.isArray(gen)) gen.forEach((m) => m?.dispose?.());
  else gen.dispose?.();
  delete mesh.userData._mapViewGeneratedMaterial;
}

function applyMapRenderMode(mode) {
  if (gridHelper) gridHelper.visible = mode !== 'material';
  if (axesHelper) axesHelper.visible = mode !== 'material';

  const mapRoot = multisetAnchor?.getObjectByName('MapMesh');
  if (!mapRoot) return;

  mapRoot.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    if (!child.userData._mapOriginalMaterial) {
      child.userData._mapOriginalMaterial = child.material;
    }

    const original = child.userData._mapOriginalMaterial;

    if (mode === 'material' || mode === 'wireframe') {
      if (child.material !== original) {
        disposeGeneratedMaterial(child);
        child.material = original;
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat) return;
        mat.wireframe = mode === 'wireframe';
        if (mode === 'material') {
          // Ensure textured/vertex-colored scan appears like source map.
          if (child.geometry?.attributes?.color && mat.vertexColors !== true) {
            mat.vertexColors = true;
          }
        }
        mat.needsUpdate = true;
      });
      return;
    }

    // Normals / UV replace material for this visualization mode.
    if (child.material === original) {
      const genMaterial = mode === 'normals'
        ? new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
        : createUvMaterial();
      child.userData._mapViewGeneratedMaterial = genMaterial;
      child.material = genMaterial;
    } else if (mode === 'uv') {
      // If currently in normals mode, swap to UV.
      disposeGeneratedMaterial(child);
      const genMaterial = createUvMaterial();
      child.userData._mapViewGeneratedMaterial = genMaterial;
      child.material = genMaterial;
    } else if (mode === 'normals') {
      // If currently in UV mode, swap to normals.
      disposeGeneratedMaterial(child);
      const genMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
      child.userData._mapViewGeneratedMaterial = genMaterial;
      child.material = genMaterial;
    }
  });
}

export function setRenderMode(mode) {
  const valid = ['material', 'wireframe', 'normals', 'uv'];
  if (!valid.includes(mode)) return;
  currentRenderMode = mode;
  applyMapRenderMode(mode);
}

export function initScene(container) {
  _container = container;
  const w = container.clientWidth || window.innerWidth;
  const h = container.clientHeight || window.innerHeight;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x0a0a14, 1);
  // Insert under DOM overlays (file drop hint + HTML overlay) so they stay visible and receive no blocked stacking.
  if (container.firstChild) {
    container.insertBefore(renderer.domElement, container.firstChild);
  } else {
    container.appendChild(renderer.domElement);
  }

  scene = new THREE.Scene();
  sceneScriptRoot = null;
  scene.fog = new THREE.FogExp2(0x0a0a14, 0.015);

  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(5, 8, 12);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1;
  controls.maxDistance = 200;
  controls.target.set(0, 0, 0);

  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode('translate');
  transformControls.setSize(0.8);
  scene.add(transformControls.getHelper());

  transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
  });

  transformControls.addEventListener('objectChange', () => {
    const obj = transformControls.object;
    if (!obj || !onGizmoTransform) return;
    onGizmoTransform({
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rotation: {
        x: THREE.MathUtils.radToDeg(obj.rotation.x),
        y: THREE.MathUtils.radToDeg(obj.rotation.y),
        z: THREE.MathUtils.radToDeg(obj.rotation.z),
      },
      scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
    });
  });

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0x8888ff, 0x444422, 0.4);
  scene.add(hemiLight);

  gridHelper = new THREE.GridHelper(50, 50, 0x333355, 0x1a1a2e);
  scene.add(gridHelper);

  axesHelper = new THREE.AxesHelper(2);
  scene.add(axesHelper);

  multisetAnchor = new THREE.Group();
  multisetAnchor.name = 'MultiSetAnchor';
  scene.add(multisetAnchor);

  window.addEventListener('resize', onResize);

  isInitialized = true;
  animate();
}

function onResize() {
  if (!camera || !renderer) return;
  const w = _container ? _container.clientWidth : window.innerWidth;
  const h = _container ? _container.clientHeight : window.innerHeight;
  if (w <= 0 || h <= 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

/** Call when the viewport container changes size (e.g. code panel open/close) without a window resize. */
export function resizeRendererToContainer() {
  onResize();
}

let flyAnimation = null;

function animate() {
  requestAnimationFrame(animate);
  if (!isInitialized) return;

  if (flyAnimation) {
    flyAnimation.t += flyAnimation.speed;
    if (flyAnimation.t >= 1) {
      flyAnimation.t = 1;
      camera.position.copy(flyAnimation.endPos);
      controls.target.copy(flyAnimation.endTarget);
      flyAnimation = null;
    } else {
      const t = easeInOutCubic(flyAnimation.t);
      camera.position.lerpVectors(flyAnimation.startPos, flyAnimation.endPos, t);
      controls.target.lerpVectors(flyAnimation.startTarget, flyAnimation.endTarget, t);
    }
  }

  for (const cb of _animationCallbacks) cb();
  controls.update();
  renderer.render(scene, camera);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function flyTo(x, y, z) {
  if (!camera || !controls) return;
  const target = new THREE.Vector3(x, y, z);
  const offset = new THREE.Vector3(3, 5, 8);

  flyAnimation = {
    t: 0,
    speed: 0.018,
    startPos: camera.position.clone(),
    endPos: target.clone().add(offset),
    startTarget: controls.target.clone(),
    endTarget: target.clone(),
  };
}

export function addMesh(gltfScene) {
  if (!multisetAnchor) return;

  const existing = multisetAnchor.getObjectByName('MapMesh');
  if (existing) {
    existing.traverse((child) => {
      if (!child.isMesh) return;
      disposeGeneratedMaterial(child);
    });
    multisetAnchor.remove(existing);
  }

  gltfScene.name = 'MapMesh';
  multisetAnchor.add(gltfScene);
  applyMapRenderMode(currentRenderMode);
  frameCameraToObject(gltfScene);
}

function frameCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
  cameraDistance *= 1.5;

  camera.position.set(
    center.x + cameraDistance * 0.5,
    center.y + cameraDistance * 0.6,
    center.z + cameraDistance,
  );
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();

  camera.near = maxDim * 0.001;
  camera.far = maxDim * 100;
  camera.updateProjectionMatrix();
}

export function attachGizmo(mesh) {
  if (!transformControls) return;
  transformControls.attach(mesh);
}

export function detachGizmo() {
  if (!transformControls) return;
  transformControls.detach();
}

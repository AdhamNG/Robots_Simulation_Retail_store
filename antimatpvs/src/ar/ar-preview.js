/**
 * AR Preview Engine
 *
 * Standalone WebAR module for mobile live-preview.
 * - Opens rear camera as video background
 * - Renders Three.js scene on top (transparent overlay)
 * - Runs MultiSet VPS localization loop (captures JPEG frames, POSTs to /v1/vps/map/query-form)
 * - On successful localization, places the 3D anchor at the returned pose
 * - Smooth pose transitions via lerp/slerp
 *
 * Designed to work WITHOUT Zappar SDK — pure getUserMedia + Three.js + MultiSet REST API.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readJsonResponse } from '../utils/safe-json.js';

/** Matches editor proxy + MultiSet REST (see https://docs.multiset.ai/basics/rest-api-docs/map-query ) */
const VPS_QUERY_SINGLE = '/api/multiset/v1/vps/map/query-form';
const VPS_QUERY_SINGLE_ALT = '/api/multiset/vps/map/query-form';
const TOKEN_URL = '/api/multiset/v1/m2m/token';
const MAP_INFO_URL = '/api/multiset/v1/vps/map';
const FILE_URL = '/api/multiset/v1/file';

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();

/**
 * Camera requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
 * On http://192.168.x.x, `navigator.mediaDevices` is often undefined — use HTTPS (tunnel) or localhost.
 */
function getCameraStream(constraints) {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacy =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  if (legacy) {
    return new Promise((resolve, reject) => {
      legacy.call(navigator, constraints, resolve, reject);
    });
  }

  const isLocalhost =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const secure =
    (typeof window.isSecureContext === 'boolean' && window.isSecureContext) ||
    location.protocol === 'https:' ||
    isLocalhost;

  if (!secure) {
    throw new Error(
      'Camera blocked: this page is not secure (HTTP on a network IP). Use an HTTPS link (e.g. npm run tunnel + the trycloudflare URL), deploy to Render, or open preview on the same PC via http://localhost:3000.',
    );
  }

  throw new Error(
    'Camera API not available (navigator.mediaDevices missing). Try Chrome or Safari, avoid in-app browsers, and ensure the site uses HTTPS except on localhost.',
  );
}

export class ARPreview {
  constructor(container, config) {
    this.container = container;
    this.mapCode = config.mapCode || '';
    this.clientId = config.clientId || '';
    this.clientSecret = config.clientSecret || '';
    this.token = null;

    this.video = null;
    this.videoStream = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.anchor = null;
    this.clock = new THREE.Clock();

    this.localized = false;
    this.localizing = false;
    this.lastLocalizeTime = 0;
    this.localizeInterval = 2000;
    this.relocalizeInterval = 15000;
    this.minConfidence = 0.5;
    this.hasEverLocalized = false;

    this._captureCanvas = null;
    this._captureCtx = null;
    this._disposed = false;

    this.onStatus = config.onStatus || (() => {});
    this.onLocalized = config.onLocalized || (() => {});
    this.onError = config.onError || (() => {});
  }

  async start() {
    try {
      this.onStatus('Authenticating…');
      await this._authenticate();

      this.onStatus('Starting camera…');
      await this._initCamera();

      this.onStatus('Setting up 3D…');
      this._initThreeScene();

      this.onStatus('Loading map mesh…');
      await this._loadMapMesh();

      this.onStatus('Ready — point at mapped area');
      this._startRenderLoop();
      this._startLocalizationLoop();
    } catch (err) {
      console.error('[ar-preview]', err);
      this.onError(err.message || String(err));
    }
  }

  dispose() {
    this._disposed = true;
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(t => t.stop());
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  async _authenticate() {
    const basic = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId: this.clientId, clientSecret: this.clientSecret }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Auth failed (${res.status}): ${body || res.statusText}`);
    }
    const data = await readJsonResponse(res);
    this.token = data.token || data.access_token;
    if (!this.token) throw new Error('No token in auth response');
  }

  async _initCamera() {
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };
    this.videoStream = await getCameraStream(constraints);
    this.video = document.createElement('video');
    this.video.srcObject = this.videoStream;
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('autoplay', '');
    this.video.muted = true;
    this.video.className = 'ar-video-bg';
    this.container.appendChild(this.video);
    await this.video.play();
  }

  _initThreeScene() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'ar-three-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const track = this.videoStream.getVideoTracks()[0];
    const settings = track.getSettings();
    const vw = settings.width || 1280;
    const vh = settings.height || 720;
    const fovY = 2 * Math.atan((vh / 2) / ((vw / 2) / Math.tan(Math.PI / 6))) * (180 / Math.PI);

    this.camera = new THREE.PerspectiveCamera(fovY || 60, w / h, 0.01, 1000);
    this.camera.position.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    this.anchor = new THREE.Group();
    this.anchor.name = 'VPSAnchor';
    this.anchor.visible = false;
    this.scene.add(this.anchor);

    window.addEventListener('resize', this._onResize.bind(this));
  }

  _onResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  async _loadMapMesh() {
    try {
      const mapInfoRes = await fetch(`${MAP_INFO_URL}/${encodeURIComponent(this.mapCode)}`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });
      if (!mapInfoRes.ok) {
        this.onStatus('No map mesh found — VPS-only mode');
        return;
      }
      const mapInfo = await readJsonResponse(mapInfoRes);
      const meshKey = this._findMeshKey(mapInfo);
      if (!meshKey) {
        this.onStatus('No mesh in map — VPS-only mode');
        return;
      }

      const fileRes = await fetch(`${FILE_URL}?key=${encodeURIComponent(meshKey)}`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });
      if (!fileRes.ok) return;
      const fileData = await readJsonResponse(fileRes);
      const downloadUrl = fileData.url || fileData.downloadUrl || fileData.signedUrl || fileData.presignedUrl;
      if (!downloadUrl) return;

      const glbRes = await fetch(downloadUrl);
      if (!glbRes.ok) return;
      const glbBuffer = await glbRes.arrayBuffer();

      const loader = new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.parse(glbBuffer, '', resolve, reject);
      });
      gltf.scene.name = 'MapMesh';

      gltf.scene.traverse(child => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            if (m.transparent === undefined) m.transparent = false;
            m.opacity = 0.6;
            m.transparent = true;
          });
        }
      });

      this.anchor.add(gltf.scene);
    } catch (err) {
      console.warn('[ar-preview] mesh load:', err.message);
    }
  }

  _findMeshKey(mapInfo) {
    const candidates = ['file', 'meshFile', 'glbFile', 'modelFile', 'download'];
    for (const key of candidates) {
      if (mapInfo[key]) return mapInfo[key];
    }
    if (mapInfo.files && typeof mapInfo.files === 'object') {
      for (const k of Object.keys(mapInfo.files)) {
        if (/\.glb$/i.test(k) || /mesh|model|3d/i.test(k)) return mapInfo.files[k];
      }
    }
    return null;
  }

  _startRenderLoop() {
    const render = () => {
      if (this._disposed) return;
      requestAnimationFrame(render);

      if (this.localized) {
        const dt = this.clock.getDelta();
        const step = Math.min(1, dt * 3.0);
        _pos.copy(this.anchor.position).lerp(_targetPos, step);
        _quat.copy(this.anchor.quaternion).slerp(_targetQuat, step);
        this.anchor.position.copy(_pos);
        this.anchor.quaternion.copy(_quat);
      }

      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  _startLocalizationLoop() {
    const tick = async () => {
      if (this._disposed) return;

      const now = performance.now();
      const interval = this.localized ? this.relocalizeInterval : this.localizeInterval;

      if (now - this.lastLocalizeTime >= interval && !this.localizing) {
        await this._tryLocalize();
      }

      setTimeout(tick, 500);
    };
    tick();
  }

  async _tryLocalize() {
    if (!this.video || this.video.readyState < 2) return;
    this.localizing = true;

    try {
      const blob = await this._captureFrame();
      if (!blob || blob.size < 100) {
        this.localizing = false;
        return;
      }

      const vw = this.video.videoWidth;
      const vh = this.video.videoHeight;
      const focalLength = (vw / 2) / Math.tan(Math.PI / 6);

      const fd = buildLocalizeFormData(blob, this.mapCode, vw, vh, focalLength);

      const post = (url, form) =>
        fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` },
          body: form,
        });

      let res = await post(VPS_QUERY_SINGLE, fd);
      if (res.status === 404) {
        res = await post(VPS_QUERY_SINGLE_ALT, buildLocalizeFormData(blob, this.mapCode, vw, vh, focalLength));
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`VPS ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`);
      }
      const data = await readJsonResponse(res);

      if (data.poseFound || data.position) {
        const confidence = data.confidence ?? data.score ?? 0;
        if (confidence < this.minConfidence) {
          this.onStatus(`Low confidence (${(confidence * 100).toFixed(0)}%) — keep scanning`);
          this.lastLocalizeTime = performance.now();
          this.localizing = false;
          return;
        }

        const pos = data.position;
        const rot = data.rotation || data.quaternion || data.orientation;

        if (pos && rot) {
          _targetPos.set(
            pos.x ?? pos[0] ?? 0,
            pos.y ?? pos[1] ?? 0,
            pos.z ?? pos[2] ?? 0,
          );
          _targetQuat.set(
            rot.x ?? rot[0] ?? 0,
            rot.y ?? rot[1] ?? 0,
            rot.z ?? rot[2] ?? 0,
            rot.w ?? rot[3] ?? 1,
          );

          if (!this.localized) {
            this.anchor.position.copy(_targetPos);
            this.anchor.quaternion.copy(_targetQuat);
          }

          this.anchor.visible = true;
          this.localized = true;

          if (!this.hasEverLocalized) {
            this.hasEverLocalized = true;
            this.onLocalized();
          }

          this.onStatus(`Localized (${(confidence * 100).toFixed(0)}%)`);
        }
      } else {
        if (!this.localized) {
          this.onStatus('Scanning — move slowly around the area');
        }
      }

      this.lastLocalizeTime = performance.now();
    } catch (err) {
      console.warn('[ar-preview] localize error:', err.message);
      this.lastLocalizeTime = performance.now();
    }

    this.localizing = false;
  }

  async _captureFrame() {
    if (!this.video || this.video.videoWidth === 0) return null;
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;

    if (!this._captureCanvas) {
      this._captureCanvas = document.createElement('canvas');
      this._captureCtx = this._captureCanvas.getContext('2d');
    }
    this._captureCanvas.width = w;
    this._captureCanvas.height = h;
    this._captureCtx.drawImage(this.video, 0, 0, w, h);

    return new Promise((resolve) => {
      this._captureCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.75);
    });
  }
}

function buildLocalizeFormData(blob, mapCode, vw, vh, focalLength) {
  const fd = new FormData();
  if (mapCode.startsWith('MSET_')) {
    fd.append('mapSetCode', mapCode);
  } else {
    fd.append('mapCode', mapCode);
  }
  fd.append('queryImage', blob, 'frame.jpg');
  fd.append('fx', String(focalLength));
  fd.append('fy', String(focalLength));
  fd.append('px', String(vw / 2));
  fd.append('py', String(vh / 2));
  fd.append('width', String(vw));
  fd.append('height', String(vh));
  fd.append('isRightHanded', 'true');
  return fd;
}

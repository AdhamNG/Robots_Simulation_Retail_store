/**
 * NavMe Editor — runs a small slice of saved behavior TypeScript in-browser.
 *
 * Add to your behavior file (below the Mattercraft class):
 *   export const navmeIntervalMs = 300000; // optional (ms), default 5 minutes; min 1000
 *   export function navmeOnInterval(mesh, cycleIndex) { ... }
 *
 * `mesh` is the object's THREE.Object3D (primitive mesh, route group, or breadcrumbs group).
 * `cycleIndex` is 0, 1, 2, ... (use cycleIndex % n to loop waypoints).
 *
 * TypeScript is loaded on demand (dynamic import) so the main bundle stays smaller.
 */
import * as THREE from 'three';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

/** Start loading the transpiler early (e.g. right after editor opens). */
export function preloadBehaviorTranspiler() {
  return loadTs();
}

/** @type {Promise<typeof import('typescript')> | null} */
let tsModPromise = null;
function loadTs() {
  if (!tsModPromise) tsModPromise = import('typescript');
  return tsModPromise;
}

/** @param {any} entry */
export function getRuntimeTarget(entry) {
  if (!entry) return null;
  if (entry.type === 'route' && entry.route) return entry.route.group;
  if (entry.type === 'navBreadcrumbs' && entry.crumbs) return entry.crumbs.group;
  if (entry.type === 'navigationMesh' && entry.navMeshGroup) return entry.navMeshGroup;
  return entry.mesh || null;
}

/**
 * @param {string} source
 */
function extractIntervalMs(source) {
  const m = source.match(/export\s+const\s+navmeIntervalMs\s*=\s*(\d+)\s*;?/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1000) return n;
  }
  return DEFAULT_INTERVAL_MS;
}

/**
 * @param {string} source
 * @returns {string|null}
 */
function extractNavMeFunctionSource(source) {
  const re = /export\s+function\s+navmeOnInterval\s*\(/;
  const m = source.match(re);
  if (!m || m.index === undefined) return null;

  let i = m.index;
  const openParen = source.indexOf('(', i);
  if (openParen === -1) return null;
  let depth = 0;
  let j = openParen;
  while (j < source.length) {
    const c = source[j];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) {
        j++;
        break;
      }
    }
    j++;
  }
  const braceStart = source.indexOf('{', j);
  if (braceStart === -1) return null;

  depth = 0;
  let k = braceStart;
  while (k < source.length) {
    const c = source[k];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        k++;
        break;
      }
    }
    k++;
  }

  const slice = source.slice(m.index, k);
  return slice.replace(/^\s*export\s+function\s+/, 'function ');
}

/**
 * @param {string} tsFragment
 * @param {typeof import('typescript')} ts
 */
function transpileFunctionOnly(tsFragment, ts) {
  const result = ts.transpileModule(tsFragment, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
    reportDiagnostics: false,
  });
  return result.outputText || '';
}

/**
 * @param {string} tsFragment
 * @param {typeof import('typescript')} ts
 */
function compileNavMeFunctionSync(tsFragment, ts) {
  let js;
  try {
    js = transpileFunctionOnly(tsFragment, ts);
  } catch (e) {
    return { fn: null, error: e?.message || String(e) };
  }

  try {
    const factory = new Function('THREE', 'Math', `"use strict"; ${js}\nreturn navmeOnInterval;`);
    const fn = factory(THREE, Math);
    if (typeof fn !== 'function') return { fn: null, error: 'navmeOnInterval is not a function after compile' };
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: e?.message || String(e) };
  }
}

/**
 * @param {object} beh
 */
export function stopBehaviorRuntime(beh) {
  if (!beh || !beh._runtime) return;
  if (beh._runtime.timerId != null) {
    clearInterval(beh._runtime.timerId);
  }
  beh._runtime = undefined;
  beh.runtimeError = undefined;
}

/**
 * Run a behavior against an explicit Object3D (e.g. scene script root).
 * @param {import('three').Object3D|null} mesh
 * @param {object} beh
 * @param {()=>void} [onAfterTick]
 */
export async function startBehaviorRuntimeOnMesh(mesh, beh, onAfterTick) {
  stopBehaviorRuntime(beh);

  const source = beh.source;
  if (!source || typeof source !== 'string') return;

  const intervalMs = extractIntervalMs(source);
  const frag = extractNavMeFunctionSource(source);
  if (!frag) {
    beh.runtimeError = undefined;
    return;
  }

  let ts;
  try {
    ts = await loadTs();
  } catch (e) {
    beh.runtimeError = `Failed to load TypeScript: ${e?.message || e}`;
    console.warn('[BehaviorRuntime]', beh.runtimeError);
    return;
  }

  const { fn, error } = compileNavMeFunctionSync(frag, ts);
  if (error || !fn) {
    beh.runtimeError = error || 'Compile failed';
    console.warn('[BehaviorRuntime]', beh.fileName, error);
    return;
  }

  if (!mesh) {
    beh.runtimeError = 'No mesh target for this object type';
    return;
  }

  beh.runtimeError = undefined;
  beh._runtime = { cycleIndex: 0 };

  const tick = () => {
    try {
      const idx = beh._runtime.cycleIndex;
      fn(mesh, idx);
      beh._runtime.cycleIndex = idx + 1;
      if (typeof onAfterTick === 'function') onAfterTick();
    } catch (e) {
      console.warn('[BehaviorRuntime] navmeOnInterval error', e);
      beh.runtimeError = e?.message || String(e);
    }
  };

  tick();
  beh._runtime.timerId = setInterval(tick, intervalMs);
}

/**
 * @param {object} entry
 * @param {object} beh
 * @param {()=>void} [onAfterTick]
 */
export async function startBehaviorRuntime(entry, beh, onAfterTick) {
  const mesh = getRuntimeTarget(entry);
  await startBehaviorRuntimeOnMesh(mesh, beh, onAfterTick);
}

/**
 * @param {object} entry
 * @param {object} beh
 * @param {()=>void} [onAfterTick]
 */
export async function refreshBehaviorRuntime(entry, beh, onAfterTick) {
  await startBehaviorRuntime(entry, beh, onAfterTick);
}

/**
 * @param {import('three').Object3D|null} mesh
 * @param {object} beh
 * @param {()=>void} [onAfterTick]
 */
export async function refreshBehaviorRuntimeOnMesh(mesh, beh, onAfterTick) {
  await startBehaviorRuntimeOnMesh(mesh, beh, onAfterTick);
}

/**
 * Behavior Generator — creates Mattercraft-style custom behavior .ts files
 * for any scene object type, and triggers a browser download.
 */

const TYPE_MAP = {
  box:            { component: 'Box',                    import: '@zcomponent/three/lib/components/meshes/Box',         tag: 'three/Object3D/Mesh/Box' },
  sphere:         { component: 'Sphere',                 import: '@zcomponent/three/lib/components/meshes/Sphere',      tag: 'three/Object3D/Mesh/Sphere' },
  cylinder:       { component: 'Cylinder',               import: '@zcomponent/three/lib/components/meshes/Cylinder',    tag: 'three/Object3D/Mesh/Cylinder' },
  plane:          { component: 'Plane',                  import: '@zcomponent/three/lib/components/meshes/Plane',       tag: 'three/Object3D/Mesh/Plane' },
  cone:           { component: 'Cone',                   import: '@zcomponent/three/lib/components/meshes/Cone',        tag: 'three/Object3D/Mesh/Cone' },
  torus:          { component: 'Torus',                  import: '@zcomponent/three/lib/components/meshes/Torus',       tag: 'three/Object3D/Mesh/Torus' },
  route:          { component: 'Group',                  import: '@zcomponent/three/lib/components/Group',              tag: 'three/Object3D/Group' },
  navBreadcrumbs: { component: 'Group',                  import: '@zcomponent/three/lib/components/Group',              tag: 'three/Object3D/Group' },
  navigationMesh: {
    component: 'NavigationMesh',
    import: '@zcomponent/three-navigation/lib/components/NavigationMesh',
    tag: 'three/Object3D/NavigationMesh',
  },
};

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Generate the TypeScript source for a custom behavior.
 * @param {string} behaviorName  PascalCase class name
 * @param {string} objectType    'box' | 'sphere' | ... | 'route' | 'navBreadcrumbs'
 * @returns {string} TypeScript source
 */
export function generateBehaviorSource(behaviorName, objectType) {
  const info = TYPE_MAP[objectType] || TYPE_MAP.box;
  const className = toPascalCase(behaviorName);
  const comp = info.component;
  const importPath = info.import;
  const tag = info.tag;

  return `\
import { Behavior, BehaviorConstructorProps, ContextManager, registerBehaviorRunAtDesignTime } from "@zcomponent/core";
import { ${comp} } from "${importPath}";
import { default as Scene } from "./Scene.zcomp";

interface ConstructionProps {
  // Add any constructor props you'd like for your behavior here
}

/**
 * @zbehavior
 * @zparents ${tag}
 */
export class ${className} extends Behavior<${comp}> {

  protected zcomponent = this.getZComponentInstance(Scene);

  constructor(contextManager: ContextManager, instance: ${comp}, protected constructorProps: ConstructionProps) {
    super(contextManager, instance);

    // Register handlers for events on the attached node:
    //
    // this.register(this.instance.onPointerDown, (evt) => {
    //   // Handle pointer-down on this ${objectType}
    // });
    //
    // Or reference other nodes in your scene:
    //
    // this.register(this.zcomponent.nodes.SomeNode.onClick, () => {
    //   // ...
    // });
  }

  /**
   * Called every frame while this behavior is active.
   * @param dt delta-time in milliseconds
   */
  // onBeforeRender(dt: number) {
  //   const pos = this.instance.element.position;
  //   // Example: rotate slowly
  //   // this.instance.element.rotation.y += 0.01;
  // }

  dispose() {
    // Clean up any resources (listeners are auto-removed)
    return super.dispose();
  }
}

// Uncomment to run at design time inside the editor
// registerBehaviorRunAtDesignTime(${className});
`;
}

/**
 * Generate and download a behavior .ts file.
 * @param {string} behaviorName  Human-readable name (will be PascalCased)
 * @param {string} objectType    Scene object type
 * @returns {{ fileName: string, className: string }} metadata
 */
export function downloadBehaviorFile(behaviorName, objectType) {
  const className = toPascalCase(behaviorName);
  const source = generateBehaviorSource(behaviorName, objectType);
  const fileName = `${className}.ts`;

  const blob = new Blob([source], { type: 'text/typescript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { fileName, className };
}

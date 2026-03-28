# Mattercraft Scripting — Full Reference

## Language & Environment

- **Language**: TypeScript (compiled to JavaScript)
- **Rendering**: three.js (accessible via `import * as THREE from "three"`)
- **Editor**: Monaco (VS Code engine) with autocomplete, IntelliSense
- **Module system**: ES modules with import/export

---

## Script Entity Types

### 1. Custom Behaviors (`@zbehavior`)

Attached to nodes. Receive the host node as `instance`.

```typescript
import { Behavior, BehaviorConstructorProps, ContextManager } from "@zcomponent/core";
import { Box } from "@zcomponent/three/lib/components/meshes/Box";
import { default as Scene } from "./Scene.zcomp";

interface ConstructionProps {
  // editor-configurable properties
}

/** @zbehavior */
export class MyBehavior extends Behavior<Box> {
  protected zcomponent = this.getZComponentInstance(Scene);

  constructor(
    contextManager: ContextManager,
    instance: Box,
    protected constructorProps: ConstructionProps
  ) {
    super(contextManager, instance);
    // Setup code, event listeners
  }

  dispose() {
    return super.dispose();
  }
}
```

### 2. Custom Components (`@zcomponent`)

Define new node types. Extend `Group` or other components.

```typescript
import { ContextManager, Observable, registerLoadable } from "@zcomponent/core";
import { Group } from "@zcomponent/three/lib/components/Group";
import * as THREE from "three";

interface ConstructorProps {
  /** @zui @zdefault 1 */
  radius: number;
}

/** @zcomponent @zicon offline_bolt */
export class MySphere extends Group {
  /** @zui @zdefault 0.5 */
  public metalness = new Observable(0.5);

  constructor(contextManager: ContextManager, constructorProps: ConstructorProps) {
    super(contextManager, constructorProps);
    registerLoadable(contextManager, this._load(constructorProps));
  }

  private async _load(props: ConstructorProps) {
    const mat = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(props.radius ?? 1),
      mat
    );
    this.element.add(mesh);

    this.register(this.metalness, (v) => { mat.metalness = v; });
  }

  public dispose() { return super.dispose(); }
}
```

### 3. Custom Contexts (`@zcontext`)

Singleton state containers.

```typescript
import { Context, ContextManager, Observable } from "@zcomponent/core";

interface ConstructionProps {}

/** @zcontext */
export class ScoreContext extends Context<ConstructionProps> {
  public currentScore = new Observable<number>(0);

  constructor(cm: ContextManager, props: ConstructionProps) {
    super(cm, props);
  }
}

export function useCurrentScore(cm: ContextManager) {
  return cm.get(ScoreContext).currentScore;
}
```

---

## Core APIs

### Event Registration
```typescript
// Auto-cleanup on dispose
this.register(this.instance.onPointerDown, (evt) => { /* ... */ });
this.register(this.instance.onClick, (evt) => { /* ... */ });
```

### Accessing Scene Elements
```typescript
protected zcomponent = this.getZComponentInstance(Scene);

// Access nodes by name
const box = this.zcomponent.nodes.Box;
box.position.value = [1, 2, 3];
box.element.visible = false; // three.js level

// Access by ID
this.zcomponent.entityByID.get(someId);

// Access by label
this.zcomponent.nodeByLabel.get("MyLabel");
```

### Frame Loop
```typescript
import { useOnBeforeRender } from "@zcomponent/core";

this.register(useOnBeforeRender(contextManager), (dt) => {
  // dt = milliseconds since last frame
  this.instance.element.rotation.y += 0.01;
});
```

### Observable Pattern
```typescript
import { Observable } from "@zcomponent/core";

public myProp = new Observable<number>(0);

// Read
console.log(this.myProp.value);

// Write
this.myProp.value = 42;

// React to changes
this.register(this.myProp, (newVal) => {
  // runs only when value changes
});
```

### Context Access in Behaviors
```typescript
const scoreCtx = contextManager.get(ScoreContext);
this.register(scoreCtx.currentScore, (score) => {
  this.instance.element.innerHTML = `Score: ${score}`;
});
```

---

## Common Node Events

| Event | Description |
|-------|-------------|
| `onPointerDown` | User presses/taps on node |
| `onPointerUp` | User releases press/tap |
| `onPointerMove` | Pointer moves over node |
| `onClick` | Complete click/tap |
| `onPointerEnter` | Pointer enters node bounds |
| `onPointerLeave` | Pointer leaves node bounds |

---

## Property System

### Runtime Properties (can animate, change at runtime)
```typescript
/** @zui @zdefault 0 @zgroup Appearance @zgrouppriority 20 */
public metalness = new Observable(0);
```

### Constructor Properties (fixed after load)
```typescript
interface ConstructorProps {
  /** @zui @zdefault 1 @zgroup Geometry */
  radius: number;
}
```

### Property Annotation Reference

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@zui` | Show in editor panel | `@zui` |
| `@zdefault` | Default value | `@zdefault 0.5` |
| `@zgroup` | Property group name | `@zgroup Appearance` |
| `@zgrouppriority` | Group ordering (higher = top) | `@zgrouppriority 20` |
| `@ztype` | UI widget type | `@ztype proportion` (0-1 slider) |
| | | `@ztype text-multiline` |
| | | `@ztype angle-radians` / `angle-degrees` |
| | | `@ztype color-norm-rgb` / `color-norm-rgba` |
| | | `@ztype color-unnorm-rgb` / `color-unnorm-rgba` |
| | | `@ztype url` |
| `@zvalues` | Autocomplete source | `@zvalues files *.png` |
| | | `@zvalues animations` |
| | | `@zvalues morphtargets` |
| | | `@zvalues events` |
| | | `@zvalues nodeids` / `nodelabels` |
| | | `@zvalues layerclipids` / `layerids` |

---

## Script Creation Workflow

1. **Project Panel** → + icon → choose template type
2. Double-click script file to open in Monaco editor
3. Write TypeScript with full IntelliSense
4. Drag nodes from Hierarchy into script to create references
5. Side-by-side editing: right-click script → "Open to the side"

---

## Design-Time Execution

Behaviors can optionally run in the editor (not just at runtime):
```typescript
import { registerBehaviorRunAtDesignTime } from "@zcomponent/core";

// At bottom of file:
registerBehaviorRunAtDesignTime(MyBehavior);
```

Or use `Run At Edit Time` checkbox on behavior actions.

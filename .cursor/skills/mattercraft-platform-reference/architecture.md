# Mattercraft Architecture — Deep Dive

## Nodes

Nodes are the atomic building blocks of any Mattercraft scene. They live in a
tree structure called the **Hierarchy** (displayed in the editor's right panel).

Every node is an **instance** of a Component. You can have many instances of
the same component type (e.g. multiple `Box` nodes).

Nodes have:
- **Transform** — position, rotation, scale (inherited from three.js Object3D)
- **Properties** — component-specific (e.g. geometry params, material, color)
- **Behaviors** — attached scripts that add interactivity
- **Children** — other nodes nested inside

### Built-in Node Types
| Category | Examples |
|----------|---------|
| Geometry | `Box`, `Sphere`, `Cylinder`, `Plane`, `Cone`, `Torus` |
| Containers | `Group` |
| Cameras | `PerspectiveCamera`, `OrthographicCamera`, `ZapparCamera` |
| Lights | `AmbientLight`, `DirectionalLight`, `PointLight`, `SpotLight`, `HemisphereLight` |
| Media | `Image`, `Video`, `Audio`, `Text` |
| AR | `WorldTracker`, `InstantWorldTracker`, `FaceTracker`, `ImageTracker` |
| UI | `Div`, `Button`, `Input` (HTML-based) |
| Triggers | `SphereTrigger`, `PointTrigger`, `PlaneTrigger`, `CubeTrigger` |
| Raycasters | `Raycaster` |
| Physics | `RigidBody`, various Collider types |

---

## Components

Components define the **type** of a node. They are TypeScript/JavaScript classes
that extend Mattercraft's `Component` base class (or more commonly, `Group`).

Each component wraps a lower-level three.js object:
- `Box` wraps `THREE.Mesh` with `THREE.BoxGeometry`
- `Group` wraps `THREE.Group`
- `PerspectiveCamera` wraps `THREE.PerspectiveCamera`

### Custom Components
Developers can create custom components by:
1. Extending `Group` (or another component)
2. Adding the `@zcomponent` annotation
3. Using `registerLoadable()` for async initialization
4. Adding three.js objects to `this.element`

```typescript
import { ContextManager, registerLoadable } from "@zcomponent/core";
import { Group } from "@zcomponent/three/lib/components/Group";
import * as THREE from "three";

/** @zcomponent @zicon favorite */
export class MyComponent extends Group {
  constructor(contextManager: ContextManager, constructorProps: {}) {
    super(contextManager, constructorProps);
    registerLoadable(contextManager, this._load());
  }

  private async _load() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    this.element.add(mesh);
  }

  public dispose() {
    return super.dispose();
  }
}
```

---

## Behaviors

Behaviors are scripts **attached to nodes**. They receive a reference to their
host node (`instance`) and can listen to events, modify properties, and access
other scene elements.

### Behavior Lifecycle
1. **Constructor** — called once when node is created; set up event listeners
2. **Frame loop** — optional per-frame callback via `useOnBeforeRender`
3. **Dispose** — cleanup when node is removed

### Key Pattern: Event Registration
```typescript
this.register(this.instance.onPointerDown, (evt) => {
  console.log("Clicked!", evt);
});
```

The `register()` method ensures automatic cleanup on dispose.

### Accessing Other Nodes
```typescript
protected zcomponent = this.getZComponentInstance(Scene);

// Access by name
this.zcomponent.nodes.MyBox.position.value = [1, 2, 3];

// Access animations
this.zcomponent.animation.layers.Layer1.clips.State1.play();
```

---

## Contexts

Contexts are **singleton** state containers shared across all behaviors and
components. They extend the `Context` base class.

### Pattern: Observable State
```typescript
import { Context, ContextManager, Observable } from "@zcomponent/core";

/** @zcontext */
export class GameContext extends Context<{}> {
  public score = new Observable<number>(0);
  public isPlaying = new Observable<boolean>(false);

  constructor(cm: ContextManager, props: {}) {
    super(cm, props);
  }

  addScore(points: number) {
    this.score.value += points;
  }
}
```

### Consuming a Context in a Behavior
```typescript
const game = contextManager.get(GameContext);
this.register(game.score, (newScore) => {
  this.instance.element.innerHTML = `Score: ${newScore}`;
});
```

---

## zcomp Files

`.zcomp` files are the serialized scene format. They store:
- Hierarchy tree structure
- Node property values
- Animation layers, clips, keyframes
- Behavior attachments
- Component references

### Multi-zcomp Projects
- Default: `Scene.zcomp`
- Additional zcomps act as **prefabs** (reusable sub-scenes)
- Child zcomps have their own Hierarchy, Animations, Behaviors
- Expose **Component Props** for customization from parent scene
- Emit events to communicate with parent

### Creating a zcomp
1. Project Panel → + icon → `3DComponent`
2. Edit its own Hierarchy independently
3. Add to any scene via Hierarchy → right-click → + New → select zcomp name

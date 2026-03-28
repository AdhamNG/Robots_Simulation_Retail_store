---
name: mattercraft-platform-reference
description: >-
  Comprehensive reference for the Zapworks Mattercraft 3D editor platform.
  Covers architecture, UI layout, scene hierarchy, node/component system,
  behaviors, contexts, scripting API, animation system, AR/VR tracking,
  physics, particles, navigation mesh, VPS, zcomponents, and publishing.
  Use when building or extending the NavMe Editor to replicate or match
  Mattercraft features, or when the user asks about Mattercraft capabilities.
---

# Mattercraft Platform Reference

Mattercraft is Zapworks' browser-based 3D scene authoring tool for building
WebAR, WebVR, and 3D web experiences. It uses **three.js** under the hood and
**TypeScript** for scripting. This skill documents every major subsystem so the
NavMe Editor can replicate equivalent functionality.

Source: <https://docs.zap.works/mattercraft/>

---

## 1. Core Architecture

| Concept | Purpose |
|---------|---------|
| **Nodes** | Basic scene elements (groups, meshes, cameras, lights). Arranged in a tree called the **Hierarchy**. |
| **Components** | Type definitions for nodes (e.g. `Group`, `Box`, `PerspectiveCamera`). Each node is an instance of a Component. |
| **Behaviors** | Scripts attached to nodes that add interactivity (click handlers, animation triggers, custom logic). |
| **Contexts** | Singleton scripts for shared state / business logic (scores, timers, global config). |
| **zcomp files** | `.zcomp` — serialized scene files storing Hierarchy, Nodes, and Animations. Like Unity prefabs. Default: `Scene.zcomp`. |

For full details, see [architecture.md](architecture.md).

---

## 2. Editor UI Layout

| Panel | Location | Purpose |
|-------|----------|---------|
| Left Menu | Left sidebar | Project files, All Files, Search, Publish, Dependencies, Commit History, Settings |
| 3D Viewport | Center | Scene preview with gizmos for translate/rotate/scale |
| Hierarchy Panel | Right of viewport | Node tree; add nodes via right-click or drag from Left Menu |
| Node Properties | Right panel | Editable properties for selected node |
| Behaviors Panel | Right panel (below props) | Add/manage behaviors on selected node |
| Animations Panel | Bottom | Layers, Clips (States & Timelines), curve editor |
| Status Bar | Bottom bar | Project size, errors, debug tools |

For full details, see [editor-ui.md](editor-ui.md).

---

## 3. Scripting System

TypeScript-based. Three script entity types:

| Entity | Annotation | Base Class | Purpose |
|--------|------------|------------|---------|
| Custom Behavior | `@zbehavior` | `Behavior<T>` | Attached to a node; receives `instance` ref |
| Custom Component | `@zcomponent` | extends `Group` / `Component` | Defines new node types wrapping three.js objects |
| Custom Context | `@zcontext` | `Context<Props>` | Shared state accessible from any behavior/component |

### Key APIs
- `this.instance` — the node this behavior is attached to
- `this.instance.element` — underlying three.js object
- `this.zcomponent.nodes.NodeName` — access other nodes
- `this.zcomponent.animation.layers.LayerName.clips.ClipName.play()`
- `this.register(event, handler)` — event subscription with auto-cleanup
- `useOnBeforeRender(contextManager)` — per-frame callback
- `Observable<T>` — reactive property wrapper with `.value` getter/setter

### Property Annotations
- `@zui` — show in editor UI
- `@zdefault value` — default value
- `@zgroup name` / `@zgrouppriority n` — organize in panels
- `@ztype proportion|text-multiline|angle-radians|color-norm-rgb|url` — UI hint
- `@zvalues files *.png|animations|morphtargets|events|nodeids` — autocomplete
- `@zicon material_icon_name` — custom icon

For full details, see [scripting.md](scripting.md).

---

## 4. Animation System

| Concept | Description |
|---------|-------------|
| **Layers** | Groups of clips. Only one clip active per layer at a time. |
| **Clips** | Either a **State** or a **Timeline**. |
| **States** | Stored set of property values; instant transition with configurable fade/easing. |
| **Timelines** | Keyframe-based animations with seek bar, easing curves, playhead. |
| **Stream Tracks** | Streamed 3D model animations, video, audio clips. |

### Clip Control (Script)
```typescript
this.zcomponent.animation.layers.MyLayer.clips.MyClip.play();
// .pause(), .seek(timeMs), .stop()
```

### Clip Control (No-code Behavior Actions)
- Play Layer Clip, Pause Layer Clip, Toggle Layer Clips
- Set Layer Off, Activate State

### Fade Parameters
- Fade Time, Easing (built-in or custom curve), Pin To

For full details, see [animation.md](animation.md).

---

## 5. Interactivity

### Behavior Actions (no-code)
Built-in actions attached to events: Toggle Visibility, Launch URL, Play Sound,
Take/Share/Download Snapshot, Console Log, Log Analytics Event, Activate Camera,
Launch WebXR Session, Show Text Alert.

### Raycasters
Shoot rays into 3D space; tag-based filtering. Events:
`onIntersection`, `onIntersectionEnter`, `onIntersectionLeave`.

### Triggers
Shape-based collision zones: `SphereTrigger`, `PointTrigger`, `PlaneTrigger`, `CubeTrigger`.
Tag-based matching. Events: `onCollisionEnter`, `onCollisionMove`, `onCollisionLeave`.
Support `local:` tag prefix for zcomp-scoped triggers.

For full details, see [interactivity.md](interactivity.md).

---

## 6. Augmented Reality

Powered by Zappar tracking. Requires `ZapparCamera` component.

| Tracking Type | Component | Use Case |
|---------------|-----------|----------|
| World Tracking | `WorldTracker` → `GroundAnchorGroup` → `WorldPlacementGroup` | Place objects on surfaces, walk-around viewing |
| Instant World Tracking | `InstantWorldTracker` | Quick place without initialization |
| Face Tracking | `FaceTracker` → `AnchorGroup` | Face filters, virtual try-on |
| Image Tracking | `ImageTracker` + `.zpt` target | Augment posters, products, magazines |

Multiple tracking types can coexist in one project across multiple zcomps.

For full details, see [augmented-reality.md](augmented-reality.md).

---

## 7. Physics (Havok)

Installed via Dependencies Browser. Features:
- **Rigid Bodies** — dynamic, static, kinematic
- **Colliders** — box, sphere, capsule, mesh, convex hull
- **Physics Material** — friction, restitution
- **Physics Settings** — gravity, timestep
- **Constraints** — Ball-and-Socket, Distance, Hinge, Locked

For full details, see [physics.md](physics.md).

---

## 8. Media & UI

### Media Types
3D Models (GLB/GLTF), Images, Videos, Audio, Text.

### User Interface
- **Using HTML** — HTML/CSS overlays for buttons, HUD, forms
- **Camera Transform** — UI elements anchored to camera space

---

## 9. Particles

Installed via Dependencies Browser. Dynamic visual effects: fire, sparkles,
confetti, smoke, etc.

---

## 10. VPS (Visual Positioning)

- **MultiSet VPS** — large-scale location-based AR using MultiSet maps
- **Immersal VPS** — alternative VPS provider with map scanning

---

## 11. zcomponents (Prefabs)

Reusable scene components (like Unity prefabs). Stored as `.zcomp` files.
- Own Hierarchy, Nodes, Behaviors, Animations
- Add to scenes via Hierarchy right-click → + New
- **Component Props** — customizable parameters exposed to parent scene
- **Emitting Events** — communicate from child zcomp to parent

---

## 12. Dependencies & Publishing

### Dependencies Browser
Install Mattercraft add-ons (Physics, Particles, Analytics, AR, Video Recorder)
or any NPM package.

### Publishing
- **Live Preview** — real-time preview in browser
- **Zapworks Publishing** — one-click publish with version management
- **Self-hosting** — export and host on own infrastructure
- **App Clips & WebXR** — enhanced AR on iOS/Android

---

## 13. Glossary of Annotations

| Annotation | Target | Purpose |
|------------|--------|---------|
| `@zbehavior` | class | Mark as behavior (appears in Behaviors panel) |
| `@zcomponent` | class | Mark as component (appears in Hierarchy menus) |
| `@zcontext` | class | Mark as context |
| `@zprop` / `@zui` | property | Show in editor properties panel |
| `@zdefault` | property | Default value |
| `@zgroup` | property/class | Group in UI |
| `@zicon` | class | Google Material icon name |
| `@ztag` | class | Component categorization tag |
| `@zstream` | class | Media stream component |
| `@ztype` | property | UI widget hint |
| `@zvalues` | property | Autocomplete source |
| `deprecated` | property | Hide from Node Properties |

---

## Additional Reference Files

- [architecture.md](architecture.md) — Deep dive into Nodes, Components, Behaviors, Contexts, zcomps
- [editor-ui.md](editor-ui.md) — Complete editor panel reference
- [scripting.md](scripting.md) — Full scripting API with code examples
- [animation.md](animation.md) — Animation system details
- [interactivity.md](interactivity.md) — Behavior Actions, Raycasters, Triggers
- [augmented-reality.md](augmented-reality.md) — All AR tracking types
- [physics.md](physics.md) — Havok physics integration

# Mattercraft Interactivity — Full Reference

## Overview

Three ways to add interactivity:
1. **Behavior Actions** — no-code, UI-configured
2. **Raycasters** — pointer-based 3D intersection detection
3. **Triggers** — shape-based collision zones

---

## 1. Behavior Actions (No-Code)

Attach to any node from the Behaviors Panel. Each action binds to an event.

### Available Actions

| Action | Description |
|--------|-------------|
| **Toggle Visibility** | Show/hide node on event |
| **Launch WebXR Session** | Start AR/VR session |
| **Activate Camera** | Switch to specified camera |
| **Take Snapshot** | Capture canvas as image |
| **Share Snapshot** | Share via Web Share API |
| **Download Snapshot** | Save canvas capture as file |
| **Show Text Alert** | Display customizable alert |
| **Play Sound** | Trigger audio playback |
| **Log Analytics Event** | Log to Google Analytics / Clarity |
| **Launch URL** | Open URL in browser |
| **Console Log** | Write message to developer console |

### Additional Behavior Categories

| Category | Behaviors |
|----------|-----------|
| **Appearance** | Override Opacity |
| **Helpers** | Bounding Box (debug visualization) |
| **Animation Actions** | Toggle Layer Clips, Set Layer Off, Play/Pause Layer Clip, Activate State |
| **Stream Actions** | Play/Pause/Stop/Seek Stream |

### Adding a Behavior Action
1. Select node in Hierarchy
2. Behaviors Panel → + icon
3. Choose action from contextual list
4. Configure: Event source, target, parameters

---

## 2. Raycasters

Cast rays into 3D space from an origin point. Detect intersected nodes.

### Setup
1. Add `Raycaster` component to Hierarchy
2. Assign `SearchTags` on the Raycaster
3. Assign matching Tags to target nodes
4. Only nodes with matching tags are detected

### Intersection Events

| Event | Fires When |
|-------|------------|
| `onIntersection` | Ray is currently intersecting a tagged node |
| `onIntersectionEnter` | Ray first enters a tagged node |
| `onIntersectionLeave` | Ray stops intersecting a tagged node |

### Intersection Data
- Point of intersection (3D coordinates)
- Normal at intersection point
- UV coordinates

### Script Usage
```typescript
this.register(this.instance.onIntersectionEnter, (evt) => {
  console.log("Hit:", evt.point, evt.normal, evt.uv);
  this.zcomponent.animation.layers.Colors.clips.RedState.play();
});
```

### Use Cases
- Object selection / highlighting
- Button press simulation
- 3D UI interaction
- Navigation (teleportation points)
- Object manipulation (grab, move, rotate)
- VR controller pointing

---

## 3. Triggers

Shape-based collision detection between objects in 3D space.

### Trigger Shapes
| Shape | Description |
|-------|-------------|
| `SphereTrigger` | Spherical detection zone |
| `PointTrigger` | Single point detection |
| `PlaneTrigger` | Infinite plane detection |
| `CubeTrigger` | Box-shaped detection zone |

### Setup
1. Add trigger shape to Hierarchy (right-click → Triggers)
2. Set **Tag** in Properties → Other section
3. Add matching Tag to other trigger(s)
4. Mark one trigger as **Is Trigger** = true

### Tag System
- Triggers only interact when they share the same tag
- `local:myTag` prefix → only interacts within same zcomp
- Multiple tags supported

### Collision Events

| Event | Fires When |
|-------|------------|
| `onCollisionEnter` | Two triggers first intersect |
| `onCollisionMove` | Triggers intersecting and moving |
| `onCollisionLeave` | Trigger exits another |

### Script Usage
```typescript
this.register(this.instance.onCollisionEnter, (evt) => {
  this.zcomponent.animation.layers.GameLayer.clips.CollisionState.play();
});
```

### Behavior Action Usage
1. Select Trigger in Hierarchy
2. Behaviors Panel → + icon
3. Choose action (e.g. Activate State)
4. Set Event property to collision event

---

## Common Events on All Nodes

| Event | Description |
|-------|-------------|
| `onPointerDown` | Press/tap on node |
| `onPointerUp` | Release press/tap |
| `onPointerMove` | Pointer moves over node |
| `onClick` | Complete click/tap gesture |
| `onPointerEnter` | Pointer enters bounds |
| `onPointerLeave` | Pointer leaves bounds |

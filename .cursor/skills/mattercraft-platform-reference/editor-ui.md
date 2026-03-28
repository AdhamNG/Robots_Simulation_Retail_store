# Mattercraft Editor UI — Complete Reference

## Overall Layout

The Mattercraft editor is a browser-based IDE with panels arranged around
a central 3D viewport. The layout is similar to Unity or Blender.

```
┌─────────────────────────────────────────────────────────┐
│                        Top Bar                          │
│  [Live Preview]  [Save]  [Undo/Redo]  [Project Name]   │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│  Left    │     3D Viewport              │  Properties   │
│  Menu    │     (scene preview,          │  Panel        │
│          │      gizmos, grid)           │  (Node Props, │
│ Project  │                              │   Behaviors)  │
│ All Files│                              │               │
│ Search   │                              │               │
│ Publish  │                              │               │
│ Deps     │                              │               │
│          ├──────────────────────────────┤               │
│          │   Animations Panel           │               │
│          │   (Layers, Clips, Timeline)  │               │
├──────────┴──────────────────────────────┴───────────────┤
│                      Status Bar                         │
│  [Project Size]  [Errors]  [Debug Tools]                │
└─────────────────────────────────────────────────────────┘
```

---

## Left Menu Panels

| Panel | Description |
|-------|-------------|
| **Project Panel** | Files relevant to creative work — scripts, assets, zcomps. Has + button to create new files (Custom Behavior, Custom Component, Custom Context, 3DComponent, Target Image). |
| **All Files Panel** | Complete file tree including auto-generated/technical files. |
| **Search Panel** | Search within Mattercraft-specific files. |
| **Publish Panel** | Publish project, view previous versions, set active version. |
| **Dependencies Panel** | Install Mattercraft add-ons and NPM packages via Dependencies Browser. |

### Bottom of Left Menu
| Feature | Description |
|---------|-------------|
| **User** | Shows collaborators editing the same project simultaneously. |
| **Commit History** | Version control — save snapshots as you work. |
| **What's New** | Latest Mattercraft updates and changelog. |
| **Settings** | Project settings (time scale units: ms/s/Hz, etc.). |

---

## 3D Viewport

- **Rendering** — three.js WebGL renderer
- **Camera** — Orbit controls (rotate, pan, zoom)
- **Gizmos** — Translate (W), Rotate (E), Scale (R) transform controls
- **Grid** — Ground reference grid
- **Selection** — Click to select nodes; bounding box highlight
- **Drag-and-drop** — Drag assets from Left Menu into viewport or Hierarchy

---

## Hierarchy Panel

Displays the scene graph as a tree. Each entry is a Node.

### Actions
- **Right-click → + New** — Add components (contextual list based on parent)
- **Drag** — Rearrange parent/child relationships
- **Click** — Select node (shows properties in right panel)
- **Double-click** — Rename node

### Structure Example
```
Scene.zcomp
├── Group
│   ├── AmbientLight
│   ├── DirectionalLight
│   ├── PerspectiveCamera
│   ├── WorldTracker
│   │   └── GroundAnchorGroup
│   │       └── WorldPlacementGroup
│   │           ├── Box
│   │           └── MyModel.glb
│   ├── Raycaster
│   └── SphereTrigger
```

---

## Node Properties Panel

Shows when a node is selected. Sections:

| Section | Contents |
|---------|----------|
| **Transform** | Position (X, Y, Z), Rotation (X, Y, Z), Scale (X, Y, Z) |
| **Component Props** | Properties specific to the component type (geometry, material, etc.) |
| **Custom Props** | `@zui`-annotated properties from custom components |
| **Other** | Tags, visibility, layer assignment |

### Property Input Types
- Number fields with drag-to-adjust
- Color pickers (swatches, hex, RGB)
- Dropdowns / selects
- Toggles (boolean)
- Text fields (single and multi-line)
- Sliders (for `@ztype proportion`)
- Angle inputs (radians/degrees switcher)
- File pickers (for `@zvalues files` pattern)

---

## Behaviors Panel

Shows behaviors attached to the currently selected node.

### Adding Behaviors
1. Click + icon
2. Choose from:
   - **Behavior Actions** (no-code) — Toggle Visibility, Launch URL, Play Sound, etc.
   - **Custom Behaviors** — user-created `@zbehavior` classes
   - **+ New Custom Behavior** — generates template file

### Behavior Action Categories
| Category | Actions |
|----------|---------|
| General | Toggle Visibility, Launch URL, Console Log, Show Text Alert |
| Media | Play Sound, Take/Share/Download Snapshot |
| Camera | Activate Camera, Launch WebXR Session |
| Analytics | Log Analytics Event |
| Animation | Play/Pause Layer Clip, Toggle Layer Clips, Set Layer Off, Activate State |
| Stream | Play/Pause/Stop/Seek Stream |
| Appearance | Override Opacity |
| Helpers | Bounding Box |

---

## Animations Panel

Located at the bottom; can be popped out to a separate window.

### Tabs
- **Layers** — Layer management (create, configure fade defaults)
- **Clips** — Independent clips not yet assigned to layers

### Layer View
Each layer shows its clips. Only one clip per layer is active at a time.

### State Clip Editor
When a State clip is selected: shows node properties that can be stored.
Adjust values in the Node Properties panel — they're captured to the state.

### Timeline Clip Editor
When a Timeline clip is selected: shows keyframe tracks.

| Element | Description |
|---------|-------------|
| Seek bar | Current time position |
| Playhead | Visual marker on timeline |
| Controls | Play, Pause, Jump to start/end, Previous/Next keyframe |
| Tracks | Per-property animation tracks with keyframes |
| Keyframes | Hold property values at specific times |
| Easing | Interpolation curve between keyframes (customizable via curve editor) |

### Clip Settings
| Setting | Options |
|---------|---------|
| Default easing | Left/Right side easing type |
| Clip length | Auto / Expand / Manual |
| Track size | Small / Medium / Large |
| Snap | Playhead↔keyframes, Keyframes↔keyframes |

---

## Status Bar

- Project file size indicator
- Error count with clickable navigation
- Debug tools access

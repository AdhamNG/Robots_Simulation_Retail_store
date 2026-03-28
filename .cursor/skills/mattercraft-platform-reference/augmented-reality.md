# Mattercraft Augmented Reality — Full Reference

## Overview

Mattercraft supports four AR tracking types via Zappar's tracking SDK.
Multiple tracking types can coexist in one project across different zcomps.

**Prerequisite**: All AR features require the `Augmented Reality by Zappar`
package from the Dependencies Browser and a `ZapparCamera` component replacing
the default `PerspectiveCamera`.

---

## ZapparCamera

Replaces the default camera. Provides device camera feed as background and
enables tracking data flow.

---

## 1. World Tracking

**Component**: `WorldTracker`

Provides advanced environment understanding with an initialization phase.
Content is placed on detected surfaces. Users can walk around objects.

### Hierarchy Structure
```
ZapparCamera
WorldTracker
├── GroundAnchorGroup
│   └── WorldPlacementGroup
│       ├── (your 3D content here)
│       └── ...
```

### WorldTracker Properties
| Property | Description |
|----------|-------------|
| `Initializing Layer Clip` | Animation during environment scanning |
| `Initialized Layer Clip` | Animation when ground anchor is found |
| `Quality Good Layer Clip` | Full 6DoF tracking active |
| `Quality Orientation Only Layer Clip` | Rotation-only tracking fallback |

### GroundAnchorGroup Properties
| Property | Description |
|----------|-------------|
| `Anchor ID` | Identifier for this anchor |
| `Show Preview At Design Time` | Toggle editor reference visualization |

### WorldPlacementGroup Properties
| Property | Description |
|----------|-------------|
| `Is Placing` | When true, content follows camera gaze |
| `Normalize Scale` | Adjust scale based on camera height |
| `Face Camera` | Rotate content to face user |

### Best Practices
- Enable App Clips (iOS) and WebXR (Android) for better stability
- Use WorldPlacementGroup for user-controlled placement
- Provide visual feedback during initialization phase

---

## 2. Instant World Tracking

**Component**: `InstantWorldTracker`

Simpler than World Tracking — no initialization phase needed.
Uses camera frames to immediately place content.

### Properties
| Property | Description |
|----------|-------------|
| `Placement mode` | Toggle placement behavior |
| `CameraPreviewOffset` | Set tracking origin point |

### When to Use
- Quick demos, simple placements
- When initialization UX is undesirable
- Prototyping

---

## 3. Face Tracking

**Component**: `FaceTracker`

Detects and tracks user faces. Ideal for filters, virtual try-on.

### Hierarchy Structure
```
ZapparCamera
FaceTracker
├── AnchorGroup (Anchor ID: 0)
│   ├── FaceMesh (optional)
│   ├── HeadMaskMesh (optional)
│   ├── FaceLandmarks (optional)
│   └── (your content: glasses, hats, etc.)
```

### FaceTracker Properties
| Property | Description |
|----------|-------------|
| `Max Faces` | Number of simultaneous faces (default 1; higher impacts performance) |

### AnchorGroup Properties
| Property | Description |
|----------|-------------|
| `Anchor ID` | Which detected face (0, 1, 2...) |
| `Show Preview At Design Time` | Toggle face mesh reference in editor |

### Sub-Components
| Component | Purpose |
|-----------|---------|
| **FaceMesh** | Deformable mesh matching face surface (for face paint effects) |
| **HeadMaskMesh** | Invisible mesh that hides content behind the head |
| **Face Landmarks** | Named anchor points on face (nose tip, left eye, chin, etc.) for precise content placement |

---

## 4. Image Tracking

**Component**: `ImageTracker`

Detects and tracks flat, curved, or concave images (posters, bottles, etc.).

### Setup
1. Generate `.zpt` target image file (Project Panel → + icon)
2. Add `ImageTracker` to Hierarchy
3. Set `Source` property to the .zpt file
4. Place content as children of the ImageTracker

### Properties
| Property | Description |
|----------|-------------|
| `Source` | Path to .zpt target image file |
| `Show Preview Design Time` | Toggle target preview in editor |
| `Mask Objects Beneath Surface` | Hide objects behind the tracked image |

### Target Image Requirements
- High-contrast, detailed images work best
- Avoid repetitive patterns
- Generated .zpt file contains tracking data

---

## Events (All Tracking Types)

Each tracker fires events you can listen to in behaviors:
- **Tracking visible** — tracker has found and is actively tracking
- **Tracking not visible** — tracker lost target
- **Specific quality events** — (World Tracking) initialization, quality changes

---

## Multi-Tracking

Combine multiple tracking types in one project:
- Use separate zcomps for different tracking modes
- Or stack trackers in the same scene
- Example: Face filter + World-tracked 3D viewer in the same experience

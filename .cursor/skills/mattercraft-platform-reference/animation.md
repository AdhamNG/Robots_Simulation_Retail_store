# Mattercraft Animation System — Full Reference

## Overview

Mattercraft has a rich animation system with layering, blending, and
composition of animation clips. Custom interpolation curves are supported
via a built-in curve editor.

---

## Layers

Layers are **groups of clips**. Only one clip per layer can be active at a time.
Playing multiple simultaneous animations requires multiple layers.

### Creating a Layer
1. Open Animations Panel → Layers tab
2. Click + icon → New Layer
3. Name it descriptively (e.g. "IdleAnims", "UITransitions")

### Layer Settings
| Parameter | Description |
|-----------|-------------|
| **Fade Time** | Default transition duration for all clips in this layer |
| **Easing** | Default easing curve (built-in presets or custom curve) |
| **Pin To** | Which stage of animation the clip should occur at |

These defaults can be overridden per-clip or via Behavior Actions.

---

## Clips

A clip is either a **State** or a **Timeline**. Clips can exist:
- Inside a Layer (recommended for playback control)
- As independent clips (in the Clips tab)

### Clip Actions (Right-click Menu)
| Action | Description |
|--------|-------------|
| Play | Play/activate from current time |
| Queue | Queue to play after current clip |
| Set as Default | Play when project launches |
| Loop | Auto-restart when finished |
| Play at Start | Play from time 0 |
| Remove from Layer | Keep clip but detach from layer |
| Rename | Change clip name |
| Delete | Remove entirely |

---

## States

A **State** is a stored set of node property values. When activated, the scene
transitions to those values using the layer's fade/easing settings.

### Creating a State
1. Layer → hover for 3 dots → + Add → New State
2. Name it (e.g. "Hover", "Active", "Hidden")
3. Click the state to open State Clip Editor
4. Adjust node properties — values are captured to the state

### Use Cases
- Toggle visibility (visible/hidden states)
- Color/material changes on hover
- Position presets (open/closed drawer)
- Scale animations (grow/shrink)

### Activating States

**Via Behavior Actions (no-code):**
1. Select node → Behaviors Panel → + icon
2. Choose "Activate State" action
3. Set Event (e.g. `onPointerDown`) and target State

**Via Script:**
```typescript
this.register(this.instance.onPointerDown, () => {
  this.zcomponent.animation.layers.MyLayer.clips.HoverState.play();
});
```

---

## Timelines

**Timelines** are keyframe-based animations with a visual timeline editor.

### Timeline Clip Editor UI

| Element | Description |
|---------|-------------|
| **(1) Seek bar time** | Current playhead time (ms/s/Hz based on settings) |
| **(2) Controls** | Play, Pause, Jump start/end, Prev/Next keyframe |
| **(3) Timeline length** | Total duration |
| **(4) Playhead** | Visual position marker |
| **(5) Zoom** | Timeline zoom + scroll bar |
| **Tracks** | Per-property rows showing keyframes |
| **Keyframes** | Diamond markers holding property values |
| **Easing curves** | Lines between keyframes showing interpolation |

### Creating a Timeline
1. Layer → 3 dots → + Add → New Timeline
2. Name it (e.g. "SpinAnimation", "FadeIn")
3. Click timeline to open editor
4. Select node in Hierarchy
5. Adjust properties — keyframes auto-created at playhead position

### Keyframe Operations
| Operation | How |
|-----------|-----|
| Add keyframe | Right-click playhead → "Add keyframe at current time" |
| Delete | Right-click keyframe → Delete |
| Copy/Paste | Right-click → Copy/Paste keyframe(s) |
| Paste on active track | Paste into a different timeline |
| Paste easing only | Copy easing curve, keep values |
| Modify values | Right-click keyframe → Modify keyframe |
| Modify easing | Right-click easing → opens curve editor |

### Clip Settings
| Setting | Options |
|---------|---------|
| Default easing | Left/Right side easing presets |
| Clip length | Auto (to last keyframe), Expand, Manual |
| Track size | Small, Medium, Large |
| Snap | Playhead↔keyframes, Keyframes↔keyframes |

### Playing Timelines

**Via Behavior Actions:**
- Play Layer Clip, Pause Layer Clip

**Via Script:**
```typescript
const clip = this.zcomponent.animation.layers.MyLayer.clips.MyTimeline;
clip.play();      // play from current time
clip.pause();     // pause
clip.seek(1500);  // seek to 1500ms
clip.stop();      // stop and reset to 0
```

---

## Stream Tracks

Timelines can contain **stream tracks** for:
- 3D model embedded animations (from GLB/GLTF)
- Video playback
- Audio playback

Stream actions: Play Stream, Pause Stream, Stop Stream, Seek Stream.

---

## Blending Multiple Animations

To blend animations (e.g. idle + walk):
1. Create separate Layers for each animation
2. Each layer plays its own clip independently
3. Fade settings control blending between clips within a layer

Only one clip per layer can be active, but multiple layers run simultaneously.

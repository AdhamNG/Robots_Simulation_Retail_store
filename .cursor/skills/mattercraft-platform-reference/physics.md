# Mattercraft Physics (Havok) — Full Reference

## Overview

Mattercraft integrates the **Havok physics engine** for real-time physics
simulation. Installed via the Dependencies Browser.

---

## Installation

1. Open Dependencies Browser (Left Menu → Dependencies)
2. Search for "Physics" or "Havok"
3. Install the physics package
4. Physics components become available in the Hierarchy

---

## Rigid Bodies

Rigid bodies define how objects behave under physics simulation.

| Type | Description |
|------|-------------|
| **Dynamic** | Affected by gravity and forces; moves freely |
| **Static** | Immovable; other objects collide with it (floors, walls) |
| **Kinematic** | Moved by code/animation; affects dynamic objects but isn't affected by them |

### Adding a Rigid Body
1. Select a node in Hierarchy
2. Add `RigidBody` component as child or behavior
3. Configure type (Dynamic/Static/Kinematic)

---

## Colliders

Define the physical shape used for collision detection.

| Collider | Description |
|----------|-------------|
| **Box Collider** | Rectangular prism shape |
| **Sphere Collider** | Spherical shape |
| **Capsule Collider** | Cylinder with hemispherical caps |
| **Mesh Collider** | Matches exact mesh geometry (expensive) |
| **Convex Hull Collider** | Convex approximation of mesh (more efficient) |

### Setup
- Add collider as child of the rigid body node
- Adjust size/offset to match visual geometry
- Multiple colliders can compose complex shapes

---

## Physics Material

Controls surface interaction properties.

| Property | Description |
|----------|-------------|
| **Friction** | Resistance to sliding (0 = ice, 1 = rubber) |
| **Restitution** | Bounciness (0 = no bounce, 1 = perfect bounce) |

---

## Physics Settings

Global physics configuration.

| Setting | Description |
|---------|-------------|
| **Gravity** | Gravity vector (default: 0, -9.81, 0) |
| **Timestep** | Physics simulation step interval |
| **Substeps** | Number of sub-steps per frame for accuracy |

---

## Constraints

Connect two rigid bodies with physical joints.

| Constraint | Description |
|------------|-------------|
| **Ball and Socket** | Freely rotating joint (shoulder-like) |
| **Distance** | Maintains fixed distance between bodies |
| **Hinge** | Single-axis rotation (door hinge) |
| **Locked** | No relative movement (weld) |

### Constraint Properties
- Connected body references
- Axis/anchor point configuration
- Limits (min/max angles for hinge, min/max distance)
- Motor settings (drive rotation/position)

---

## Physics + Triggers

Physics colliders and Trigger shapes are separate systems:
- **Colliders** → physical simulation (bouncing, stacking, sliding)
- **Triggers** → event-based detection (no physical response)

Both can coexist on the same node for combined physical + event behavior.

---

## Performance Tips

- Use simple collider shapes (box, sphere) over mesh colliders
- Limit dynamic rigid body count
- Use kinematic for animated objects that should push dynamic objects
- Static bodies are essentially free (no simulation cost)
- Convex hull is a good middle ground for complex shapes

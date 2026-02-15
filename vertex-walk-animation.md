# Vertex Deformation Walk Animation Pattern

Reusable pattern for animating static GLB models (no skeleton/bones) by deforming mesh vertices per frame.

## Overview

Static 3D models from tools like Meshy AI have no embedded animations. This pattern creates walk cycles by directly modifying vertex positions based on their location in the mesh (legs, tail, head, arms).

## Setup Phase

After loading a GLB model, store original vertex positions for each mesh:

```javascript
let walkMeshes = [];

function setupWalkAnimation(model) {
    model.traverse(function(child) {
        if (child.isMesh && child.geometry) {
            const geo = child.geometry;
            const pos = geo.attributes.position;
            if (!pos) return;

            // Store original positions (MUST copy, not reference)
            const origPositions = new Float32Array(pos.array.length);
            origPositions.set(pos.array);

            geo.computeBoundingBox();

            walkMeshes.push({
                mesh: child,
                origPositions: origPositions,
                box: geo.boundingBox.clone()
            });
        }
    });
}
```

## Animation Phase (called every frame)

Deform vertices based on their position in the bounding box:

```javascript
function animateWalk(moving, isSprinting) {
    if (walkMeshes.length === 0) return;

    const t = Date.now() * 0.001;
    const walkSpeed = isSprinting ? 10 : 7;
    const amplitude = moving ? (isSprinting ? 0.4 : 0.25) : 0;

    walkMeshes.forEach(function(wm) {
        const pos = wm.mesh.geometry.attributes.position;
        const orig = wm.origPositions;
        const box = wm.box;
        const height = box.max.y - box.min.y;

        // Region thresholds (tune per model)
        const legThreshold = box.min.y + height * 0.45;    // bottom 45% = legs
        const tailThreshold = box.min.z + (box.max.z - box.min.z) * 0.15; // back 15% = tail
        const headThreshold = box.min.z + (box.max.z - box.min.z) * 0.85; // front 15% = head
        const midZ = (box.min.z + box.max.z) / 2;
        const midX = (box.min.x + box.max.x) / 2;

        for (let i = 0; i < pos.count; i++) {
            const ox = orig[i * 3];       // original X
            const oy = orig[i * 3 + 1];   // original Y
            const oz = orig[i * 3 + 2];   // original Z
            let dx = 0, dy = 0, dz = 0;

            // === LEG ANIMATION ===
            // Vertices in lower portion swing forward/back
            if (oy < legThreshold) {
                // 0 at hip, 1 at foot
                const legFactor = (legThreshold - oy) / (legThreshold - box.min.y);

                // Left vs right (alternating phase)
                const isLeft = ox < midX;
                const phase = isLeft ? 0 : Math.PI;

                // Front vs back legs (offset phase)
                const isFront = oz > midZ;
                const legPhase = isFront ? 0 : Math.PI * 0.5;

                // Forward/backward swing (Z axis)
                dz += Math.sin(t * walkSpeed + phase + legPhase) * amplitude * legFactor;

                // Lift at mid-stride (Y axis) - only positive
                dy += Math.max(0, Math.sin(t * walkSpeed + phase + legPhase)) * amplitude * 0.5 * legFactor;
            }

            // === TAIL SWAY ===
            // Vertices at the back sway side-to-side
            if (oz < tailThreshold) {
                const tailFactor = (tailThreshold - oz) / (tailThreshold - box.min.z);
                const tailSwing = moving
                    ? Math.sin(t * walkSpeed * 0.5) * 0.15 * tailFactor
                    : Math.sin(t * 2) * 0.05 * tailFactor; // idle sway
                dx += tailSwing;
            }

            // === HEAD BOB ===
            // Vertices at the front top bob up/down with steps
            if (oz > headThreshold && oy > legThreshold) {
                const headFactor = (oz - headThreshold) / (box.max.z - headThreshold);
                const headBob = moving
                    ? Math.sin(t * walkSpeed * 2) * 0.08 * headFactor
                    : Math.sin(t * 1.5) * 0.03 * headFactor;
                dy += headBob;
            }

            // === ARM SWING ===
            // Upper body sides swing with walk cycle
            if (oy > legThreshold && oy < box.min.y + height * 0.8) {
                const armRegion = Math.abs(ox - midX) / ((box.max.x - box.min.x) / 2);
                if (armRegion > 0.3 && oz > midZ) {
                    const isLeftArm = ox < midX;
                    const armPhase = isLeftArm ? 0 : Math.PI;
                    dz += moving ? Math.sin(t * walkSpeed + armPhase) * 0.1 * armRegion : 0;
                }
            }

            // Apply deformation
            pos.setXYZ(i, ox + dx, oy + dy, oz + dz);
        }

        // CRITICAL: must flag for GPU upload
        pos.needsUpdate = true;
    });
}
```

## Cloning for NPCs

When cloning a model for NPC use, each clone needs its own geometry (vertices are shared by default):

```javascript
function cloneWithUniqueGeometry(source) {
    const cloned = source.clone(true);
    const srcMeshes = [];
    source.traverse(child => { if (child.isMesh) srcMeshes.push(child); });
    let idx = 0;
    cloned.traverse(child => {
        if (child.isMesh && srcMeshes[idx]) {
            child.geometry = srcMeshes[idx].geometry.clone();
            child.material = srcMeshes[idx].material.clone();
            idx++;
        }
    });
    return cloned;
}
```

## Body Movement (applied to the Group, not vertices)

Complement vertex animation with whole-body procedural motion:

```javascript
// Walking bob (on the group position)
const bobSpeed = isSprinting ? 12 : 8;
const t = Date.now() * 0.001 * bobSpeed;
group.position.y = terrainY + Math.abs(Math.sin(t)) * 0.4;

// Body tilt side-to-side (weight shift)
pivot.rotation.z = (moveLeft ? 0.08 : moveRight ? -0.08 : 0) + Math.sin(t) * 0.03;

// Lean forward when sprinting
pivot.rotation.x = isSprinting ? 0.15 : Math.sin(t * 0.5) * 0.04;

// Tail/body sway (Y rotation)
pivot.rotation.y = Math.sin(t * 0.5) * 0.06;

// Idle breathing when not moving
group.position.y = terrainY + Math.sin(Date.now() * 0.0015) * 0.05;
```

## Terrain Height Tracking

Always place models on terrain surface:

```javascript
function getTerrainHeight(x, z) {
    // Match whatever height formula the terrain uses
    return Math.sin(x * 0.02) * Math.cos(z * 0.015) * 3
         + Math.sin(x * 0.05 + 1) * Math.cos(z * 0.04) * 1.5;
}

// In update loop:
const terrainY = getTerrainHeight(posX, posZ);
group.position.y = terrainY + walkBob;
```

## Tuning Guide

| Parameter | Effect | Typical Range |
|-----------|--------|---------------|
| `legThreshold` | Where legs start (% from bottom) | 0.35 - 0.50 |
| `walkSpeed` | Step frequency | 6-12 (higher = faster steps) |
| `amplitude` | Leg swing distance | 0.15 - 0.40 |
| `lift factor` | How high feet lift | 0.3 - 0.6 of amplitude |
| `tailFactor range` | Tail sway amount | 0.05 - 0.20 |
| `headBob` | Head movement amount | 0.03 - 0.10 |

## Key Gotchas

1. **Always store original positions** — deformation is relative to originals, not cumulative
2. **`pos.needsUpdate = true`** is required every frame or GPU won't see changes
3. **Clone geometry** for each NPC instance — shared geometry = all NPCs move identically
4. **Bounding box axes** vary by model — some models face +Z, others -Z. Check `console.log` of bounds to verify
5. **Performance** — vertex deformation on 20+ NPCs with 50K+ verts each will drop FPS. Keep NPC models under 10K verts or reduce pack sizes

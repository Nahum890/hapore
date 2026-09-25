---
name: physics-modeling
description: Use when implementing, refactoring, or verifying physics calculations, projectile motion, kinematics, or scientific models in PyFis IA.
---

# Physics Modeling for PyFis IA

## Core Principles
1. **Single Source of Truth**: All physics calculations must be centralized in `src/physics/formulas.js` and `src/physics/projectileMotion.js`. Never duplicate kinematic equations in UI components, minigames, or simulators.
2. **Explicit Physical Assumptions**:
   - Ideal projectile motion in a uniform gravitational field.
   - Point mass approximation.
   - Flat horizontal ground ($y=0$).
   - Air resistance is neglected ($F_{drag} = 0$) unless explicitly noted.
   - Standard Earth gravity is $g = 9.8\ \text{m/s}^2$ (or $g = 10\ \text{m/s}^2$ when explicitly stated by the exercise).
3. **Input Validation**:
   - Gravity must always be strictly positive ($g > 0$).
   - Angles must be clamped or validated in $(0, 90)$ degrees for standard ground launches.
   - Velocities must be non-negative.
   - Coordinates and times must be finite numbers; return safe defaults (0 or NaN guarded) when inputs are degenerate.
4. **Units and Conventions**:
   - Internal physics computations strictly use SI units: meters (m), seconds (s), meters per second (m/s), Newtons (N), Joules (J), Celsius (°C) for temperature differentials.
   - Angles in user-facing controls are in degrees (°), converted via `toRadians(deg)` internally.

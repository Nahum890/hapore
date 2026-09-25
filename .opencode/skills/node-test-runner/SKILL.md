---
name: node-test-runner
description: Use when authoring, updating, or debugging unit and integration tests using Node.js built-in test runner (node:test) and node:assert/strict.
---

# Node.js Test Runner Conventions

## Test Suite Execution
- PyFis IA uses Node's native runner: `node --test tests/*.test.js`
- Test files live in `tests/*.test.js`.
- Always import:
  ```javascript
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  ```

## Best Practices
1. **Precision & Tolerances**:
   - Floating-point calculations should be compared with `assert.ok(Math.abs(actual - expected) < epsilon)`.
2. **Deterministic Physics**:
   - Verify projectile launch coordinates, velocity components, time of flight, peak height, and ranges with known analytical solutions.
3. **Boundary & Malformed Inputs**:
   - Test non-positive gravity, negative speeds, extreme angles, missing arguments, and ensure safe fallbacks without throwing unexpected exceptions.
4. **No UI/DOM Dependencies in Unit Tests**:
   - Keep physics logic testable in pure Node.js environments without requiring headless browsers unless polyfilled.

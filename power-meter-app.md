# Power Meter PWA - Implementation Plan

## Goal
Build a React+Vite PWA that calculates a vehicle's horsepower during acceleration using a combination of the DeviceMotion API (Accelerometer) and Geolocation API, incorporating physical parameters (weight, drag coefficient, frontal area).

## Architecture & Tech Stack
-   **Frontend Framework:** React (with Vite for fast build and PWA support).
-   **Styling:** Vanilla CSS or minimal structured CSS for a premium, dark-mode automotive aesthetic.
-   **State Management:** React Context or simple Zustand store for handling sensor data streams and physics calculations.
-   **Core APIs:**
    -   `DeviceMotionEvent` (Accleration + Rotation Rate)
    -   `navigator.geolocation` (GPS Reference)
    -   `navigator.wakeLock` (Keep screen awake)
-   **Hosting/Deployment:** GitHub Pages or Vercel (needs HTTPS for sensor access).

## Physics Engine (Core Logic)
1.  **Inputs:** Vehicle Mass ($m$), Drag Coefficient ($c_w$), Frontal Area ($A$).
2.  **Sensors:** Accelerometer provides $a$ (m/s²). GPS provides periodic absolute $v$ (m/s).
3.  **Sensor Fusion:** A Simple Complementary Filter (or basic Kalman) to correct the integral of acceleration (speed) with the GPS speed.
4.  **Forces:**
    -   Inertial Force: $F_{in} = m \cdot a$
    -   Aerodynamic Drag: $F_{aero} = 0.5 \cdot \rho \cdot c_w \cdot A \cdot v^2$ (mit $\rho \approx 1.225$ kg/m³)
    -   Rolling Resistance: $F_{roll} \approx m \cdot g \cdot c_{rr}$ (with $c_{rr} \approx 0.015$)
5.  **Power:** $P_{rad} = (F_{in} + F_{aero} + F_{roll}) \cdot v$
6.  **Engine Power:** $P_{motor} = P_{rad} / (1 - Verlustfaktor)$. Initial release uses estimated drivetrain loss factors (e.g., FWD=15%, RWD=18%, AWD=22%).
7.  **Calibration:** 3D Gravity vector extraction. When stationary, the sensor measures 1G. This vector defines "down". Acceleration perpendicular to this and in the direction of GPS movement is "forward".

## Tasks

- [ ] Task 1: Initialize Vite React project with PWA plugin and CSS setup.
      → Verify: `npm run dev` starts correctly, manifest and service worker are present.
- [ ] Task 2: Implement UI - User Profile. Inputs for Mass, $c_w$, Area, and Drivetrain Type. Validation included.
      → Verify: Values are saved to LocalStorage.
- [ ] Task 3: Implement Wake Lock API hook.
      → Verify: Screen stays on when "Measuring Mode" is active.
- [ ] Task 4: Implement Sensor Abstraction Layer. Hooks for Geolocation and DeviceMotion. Handle iOS 13+ permission prompts.
      → Verify: Raw sensor data streams to console or debug UI component.
- [ ] Task 5: Implement Physics Engine Math Module. 3D Calibration (gravity extraction) and force/power calculation.
      → Verify: Unit tests for math functions given mock sensor data.
- [ ] Task 6: Implement Main Dashboard UI. Live graph or large numbers for current Speed and Max HP.
      → Verify: Data flows from sensors -> physics engine -> UI.
- [ ] Task 7: Implement Measurement Flow (0-100km/h trigger).
      → Verify: Timer starts at $v > 0$, stops at $v \ge 100$. Logs max HP during this window.

## Done When
- [ ] User can input vehicle data.
- [ ] User can grant sensor permissions.
- [ ] App calibrates resting position.
- [ ] App calculates and displays HP based on acceleration.
- [ ] App works as a PWA (installable, full screen).

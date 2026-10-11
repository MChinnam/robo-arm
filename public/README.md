# RoboArm 3D Control Studio & Simulation Environment

An interactive, high-precision 3D robotic arm control and simulation environment designed for robotics engineering, kinematics experimentation, trajectory sequencing, and code export.

---

## 🚀 Downloading & Running the Code

### Option 1: Standalone Offline Single-File HTML (Zero Setup)
- **File**: `robo_arm_environment.html`
- **Requirements**: None! No Node.js, no Python, no npm install.
- **How to run**: Simply double-click `robo_arm_environment.html` or drag it into any modern web browser (Chrome, Edge, Firefox, Safari).
- **Features**: Includes custom 3D perspective projection, Forward Kinematics (FK), Inverse Kinematics (IK), trajectory tracing, preset poses, and real-time TCP telemetry.

### Option 2: Full React + Three.js Studio (Web App)
- **Features**: Realistic WebGL 3D rendering with metallic materials, physical pick-and-place interactive blocks, trajectory recorder & playback, multiple industrial themes (KUKA, ABB, FANUC, Cyber Stealth), and camera angles.
- **Run in development**:
  ```bash
  npm install
  npm run dev
  ```
  Open `http://localhost:3000` in your browser.
- **Export directly from the UI**: Click the **Download Code** button in the top navigation bar to download either the standalone HTML file, a complete `.zip` archive of the source code, or the trajectory waypoints.

---

## 🦾 Kinematics Architecture

The robot model simulates a 6-Degree-of-Freedom (6-DOF) articulated industrial manipulator:

| Joint | Type | Motion Range | Description |
|---|---|---|---|
| **$J_1$ (Base)** | Revolute | $-180^\circ \text{ to } +180^\circ$ | Turntable azimuth rotation around the Z-axis |
| **$J_2$ (Shoulder)** | Revolute | $-60^\circ \text{ to } +120^\circ$ | Articulated pitch controlling elevation |
| **$J_3$ (Elbow)** | Revolute | $-150^\circ \text{ to } +150^\circ$ | Forearm pitch controlling reach extension |
| **$J_4$ (Wrist Pitch)** | Revolute | $-110^\circ \text{ to } +110^\circ$ | End-effector vertical orientation |
| **$J_5$ (Wrist Roll)** | Revolute | $-180^\circ \text{ to } +180^\circ$ | Flange continuous axial rotation |
| **Gripper** | Prismatic | $0 \text{ to } 80\text{ mm}$ ($0-100\%$) | Parallel pneumatic jaw aperture |

### Forward Kinematics (FK)
Given joint angles $\mathbf{q} = [q_1, q_2, q_3, q_4, q_5]^T$, the Tool Center Point (TCP) Cartesian coordinates $(X, Y, Z)$ are calculated by composing homogeneous transformation matrices from the base coordinate frame to the flange:
$$T_0^5 = T_0^1(q_1) \cdot T_1^2(q_2) \cdot T_2^3(q_3) \cdot T_3^4(q_4) \cdot T_4^5(q_5)$$

### Inverse Kinematics (IK)
Given target TCP coordinates $(X_{\text{target}}, Y_{\text{target}}, Z_{\text{target}})$, the solver calculates joint angles using:
1. **Base Yaw ($q_1$)**:
   $$q_1 = \text{atan2}(X_{\text{target}}, Z_{\text{target}})$$
2. **Shoulder ($q_2$) & Elbow ($q_3$)**:
   Solved analytically via the Law of Cosines on the planar triangle formed by the shoulder pivot, elbow joint, and wrist center.
3. **Wrist Orientation ($q_4, q_5$)**:
   Compensates for arm pitch to maintain ground-parallel or user-commanded tool approach angles.

---

## 🎮 Features & Controls

1. **AI Natural Language Command Controller**:
   - Give plain text or speech commands:
     - `"turn right"` or `"turn right 45 degrees"`: Rotates base turntable clockwise.
     - `"turn left"`: Rotates base turntable counter-clockwise.
     - `"down"` / `"lower"`: Lowers the arm vertically toward the work table.
     - `"up"` / `"raise"`: Lifts the arm up to clearance altitude.
     - `"pick up"` / `"pick up red cube"`: Executes coordinated multi-step pick sequence (hover -> descend -> clamp -> lift).
     - `"release"` / `"open gripper"`: Opens pneumatic claw.
     - `"close gripper"` / `"clamp"`: Clamps jaw onto workpieces.
     - `"wave"` / `"dance"`: Plays animated multi-axis greeting routine.
     - `"home"` / `"reset"`: Returns robot to calibrated home position.
   - Powered by server-side Gemini/Gemma AI kinematics reasoning with automatic deterministic offline fallback.
2. **Forward Kinematics Sliders**: Individual angle adjustment with real-time numeric readouts.
3. **Inverse Kinematics Cartesian Sliders**: Direct $(X, Y, Z)$ positioning with reachability safety boundary alerts.
4. **Pick-and-Place Simulation**: Physical interactive work cubes that the robotic claw can grab, lift, and deposit onto target drop zones.
5. **Waypoint Sequencer**: Record keyframes, set playback speed, loop paths, and export recorded trajectory curves.
6. **Code & Trajectory Export Center**:
   - Download Standalone HTML (`robo_arm_environment.html`)
   - Download Project `.zip` Archive
   - Export Trajectory JSON / CSV
   - Instant clipboard code copy

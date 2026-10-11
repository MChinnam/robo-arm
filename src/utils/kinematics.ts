import { JointAngles, TCPState, Vector3D, RobotTheme, RobotThemeId, PickableBlock, CollisionState, CollisionSegment } from '../types/robot';
import JSZip from 'jszip';

// Arm physical link dimensions (in millimeters)
export const ROBOT_DIMENSIONS = {
  L1: 130, // Base pedestal to shoulder pivot
  L2: 190, // Upper arm length (shoulder to elbow)
  L3: 160, // Forearm length (elbow to wrist pitch)
  L4: 95,  // Wrist to Tool Center Point (TCP)
  MAX_REACH: 445, // L2 + L3 + L4
};

export const ROBOT_THEMES: Record<RobotThemeId, RobotTheme> = {
  kuka: {
    id: 'kuka',
    name: 'Industrial Orange (KUKA)',
    primary: '#ea580c',
    secondary: '#1e293b',
    accent: '#f97316',
    jointBase: '#0f172a',
  },
  fanuc: {
    id: 'fanuc',
    name: 'Cyber Yellow (FANUC)',
    primary: '#eab308',
    secondary: '#18181b',
    accent: '#facc15',
    jointBase: '#09090b',
  },
  abb: {
    id: 'abb',
    name: 'Cleanroom White (ABB)',
    primary: '#f8fafc',
    secondary: '#334155',
    accent: '#94a3b8',
    jointBase: '#1e293b',
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth Carbon',
    primary: '#334155',
    secondary: '#0f172a',
    accent: '#64748b',
    jointBase: '#020617',
  },
  cyan: {
    id: 'cyan',
    name: 'Precision Cyan',
    primary: '#0891b2',
    secondary: '#0f172a',
    accent: '#06b6d4',
    jointBase: '#020617',
  },
};

export const PRESET_POSES: Record<string, { name: string; joints: JointAngles }> = {
  home: {
    name: 'Home Position',
    joints: { j1: 0, j2: 35, j3: -40, j4: 5, j5: 0, gripper: 60 },
  },
  ready: {
    name: 'Pick Ready',
    joints: { j1: 0, j2: 55, j3: -15, j4: -40, j5: 0, gripper: 90 },
  },
  reach: {
    name: 'Max Extension',
    joints: { j1: 0, j2: 85, j3: 5, j4: 0, j5: 0, gripper: 50 },
  },
  park: {
    name: 'Folded Stowed',
    joints: { j1: 0, j2: -15, j3: -110, j4: 35, j5: 0, gripper: 10 },
  },
  inspect: {
    name: 'Overhead Inspection',
    joints: { j1: 45, j2: 15, j3: -15, j4: 90, j5: 90, gripper: 80 },
  },
};

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Computes forward kinematics for the 5 revolute joints + gripper
 */
export function computeForwardKinematics(joints: JointAngles): TCPState {
  const { L1, L2, L3, L4, MAX_REACH } = ROBOT_DIMENSIONS;
  const q1 = degToRad(joints.j1);
  const q2 = degToRad(joints.j2);
  const q3 = degToRad(joints.j3);
  const q4 = degToRad(joints.j4);

  // Link projections in vertical plane
  const a2 = q2;
  const r2 = L2 * Math.sin(a2);
  const h2 = L2 * Math.cos(a2);

  const a3 = q2 + q3;
  const r3 = r2 + L3 * Math.sin(a3);
  const h3 = h2 + L3 * Math.cos(a3);

  const a4 = a3 + q4;
  const r4 = r3 + L4 * Math.sin(a4);
  const h4 = h3 + L4 * Math.cos(a4);

  // Azimuth rotation around J1 (Y axis is up in standard Three.js)
  const x = r4 * Math.sin(q1);
  const z = r4 * Math.cos(q1);
  const y = L1 + h4;

  const distFromShoulder = Math.sqrt(r4 * r4 + h4 * h4);
  const distFromBase = Math.sqrt(x * x + (y - L1) * (y - L1) + z * z);

  return {
    position: {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      z: Math.round(z * 10) / 10,
    },
    pitch: Math.round(radToDeg(a4) * 10) / 10,
    roll: joints.j5,
    yaw: joints.j1,
    inReach: distFromShoulder <= MAX_REACH + 2,
    distanceFromBase: Math.round(distFromBase * 10) / 10,
  };
}

export interface RobotJointPositions {
  p0_base: Vector3D;
  p1_shoulder: Vector3D;
  p2_elbow: Vector3D;
  p3_wrist: Vector3D;
  p4_tcp: Vector3D;
}

/**
 * Computes exact 3D Cartesian coordinates of each articulated joint pivot
 */
export function computeRobotJointPositions(joints: JointAngles): RobotJointPositions {
  const { L1, L2, L3, L4 } = ROBOT_DIMENSIONS;
  const q1 = degToRad(joints.j1);
  const q2 = degToRad(joints.j2);
  const q3 = degToRad(joints.j3);
  const q4 = degToRad(joints.j4);

  // Segment 1 (Shoulder to Elbow)
  const a2 = q2;
  const r2 = L2 * Math.sin(a2);
  const h2 = L2 * Math.cos(a2);
  const p2: Vector3D = {
    x: r2 * Math.sin(q1),
    y: L1 + h2,
    z: r2 * Math.cos(q1),
  };

  // Segment 2 (Elbow to Wrist)
  const a3 = q2 + q3;
  const r3 = r2 + L3 * Math.sin(a3);
  const h3 = h2 + L3 * Math.cos(a3);
  const p3: Vector3D = {
    x: r3 * Math.sin(q1),
    y: L1 + h3,
    z: r3 * Math.cos(q1),
  };

  // Segment 3 (Wrist to TCP)
  const a4 = a3 + q4;
  const r4 = r3 + L4 * Math.sin(a4);
  const h4 = h3 + L4 * Math.cos(a4);
  const p4: Vector3D = {
    x: r4 * Math.sin(q1),
    y: L1 + h4,
    z: r4 * Math.cos(q1),
  };

  return {
    p0_base: { x: 0, y: 0, z: 0 },
    p1_shoulder: { x: 0, y: L1, z: 0 },
    p2_elbow: p2,
    p3_wrist: p3,
    p4_tcp: p4,
  };
}

/**
 * Computes shortest distance from point to an Axis-Aligned Bounding Box (AABB)
 */
function distancePointToAABB(pt: Vector3D, bMin: Vector3D, bMax: Vector3D): number {
  const dx = Math.max(0, Math.max(bMin.x - pt.x, pt.x - bMax.x));
  const dy = Math.max(0, Math.max(bMin.y - pt.y, pt.y - bMax.y));
  const dz = Math.max(0, Math.max(bMin.z - pt.z, pt.z - bMax.z));
  return Math.hypot(dx, dy, dz);
}

/**
 * Computes shortest distance from line segment [pA, pB] to an AABB by dense linear sampling
 */
function distanceSegmentToAABB(pA: Vector3D, pB: Vector3D, bMin: Vector3D, bMax: Vector3D, steps = 14): number {
  let minDist = Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt: Vector3D = {
      x: pA.x + t * (pB.x - pA.x),
      y: pA.y + t * (pB.y - pA.y),
      z: pA.z + t * (pB.z - pA.z),
    };
    const dist = distancePointToAABB(pt, bMin, bMax);
    if (dist < minDist) minDist = dist;
    if (minDist === 0) break;
  }
  return minDist;
}

/**
 * Checks for collisions between robot segments/TCP and workspace blocks or work table
 */
export function checkRobotCollisions(
  joints: JointAngles,
  blocks: PickableBlock[]
): CollisionState {
  const jointPts = computeRobotJointPositions(joints);
  const { p1_shoulder, p2_elbow, p3_wrist, p4_tcp } = jointPts;

  let minClearance = Infinity;

  // 1. Table Surface Impact check (Table plane at Y = 0)
  const tcpTableClearance = p4_tcp.y;
  if (tcpTableClearance < minClearance) minClearance = tcpTableClearance;

  if (p4_tcp.y <= 4) {
    return {
      hasCollision: true,
      isProximityWarning: false,
      type: 'TABLE_IMPACT',
      collidingSegment: 'Gripper / TCP',
      penetrationDepth: Math.max(0, Math.round((4 - p4_tcp.y) * 10) / 10),
      minClearance: Math.round(tcpTableClearance * 10) / 10,
      warningMessage: 'Table Impact: End-effector colliding with table surface!',
    };
  }

  // Joint links plunging below table
  if (p2_elbow.y < 8 || p3_wrist.y < 8) {
    return {
      hasCollision: true,
      isProximityWarning: false,
      type: 'TABLE_IMPACT',
      collidingSegment: p2_elbow.y < 8 ? 'Upper Arm' : 'Forearm',
      penetrationDepth: Math.max(0, Math.round((8 - Math.min(p2_elbow.y, p3_wrist.y)) * 10) / 10),
      minClearance: 0,
      warningMessage: 'Structural Impact: Arm segment colliding with table surface!',
    };
  }

  // 2. Check each physical block in workspace
  const armSegments: { name: CollisionSegment; pA: Vector3D; pB: Vector3D; radius: number }[] = [
    { name: 'Upper Arm', pA: p1_shoulder, pB: p2_elbow, radius: 18 },
    { name: 'Forearm', pA: p2_elbow, pB: p3_wrist, radius: 16 },
    { name: 'Wrist', pA: p3_wrist, pB: p4_tcp, radius: 15 },
  ];

  for (const block of blocks) {
    const h = block.size / 2;
    const bMin: Vector3D = { x: block.x - h, y: block.y - h, z: block.z - h };
    const bMax: Vector3D = { x: block.x + h, y: block.y + h, z: block.z + h };

    // If block is currently held in the claw
    if (block.isHeld) {
      if (block.y - h < 1) {
        return {
          hasCollision: true,
          isProximityWarning: false,
          type: 'TABLE_IMPACT',
          collidingBlockId: block.id,
          collidingSegment: 'Gripper / TCP',
          penetrationDepth: Math.round((1 - (block.y - h)) * 10) / 10,
          minClearance: 0,
          warningMessage: `Held payload (${block.id.toUpperCase()}) crashed into table!`,
        };
      }
      continue;
    }

    // Check intermediate arm segments (Upper Arm, Forearm, Wrist)
    for (const seg of armSegments) {
      const segDist = distanceSegmentToAABB(seg.pA, seg.pB, bMin, bMax);
      const clearance = segDist - seg.radius;
      if (clearance < minClearance) minClearance = clearance;

      if (clearance <= 0) {
        return {
          hasCollision: true,
          isProximityWarning: false,
          type: 'BLOCK_SEGMENT',
          collidingBlockId: block.id,
          collidingSegment: seg.name,
          penetrationDepth: Math.round(Math.abs(clearance) * 10) / 10,
          minClearance: 0,
          warningMessage: `${seg.name} segment colliding with ${block.id.toUpperCase()}!`,
        };
      }
    }

    // Check TCP / Gripper Claw
    const tcpDist = distancePointToAABB(p4_tcp, bMin, bMax);
    const tcpRadius = 14;
    const tcpClearance = tcpDist - tcpRadius;
    if (tcpClearance < minClearance) minClearance = tcpClearance;

    // Distinguish intentional pickup from crash
    const isAboveBlock = p4_tcp.y >= block.y + 12;
    const isHorizClose = Math.hypot(p4_tcp.x - block.x, p4_tcp.z - block.z) < 28;
    const isGraspingPrep = joints.gripper > 30 && isAboveBlock && isHorizClose;

    if (tcpClearance <= 0 && !isGraspingPrep) {
      return {
        hasCollision: true,
        isProximityWarning: false,
        type: 'BLOCK_TCP',
        collidingBlockId: block.id,
        collidingSegment: 'Gripper / TCP',
        penetrationDepth: Math.round(Math.abs(tcpClearance) * 10) / 10,
        minClearance: 0,
        warningMessage: `TCP Collision: Gripper colliding with ${block.id.toUpperCase()}!`,
      };
    }
  }

  const cleanClearance = Math.max(0, Math.round(minClearance * 10) / 10);
  const isProximityWarning = cleanClearance < 22;

  return {
    hasCollision: false,
    isProximityWarning,
    minClearance: cleanClearance,
    warningMessage: isProximityWarning
      ? `Proximity Alert: Minimum clearance ${cleanClearance} mm`
      : undefined,
  };
}

/**
 * Solves Inverse Kinematics for a given target (X, Y, Z) and desired pitch
 */
export function solveInverseKinematics(
  target: Vector3D,
  pitchBias: number = 0
): { solved: boolean; joints: JointAngles; errorMsg?: string } {
  const { L1, L2, L3, L4, MAX_REACH } = ROBOT_DIMENSIONS;

  // J1: Base azimuth rotation
  const j1 = radToDeg(Math.atan2(target.x, target.z));

  // Compute wrist center location by backing off from TCP along pitch angle
  const desiredPitchRad = degToRad(pitchBias);
  const horizDist = Math.sqrt(target.x * target.x + target.z * target.z);
  const vertDist = target.y - L1;

  // Wrist center relative to shoulder
  const rWrist = horizDist - L4 * Math.sin(desiredPitchRad);
  const yWrist = vertDist - L4 * Math.cos(desiredPitchRad);

  const d = Math.sqrt(rWrist * rWrist + yWrist * yWrist);

  if (d > L2 + L3 || d < Math.abs(L2 - L3) || d === 0) {
    // Target is out of reach or in singular deadzone
    return {
      solved: false,
      joints: { j1, j2: 30, j3: -45, j4: 15, j5: 0, gripper: 50 },
      errorMsg: `Target is outside reachable envelope (Distance: ${Math.round(d)}mm / Max: ${L2 + L3}mm)`,
    };
  }

  // Law of Cosines for elbow angle q3
  const cosElbow = (d * d - L2 * L2 - L3 * L3) / (2 * L2 * L3);
  const clampedCos = Math.max(-1, Math.min(1, cosElbow));
  const q3Internal = Math.acos(clampedCos);

  // Geometric angles for shoulder
  const gamma = Math.atan2(rWrist, yWrist);
  const beta = Math.atan2(L3 * Math.sin(q3Internal), L2 + L3 * Math.cos(q3Internal));
  const q2Rad = gamma - beta;
  const q3Rad = -(Math.PI - q3Internal);

  const j2 = radToDeg(q2Rad);
  const j3 = radToDeg(q3Rad);

  // Wrist pitch compensates to reach desired orientation
  const j4 = pitchBias - (j2 + j3);

  return {
    solved: true,
    joints: {
      j1: Math.round(j1 * 10) / 10,
      j2: Math.max(-60, Math.min(120, Math.round(j2 * 10) / 10)),
      j3: Math.max(-150, Math.min(150, Math.round(j3 * 10) / 10)),
      j4: Math.max(-110, Math.min(110, Math.round(j4 * 10) / 10)),
      j5: 0,
      gripper: 50,
    },
  };
}

/**
 * Downloads a text/html file directly in the browser
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Packages and downloads the entire project as a clean ZIP bundle
 */
export async function downloadProjectZip(standaloneHtml: string, readmeContent: string) {
  const zip = new JSZip();

  // Root files
  zip.file('robo_arm_environment.html', standaloneHtml);
  zip.file('README.md', readmeContent);
  zip.file('package.json', JSON.stringify({
    name: 'robo-arm-3d-studio',
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview'
    },
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      three: '^0.170.0',
      'lucide-react': '^0.546.0',
      motion: '^12.0.0',
      jszip: '^3.10.1'
    },
    devDependencies: {
      '@types/react': '^19.0.0',
      '@types/react-dom': '^19.0.0',
      '@types/three': '^0.170.0',
      '@tailwindcss/vite': '^4.0.0',
      tailwindcss: '^4.0.0',
      typescript: '^5.7.0',
      vite: '^6.0.0'
    }
  }, null, 2));

  // Trajectory sample
  zip.file('sample_trajectory.json', JSON.stringify([
    { step: 1, name: 'Home', joints: { j1: 0, j2: 35, j3: -40, j4: 5, j5: 0, gripper: 60 } },
    { step: 2, name: 'Pick Intake', joints: { j1: -45, j2: 60, j3: -10, j4: -50, j5: 0, gripper: 10 } },
    { step: 3, name: 'Lift Safe', joints: { j1: -45, j2: 30, j3: -35, j4: 5, j5: 0, gripper: 10 } },
    { step: 4, name: 'Deposit Outtake', joints: { j1: 45, j2: 60, j3: -10, j4: -50, j5: 0, gripper: 80 } },
    { step: 5, name: 'Return Home', joints: { j1: 0, j2: 35, j3: -40, j4: 5, j5: 0, gripper: 60 } }
  ], null, 2));

  // ROS 2 Package files
  const { generateRobotUrdf, generateRosGemmaNodePy } = await import('./rosBridge');
  zip.file('ros2_ws/src/roboarm_description/urdf/robo_arm.urdf', generateRobotUrdf());
  zip.file('ros2_ws/src/roboarm_gemma/robo_arm_gemma_node.py', generateRosGemmaNodePy());
  zip.file('ros2_ws/src/roboarm_description/config/ros_controllers.yaml', `controller_manager:
  ros__parameters:
    update_rate: 100
    joint_state_broadcaster:
      type: joint_state_broadcaster/JointStateBroadcaster
    arm_controller:
      type: joint_trajectory_controller/JointTrajectoryController

arm_controller:
  ros__parameters:
    joints:
      - joint_1_base
      - joint_2_shoulder
      - joint_3_elbow
      - joint_4_wrist_pitch
      - joint_5_wrist_roll
      - gripper_joint
    command_interfaces:
      - position
    state_interfaces:
      - position
      - velocity
`);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'robo-arm-3d-control-environment.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

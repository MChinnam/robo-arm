import { JointAngles, PickableBlock, TCPState } from '../types/robot';
import { PRESET_POSES } from './kinematics';

export interface CommandStep {
  name: string;
  joints: JointAngles;
  durationMs?: number;
}

export interface ParsedCommandResult {
  intent: string;
  explanation: string;
  steps: CommandStep[];
}

/**
 * Deterministic offline NLP command solver.
 * Handles instructions like: "pick up", "down", "turn right", "turn left", "up", "close gripper", "wave", etc.
 */
export function solveCommandOffline(
  commandText: string,
  currentJoints: JointAngles,
  currentTcp: TCPState,
  blocks: PickableBlock[]
): ParsedCommandResult {
  const text = commandText.trim().toLowerCase();

  // 1. Turn Right / Rotate Right
  if (text.includes('turn right') || text.includes('rotate right') || text === 'right') {
    const delta = text.match(/(\d+)\s*(deg|degree)?/)?.[1] ? parseFloat(text.match(/(\d+)/)![1]) : 35;
    const targetJ1 = Math.min(180, currentJoints.j1 + delta);
    return {
      intent: 'TURN_RIGHT',
      explanation: `Rotating base turntable clockwise by ${delta}° (J1: ${targetJ1.toFixed(1)}°).`,
      steps: [
        {
          name: `Rotate Base Right (${delta}°)`,
          joints: { ...currentJoints, j1: targetJ1 },
          durationMs: 800,
        },
      ],
    };
  }

  // 2. Turn Left / Rotate Left
  if (text.includes('turn left') || text.includes('rotate left') || text === 'left') {
    const delta = text.match(/(\d+)\s*(deg|degree)?/)?.[1] ? parseFloat(text.match(/(\d+)/)![1]) : 35;
    const targetJ1 = Math.max(-180, currentJoints.j1 - delta);
    return {
      intent: 'TURN_LEFT',
      explanation: `Rotating base turntable counter-clockwise by ${delta}° (J1: ${targetJ1.toFixed(1)}°).`,
      steps: [
        {
          name: `Rotate Base Left (${delta}°)`,
          joints: { ...currentJoints, j1: targetJ1 },
          durationMs: 800,
        },
      ],
    };
  }

  // 3. Move Down / Lower Arm
  if (text.includes('down') || text.includes('lower') || text.includes('descend')) {
    const nextJ2 = Math.min(90, currentJoints.j2 + 18);
    const nextJ3 = Math.max(-100, currentJoints.j3 + 5);
    const nextJ4 = Math.max(-90, currentJoints.j4 - 20);
    return {
      intent: 'MOVE_DOWN',
      explanation: 'Lowering the articulated arm closer to the work table plane.',
      steps: [
        {
          name: 'Lower Arm Towards Table',
          joints: { ...currentJoints, j2: nextJ2, j3: nextJ3, j4: nextJ4 },
          durationMs: 900,
        },
      ],
    };
  }

  // 4. Move Up / Raise Arm / Lift
  if ((text.includes('up') && !text.includes('pick')) || text.includes('raise') || text.includes('lift')) {
    const nextJ2 = Math.max(-10, currentJoints.j2 - 20);
    const nextJ3 = Math.max(-120, currentJoints.j3 - 10);
    const nextJ4 = Math.min(80, currentJoints.j4 + 15);
    return {
      intent: 'MOVE_UP',
      explanation: 'Elevating the articulated arm upwards into clearance height.',
      steps: [
        {
          name: 'Elevate Arm Upwards',
          joints: { ...currentJoints, j2: nextJ2, j3: nextJ3, j4: nextJ4 },
          durationMs: 900,
        },
      ],
    };
  }

  // 5. Pick Up / Grab / Grasp
  if (text.includes('pick') || text.includes('grab') || text.includes('grasp')) {
    // Check if red or specific cube is targeted
    const isRed = text.includes('red');
    const isBlue = text.includes('blue');
    const isEmerald = text.includes('emerald') || text.includes('green');

    let baseAngle = -52; // Default intake position
    if (isBlue) baseAngle = -58;
    if (isEmerald) baseAngle = -46;

    return {
      intent: 'PICK_UP',
      explanation: 'Executing multi-step automated pick sequence: align above workpiece, descend, clamp jaw, and lift vertically.',
      steps: [
        {
          name: '1. Position Above Workpiece (Aperture Open)',
          joints: { j1: baseAngle, j2: 40, j3: -25, j4: -15, j5: 0, gripper: 90 },
          durationMs: 900,
        },
        {
          name: '2. Descend to Table Contact Height',
          joints: { j1: baseAngle, j2: 62, j3: -5, j4: -57, j5: 0, gripper: 90 },
          durationMs: 900,
        },
        {
          name: '3. Pneumatic Jaw Clamping',
          joints: { j1: baseAngle, j2: 62, j3: -5, j4: -57, j5: 0, gripper: 15 },
          durationMs: 600,
        },
        {
          name: '4. Lift Workpiece Vertically',
          joints: { j1: baseAngle, j2: 30, j3: -35, j4: 5, j5: 0, gripper: 15 },
          durationMs: 900,
        },
      ],
    };
  }

  // 6. Drop / Release / Open Gripper / Put Down
  if (text.includes('open') || text.includes('release') || text.includes('drop') || text.includes('place')) {
    return {
      intent: 'RELEASE_OBJECT',
      explanation: 'Opening pneumatic parallel claw to 90% aperture.',
      steps: [
        {
          name: 'Open Gripper Claws',
          joints: { ...currentJoints, gripper: 90 },
          durationMs: 600,
        },
      ],
    };
  }

  // 7. Close Gripper / Clamp
  if (text.includes('close') || text.includes('clamp')) {
    return {
      intent: 'CLAMP_GRIPPER',
      explanation: 'Closing parallel gripper jaw to 15% aperture.',
      steps: [
        {
          name: 'Clamp Gripper Claws',
          joints: { ...currentJoints, gripper: 15 },
          durationMs: 600,
        },
      ],
    };
  }

  // 8. Go Home / Reset
  if (text.includes('home') || text.includes('reset') || text.includes('center')) {
    return {
      intent: 'HOME_POSITION',
      explanation: 'Resetting manipulator to calibrated home coordinates.',
      steps: [
        {
          name: 'Return to Home Pose',
          joints: PRESET_POSES.home.joints,
          durationMs: 1000,
        },
      ],
    };
  }

  // 9. Wave / Dance
  if (text.includes('wave') || text.includes('dance') || text.includes('hello')) {
    return {
      intent: 'WAVE_ARM',
      explanation: 'Performing friendly multi-axis greeting wave sequence.',
      steps: [
        {
          name: 'Wave Left',
          joints: { j1: -25, j2: 25, j3: -20, j4: 45, j5: -45, gripper: 90 },
          durationMs: 600,
        },
        {
          name: 'Wave Right',
          joints: { j1: 25, j2: 25, j3: -20, j4: 45, j5: 45, gripper: 90 },
          durationMs: 600,
        },
        {
          name: 'Wave Left',
          joints: { j1: -25, j2: 25, j3: -20, j4: 45, j5: -45, gripper: 90 },
          durationMs: 600,
        },
        {
          name: 'Return Home',
          joints: PRESET_POSES.home.joints,
          durationMs: 800,
        },
      ],
    };
  }

  // 10. Reach Forward / Stretch
  if (text.includes('forward') || text.includes('reach') || text.includes('extend')) {
    return {
      intent: 'REACH_FORWARD',
      explanation: 'Extending upper arm and forearm forward along workspace depth.',
      steps: [
        {
          name: 'Reach Forward',
          joints: { ...currentJoints, j2: 70, j3: -10, j4: -40 },
          durationMs: 900,
        },
      ],
    };
  }

  // Default fallback: small responsive nudge
  return {
    intent: 'GENERIC_MOTION',
    explanation: `Interpreting natural language command "${commandText}" into safe incremental motion.`,
    steps: [
      {
        name: `Execute: ${commandText}`,
        joints: {
          ...currentJoints,
          j1: currentJoints.j1 + 10,
          j4: currentJoints.j4 - 5,
        },
        durationMs: 800,
      },
    ],
  };
}

export interface JointAngles {
  j1: number; // Base Yaw (-180 to 180 deg)
  j2: number; // Shoulder Pitch (-60 to 120 deg)
  j3: number; // Elbow Pitch (-150 to 150 deg)
  j4: number; // Wrist Pitch (-110 to 110 deg)
  j5: number; // Wrist Roll (-180 to 180 deg)
  gripper: number; // Gripper aperture (0 closed to 100 fully open)
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface TCPState {
  position: Vector3D;
  pitch: number;
  roll: number;
  yaw: number;
  inReach: boolean;
  distanceFromBase: number;
}

export type CollisionSegment = 'Base' | 'Shoulder' | 'Upper Arm' | 'Forearm' | 'Wrist' | 'Gripper / TCP';

export interface CollisionState {
  hasCollision: boolean;
  isProximityWarning: boolean;
  type?: 'BLOCK_TCP' | 'BLOCK_SEGMENT' | 'TABLE_IMPACT';
  collidingBlockId?: string;
  collidingSegment?: CollisionSegment;
  penetrationDepth?: number;
  minClearance: number; // in millimeters
  warningMessage?: string;
}

export interface Waypoint {
  id: string;
  name: string;
  joints: JointAngles;
  tcp: Vector3D;
  durationMs: number;
}

export type RobotThemeId = 'kuka' | 'fanuc' | 'abb' | 'stealth' | 'cyan';

export interface RobotTheme {
  id: RobotThemeId;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  jointBase: string;
}

export interface PickableBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  isHeld: boolean;
  targetSlot?: { x: number; z: number };
}

export type ControlMode = 'fk' | 'ik' | 'sequence' | 'workcell' | 'ros';

export type CameraPreset = 'orbit' | 'top' | 'front' | 'side' | 'wrist';

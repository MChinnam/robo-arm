export interface RosHeader {
  seq?: number;
  stamp: {
    sec: number;
    nanosec: number;
  };
  frame_id: string;
}

export interface RosJointStateMsg {
  header: RosHeader;
  name: string[];
  position: number[]; // radians (or meters for gripper)
  velocity: number[];
  effort: number[];
}

export interface RosTrajectoryPoint {
  positions: number[];
  velocities?: number[];
  accelerations?: number[];
  time_from_start: {
    sec: number;
    nanosec: number;
  };
}

export interface RosJointTrajectoryMsg {
  header: RosHeader;
  joint_names: string[];
  points: RosTrajectoryPoint[];
}

export interface RosTopicLog {
  id: string;
  topic: string;
  type: string;
  timestamp: string;
  direction: 'pub' | 'sub';
  payload: any;
}

export interface RosBridgeState {
  isConnected: boolean;
  isSimulated: boolean;
  url: string;
  publishedCount: number;
  receivedCount: number;
}

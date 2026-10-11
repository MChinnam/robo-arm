import { JointAngles } from '../types/robot';
import {
  RosJointStateMsg,
  RosJointTrajectoryMsg,
  RosTrajectoryPoint,
  RosTopicLog,
} from '../types/ros';
import { degToRad, ROBOT_DIMENSIONS } from './kinematics';

export const ROS_JOINT_NAMES = [
  'joint_1_base',
  'joint_2_shoulder',
  'joint_3_elbow',
  'joint_4_wrist_pitch',
  'joint_5_wrist_roll',
  'gripper_joint',
];

/**
 * Converts JointAngles to standard ROS sensor_msgs/JointState (angles in radians)
 */
export function formatRosJointState(joints: JointAngles): RosJointStateMsg {
  const now = Date.now();
  return {
    header: {
      stamp: {
        sec: Math.floor(now / 1000),
        nanosec: (now % 1000) * 1_000_000,
      },
      frame_id: 'base_link',
    },
    name: ROS_JOINT_NAMES,
    position: [
      Math.round(degToRad(joints.j1) * 1000) / 1000,
      Math.round(degToRad(joints.j2) * 1000) / 1000,
      Math.round(degToRad(joints.j3) * 1000) / 1000,
      Math.round(degToRad(joints.j4) * 1000) / 1000,
      Math.round(degToRad(joints.j5) * 1000) / 1000,
      Math.round((joints.gripper / 100) * 0.08 * 1000) / 1000, // 0 to 0.08 meters
    ],
    velocity: [0, 0, 0, 0, 0, 0],
    effort: [0, 0, 0, 0, 0, 0],
  };
}

/**
 * Converts sequential keyframe joint steps to standard ROS trajectory_msgs/JointTrajectory
 */
export function formatRosTrajectory(steps: { name: string; joints: JointAngles; durationMs?: number }[]): RosJointTrajectoryMsg {
  const now = Date.now();
  let cumulativeMs = 0;

  const points: RosTrajectoryPoint[] = steps.map((step) => {
    cumulativeMs += step.durationMs || 900;
    return {
      positions: [
        degToRad(step.joints.j1),
        degToRad(step.joints.j2),
        degToRad(step.joints.j3),
        degToRad(step.joints.j4),
        degToRad(step.joints.j5),
        (step.joints.gripper / 100) * 0.08,
      ],
      velocities: [0, 0, 0, 0, 0, 0],
      time_from_start: {
        sec: Math.floor(cumulativeMs / 1000),
        nanosec: (cumulativeMs % 1000) * 1_000_000,
      },
    };
  });

  return {
    header: {
      stamp: {
        sec: Math.floor(now / 1000),
        nanosec: (now % 1000) * 1_000_000,
      },
      frame_id: 'base_link',
    },
    joint_names: ROS_JOINT_NAMES,
    points,
  };
}

/**
 * Generates ready-to-use URDF (Unified Robot Description Format) XML for ROS & RViz
 */
export function generateRobotUrdf(): string {
  const { L1, L2, L3, L4 } = ROBOT_DIMENSIONS;
  const l1M = (L1 / 1000).toFixed(3);
  const l2M = (L2 / 1000).toFixed(3);
  const l3M = (L3 / 1000).toFixed(3);
  const l4M = (L4 / 1000).toFixed(3);

  return `<?xml version="1.0"?>
<robot name="roboarm_gemma_6dof" xmlns:xacro="http://www.ros.org/wiki/xacro">
  <!-- Material Definitions -->
  <material name="industrial_orange">
    <color rgba="0.92 0.35 0.05 1.0"/>
  </material>
  <material name="dark_metallic">
    <color rgba="0.12 0.16 0.22 1.0"/>
  </material>
  <material name="cyan_accent">
    <color rgba="0.02 0.71 0.83 1.0"/>
  </material>

  <!-- World Fixed Link -->
  <link name="world"/>

  <joint name="world_fixed" type="fixed">
    <parent link="world"/>
    <child link="base_link"/>
    <origin xyz="0 0 0" rpy="0 0 0"/>
  </joint>

  <!-- Base Link -->
  <link name="base_link">
    <visual>
      <origin xyz="0 0 0.012" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.085" length="0.024"/>
      </geometry>
      <material name="dark_metallic"/>
    </visual>
    <collision>
      <origin xyz="0 0 0.012" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.085" length="0.024"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="3.5"/>
      <inertia ixx="0.01" ixy="0" ixz="0" iyy="0.01" iyz="0" izz="0.015"/>
    </inertial>
  </link>

  <!-- Joint 1: Base Turntable Azimuth (Yaw) -->
  <joint name="joint_1_base" type="revolute">
    <parent link="base_link"/>
    <child link="shoulder_link"/>
    <origin xyz="0 0 0.024" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14159" upper="3.14159" effort="50.0" velocity="2.0"/>
  </joint>

  <!-- Shoulder Link -->
  <link name="shoulder_link">
    <visual>
      <origin xyz="0 0 ${(Number(l1M) - 0.024) / 2}" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.045" length="${(Number(l1M) - 0.024).toFixed(3)}"/>
      </geometry>
      <material name="industrial_orange"/>
    </visual>
    <inertial>
      <mass value="2.8"/>
      <inertia ixx="0.008" ixy="0" ixz="0" iyy="0.008" iyz="0" izz="0.005"/>
    </inertial>
  </link>

  <!-- Joint 2: Shoulder Elevation (Pitch) -->
  <joint name="joint_2_shoulder" type="revolute">
    <parent link="shoulder_link"/>
    <child link="upper_arm_link"/>
    <origin xyz="0 0 ${(Number(l1M) - 0.024).toFixed(3)}" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-1.047" upper="2.094" effort="80.0" velocity="1.5"/>
  </joint>

  <!-- Upper Arm Link -->
  <link name="upper_arm_link">
    <visual>
      <origin xyz="0 0 ${Number(l2M) / 2}" rpy="0 0 0"/>
      <geometry>
        <box size="0.035 0.040 ${l2M}"/>
      </geometry>
      <material name="industrial_orange"/>
    </visual>
    <inertial>
      <mass value="2.1"/>
      <inertia ixx="0.006" ixy="0" ixz="0" iyy="0.006" iyz="0" izz="0.002"/>
    </inertial>
  </link>

  <!-- Joint 3: Elbow Pitch -->
  <joint name="joint_3_elbow" type="revolute">
    <parent link="upper_arm_link"/>
    <child link="forearm_link"/>
    <origin xyz="0 0 ${l2M}" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-2.618" upper="2.618" effort="40.0" velocity="2.0"/>
  </joint>

  <!-- Forearm Link -->
  <link name="forearm_link">
    <visual>
      <origin xyz="0 0 ${Number(l3M) / 2}" rpy="0 0 0"/>
      <geometry>
        <box size="0.028 0.032 ${l3M}"/>
      </geometry>
      <material name="dark_metallic"/>
    </visual>
    <inertial>
      <mass value="1.4"/>
      <inertia ixx="0.003" ixy="0" ixz="0" iyy="0.003" iyz="0" izz="0.001"/>
    </inertial>
  </link>

  <!-- Joint 4: Wrist Pitch -->
  <joint name="joint_4_wrist_pitch" type="revolute">
    <parent link="forearm_link"/>
    <child link="wrist_link"/>
    <origin xyz="0 0 ${l3M}" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="-1.919" upper="1.919" effort="20.0" velocity="2.5"/>
  </joint>

  <!-- Wrist Link -->
  <link name="wrist_link">
    <visual>
      <origin xyz="0 0 0.015" rpy="0 0 0"/>
      <geometry>
        <cylinder radius="0.022" length="0.030"/>
      </geometry>
      <material name="cyan_accent"/>
    </visual>
    <inertial>
      <mass value="0.6"/>
      <inertia ixx="0.001" ixy="0" ixz="0" iyy="0.001" iyz="0" izz="0.001"/>
    </inertial>
  </link>

  <!-- Joint 5: Wrist Roll -->
  <joint name="joint_5_wrist_roll" type="revolute">
    <parent link="wrist_link"/>
    <child link="tool_center_point"/>
    <origin xyz="0 0 0.030" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14159" upper="3.14159" effort="10.0" velocity="3.0"/>
  </joint>

  <!-- End-Effector Tool Center Point -->
  <link name="tool_center_point">
    <visual>
      <origin xyz="0 0 ${(Number(l4M) - 0.030) / 2}" rpy="0 0 0"/>
      <geometry>
        <box size="0.054 0.024 ${(Number(l4M) - 0.030).toFixed(3)}"/>
      </geometry>
      <material name="dark_metallic"/>
    </visual>
  </link>
</robot>
`;
}

/**
 * Generates complete ROS 2 Python Node integrating Gemma text command subscriber
 */
export function generateRosGemmaNodePy(): string {
  return `#!/usr/bin/env python3
"""
RoboArm Gemma 4 ROS 2 Controller Node
Subscribes to natural language text commands (/gemma/command)
Translates instructions into joint trajectories on (/arm_controller/joint_trajectory)
Publishes joint states to (/joint_states)
"""

import math
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from sensor_msgs.msg import JointState
from trajectory_msgs.msg import JointTrajectory, JointTrajectoryPoint
from builtin_interfaces.msg import Duration

JOINTS = [
    'joint_1_base',
    'joint_2_shoulder',
    'joint_3_elbow',
    'joint_4_wrist_pitch',
    'joint_5_wrist_roll',
    'gripper_joint'
]

class RoboArmGemmaNode(Node):
    def __init__(self):
        super().__init__('roboarm_gemma_controller')

        # Current Joint Angles (in radians)
        self.current_joints = [0.0, 0.61, -0.70, 0.09, 0.0, 0.048]

        # Publishers
        self.joint_state_pub = self.create_publisher(JointState, '/joint_states', 10)
        self.trajectory_pub = self.create_publisher(JointTrajectory, '/arm_controller/joint_trajectory', 10)
        self.status_pub = self.create_publisher(String, '/gemma/action_status', 10)

        # Subscriber for Natural Language Text Commands
        self.cmd_sub = self.create_subscription(String, '/gemma/command', self.on_command_received, 10)

        # 20Hz Joint State Broadcast Timer
        self.timer = self.create_timer(0.05, self.publish_joint_states)

        self.get_logger().info('RoboArm Gemma ROS 2 Controller Node Initialized!')
        self.get_logger().info('Publish text commands to /gemma/command (e.g. "turn right", "pick up", "down")')

    def publish_joint_states(self):
        msg = JointState()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'base_link'
        msg.name = JOINTS
        msg.position = self.current_joints
        msg.velocity = [0.0] * 6
        msg.effort = [0.0] * 6
        self.joint_state_pub.publish(msg)

    def on_command_received(self, msg: String):
        text = msg.data.lower().strip()
        self.get_logger().info(f'Processing Gemma Command: "{text}"')

        # Translate natural language to JointTrajectory keyframes
        steps = []
        if 'turn right' in text or text == 'right':
            steps = [{'j1': self.current_joints[0] + math.radians(35), 'name': 'Rotate Base Right'}]
        elif 'turn left' in text or text == 'left':
            steps = [{'j1': self.current_joints[0] - math.radians(35), 'name': 'Rotate Base Left'}]
        elif 'down' in text or 'lower' in text:
            steps = [{
                'j2': self.current_joints[1] + math.radians(18),
                'j3': self.current_joints[2] + math.radians(5),
                'j4': self.current_joints[3] - math.radians(20),
                'name': 'Lower Arm to Table'
            }]
        elif 'up' in text or 'raise' in text or 'lift' in text:
            steps = [{
                'j2': self.current_joints[1] - math.radians(20),
                'j3': self.current_joints[2] - math.radians(10),
                'j4': self.current_joints[3] + math.radians(15),
                'name': 'Elevate Arm Upwards'
            }]
        elif 'pick' in text or 'grab' in text:
            # Multi-point coordinated pick sequence
            steps = [
                {'j1': math.radians(-52), 'j2': math.radians(40), 'j3': math.radians(-25), 'j4': math.radians(-15), 'grip': 0.072, 'name': '1. Align Above Workpiece'},
                {'j1': math.radians(-52), 'j2': math.radians(62), 'j3': math.radians(-5), 'j4': math.radians(-57), 'grip': 0.072, 'name': '2. Contact Height'},
                {'j1': math.radians(-52), 'j2': math.radians(62), 'j3': math.radians(-5), 'j4': math.radians(-57), 'grip': 0.012, 'name': '3. Clamp Jaw'},
                {'j1': math.radians(-52), 'j2': math.radians(30), 'j3': math.radians(-35), 'j4': math.radians(5), 'grip': 0.012, 'name': '4. Lift Workpiece'},
            ]
        elif 'release' in text or 'open' in text:
            steps = [{'grip': 0.072, 'name': 'Open Gripper'}]
        elif 'close' in text or 'clamp' in text:
            steps = [{'grip': 0.012, 'name': 'Clamp Gripper'}]
        elif 'home' in text or 'reset' in text:
            steps = [{'j1': 0.0, 'j2': math.radians(35), 'j3': math.radians(-40), 'j4': math.radians(5), 'j5': 0.0, 'grip': 0.048, 'name': 'Return Home'}]
        else:
            steps = [{'j1': self.current_joints[0] + math.radians(15), 'name': f'Generic Command: {text}'}]

        # Construct and publish trajectory_msgs/JointTrajectory
        traj_msg = JointTrajectory()
        traj_msg.header.stamp = self.get_clock().now().to_msg()
        traj_msg.header.frame_id = 'base_link'
        traj_msg.joint_names = JOINTS

        cumulative_sec = 1
        for s in steps:
            pt = JointTrajectoryPoint()
            # Update target joint list
            target = list(self.current_joints)
            if 'j1' in s: target[0] = s['j1']
            if 'j2' in s: target[1] = s['j2']
            if 'j3' in s: target[2] = s['j3']
            if 'j4' in s: target[3] = s['j4']
            if 'j5' in s: target[4] = s['j5']
            if 'grip' in s: target[5] = s['grip']

            pt.positions = target
            pt.time_from_start = Duration(sec=cumulative_sec, nanosec=0)
            traj_msg.points.append(pt)
            cumulative_sec += 1
            self.current_joints = target

        self.trajectory_pub.publish(traj_msg)
        status_msg = String()
        status_msg.data = f'EXECUTED: "{text}" with {len(traj_msg.points)} trajectory points'
        self.status_pub.publish(status_msg)

def main(args=None):
    rclpy.init(args=args)
    node = RoboArmGemmaNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
`;
}

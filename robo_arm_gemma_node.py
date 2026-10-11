#!/usr/bin/env python3
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

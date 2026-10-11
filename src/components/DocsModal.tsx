import React from 'react';
import { X, BookOpen, Compass, Cpu, CheckCircle2, Radio } from 'lucide-react';
import { ROBOT_DIMENSIONS } from '../utils/kinematics';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDownloadModal: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose, onOpenDownloadModal }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Robotic Arm Kinematics & Reference</h2>
              <p className="text-xs text-slate-400">Mechanical specifications, mathematical models, and controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs leading-relaxed select-text">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-orange-400" />
              1. Kinematic Link Parameters (DH Standard)
            </h3>
            <p className="text-slate-300">
              The manipulator is a 6-DOF articulated industrial robot with cylindrical base pedestal, offset shoulder yoke, balanced upper arm, forearm, and 2-axis wrist with parallel pneumatic end-effector.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-sans">L1 (Base Pedestal)</span>
                <span className="text-sm font-mono font-bold text-white">{ROBOT_DIMENSIONS.L1} mm</span>
              </div>
              <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-sans">L2 (Upper Arm)</span>
                <span className="text-sm font-mono font-bold text-white">{ROBOT_DIMENSIONS.L2} mm</span>
              </div>
              <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-sans">L3 (Forearm)</span>
                <span className="text-sm font-mono font-bold text-white">{ROBOT_DIMENSIONS.L3} mm</span>
              </div>
              <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block font-sans">L4 (Flange to TCP)</span>
                <span className="text-sm font-mono font-bold text-white">{ROBOT_DIMENSIONS.L4} mm</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              2. Forward & Inverse Kinematics Theory
            </h3>
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300">
              <div>
                <span className="text-orange-400 font-bold">Forward Kinematics (FK):</span>
                <p className="font-sans text-xs text-slate-400 mt-0.5">
                  Calculates Cartesian position (X, Y, Z) and pitch/roll of the Tool Center Point from the 5 joint angles [q1, q2, q3, q4, q5].
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-cyan-400 font-bold">Inverse Kinematics (IK):</span>
                <p className="font-sans text-xs text-slate-400 mt-0.5">
                  Solves the required joint angles to position the Tool Center Point at the specified (X, Y, Z) target coordinate:
                </p>
                <div className="text-slate-200 mt-1 pl-2 border-l-2 border-cyan-500/40">
                  <div>q1 = atan2(X_target, Z_target)</div>
                  <div>cos(q3) = (d² - L2² - L3²) / (2 · L2 · L3)</div>
                  <div>q2 = atan2(r_wrist, y_wrist) - atan2(L3·sin(q3), L2 + L3·cos(q3))</div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              3. Joint Limits & Safety Envelope
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-800/40 rounded border border-slate-800">
                <span className="font-semibold text-slate-200">J1 Turntable Azimuth:</span> -180° to +180°
              </div>
              <div className="p-2 bg-slate-800/40 rounded border border-slate-800">
                <span className="font-semibold text-slate-200">J2 Shoulder Elevation:</span> -60° to +120°
              </div>
              <div className="p-2 bg-slate-800/40 rounded border border-slate-800">
                <span className="font-semibold text-slate-200">J3 Elbow Extension:</span> -150° to +150°
              </div>
              <div className="p-2 bg-slate-800/40 rounded border border-slate-800">
                <span className="font-semibold text-slate-200">J4 Wrist Pitch:</span> -110° to +110°
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-orange-400" />
              4. ROS 2 Framework & Gemma Text Command Pipeline
            </h3>
            <p className="text-slate-300">
              The robot seamlessly communicates with the ROS 2 framework (Humble/Iron/Rolling) through standard message protocols:
            </p>
            <div className="space-y-1 font-mono text-[11px] text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div><span className="text-cyan-400">/joint_states</span>: sensor_msgs/JointState (20Hz broadcast in radians)</div>
              <div><span className="text-orange-400">/gemma/command</span>: std_msgs/String (Natural language text input)</div>
              <div><span className="text-emerald-400">/arm_controller/joint_trajectory</span>: trajectory_msgs/JointTrajectory</div>
              <div><span className="text-amber-400">/gemma/action_status</span>: std_msgs/String (Execution feedback)</div>
            </div>
            <p className="text-slate-400 text-[11px]">
              Ready-to-use URDF (<code className="text-orange-300">robo_arm.urdf</code>) and rclpy Node (<code className="text-orange-300">robo_arm_gemma_node.py</code>) are included in the workspace and download center.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <span className="text-xs text-slate-400">All code is available offline and open-source</span>
          <button
            onClick={() => {
              onClose();
              onOpenDownloadModal();
            }}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors cursor-pointer"
          >
            Open Download Center
          </button>
        </div>
      </div>
    </div>
  );
};

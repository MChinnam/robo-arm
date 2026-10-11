import React from 'react';
import {
  JointAngles,
  ControlMode,
  RobotTheme,
  RobotThemeId,
  Waypoint,
  Vector3D,
} from '../types/robot';
import { ROBOT_THEMES, PRESET_POSES } from '../utils/kinematics';
import { RosPanel } from './RosPanel';
import {
  Sliders,
  Crosshair,
  ListOrdered,
  Package,
  Play,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  Palette,
  Eye,
  Radio,
} from 'lucide-react';

interface ControlPanelProps {
  activeMode: ControlMode;
  onSelectMode: (mode: ControlMode) => void;
  joints: JointAngles;
  onChangeJoints: (updater: (prev: JointAngles) => JointAngles) => void;
  ikTarget: Vector3D;
  onChangeIKTarget: (target: Vector3D) => void;
  ikStatus: { solved: boolean; errorMsg?: string };
  theme: RobotTheme;
  onChangeTheme: (themeId: RobotThemeId) => void;
  waypoints: Waypoint[];
  onAddWaypoint: () => void;
  onDeleteWaypoint: (id: string) => void;
  isPlayingSequence: boolean;
  onTogglePlaySequence: () => void;
  loopSequence: boolean;
  onToggleLoopSequence: () => void;
  sequenceSpeed: number;
  onChangeSequenceSpeed: (speed: number) => void;
  showTrail: boolean;
  onToggleTrail: () => void;
  showReachEnvelope: boolean;
  onToggleReachEnvelope: () => void;
  showLaser: boolean;
  onToggleLaser: () => void;
  onApplyPreset: (presetKey: string) => void;
  onResetBlocks: () => void;
  onRunPickAndPlaceRoutine: () => void;
  isRunningRoutine: boolean;
  onExecuteCommand: (command: string) => Promise<void>;
  isProcessingCommand: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  activeMode,
  onSelectMode,
  joints,
  onChangeJoints,
  ikTarget,
  onChangeIKTarget,
  ikStatus,
  theme,
  onChangeTheme,
  waypoints,
  onAddWaypoint,
  onDeleteWaypoint,
  isPlayingSequence,
  onTogglePlaySequence,
  loopSequence,
  onToggleLoopSequence,
  sequenceSpeed,
  onChangeSequenceSpeed,
  showTrail,
  onToggleTrail,
  showReachEnvelope,
  onToggleReachEnvelope,
  showLaser,
  onToggleLaser,
  onApplyPreset,
  onResetBlocks,
  onRunPickAndPlaceRoutine,
  isRunningRoutine,
  onExecuteCommand,
  isProcessingCommand,
}) => {
  const updateSingleJoint = (key: keyof JointAngles, val: number) => {
    onChangeJoints((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <aside className="w-80 md:w-96 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-20 shrink-0 overflow-hidden select-none">
      {/* Mode Segmented Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/60">
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectMode('fk')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              activeMode === 'fk'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FK
          </button>
          <button
            onClick={() => onSelectMode('ik')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              activeMode === 'ik'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            IK
          </button>
          <button
            onClick={() => onSelectMode('sequence')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              activeMode === 'sequence'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Path
          </button>
          <button
            onClick={() => onSelectMode('workcell')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              activeMode === 'workcell'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => onSelectMode('ros')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all ${
              activeMode === 'ros'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ROS
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200">
        {/* FORWARD KINEMATICS */}
        {activeMode === 'fk' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Joint Angles</h2>
              <button
                onClick={() => onApplyPreset('home')}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset Home
              </button>
            </div>

            {/* J1 Base Yaw */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">J1 Base Yaw</span>
                <span className="font-mono tabular-nums text-orange-400">{joints.j1.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={joints.j1}
                onChange={(e) => updateSingleJoint('j1', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-180°</span>
                <span>0°</span>
                <span>+180°</span>
              </div>
            </div>

            {/* J2 Shoulder Pitch */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">J2 Shoulder Pitch</span>
                <span className="font-mono tabular-nums text-orange-400">{joints.j2.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-60"
                max="120"
                step="0.5"
                value={joints.j2}
                onChange={(e) => updateSingleJoint('j2', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-60°</span>
                <span>+30°</span>
                <span>+120°</span>
              </div>
            </div>

            {/* J3 Elbow Pitch */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">J3 Elbow Pitch</span>
                <span className="font-mono tabular-nums text-orange-400">{joints.j3.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="0.5"
                value={joints.j3}
                onChange={(e) => updateSingleJoint('j3', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-150°</span>
                <span>0°</span>
                <span>+150°</span>
              </div>
            </div>

            {/* J4 Wrist Pitch */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">J4 Wrist Pitch</span>
                <span className="font-mono tabular-nums text-orange-400">{joints.j4.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-110"
                max="110"
                step="0.5"
                value={joints.j4}
                onChange={(e) => updateSingleJoint('j4', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-110°</span>
                <span>0°</span>
                <span>+110°</span>
              </div>
            </div>

            {/* J5 Wrist Roll */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">J5 Wrist Roll</span>
                <span className="font-mono tabular-nums text-orange-400">{joints.j5.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="0.5"
                value={joints.j5}
                onChange={(e) => updateSingleJoint('j5', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-180°</span>
                <span>0°</span>
                <span>+180°</span>
              </div>
            </div>

            {/* Gripper Aperture */}
            <div className="space-y-1 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Gripper Jaw Aperture</span>
                <span className="font-mono tabular-nums text-cyan-400">{Math.round(joints.gripper)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={joints.gripper}
                onChange={(e) => updateSingleJoint('gripper', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Clamped (0%)</span>
                <span>Aperture (100%)</span>
              </div>
            </div>

            {/* Preset Poses Quick Grid */}
            <div className="pt-2">
              <span className="text-xs text-slate-400 font-medium block mb-2">Preset Positions</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRESET_POSES).map(([key, pose]) => (
                  <button
                    key={key}
                    onClick={() => onApplyPreset(key)}
                    className="px-2.5 py-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded text-slate-200 transition-colors text-left truncate"
                  >
                    {pose.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INVERSE KINEMATICS */}
        {activeMode === 'ik' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cartesian Coordinates</h2>
              <span className={`text-xs font-medium ${ikStatus.solved ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ikStatus.solved ? 'Target Solved' : 'Out of Reach'}
              </span>
            </div>

            {/* Target X */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Target X (Lateral)</span>
                <span className="font-mono tabular-nums text-emerald-400">{ikTarget.x.toFixed(0)} mm</span>
              </div>
              <input
                type="range"
                min="-340"
                max="340"
                step="2"
                value={ikTarget.x}
                onChange={(e) => onChangeIKTarget({ ...ikTarget, x: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Target Y */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Target Y (Elevation)</span>
                <span className="font-mono tabular-nums text-emerald-400">{ikTarget.y.toFixed(0)} mm</span>
              </div>
              <input
                type="range"
                min="20"
                max="400"
                step="2"
                value={ikTarget.y}
                onChange={(e) => onChangeIKTarget({ ...ikTarget, y: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Target Z */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Target Z (Depth)</span>
                <span className="font-mono tabular-nums text-emerald-400">{ikTarget.z.toFixed(0)} mm</span>
              </div>
              <input
                type="range"
                min="-340"
                max="340"
                step="2"
                value={ikTarget.z}
                onChange={(e) => onChangeIKTarget({ ...ikTarget, z: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Quick Target Presets */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-medium block mb-2">Workspace Targets</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onChangeIKTarget({ x: -200, y: 35, z: 100 })}
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition-colors"
                >
                  Intake Pallet
                </button>
                <button
                  onClick={() => onChangeIKTarget({ x: 200, y: 35, z: 100 })}
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition-colors"
                >
                  Outtake Pallet
                </button>
                <button
                  onClick={() => onChangeIKTarget({ x: 0, y: 150, z: 220 })}
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition-colors"
                >
                  Center High
                </button>
                <button
                  onClick={() => onChangeIKTarget({ x: 0, y: 35, z: 240 })}
                  className="px-2.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-200 transition-colors"
                >
                  Center Table
                </button>
              </div>
            </div>

            {!ikStatus.solved && ikStatus.errorMsg && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300">
                {ikStatus.errorMsg}
              </div>
            )}
          </div>
        )}

        {/* SEQUENCE RECORDER */}
        {activeMode === 'sequence' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trajectory Studio</h2>
              <span className="text-xs text-slate-400 font-mono">{waypoints.length} Keyframes</span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlaySequence}
                disabled={waypoints.length < 2}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  isPlayingSequence
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {isPlayingSequence ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingSequence ? 'Stop Playback' : 'Play Trajectory'}</span>
              </button>

              <button
                onClick={onAddWaypoint}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors cursor-pointer"
                title="Capture Current Joint Pose"
              >
                <Plus className="w-4 h-4" />
                <span>Capture</span>
              </button>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loopSequence}
                  onChange={onToggleLoopSequence}
                  className="rounded border-slate-700 text-orange-500 focus:ring-0"
                />
                <span>Loop Continuously</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span>Speed:</span>
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onChangeSequenceSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      sequenceSpeed === spd ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Waypoint List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {waypoints.map((wp, idx) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between p-2 bg-slate-800/60 border border-slate-800 rounded text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-700 font-mono text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-medium text-slate-200 block">{wp.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        X:{Math.round(wp.tcp.x)} Y:{Math.round(wp.tcp.y)} Z:{Math.round(wp.tcp.z)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteWaypoint(wp.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKCELL TASKS */}
        {activeMode === 'workcell' && (
          <div className="space-y-4">
            <div className="pb-1 border-b border-slate-800">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Automated Pick & Place</h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Control physical objects on the workcell table. The manipulator can grip cubes from the intake dock and transport them to sorting destinations.
            </p>

            <button
              onClick={onRunPickAndPlaceRoutine}
              className={`w-full py-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isRunningRoutine
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {isRunningRoutine ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop Automated Routine</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Pick & Place Routine</span>
                </>
              )}
            </button>

            <button
              onClick={onResetBlocks}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Physical Workpieces</span>
            </button>
          </div>
        )}

        {/* ROS 2 FRAMEWORK INTEGRATION */}
        {activeMode === 'ros' && (
          <RosPanel
            joints={joints}
            onExecuteCommand={onExecuteCommand}
            isProcessingCommand={isProcessingCommand}
          />
        )}

        {/* VIEWPORT ENVIRONMENT TOGGLES */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Visual Overlays</span>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onToggleTrail}
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                showTrail
                  ? 'bg-orange-950/60 border-orange-500/50 text-orange-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              Trail
            </button>
            <button
              onClick={onToggleReachEnvelope}
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                showReachEnvelope
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              Envelope
            </button>
            <button
              onClick={onToggleLaser}
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                showLaser
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              Laser
            </button>
          </div>

          {/* Robot Theme Switcher */}
          <div className="pt-2">
            <span className="text-xs text-slate-400 font-medium block mb-2">Manipulator Coating</span>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.values(ROBOT_THEMES).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChangeTheme(t.id)}
                  className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors border text-left ${
                    theme.id === t.id
                      ? 'bg-slate-800 border-orange-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.primary }} />
                  <span className="truncate">{t.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

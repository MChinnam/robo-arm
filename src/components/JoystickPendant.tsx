import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  JointAngles,
  Vector3D,
  ControlMode,
} from '../types/robot';
import { VirtualJoystick } from './VirtualJoystick';
import {
  Gamepad2,
  RotateCcw,
  Maximize2,
  Minimize2,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface JoystickPendantProps {
  joints: JointAngles;
  onChangeJoints: (updater: (prev: JointAngles) => JointAngles) => void;
  ikTarget: Vector3D;
  onChangeIKTarget: (target: Vector3D) => void;
  activeMode: ControlMode;
  onSelectMode: (mode: ControlMode) => void;
  onApplyPreset: (key: string) => void;
  compact?: boolean;
}

export const JoystickPendant: React.FC<JoystickPendantProps> = ({
  joints,
  onChangeJoints,
  ikTarget,
  onChangeIKTarget,
  activeMode,
  onSelectMode,
  onApplyPreset,
  compact = false,
}) => {
  const [jogSpeedMultiplier, setJogSpeedMultiplier] = useState<number>(1.0);
  const [isDeadmanActive, setIsDeadmanActive] = useState<boolean>(true);
  const [gamepadDetected, setGamepadDetected] = useState<string | null>(null);
  const [activeStickTab, setActiveStickTab] = useState<'arm' | 'wrist-gripper'>('arm');

  const pendantMode = activeMode === 'ik' ? 'ik' : 'fk';

  // 1. Stick 1: Base & Shoulder (FK) OR Planar X / Z (IK)
  const handleStick1 = useCallback(
    (vec: { x: number; y: number }) => {
      if (!isDeadmanActive) return;
      const rate = 1.5 * jogSpeedMultiplier;

      if (pendantMode === 'fk') {
        onChangeJoints((prev) => ({
          ...prev,
          j1: Math.max(-180, Math.min(180, prev.j1 + vec.x * rate)),
          j2: Math.max(-60, Math.min(120, prev.j2 + vec.y * rate)),
        }));
      } else {
        const cartRate = 3.6 * jogSpeedMultiplier;
        onChangeIKTarget({
          ...ikTarget,
          x: Math.max(-340, Math.min(340, ikTarget.x + vec.x * cartRate)),
          z: Math.max(-340, Math.min(340, ikTarget.z + vec.y * cartRate)),
        });
      }
    },
    [isDeadmanActive, jogSpeedMultiplier, pendantMode, onChangeJoints, ikTarget, onChangeIKTarget]
  );

  // 2. Stick 2: Elbow & Wrist Pitch (FK) OR Elevation Y & Trim (IK)
  const handleStick2 = useCallback(
    (vec: { x: number; y: number }) => {
      if (!isDeadmanActive) return;
      const rate = 1.5 * jogSpeedMultiplier;

      if (pendantMode === 'fk') {
        onChangeJoints((prev) => ({
          ...prev,
          j4: Math.max(-110, Math.min(110, prev.j4 + vec.x * rate)),
          j3: Math.max(-150, Math.min(150, prev.j3 + vec.y * rate)),
        }));
      } else {
        const cartRate = 3.6 * jogSpeedMultiplier;
        onChangeIKTarget({
          ...ikTarget,
          y: Math.max(10, Math.min(400, ikTarget.y + vec.y * cartRate)),
          x: Math.max(-340, Math.min(340, ikTarget.x + vec.x * (cartRate * 0.4))),
        });
      }
    },
    [isDeadmanActive, jogSpeedMultiplier, pendantMode, onChangeJoints, ikTarget, onChangeIKTarget]
  );

  // 3. Stick 3: Wrist Roll & Gripper (FK) OR Fine Pitch & Gripper (IK)
  const handleStick3 = useCallback(
    (vec: { x: number; y: number }) => {
      if (!isDeadmanActive) return;
      const rate = 2.0 * jogSpeedMultiplier;
      const gripRate = 2.5 * jogSpeedMultiplier;

      onChangeJoints((prev) => ({
        ...prev,
        j5: Math.max(-180, Math.min(180, prev.j5 + vec.x * rate)),
        gripper: Math.max(0, Math.min(100, prev.gripper + vec.y * gripRate)),
      }));
    },
    [isDeadmanActive, jogSpeedMultiplier, onChangeJoints]
  );

  // Step micro-nudge helpers
  const handleStepStick1 = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (pendantMode === 'fk') {
      const step = 2.0;
      if (dir === 'left') onChangeJoints((p) => ({ ...p, j1: Math.max(-180, p.j1 - step) }));
      if (dir === 'right') onChangeJoints((p) => ({ ...p, j1: Math.min(180, p.j1 + step) }));
      if (dir === 'up') onChangeJoints((p) => ({ ...p, j2: Math.min(120, p.j2 + step) }));
      if (dir === 'down') onChangeJoints((p) => ({ ...p, j2: Math.max(-60, p.j2 - step) }));
    } else {
      const step = 5.0;
      if (dir === 'left') onChangeIKTarget({ ...ikTarget, x: Math.max(-340, ikTarget.x - step) });
      if (dir === 'right') onChangeIKTarget({ ...ikTarget, x: Math.min(340, ikTarget.x + step) });
      if (dir === 'up') onChangeIKTarget({ ...ikTarget, z: Math.min(340, ikTarget.z + step) });
      if (dir === 'down') onChangeIKTarget({ ...ikTarget, z: Math.max(-340, ikTarget.z - step) });
    }
  };

  const handleStepStick2 = (dir: 'left' | 'right' | 'up' | 'down') => {
    if (pendantMode === 'fk') {
      const step = 2.0;
      if (dir === 'left') onChangeJoints((p) => ({ ...p, j4: Math.max(-110, p.j4 - step) }));
      if (dir === 'right') onChangeJoints((p) => ({ ...p, j4: Math.min(110, p.j4 + step) }));
      if (dir === 'up') onChangeJoints((p) => ({ ...p, j3: Math.min(150, p.j3 + step) }));
      if (dir === 'down') onChangeJoints((p) => ({ ...p, j3: Math.max(-150, p.j3 - step) }));
    } else {
      const step = 5.0;
      if (dir === 'up') onChangeIKTarget({ ...ikTarget, y: Math.min(400, ikTarget.y + step) });
      if (dir === 'down') onChangeIKTarget({ ...ikTarget, y: Math.max(10, ikTarget.y - step) });
      if (dir === 'left') onChangeIKTarget({ ...ikTarget, x: Math.max(-340, ikTarget.x - step) });
      if (dir === 'right') onChangeIKTarget({ ...ikTarget, x: Math.min(340, ikTarget.x + step) });
    }
  };

  const handleStepStick3 = (dir: 'left' | 'right' | 'up' | 'down') => {
    const step = 4.0;
    if (dir === 'left') onChangeJoints((p) => ({ ...p, j5: Math.max(-180, p.j5 - step) }));
    if (dir === 'right') onChangeJoints((p) => ({ ...p, j5: Math.min(180, p.j5 + step) }));
    if (dir === 'up') onChangeJoints((p) => ({ ...p, gripper: Math.min(100, p.gripper + 5) }));
    if (dir === 'down') onChangeJoints((p) => ({ ...p, gripper: Math.max(0, p.gripper - 5) }));
  };

  // Keyboard Gamepad Loop (WASD + Arrows + Q/E + R/F)
  useEffect(() => {
    const activeKeys = new Set<string>();
    let keyTimer: number | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      activeKeys.add(e.key.toLowerCase());
      startKeyLoop();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.key.toLowerCase());
      if (activeKeys.size === 0 && keyTimer) {
        cancelAnimationFrame(keyTimer);
        keyTimer = null;
      }
    };

    const startKeyLoop = () => {
      if (keyTimer) return;
      const loop = () => {
        let s1x = 0, s1y = 0;
        let s2x = 0, s2y = 0;
        let s3x = 0, s3y = 0;

        // Stick 1: WASD
        if (activeKeys.has('a')) s1x -= 1;
        if (activeKeys.has('d')) s1x += 1;
        if (activeKeys.has('w')) s1y += 1;
        if (activeKeys.has('s')) s1y -= 1;

        // Stick 2: Arrow Keys
        if (activeKeys.has('arrowleft')) s2x -= 1;
        if (activeKeys.has('arrowright')) s2x += 1;
        if (activeKeys.has('arrowup')) s2y += 1;
        if (activeKeys.has('arrowdown')) s2y -= 1;

        // Stick 3: Q/E for Roll, R/F for Gripper
        if (activeKeys.has('q')) s3x -= 1;
        if (activeKeys.has('e')) s3x += 1;
        if (activeKeys.has('r')) s3y += 1;
        if (activeKeys.has('f')) s3y -= 1;

        if (s1x !== 0 || s1y !== 0) handleStick1({ x: s1x, y: s1y });
        if (s2x !== 0 || s2y !== 0) handleStick2({ x: s2x, y: s2y });
        if (s3x !== 0 || s3y !== 0) handleStick3({ x: s3x, y: s3y });

        if (activeKeys.size > 0) {
          keyTimer = requestAnimationFrame(loop);
        } else {
          keyTimer = null;
        }
      };
      keyTimer = requestAnimationFrame(loop);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (keyTimer) cancelAnimationFrame(keyTimer);
    };
  }, [handleStick1, handleStick2, handleStick3]);

  // Web Gamepad API Polling Loop (USB / Bluetooth gamepads)
  useEffect(() => {
    let animId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let found: Gamepad | null = null;
      for (const gp of gamepads) {
        if (gp) {
          found = gp;
          break;
        }
      }

      if (found) {
        setGamepadDetected(found.id.slice(0, 24));
        const [lx, ly, rx, ry] = found.axes;
        const deadzone = 0.12;

        if (Math.abs(lx) > deadzone || Math.abs(ly) > deadzone) {
          handleStick1({ x: Math.abs(lx) > deadzone ? lx : 0, y: Math.abs(ly) > deadzone ? -ly : 0 });
        }
        if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
          handleStick2({ x: Math.abs(rx) > deadzone ? rx : 0, y: Math.abs(ry) > deadzone ? -ry : 0 });
        }

        // Triggers (LT: button 6, RT: button 7) or shoulder buttons (LB/RB: 4/5)
        if (found.buttons[6]?.pressed || found.buttons[4]?.pressed) {
          onChangeJoints((p) => ({ ...p, gripper: Math.max(0, p.gripper - 2) }));
        }
        if (found.buttons[7]?.pressed || found.buttons[5]?.pressed) {
          onChangeJoints((p) => ({ ...p, gripper: Math.min(100, p.gripper + 2) }));
        }
      } else {
        setGamepadDetected(null);
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [handleStick1, handleStick2, onChangeJoints]);

  return (
    <div className="space-y-4 select-none text-slate-200">
      {/* Teach Pendant Header Bar */}
      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-orange-600/20 text-orange-400 border border-orange-500/30">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-white block">SmartPAD Simulation Joysticks</span>
              <span className="text-[10px] text-slate-400">All 6-DOF movements mapped</span>
            </div>
          </div>
          <button
            onClick={() => onApplyPreset('home')}
            className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Home
          </button>
        </div>

        {/* Coordinate System Selector */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectMode('fk')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              pendantMode === 'fk'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Joint Joysticks (FK)</span>
          </button>
          <button
            onClick={() => onSelectMode('ik')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              pendantMode === 'ik'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Cartesian Joysticks (IK)</span>
          </button>
        </div>

        {/* Speed Multiplier & Deadman Interlock Switch */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[10px] uppercase font-bold text-slate-400">Jog Speed:</span>
            {[
              { val: 0.3, label: 'Creep' },
              { val: 1.0, label: '1x' },
              { val: 2.2, label: 'Turbo' },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setJogSpeedMultiplier(val)}
                className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer transition-colors ${
                  jogSpeedMultiplier === val
                    ? 'bg-orange-600 text-white font-bold shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsDeadmanActive(!isDeadmanActive)}
            title="Deadman Safety Switch (Must be active to jog)"
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              isDeadmanActive
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/70 shadow-emerald-950/50'
                : 'bg-rose-950/90 text-rose-300 border-rose-600/70 animate-pulse'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isDeadmanActive ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-400'
              }`}
            />
            {isDeadmanActive ? 'LIVE' : 'INTERLOCK'}
          </button>
        </div>

        {/* Gamepad status indicator */}
        {gamepadDetected && (
          <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded flex items-center gap-1">
            <Gamepad2 className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Gamepad Active: {gamepadDetected}</span>
          </div>
        )}
      </div>

      {/* STICK PAIR SELECTOR TABS (Arm Base/Elbow vs Wrist/Gripper) */}
      <div className="flex gap-1 p-0.5 bg-slate-950/70 rounded-lg border border-slate-800/90">
        <button
          onClick={() => setActiveStickTab('arm')}
          className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
            activeStickTab === 'arm'
              ? 'bg-slate-800 text-orange-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {pendantMode === 'fk' ? 'Primary Joints (J1-J4)' : 'Cartesian Translation (X, Y, Z)'}
        </button>
        <button
          onClick={() => setActiveStickTab('wrist-gripper')}
          className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
            activeStickTab === 'wrist-gripper'
              ? 'bg-slate-800 text-cyan-400 shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Wrist Roll & Gripper
        </button>
      </div>

      {/* JOYSTICK DISPLAY AREA */}
      {activeStickTab === 'arm' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* JOYSTICK 1 */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 flex flex-col items-center shadow-md">
            <VirtualJoystick
              label={pendantMode === 'fk' ? 'Base & Shoulder' : 'Planar Lateral / Depth'}
              xLabel={
                pendantMode === 'fk'
                  ? { neg: 'J1 Left', pos: 'J1 Right' }
                  : { neg: '-X Left', pos: '+X Right' }
              }
              yLabel={
                pendantMode === 'fk'
                  ? { neg: 'J2 Down', pos: 'J2 Up' }
                  : { neg: '-Z Back', pos: '+Z Fwd' }
              }
              onMove={handleStick1}
              onStep={handleStepStick1}
              size={136}
              accentColor="#ea580c"
              keyLabels={{ up: 'W', down: 'S', left: 'A', right: 'D' }}
              currentValues={
                pendantMode === 'fk'
                  ? {
                      xName: 'J1 Base',
                      xVal: `${joints.j1.toFixed(1)}°`,
                      yName: 'J2 Shldr',
                      yVal: `${joints.j2.toFixed(1)}°`,
                    }
                  : {
                      xName: 'X Target',
                      xVal: `${ikTarget.x.toFixed(0)} mm`,
                      yName: 'Z Target',
                      yVal: `${ikTarget.z.toFixed(0)} mm`,
                    }
              }
            />
          </div>

          {/* JOYSTICK 2 */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 flex flex-col items-center shadow-md">
            <VirtualJoystick
              label={pendantMode === 'fk' ? 'Elbow & Wrist Pitch' : 'Elevation & Fine Lateral'}
              xLabel={
                pendantMode === 'fk'
                  ? { neg: 'J4 Pitch -', pos: 'J4 Pitch +' }
                  : { neg: 'Fine -X', pos: 'Fine +X' }
              }
              yLabel={
                pendantMode === 'fk'
                  ? { neg: 'J3 Down', pos: 'J3 Up' }
                  : { neg: '-Y Down', pos: '+Y Up' }
              }
              onMove={handleStick2}
              onStep={handleStepStick2}
              size={136}
              accentColor="#06b6d4"
              keyLabels={{ up: '↑', down: '↓', left: '←', right: '→' }}
              currentValues={
                pendantMode === 'fk'
                  ? {
                      xName: 'J4 Pitch',
                      xVal: `${joints.j4.toFixed(1)}°`,
                      yName: 'J3 Elbow',
                      yVal: `${joints.j3.toFixed(1)}°`,
                    }
                  : {
                      xName: 'X Fine',
                      xVal: `${ikTarget.x.toFixed(0)} mm`,
                      yName: 'Y Height',
                      yVal: `${ikTarget.y.toFixed(0)} mm`,
                    }
              }
            />
          </div>
        </div>
      ) : (
        /* WRIST ROLL & GRIPPER JOYSTICK */
        <div className="space-y-3">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 flex flex-col items-center shadow-md">
            <VirtualJoystick
              label="Wrist Roll & Gripper Aperture"
              xLabel={{ neg: 'J5 CCW', pos: 'J5 CW' }}
              yLabel={{ neg: 'Clamp 0%', pos: 'Open 100%' }}
              onMove={handleStick3}
              onStep={handleStepStick3}
              size={144}
              accentColor="#10b981"
              keyLabels={{ up: 'R', down: 'F', left: 'Q', right: 'E' }}
              currentValues={{
                xName: 'J5 Roll',
                xVal: `${joints.j5.toFixed(1)}°`,
                yName: 'Jaw',
                yVal: `${Math.round(joints.gripper)}%`,
              }}
            />
          </div>

          {/* Quick Gripper Controls */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Continuous Squeeze Rockers</span>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(joints.gripper)}%</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onPointerDown={() => {
                  const timer = setInterval(() => {
                    onChangeJoints((p) => ({ ...p, gripper: Math.max(0, p.gripper - 4) }));
                  }, 40);
                  const clear = () => {
                    clearInterval(timer);
                    window.removeEventListener('pointerup', clear);
                  };
                  window.addEventListener('pointerup', clear);
                }}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 active:bg-orange-600 active:text-white rounded-lg text-xs font-semibold text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-none"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Hold: Clamp</span>
              </button>

              <button
                onPointerDown={() => {
                  const timer = setInterval(() => {
                    onChangeJoints((p) => ({ ...p, gripper: Math.min(100, p.gripper + 4) }));
                  }, 40);
                  const clear = () => {
                    clearInterval(timer);
                    window.removeEventListener('pointerup', clear);
                  };
                  window.addEventListener('pointerup', clear);
                }}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 active:text-white rounded-lg text-xs font-semibold text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer touch-none"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Hold: Open</span>
              </button>
            </div>

            {/* Quick Aperture Presets */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => onChangeJoints((p) => ({ ...p, gripper: 0 }))}
                className="py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors cursor-pointer"
              >
                Clamp (0%)
              </button>
              <button
                onClick={() => onChangeJoints((p) => ({ ...p, gripper: 50 }))}
                className="py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors cursor-pointer"
              >
                Half (50%)
              </button>
              <button
                onClick={() => onChangeJoints((p) => ({ ...p, gripper: 100 }))}
                className="py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors cursor-pointer"
              >
                Full (100%)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Quick Guide Footnote */}
      <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/60 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
        <span>🎮 WASD: Stick 1</span>
        <span>Arrows: Stick 2</span>
        <span>Q/E: Roll</span>
        <span>R/F: Gripper</span>
      </div>
    </div>
  );
};

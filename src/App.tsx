/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  JointAngles,
  ControlMode,
  RobotThemeId,
  CameraPreset,
  Waypoint,
  PickableBlock,
  Vector3D,
} from './types/robot';
import {
  ROBOT_THEMES,
  PRESET_POSES,
  computeForwardKinematics,
  solveInverseKinematics,
  checkRobotCollisions,
} from './utils/kinematics';
import { TopNav } from './components/TopNav';
import { Viewport3D } from './components/Viewport3D';
import { ControlPanel } from './components/ControlPanel';
import { TelemetryHUD } from './components/TelemetryHUD';
import { DownloadModal } from './components/DownloadModal';
import { DocsModal } from './components/DocsModal';
import { AICommandBar } from './components/AICommandBar';
import { JoystickPendant } from './components/JoystickPendant';
import { solveCommandOffline, CommandStep } from './utils/nlpCommands';
import { Gamepad2, X } from 'lucide-react';

const INITIAL_BLOCKS: PickableBlock[] = [
  { id: 'cube-red', x: -200, y: 15, z: 100, size: 24, color: '#ef4444', isHeld: false },
  { id: 'cube-blue', x: -220, y: 15, z: 60, size: 24, color: '#3b82f6', isHeld: false },
  { id: 'cube-emerald', x: -180, y: 15, z: 130, size: 24, color: '#10b981', isHeld: false },
];

export default function App() {
  // Robot Joint States
  const [joints, setJoints] = useState<JointAngles>(PRESET_POSES.home.joints);
  const [themeId, setThemeId] = useState<RobotThemeId>('kuka');
  const [activeMode, setActiveMode] = useState<ControlMode>('fk');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('orbit');

  // Visual overlays
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [showReachEnvelope, setShowReachEnvelope] = useState<boolean>(false);
  const [showLaser, setShowLaser] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showFloatingPendant, setShowFloatingPendant] = useState<boolean>(false);

  // IK State
  const [ikTarget, setIkTarget] = useState<Vector3D>({ x: 160, y: 140, z: 120 });
  const [ikStatus, setIkStatus] = useState<{ solved: boolean; errorMsg?: string }>({ solved: true });

  // Sequencer State
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    {
      id: 'wp-1',
      name: 'Home Position',
      joints: PRESET_POSES.home.joints,
      tcp: { x: 0, y: 220, z: 180 },
      durationMs: 1200,
    },
    {
      id: 'wp-2',
      name: 'Intake Hover',
      joints: { j1: -50, j2: 45, j3: -25, j4: -20, j5: 0, gripper: 85 },
      tcp: { x: -180, y: 140, z: 100 },
      durationMs: 1200,
    },
    {
      id: 'wp-3',
      name: 'Drop Station',
      joints: { j1: 50, j2: 45, j3: -25, j4: -20, j5: 0, gripper: 85 },
      tcp: { x: 180, y: 140, z: 100 },
      durationMs: 1200,
    },
  ]);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [loopSequence, setLoopSequence] = useState<boolean>(true);
  const [sequenceSpeed, setSequenceSpeed] = useState<number>(1);

  // Physical Workcell Blocks
  const [blocks, setBlocks] = useState<PickableBlock[]>(INITIAL_BLOCKS);
  const [isRunningRoutine, setIsRunningRoutine] = useState<boolean>(false);

  // Modals
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);

  // AI Command Execution State
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [executingStepName, setExecutingStepName] = useState<string | undefined>(undefined);
  const [stepProgress, setStepProgress] = useState<{ current: number; total: number } | undefined>(undefined);
  const [lastExplanation, setLastExplanation] = useState<string | undefined>(undefined);
  const aiAbortRef = useRef<boolean>(false);

  // Raw file contents for download modal
  const [standaloneHtml, setStandaloneHtml] = useState<string>('');
  const [readmeText, setReadmeText] = useState<string>('');

  // Fetch or prepare standalone HTML & README contents
  useEffect(() => {
    fetch('/robo_arm_environment.html')
      .then((res) => (res.ok ? res.text() : ''))
      .then((text) => {
        if (text) setStandaloneHtml(text);
      })
      .catch(() => {});

    fetch('/README.md')
      .then((res) => (res.ok ? res.text() : ''))
      .then((text) => {
        if (text) setReadmeText(text);
      })
      .catch(() => {});
  }, []);

  // Compute forward kinematics telemetry & collision detection
  const tcp = computeForwardKinematics(joints);
  const collision = checkRobotCollisions(joints, blocks);

  // Solve IK when target changes and IK mode is active
  useEffect(() => {
    if (activeMode === 'ik') {
      const result = solveInverseKinematics(ikTarget, -20);
      setIkStatus({ solved: result.solved, errorMsg: result.errorMsg });
      if (result.solved) {
        setJoints(result.joints);
      }
    }
  }, [ikTarget, activeMode]);

  // Apply a preset pose
  const handleApplyPreset = (key: string) => {
    const pose = PRESET_POSES[key];
    if (pose) {
      setJoints(pose.joints);
      if (activeMode === 'ik') {
        const calculated = computeForwardKinematics(pose.joints);
        setIkTarget(calculated.position);
      }
    }
  };

  // Add current joint state as a waypoint
  const handleAddWaypoint = () => {
    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      name: `Waypoint ${waypoints.length + 1}`,
      joints: { ...joints },
      tcp: { ...tcp.position },
      durationMs: 1200,
    };
    setWaypoints((prev) => [...prev, newWp]);
  };

  const handleDeleteWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  // Waypoint Sequence Playback Loop
  const seqTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStepRef = useRef<number>(0);

  const stopSequencePlayback = useCallback(() => {
    if (seqTimerRef.current) {
      clearInterval(seqTimerRef.current);
      seqTimerRef.current = null;
    }
    setIsPlayingSequence(false);
  }, []);

  const startSequencePlayback = useCallback(() => {
    if (waypoints.length < 2) return;
    setIsPlayingSequence(true);
    currentStepRef.current = 0;

    const intervalTime = Math.max(300, 1400 / sequenceSpeed);

    seqTimerRef.current = setInterval(() => {
      const step = currentStepRef.current;
      const targetWp = waypoints[step % waypoints.length];
      setJoints(targetWp.joints);

      currentStepRef.current++;
      if (!loopSequence && currentStepRef.current >= waypoints.length) {
        stopSequencePlayback();
      }
    }, intervalTime);
  }, [waypoints, sequenceSpeed, loopSequence, stopSequencePlayback]);

  const handleTogglePlaySequence = () => {
    if (isPlayingSequence) {
      stopSequencePlayback();
    } else {
      startSequencePlayback();
    }
  };

  useEffect(() => {
    return () => {
      if (seqTimerRef.current) clearInterval(seqTimerRef.current);
    };
  }, []);

  // Pick-and-Place Automated Workcell Routine
  const routineTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopRoutine = useCallback(() => {
    if (routineTimerRef.current) {
      clearInterval(routineTimerRef.current);
      routineTimerRef.current = null;
    }
    setIsRunningRoutine(false);
  }, []);

  const runPickAndPlaceRoutine = useCallback(() => {
    if (isRunningRoutine) {
      stopRoutine();
      return;
    }

    setIsRunningRoutine(true);
    let step = 0;

    const routineSequence: JointAngles[] = [
      // 1. Hover above intake pallet
      { j1: -52, j2: 40, j3: -25, j4: -15, j5: 0, gripper: 90 },
      // 2. Descend to grab red block
      { j1: -52, j2: 62, j3: -5, j4: -57, j5: 0, gripper: 90 },
      // 3. Clamp gripper
      { j1: -52, j2: 62, j3: -5, j4: -57, j5: 0, gripper: 15 },
      // 4. Lift vertically
      { j1: -52, j2: 30, j3: -35, j4: 5, j5: 0, gripper: 15 },
      // 5. Sweep through center
      { j1: 0, j2: 25, j3: -30, j4: 5, j5: 0, gripper: 15 },
      // 6. Swing to outtake pallet
      { j1: 52, j2: 30, j3: -35, j4: 5, j5: 0, gripper: 15 },
      // 7. Descend to place block
      { j1: 52, j2: 62, j3: -5, j4: -57, j5: 0, gripper: 15 },
      // 8. Open gripper
      { j1: 52, j2: 62, j3: -5, j4: -57, j5: 0, gripper: 90 },
      // 9. Retract vertically
      { j1: 52, j2: 35, j3: -40, j4: 5, j5: 0, gripper: 90 },
      // 10. Return to home
      PRESET_POSES.home.joints,
    ];

    routineTimerRef.current = setInterval(() => {
      const targetJoints = routineSequence[step % routineSequence.length];
      setJoints(targetJoints);
      step++;
      if (step >= routineSequence.length) {
        stopRoutine();
      }
    }, 1100);
  }, [isRunningRoutine, stopRoutine]);

  const handleResetBlocks = () => {
    stopRoutine();
    setBlocks(INITIAL_BLOCKS);
    setJoints(PRESET_POSES.home.joints);
  };

  const handleStopAIExecution = useCallback(() => {
    aiAbortRef.current = true;
    setIsProcessingAI(false);
    setExecutingStepName(undefined);
    setStepProgress(undefined);
  }, []);

  const handleExecuteAICommand = useCallback(
    async (commandText: string) => {
      aiAbortRef.current = false;
      setIsProcessingAI(true);
      setExecutingStepName('Analyzing kinematics instruction...');
      setStepProgress(undefined);

      try {
        let plan: { intent: string; explanation: string; steps: CommandStep[] };

        // 1. Try server-side Gemma / Gemini reasoning endpoint
        try {
          const res = await fetch('/api/robot/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: commandText,
              currentJoints: joints,
              currentTcp: tcp,
              blocks,
            }),
          });

          const data = await res.json();
          if (data && data.steps && Array.isArray(data.steps) && data.steps.length > 0) {
            plan = data;
          } else {
            plan = solveCommandOffline(commandText, joints, tcp, blocks);
          }
        } catch {
          plan = solveCommandOffline(commandText, joints, tcp, blocks);
        }

        setLastExplanation(plan.explanation);
        setIsProcessingAI(false);

        // 2. Animate through keyframe sequence smoothly
        for (let i = 0; i < plan.steps.length; i++) {
          if (aiAbortRef.current) break;

          const step = plan.steps[i];
          setExecutingStepName(step.name);
          setStepProgress({ current: i + 1, total: plan.steps.length });
          setJoints(step.joints);

          const duration = step.durationMs || 900;
          await new Promise((resolve) => setTimeout(resolve, duration));
        }
      } catch (err: any) {
        console.error('Command execution error:', err);
        setLastExplanation('Error parsing motion: safety envelope preserved.');
      } finally {
        setIsProcessingAI(false);
        setExecutingStepName(undefined);
        setStepProgress(undefined);
      }
    },
    [joints, tcp, blocks]
  );

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 antialiased">
      {/* Universal Top Bar */}
      <TopNav
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onOpenDocs={() => setIsDocsModalOpen(true)}
      />

      {/* Main Viewport + Sidebar Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Simulation Viewport */}
        <main className="flex-1 relative h-full">
          <Viewport3D
            joints={joints}
            theme={ROBOT_THEMES[themeId]}
            cameraPreset={cameraPreset}
            onCameraPresetChange={setCameraPreset}
            showTrail={showTrail}
            showReachEnvelope={showReachEnvelope}
            showLaser={showLaser}
            showGrid={showGrid}
            blocks={blocks}
            onUpdateBlocks={setBlocks}
            ikTarget={activeMode === 'ik' ? ikTarget : undefined}
            collision={collision}
          />

          {/* Floating Teach Pendant Joystick Quick Action */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={() => setShowFloatingPendant(!showFloatingPendant)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold backdrop-blur-md border shadow-lg transition-all cursor-pointer ${
                showFloatingPendant
                  ? 'bg-orange-600 text-white border-orange-500 shadow-orange-950/60'
                  : 'bg-slate-900/85 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-850'
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-orange-400" />
              <span>{showFloatingPendant ? 'Hide Joystick HUD' : 'Canvas Joysticks HUD'}</span>
            </button>
          </div>

          {/* Floating Teach Pendant Joystick HUD Overlay */}
          {showFloatingPendant && (
            <div className="absolute top-16 right-4 z-30 w-80 md:w-96 max-h-[82vh] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Gamepad2 className="w-4 h-4 text-orange-400" />
                  <span>Interactive Teach Pendant Joysticks</span>
                </div>
                <button
                  onClick={() => setShowFloatingPendant(false)}
                  className="text-slate-400 hover:text-white text-xs p-1 rounded hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <JoystickPendant
                joints={joints}
                onChangeJoints={setJoints}
                ikTarget={ikTarget}
                onChangeIKTarget={setIkTarget}
                activeMode={activeMode}
                onSelectMode={setActiveMode}
                onApplyPreset={handleApplyPreset}
              />
            </div>
          )}

          {/* Real-Time Telemetry Readout & Collision Warning */}
          <TelemetryHUD tcp={tcp} joints={joints} blocks={blocks} collision={collision} />

          {/* AI Gemma Natural Language Command Bar */}
          <AICommandBar
            onExecuteCommand={handleExecuteAICommand}
            isProcessing={isProcessingAI}
            executingStepName={executingStepName}
            stepProgress={stepProgress}
            lastExplanation={lastExplanation}
            onStopExecution={handleStopAIExecution}
          />
        </main>

        {/* Control Panel Sidebar */}
        <ControlPanel
          activeMode={activeMode}
          onSelectMode={setActiveMode}
          joints={joints}
          onChangeJoints={setJoints}
          ikTarget={ikTarget}
          onChangeIKTarget={setIkTarget}
          ikStatus={ikStatus}
          theme={ROBOT_THEMES[themeId]}
          onChangeTheme={setThemeId}
          waypoints={waypoints}
          onAddWaypoint={handleAddWaypoint}
          onDeleteWaypoint={handleDeleteWaypoint}
          isPlayingSequence={isPlayingSequence}
          onTogglePlaySequence={handleTogglePlaySequence}
          loopSequence={loopSequence}
          onToggleLoopSequence={() => setLoopSequence(!loopSequence)}
          sequenceSpeed={sequenceSpeed}
          onChangeSequenceSpeed={setSequenceSpeed}
          showTrail={showTrail}
          onToggleTrail={() => setShowTrail(!showTrail)}
          showReachEnvelope={showReachEnvelope}
          onToggleReachEnvelope={() => setShowReachEnvelope(!showReachEnvelope)}
          showLaser={showLaser}
          onToggleLaser={() => setShowLaser(!showLaser)}
          onApplyPreset={handleApplyPreset}
          onResetBlocks={handleResetBlocks}
          onRunPickAndPlaceRoutine={runPickAndPlaceRoutine}
          isRunningRoutine={isRunningRoutine}
          onExecuteCommand={handleExecuteAICommand}
          isProcessingCommand={isProcessingAI}
        />
      </div>

      {/* Download Center Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        standaloneHtmlContent={standaloneHtml}
        readmeContent={readmeText}
        waypoints={waypoints}
      />

      {/* Documentation Modal */}
      <DocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />
    </div>
  );
}

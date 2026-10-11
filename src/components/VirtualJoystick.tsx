import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualJoystickProps {
  label: string;
  xLabel: { neg: string; pos: string };
  yLabel: { neg: string; pos: string };
  onMove: (vector: { x: number; y: number }) => void;
  onStep?: (dir: 'left' | 'right' | 'up' | 'down') => void;
  onRelease?: () => void;
  size?: number;
  accentColor?: string;
  keyLabels?: { up: string; down: string; left: string; right: string };
  currentValues?: { xName: string; xVal: string; yName: string; yVal: string };
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  label,
  xLabel,
  yLabel,
  onMove,
  onStep,
  onRelease,
  size = 146,
  accentColor = '#ea580c',
  keyLabels,
  currentValues,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const isPointerDownRef = useRef(false);
  const currentVectorRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  const radius = size / 2;
  const maxDistance = radius * 0.65;

  // Proportional continuous jogging loop
  const jogLoop = useCallback(() => {
    if (
      isPointerDownRef.current &&
      (currentVectorRef.current.x !== 0 || currentVectorRef.current.y !== 0)
    ) {
      onMove(currentVectorRef.current);
      animFrameRef.current = requestAnimationFrame(jogLoop);
    }
  }, [onMove]);

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);

      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * maxDistance;
        dy = Math.sin(angle) * maxDistance;
      }

      setKnobPos({ x: dx, y: dy });

      // Normalized vector (-1.0 to 1.0), with Y inverted (up is positive)
      const rawX = dx / maxDistance;
      const rawY = -dy / maxDistance;

      // Deadzone threshold (8%)
      const deadzone = 0.08;
      let normX = 0;
      let normY = 0;

      if (Math.abs(rawX) > deadzone) {
        const signX = Math.sign(rawX);
        const scaledX = (Math.abs(rawX) - deadzone) / (1 - deadzone);
        // Exponential response curve (smooth fine control near center, fast near edge)
        normX = signX * Math.pow(scaledX, 1.4);
      }

      if (Math.abs(rawY) > deadzone) {
        const signY = Math.sign(rawY);
        const scaledY = (Math.abs(rawY) - deadzone) / (1 - deadzone);
        normY = signY * Math.pow(scaledY, 1.4);
      }

      currentVectorRef.current = {
        x: Math.round(normX * 100) / 100,
        y: Math.round(normY * 100) / 100,
      };

      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(jogLoop);
      }
    },
    [maxDistance, jogLoop]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    setIsActive(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    isPointerDownRef.current = false;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    currentVectorRef.current = { x: 0, y: 0 };
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    onRelease?.();
  };

  // Keyboard active highlight listener
  useEffect(() => {
    if (!keyLabels) return;
    const handleKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        k === keyLabels.up.toLowerCase() ||
        k === keyLabels.down.toLowerCase() ||
        k === keyLabels.left.toLowerCase() ||
        k === keyLabels.right.toLowerCase()
      ) {
        setPressedKey(e.type === 'keydown' ? k : null);
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [keyLabels]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Compute 3D tilt angles based on deflection
  const tiltX = (knobPos.y / maxDistance) * -24; // degrees
  const tiltY = (knobPos.x / maxDistance) * 24;

  const deflectionPct = Math.round(
    (Math.hypot(knobPos.x, knobPos.y) / maxDistance) * 100
  );

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[210px]">
      {/* Header with live feedback and labels */}
      <div className="flex items-center justify-between w-full px-1 mb-1.5 text-xs">
        <span className="font-semibold tracking-wide text-slate-200 text-[11px] truncate uppercase">
          {label}
        </span>
        <span
          className={`font-mono text-[10px] tabular-nums transition-colors px-1 py-0.5 rounded ${
            deflectionPct > 5
              ? 'bg-orange-500/20 text-orange-400 font-bold'
              : 'text-slate-500 bg-slate-900/60'
          }`}
        >
          {deflectionPct}% JOG
        </span>
      </div>

      {/* Real-time Current Values Readout (if provided) */}
      {currentValues && (
        <div className="flex justify-between w-full px-1 mb-2 text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/80">
          <span>
            {currentValues.xName}:{' '}
            <strong className="text-orange-400 font-bold">{currentValues.xVal}</strong>
          </span>
          <span>
            {currentValues.yName}:{' '}
            <strong className="text-cyan-400 font-bold">{currentValues.yVal}</strong>
          </span>
        </div>
      )}

      {/* Axis Direction Indicators & Joystick Center Assembly */}
      <div className="relative flex items-center justify-center p-2">
        {/* Step Nudge Buttons & Axis Direction Labels */}
        {/* TOP */}
        <div className="absolute -top-1.5 flex flex-col items-center z-10">
          <button
            type="button"
            onClick={() => onStep?.('up')}
            title={`Step ${yLabel.pos}`}
            className="p-0.5 rounded bg-slate-800/90 hover:bg-orange-600 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shadow cursor-pointer active:scale-95"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <span
            className={`text-[9px] font-mono uppercase tracking-wider transition-colors font-bold ${
              pressedKey === keyLabels?.up?.toLowerCase() || knobPos.y < -10
                ? 'text-orange-400'
                : 'text-slate-400'
            }`}
          >
            {yLabel.pos} {keyLabels ? `[${keyLabels.up}]` : ''}
          </span>
        </div>

        {/* BOTTOM */}
        <div className="absolute -bottom-2 flex flex-col items-center z-10">
          <span
            className={`text-[9px] font-mono uppercase tracking-wider transition-colors font-bold ${
              pressedKey === keyLabels?.down?.toLowerCase() || knobPos.y > 10
                ? 'text-orange-400'
                : 'text-slate-400'
            }`}
          >
            {yLabel.neg} {keyLabels ? `[${keyLabels.down}]` : ''}
          </span>
          <button
            type="button"
            onClick={() => onStep?.('down')}
            title={`Step ${yLabel.neg}`}
            className="p-0.5 rounded bg-slate-800/90 hover:bg-orange-600 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shadow cursor-pointer active:scale-95"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* LEFT */}
        <div className="absolute -left-3.5 flex items-center gap-0.5 z-10">
          <button
            type="button"
            onClick={() => onStep?.('left')}
            title={`Step ${xLabel.neg}`}
            className="p-0.5 rounded bg-slate-800/90 hover:bg-orange-600 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shadow cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span
            className={`text-[9px] font-mono uppercase tracking-wider transition-colors font-bold ${
              pressedKey === keyLabels?.left?.toLowerCase() || knobPos.x < -10
                ? 'text-orange-400'
                : 'text-slate-400'
            }`}
          >
            {xLabel.neg}
          </span>
        </div>

        {/* RIGHT */}
        <div className="absolute -right-3.5 flex items-center gap-0.5 z-10">
          <span
            className={`text-[9px] font-mono uppercase tracking-wider transition-colors font-bold ${
              pressedKey === keyLabels?.right?.toLowerCase() || knobPos.x > 10
                ? 'text-orange-400'
                : 'text-slate-400'
            }`}
          >
            {xLabel.pos}
          </span>
          <button
            type="button"
            onClick={() => onStep?.('right')}
            title={`Step ${xLabel.pos}`}
            className="p-0.5 rounded bg-slate-800/90 hover:bg-orange-600 text-slate-300 hover:text-white transition-colors border border-slate-700/60 shadow cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Outer Industrial Gimbal Housing with Bezel and Screws */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: size, height: size }}
          className={`relative rounded-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-all shadow-2xl p-2 ${
            isActive
              ? 'ring-2 ring-orange-500 shadow-orange-950/50'
              : 'ring-1 ring-slate-800 shadow-black'
          }`}
        >
          {/* Beveled Metallic Base Rim */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-slate-700/80 shadow-inner" />

          {/* Industrial Socket Screws (4 corners) */}
          <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 border border-slate-600 shadow-xs" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 border border-slate-600 shadow-xs" />
          <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 border border-slate-600 shadow-xs" />
          <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 border border-slate-600 shadow-xs" />

          {/* Concentric Rubber Bellows / Gaiter Rings (Flexible 3D boot) */}
          <div className="absolute inset-2.5 rounded-full bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center overflow-hidden">
            <div className="absolute inset-2 rounded-full border border-slate-800/80" />
            <div className="absolute inset-4 rounded-full border border-slate-800/60" />
            <div className="absolute inset-6 rounded-full border border-dashed border-slate-800/40" />

            {/* Crosshair Alignment Reticle */}
            <div className="absolute w-full h-[1px] bg-slate-800/50 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-slate-800/50 pointer-events-none" />

            {/* Glowing Deflection Vector Line */}
            {isActive && (
              <div
                className="absolute left-1/2 top-1/2 origin-top-left pointer-events-none"
                style={{
                  width: Math.hypot(knobPos.x, knobPos.y),
                  height: 2,
                  backgroundColor: accentColor,
                  opacity: 0.8,
                  boxShadow: `0 0 8px ${accentColor}`,
                  transform: `rotate(${Math.atan2(knobPos.y, knobPos.x)}rad)`,
                }}
              />
            )}
          </div>

          {/* 3D Simulation Stick Gimbal & Textured Grip Knob */}
          <div
            className="relative pointer-events-none z-20 flex items-center justify-center transition-transform"
            style={{
              transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0px) perspective(250px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${
                isActive ? 1.05 : 1
              })`,
            }}
          >
            {/* Cylindrical Metallic Shaft */}
            <div className="absolute w-4 h-4 rounded-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 shadow-md" />

            {/* Outer Ergonomic Thumbstick Knob */}
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                isActive
                  ? 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-orange-500 shadow-xl'
                  : 'bg-gradient-to-b from-slate-800 via-slate-850 to-slate-950 border-slate-600 shadow-lg'
              }`}
              style={{
                boxShadow: isActive
                  ? `0 6px 18px rgba(0,0,0,0.8), 0 0 14px ${accentColor}60`
                  : '0 4px 10px rgba(0,0,0,0.6)',
              }}
            >
              {/* Tactile Knurled Grip Ring (Outer ridges) */}
              <div className="w-11 h-11 rounded-full border border-slate-700/80 bg-gradient-to-b from-slate-850 to-slate-950 flex items-center justify-center shadow-inner">
                {/* Concave Thumb Indentation */}
                <div
                  className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors"
                  style={{
                    borderColor: isActive ? accentColor : '#475569',
                    backgroundColor: isActive ? `${accentColor}25` : '#0f172a',
                  }}
                >
                  {/* Central LED Status Dot */}
                  <div
                    className="w-3 h-3 rounded-full transition-all"
                    style={{
                      backgroundColor: isActive ? accentColor : '#64748b',
                      boxShadow: isActive ? `0 0 8px ${accentColor}` : undefined,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

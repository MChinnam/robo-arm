import React from 'react';
import { TCPState, JointAngles, PickableBlock, CollisionState } from '../types/robot';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface TelemetryHUDProps {
  tcp: TCPState;
  joints: JointAngles;
  blocks: PickableBlock[];
  collision: CollisionState;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ tcp, joints, blocks, collision }) => {
  const heldBlock = blocks.find((b) => b.isHeld);

  // Payload torque estimation based on cantilever distance
  const baseTorqueNm = Math.round((tcp.distanceFromBase / 1000) * 12 * 10) / 10;
  const payloadExtra = heldBlock ? 2.5 : 0;
  const totalTorque = Math.round((baseTorqueNm + payloadExtra) * 10) / 10;

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none select-none max-w-sm">
      {/* Collision Alert / Proximity Banner */}
      {collision.hasCollision ? (
        <div className="px-4 py-2.5 bg-rose-950/95 backdrop-blur-md rounded-lg border-2 border-rose-500 shadow-2xl flex flex-col gap-1 text-xs animate-pulse">
          <div className="flex items-center justify-between text-rose-200 font-bold">
            <div className="flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>COLLISION DETECTED</span>
            </div>
            {collision.penetrationDepth !== undefined && (
              <span className="font-mono text-[11px] text-rose-300">
                -{collision.penetrationDepth} mm
              </span>
            )}
          </div>
          <p className="text-[11px] text-rose-200 leading-snug">
            {collision.warningMessage || 'Interference detected between arm and workspace object.'}
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-rose-800/80 text-[10px] text-rose-300 font-mono">
            <span>Segment: {collision.collidingSegment || 'TCP'}</span>
            {collision.collidingBlockId && <span>Target: {collision.collidingBlockId.toUpperCase()}</span>}
          </div>
        </div>
      ) : collision.isProximityWarning ? (
        <div className="px-4 py-2 bg-amber-950/90 backdrop-blur-md rounded-lg border border-amber-500/80 shadow-xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Proximity Alert</span>
          </div>
          <span className="font-mono text-[11px] text-amber-300">
            Clearance: {collision.minClearance} mm
          </span>
        </div>
      ) : (
        <div className="px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-md border border-slate-800/80 text-[11px] flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">Collision Clearance</span>
          </div>
          <span className="font-mono text-emerald-400">
            {collision.minClearance > 100 ? '>100 mm' : `${collision.minClearance} mm`}
          </span>
        </div>
      )}

      {/* Primary Coordinates HUD */}
      <div
        className={`px-4 py-3 backdrop-blur-md rounded-lg border shadow-xl flex flex-col gap-2 min-w-[240px] transition-colors ${
          collision.hasCollision
            ? 'bg-rose-950/40 border-rose-800/60'
            : 'bg-slate-900/85 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs">
          <span className="font-semibold text-slate-200">Tool Center Point (TCP)</span>
          <span className={`text-[11px] font-mono ${tcp.inReach ? 'text-emerald-400' : 'text-rose-400'}`}>
            {tcp.inReach ? 'IN WORKSPACE' : 'OUT OF REACH'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">X POS</span>
            <span className="text-slate-100 font-semibold">{tcp.position.x.toFixed(1)} <span className="text-[10px] text-slate-400">mm</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">Y POS</span>
            <span className="text-slate-100 font-semibold">{tcp.position.y.toFixed(1)} <span className="text-[10px] text-slate-400">mm</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">Z POS</span>
            <span className="text-slate-100 font-semibold">{tcp.position.z.toFixed(1)} <span className="text-[10px] text-slate-400">mm</span></span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums pt-1 border-t border-slate-800/60">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">PITCH</span>
            <span className="text-cyan-400 font-medium">{tcp.pitch.toFixed(1)}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">ROLL</span>
            <span className="text-cyan-400 font-medium">{tcp.roll.toFixed(1)}°</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-sans">EST. LOAD</span>
            <span className="text-amber-400 font-medium">{totalTorque} Nm</span>
          </div>
        </div>
      </div>

      {/* Gripper & Physical Payload Status */}
      <div className="px-3 py-2 bg-slate-900/80 backdrop-blur-md rounded-md border border-slate-800 text-xs flex items-center justify-between">
        <span className="text-slate-400">Gripper State:</span>
        <span className="font-mono text-slate-200">
          {heldBlock ? (
            <span className="text-orange-400 font-semibold">Holding ({heldBlock.id.toUpperCase()})</span>
          ) : joints.gripper < 20 ? (
            'Closed'
          ) : joints.gripper > 80 ? (
            'Fully Open'
          ) : (
            `${Math.round(joints.gripper)}% Open`
          )}
        </span>
      </div>
    </div>
  );
};

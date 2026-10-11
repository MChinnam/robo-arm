import React from 'react';
import { Download, FileCode, Play, RotateCcw, Sliders } from 'lucide-react';
import { ControlMode } from '../types/robot';

interface TopNavProps {
  activeMode: ControlMode;
  onSelectMode: (mode: ControlMode) => void;
  onOpenDownloadModal: () => void;
  onOpenDocs: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeMode,
  onSelectMode,
  onOpenDownloadModal,
  onOpenDocs,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 select-none shrink-0 z-30">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-orange-400 transition-colors">
          RoboArm 3D Studio
        </a>
      </div>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
        <button
          onClick={() => onSelectMode('fk')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeMode === 'fk' ? 'text-orange-400 font-semibold' : 'text-slate-300'
          }`}
        >
          Joint Control (FK)
        </button>
        <button
          onClick={() => onSelectMode('ik')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeMode === 'ik' ? 'text-orange-400 font-semibold' : 'text-slate-300'
          }`}
        >
          Cartesian Target (IK)
        </button>
        <button
          onClick={() => onSelectMode('sequence')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeMode === 'sequence' ? 'text-orange-400 font-semibold' : 'text-slate-300'
          }`}
        >
          Waypoint Sequencer
        </button>
        <button
          onClick={() => onSelectMode('workcell')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeMode === 'workcell' ? 'text-orange-400 font-semibold' : 'text-slate-300'
          }`}
        >
          Workcell Tasks
        </button>
        <button
          onClick={() => onSelectMode('ros')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activeMode === 'ros' ? 'text-orange-400 font-semibold' : 'text-slate-300'
          }`}
        >
          ROS 2 Bridge
        </button>
        <button
          onClick={onOpenDocs}
          className="hover:text-white text-slate-400 transition-colors whitespace-nowrap shrink-0"
        >
          Documentation
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenDownloadModal}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-500 transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Code</span>
        </button>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import {
  Download,
  FileCode,
  FileText,
  Archive,
  Copy,
  Check,
  X,
  Code2,
  FolderTree,
  Terminal,
} from 'lucide-react';
import { downloadFile, downloadProjectZip } from '../utils/kinematics';
import { Waypoint } from '../types/robot';

import { generateRobotUrdf, generateRosGemmaNodePy } from '../utils/rosBridge';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  standaloneHtmlContent: string;
  readmeContent: string;
  waypoints: Waypoint[];
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  standaloneHtmlContent,
  readmeContent,
  waypoints,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'readme' | 'json' | 'urdf' | 'ros_py'>('html');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadProjectZip(standaloneHtmlContent, readmeContent);
    } finally {
      setIsZipping(false);
    }
  };

  const getCodeSnippet = () => {
    switch (activeCodeTab) {
      case 'html':
        return standaloneHtmlContent;
      case 'readme':
        return readmeContent;
      case 'urdf':
        return generateRobotUrdf();
      case 'ros_py':
        return generateRosGemmaNodePy();
      case 'json':
        return JSON.stringify(
          waypoints.map((w, i) => ({
            step: i + 1,
            name: w.name,
            joints: w.joints,
            tcp: w.tcp,
          })),
          null,
          2
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Download Code & Project Assets</h2>
              <p className="text-xs text-slate-400">Download single-file offline HTML, full project ZIP, or trajectory data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Download Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Standalone Offline HTML */}
            <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between hover:border-orange-500/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
                  <FileCode className="w-4 h-4" />
                  <span>Standalone HTML</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Single-file zero-dependency offline version (<code className="text-[11px] text-orange-300">robo_arm_environment.html</code>). Runs in any browser without npm or node.
                </p>
              </div>
              <button
                onClick={() => downloadFile('robo_arm_environment.html', standaloneHtmlContent, 'text/html')}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .HTML</span>
              </button>
            </div>

            {/* 2. Full Project ZIP */}
            <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between hover:border-cyan-500/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Archive className="w-4 h-4" />
                  <span>Full Project ZIP</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Complete React + Three.js source code bundle, package.json, documentation, and example trajectory files packed into a .zip.
                </p>
              </div>
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isZipping ? 'Generating...' : 'Download Project .ZIP'}</span>
              </button>
            </div>

            {/* 3. README Documentation */}
            <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Documentation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Detailed Markdown engineering guide (<code className="text-[11px] text-emerald-300">README.md</code>) with kinematics formulas and coordinate references.
                </p>
              </div>
              <button
                onClick={() => downloadFile('README.md', readmeContent, 'text/markdown')}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download README.md</span>
              </button>
            </div>
          </div>

          {/* Where is the code stored info box */}
          <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <FolderTree className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-white block">Workspace Direct Access</span>
              <p className="text-slate-400">
                The files are also saved directly in your current workspace directory:
              </p>
              <div className="font-mono text-[11px] text-orange-300 space-y-0.5 pt-1">
                <div>📁 /robo_arm_environment.html <span className="text-slate-500">(Standalone offline HTML)</span></div>
                <div>📁 /README.md <span className="text-slate-500">(Kinematics documentation)</span></div>
                <div>📁 /src/App.tsx & /src/components/* <span className="text-slate-500">(React + Three.js source)</span></div>
              </div>
            </div>
          </div>

          {/* In-Browser Code Inspector */}
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveCodeTab('html')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'html'
                        ? 'bg-slate-800 text-orange-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    robo_arm_environment.html
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('readme')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'readme'
                        ? 'bg-slate-800 text-orange-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    README.md
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('json')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'json'
                        ? 'bg-slate-800 text-orange-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    trajectory.json
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('urdf')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'urdf'
                        ? 'bg-slate-800 text-orange-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    robo_arm.urdf
                  </button>
                  <button
                    onClick={() => setActiveCodeTab('ros_py')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeCodeTab === 'ros_py'
                        ? 'bg-slate-800 text-orange-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    rclpy_node.py
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleCopy(getCodeSnippet())}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950/90 text-slate-300 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto overflow-x-auto select-text">
              <code>{getCodeSnippet()}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

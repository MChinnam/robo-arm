import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  Radio,
  FileCode,
  Download,
  Copy,
  Check,
  Terminal,
  Activity,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { JointAngles } from '../types/robot';
import { RosTopicLog, RosBridgeState } from '../types/ros';
import {
  formatRosJointState,
  formatRosTrajectory,
  generateRobotUrdf,
  generateRosGemmaNodePy,
  ROS_JOINT_NAMES,
} from '../utils/rosBridge';
import { downloadFile } from '../utils/kinematics';

interface RosPanelProps {
  joints: JointAngles;
  onExecuteCommand: (command: string) => Promise<void>;
  isProcessingCommand: boolean;
}

export const RosPanel: React.FC<RosPanelProps> = ({
  joints,
  onExecuteCommand,
  isProcessingCommand,
}) => {
  const [bridgeState, setBridgeState] = useState<RosBridgeState>({
    isConnected: true,
    isSimulated: true,
    url: 'ws://localhost:9090',
    publishedCount: 142,
    receivedCount: 18,
  });

  const [activeTopicTab, setActiveTopicTab] = useState<
    'joint_states' | 'trajectory' | 'gemma_cmd' | 'urdf' | 'node_py'
  >('joint_states');

  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [topicLogs, setTopicLogs] = useState<RosTopicLog[]>([]);

  // Keep a running log of published messages
  useEffect(() => {
    const jointState = formatRosJointState(joints);
    const now = new Date().toLocaleTimeString();

    setBridgeState((prev) => ({
      ...prev,
      publishedCount: prev.publishedCount + 1,
    }));

    setTopicLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        topic: '/joint_states',
        type: 'sensor_msgs/JointState',
        timestamp: now,
        direction: 'pub',
        payload: jointState,
      },
      ...prev.slice(0, 19),
    ]);
  }, [joints]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isProcessingCommand) return;
    const cmd = commandInput.trim();
    setCommandInput('');

    const now = new Date().toLocaleTimeString();
    setTopicLogs((prev) => [
      {
        id: `cmd-${Date.now()}`,
        topic: '/gemma/command',
        type: 'std_msgs/String',
        timestamp: now,
        direction: 'sub',
        payload: { data: cmd },
      },
      ...prev,
    ]);

    await onExecuteCommand(cmd);
  };

  const currentJointState = formatRosJointState(joints);
  const urdfContent = generateRobotUrdf();
  const nodePyContent = generateRosGemmaNodePy();

  return (
    <div className="space-y-4 text-xs select-none">
      {/* ROS Bridge Connection Banner */}
      <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">ROS 2 Humble / Iron Bridge</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            {bridgeState.isSimulated ? 'VIRTUAL NODE ACTIVE' : 'ROSBRIDGE CONNECTED'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Bridge: {bridgeState.url}</span>
          <div className="flex items-center gap-3">
            <span>TX: {bridgeState.publishedCount}</span>
            <span>RX: {bridgeState.receivedCount}</span>
          </div>
        </div>
      </div>

      {/* Topic Inspector Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTopicTab('joint_states')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTopicTab === 'joint_states'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          /joint_states
        </button>
        <button
          onClick={() => setActiveTopicTab('gemma_cmd')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTopicTab === 'gemma_cmd'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          /gemma/command
        </button>
        <button
          onClick={() => setActiveTopicTab('urdf')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTopicTab === 'urdf'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          URDF (XML)
        </button>
        <button
          onClick={() => setActiveTopicTab('node_py')}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            activeTopicTab === 'node_py'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          rclpy Node
        </button>
      </div>

      {/* ROS Command Terminal Publisher */}
      <form onSubmit={handlePublishCommand} className="flex gap-2">
        <div className="relative flex-1">
          <Terminal className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={isProcessingCommand}
            placeholder="ros2 topic pub /gemma/command ('pick up', 'turn right')..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          disabled={!commandInput.trim() || isProcessingCommand}
          className="px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
        >
          Publish
        </button>
      </form>

      {/* Active Tab View */}
      {activeTopicTab === 'joint_states' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-200">sensor_msgs/JointState (20 Hz)</span>
            <span className="font-mono text-[10px]">frame: base_link</span>
          </div>

          <div className="space-y-1 font-mono text-xs">
            {ROS_JOINT_NAMES.map((name, i) => (
              <div
                key={name}
                className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-slate-800/80"
              >
                <span className="text-slate-400 truncate max-w-[140px]">{name}</span>
                <span className="text-cyan-400 tabular-nums">
                  {currentJointState.position[i].toFixed(3)} rad
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTopicTab === 'gemma_cmd' && (
        <div className="space-y-2">
          <span className="font-semibold text-slate-200 block">ROS Topic Event Log</span>
          <div className="space-y-1 max-h-56 overflow-y-auto font-mono text-[11px] pr-1">
            {topicLogs.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="p-1.5 rounded bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1 rounded text-[9px] font-bold ${
                      log.direction === 'pub'
                        ? 'bg-cyan-950 text-cyan-400'
                        : 'bg-orange-950 text-orange-400'
                    }`}
                  >
                    {log.direction.toUpperCase()}
                  </span>
                  <span className="text-slate-300 truncate max-w-[160px]">{log.topic}</span>
                </div>
                <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTopicTab === 'urdf' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">robo_arm.urdf</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopy(urdfContent)}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                title="Copy URDF XML"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => downloadFile('robo_arm.urdf', urdfContent, 'application/xml')}
                className="p-1 rounded bg-orange-600 text-white hover:bg-orange-500"
                title="Download robo_arm.urdf"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-300 max-h-52 overflow-y-auto select-text leading-snug">
            <code>{urdfContent}</code>
          </pre>
        </div>
      )}

      {activeTopicTab === 'node_py' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">robo_arm_gemma_node.py</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopy(nodePyContent)}
                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                title="Copy Python Node"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => downloadFile('robo_arm_gemma_node.py', nodePyContent, 'text/x-python')}
                className="p-1 rounded bg-orange-600 text-white hover:bg-orange-500"
                title="Download Python Node"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-300 max-h-52 overflow-y-auto select-text leading-snug">
            <code>{nodePyContent}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

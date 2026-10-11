import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Square,
  CheckCircle2,
  AlertCircle,
  CornerDownLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';

interface AICommandBarProps {
  onExecuteCommand: (command: string) => Promise<void>;
  isProcessing: boolean;
  executingStepName?: string;
  stepProgress?: { current: number; total: number };
  lastExplanation?: string;
  onStopExecution: () => void;
}

const QUICK_COMMANDS = [
  { label: 'Pick Up', cmd: 'pick up' },
  { label: 'Down', cmd: 'down' },
  { label: 'Turn Right', cmd: 'turn right' },
  { label: 'Turn Left', cmd: 'turn left' },
  { label: 'Up', cmd: 'up' },
  { label: 'Release', cmd: 'release gripper' },
  { label: 'Wave', cmd: 'wave arm' },
  { label: 'Home', cmd: 'home' },
];

export const AICommandBar: React.FC<AICommandBarProps> = ({
  onExecuteCommand,
  isProcessing,
  executingStepName,
  stepProgress,
  lastExplanation,
  onStopExecution,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        onExecuteCommand(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onExecuteCommand]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use text input.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const cmd = inputText.trim();
    setInputText('');
    onExecuteCommand(cmd);
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 select-none pointer-events-auto">
      {/* Execution Feedback Banner */}
      {(isProcessing || executingStepName || lastExplanation) && (
        <div className="mb-2 p-3 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-orange-400 animate-pulse" />
              <span className="font-semibold text-slate-200">
                {isProcessing
                  ? 'Gemma Kinematics: Computing Motion Plan...'
                  : executingStepName
                  ? 'Executing Trajectory'
                  : 'Action Completed'}
              </span>
              {stepProgress && stepProgress.total > 1 && (
                <span className="text-[11px] font-mono text-cyan-400">
                  Step {stepProgress.current} of {stepProgress.total}
                </span>
              )}
            </div>

            {isProcessing || executingStepName ? (
              <button
                onClick={onStopExecution}
                className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800 rounded hover:bg-rose-900 transition-colors cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>

          {executingStepName && (
            <div className="flex items-center gap-2 text-xs font-mono text-orange-300">
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{executingStepName}</span>
            </div>
          )}

          {lastExplanation && !executingStepName && (
            <p className="text-[11px] text-slate-400 leading-snug truncate">
              {lastExplanation}
            </p>
          )}

          {/* Progress bar indicator */}
          {stepProgress && stepProgress.total > 1 && (
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{
                  width: `${(stepProgress.current / stepProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Main Command Input Box */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-2.5 flex flex-col gap-2">
        {/* Quick action chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0 pl-1">
            Quick:
          </span>
          {QUICK_COMMANDS.map((qc) => (
            <button
              key={qc.label}
              disabled={isProcessing}
              onClick={() => onExecuteCommand(qc.cmd)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {qc.label}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Sparkles className="w-4 h-4 text-orange-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              placeholder="Give command: 'pick up', 'down', 'turn right 45 deg', 'lift', 'wave'..."
              className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleVoice}
                title={isListening ? 'Listening...' : 'Voice command'}
                className={`absolute right-2.5 p-1 rounded-md transition-colors cursor-pointer ${
                  isListening
                    ? 'text-rose-400 animate-pulse bg-rose-950/60'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <span>Command</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

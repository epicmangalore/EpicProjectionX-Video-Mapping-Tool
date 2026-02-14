"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  timestamp: string;
  type: "log" | "warn" | "error";
  message: string;
}

export default function DiagnosticsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [containerReady, setContainerReady] = useState(false);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: "log" | "warn" | "error", ...args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, { timestamp, type, message }]);
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog("log", ...args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog("warn", ...args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog("error", ...args);
    };

    // Check for video container
    const checkContainer = () => {
      const container = (window as any).globalVideoContainer;
      const ready = (window as any).globalVideoContainerReady;
      setContainerReady(!!ready && !!container);

      if (ready && container) {
        console.log("✓ Global video container detected:", {
          element: container.tagName,
          id: container.id,
          childCount: container.children.length
        });
      }
    };

    // Listen for container ready event
    window.addEventListener("video-container-ready", checkContainer);

    // Check immediately and periodically
    checkContainer();
    const interval = setInterval(checkContainer, 1000);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener("video-container-ready", checkContainer);
      clearInterval(interval);
    };
  }, []);

  const videoLogs = logs.filter(log =>
    log.message.toLowerCase().includes('video') ||
    log.message.toLowerCase().includes('container') ||
    log.message.toLowerCase().includes('texture')
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Video Playback Diagnostics</h1>

        <div className="mb-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${containerReady ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Global Video Container: {containerReady ? 'Ready' : 'Not Ready'}</span>
            </div>
            <div className="text-sm text-zinc-400 mt-2">
              <p>Container Element: {typeof window !== 'undefined' && (window as any).globalVideoContainer ? 'Found' : 'Not Found'}</p>
              <p>Container Ready Flag: {typeof window !== 'undefined' && (window as any).globalVideoContainerReady ? 'True' : 'False'}</p>
              {typeof window !== 'undefined' && (window as any).globalVideoContainer && (
                <p>Video Elements in Container: {(window as any).globalVideoContainer.children.length}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Video-Related Logs ({videoLogs.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {videoLogs.length === 0 ? (
              <p className="text-zinc-500">No video-related logs yet. Try loading a video in the main app.</p>
            ) : (
              videoLogs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-sm font-mono ${log.type === 'error' ? 'bg-red-900/20 text-red-400' :
                      log.type === 'warn' ? 'bg-yellow-900/20 text-yellow-400' :
                        'bg-zinc-800 text-zinc-300'
                    }`}
                >
                  <span className="text-zinc-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">All Console Logs ({logs.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-zinc-500">No logs yet.</p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-sm font-mono ${log.type === 'error' ? 'bg-red-900/20 text-red-400' :
                      log.type === 'warn' ? 'bg-yellow-900/20 text-yellow-400' :
                        'bg-zinc-800 text-zinc-300'
                    }`}
                >
                  <span className="text-zinc-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-300">
            <li>Keep this page open in one tab</li>
            <li>Open the main app (localhost:3000) in another tab</li>
            <li>Load a video file in the main app</li>
            <li>Come back to this page to see the captured logs</li>
            <li>Look for the specific log messages mentioned in the task</li>
          </ol>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => setLogs([])}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
          >
            Clear Logs
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Go to Main App
          </a>
        </div>
      </div>
    </div>
  );
}

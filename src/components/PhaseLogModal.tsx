import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Check, 
  FileSpreadsheet, 
  FileText,
  Clock, 
  User, 
  Layers, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';
import { PhaseCallLog, STATUS_COLORS, Status } from '../types';

interface PhaseLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PhaseCallLog[];
  onRefresh?: () => void;
}

export const PhaseLogModal: React.FC<PhaseLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onRefresh
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (!isOpen) return null;

  // Format timestamp helper
  const formatTime = (isoString: string | number) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return String(isoString);
    }
  };

  const formatReportTime = (isoString: string | number) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch {
      return String(isoString);
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesText = filterText === '' || 
        log.communityName.toLowerCase().includes(filterText.toLowerCase()) ||
        log.calledBy.toLowerCase().includes(filterText.toLowerCase()) ||
        log.status.toLowerCase().includes(filterText.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

      return matchesText && matchesStatus;
    });
  }, [logs, filterText, filterStatus]);

  // Statistics for the day
  const stats = useMemo(() => {
    const red = logs.filter(l => l.status === 'Red - Critical').length;
    const yellow = logs.filter(l => l.status === 'Yellow - High Volume').length;
    const green = logs.filter(l => l.status === 'Green - Normal').length;
    return { total: logs.length, red, yellow, green };
  }, [logs]);

  // Copy as a formatted text summary for Word documents and end-of-day reports
  const copyAsReportSummary = async () => {
    if (logs.length === 0) return;

    const todayStr = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const title = `Summary of phases called on ${todayStr}`;

    // Chronological order from morning to evening
    const sortedLogs = [...logs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const lines = sortedLogs.map(l => {
      const phaseColor = l.status.split(' - ')[0] || l.status;
      const phaseName = `${phaseColor} Phase`;
      const time = formatReportTime(l.calledAt || l.timestamp);
      return `${phaseName} called for ${l.communityName} by ${l.calledBy} at ${time}`;
    });

    const plainText = `${title}\n\n${lines.join('\n')}`;

    // Clean rich text for Word document pasting
    const htmlContent = `
<div style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5;">
  <p style="margin: 0 0 12pt 0; font-size: 12pt; font-weight: bold; color: #002244;">${title}</p>
  ${lines.map(line => `<p style="margin: 0 0 4pt 0; line-height: 1.4;">${line}</p>`).join('')}
</div>`.trim();

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch {
      await navigator.clipboard.writeText(plainText);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-[#002244] text-white px-5 py-4 flex items-center justify-between flex-shrink-0 border-b border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-blue-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">Daily Phase Call Log</h2>
                <span className="text-[10px] uppercase font-extrabold bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Today Only
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Chronological record of operational phases called today • Automatically clears at midnight
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats & Actions Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
            <span className="text-slate-500 font-medium">Today's Activity:</span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md font-bold text-slate-700 shadow-xs">
              {stats.total} {stats.total === 1 ? 'Phase Call' : 'Phase Calls'}
            </span>
            {stats.red > 0 && (
              <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md font-bold">
                {stats.red} Critical
              </span>
            )}
            {stats.yellow > 0 && (
              <span className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md font-bold">
                {stats.yellow} High Volume
              </span>
            )}
            {stats.green > 0 && (
              <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-bold">
                {stats.green} Normal
              </span>
            )}
          </div>

          {/* Copy Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyAsReportSummary}
              disabled={logs.length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs border ${
                copied
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-[#002244] hover:bg-[#001730] text-white border-[#002244] disabled:opacity-50 disabled:pointer-events-none'
              }`}
              title="Copies formatted single lines titled 'Summary of phases called on (Date)' ready to paste into Word"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <FileText className="w-3.5 h-3.5 text-blue-200" />}
              {copied ? 'Report Copied!' : 'Copy End-of-Day Report'}
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search community or color..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#002244]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Filter:</span>
            {['all', 'Red - Critical', 'Yellow - High Volume', 'Green - Normal'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setFilterStatus(statusKey)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  filterStatus === statusKey
                    ? 'bg-[#002244] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusKey === 'all' ? 'All' : statusKey.split(' - ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table Content */}
        <div className="flex-1 overflow-y-auto min-h-[250px] p-0">
          {logs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <Clock className="w-10 h-10 stroke-[1.5] mb-2 text-slate-300" />
              <p className="font-bold text-slate-600">No Phase Calls Logged Today</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Phases are logged here once you click &quot;Send Phases&quot; in the Review &amp; Distribute window to confirm and communicate phase calls.
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <p className="font-semibold text-slate-600">No matching logs found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing your search or phase filter.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-600 font-bold border-b border-slate-200 shadow-xs z-10 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Time Called</th>
                  <th className="py-2.5 px-4">Community</th>
                  <th className="py-2.5 px-4">Phase / Color</th>
                  <th className="py-2.5 px-4">Called By</th>
                  <th className="py-2.5 px-4 text-right">Status Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLogs.map((log, index) => {
                  const isRed = log.status === 'Red - Critical';
                  const isYellow = log.status === 'Yellow - High Volume';

                  return (
                    <tr 
                      key={log.id || index}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTime(log.calledAt || log.timestamp)}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.communityName}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            isRed 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : isYellow 
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: STATUS_COLORS[log.status as Status] || '#008A00' }}
                          />
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.calledBy || 'Coordinator'}</span>
                          {log.calledById && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({log.calledById})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-400 text-[11px]">
                        {isRed ? '🔴 RED' : isYellow ? '🟡 YLW' : '🟢 GRN'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Logs are retained for the current operating day only and automatically reset at midnight.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  RotateCw, 
  Trash2, 
  Search, 
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Upload,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { API_URL } from '../services/api';

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  details: any;
}

export default function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [level, setLevel] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        level,
        category,
        search
      });
      const res = await fetch(`${API_URL}/api/logs?${params.toString()}`);
      if (!res.ok) throw new Error('Impossible de récupérer les logs système.');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir vider tous les logs système ? Cette action est irréversible.')) {
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}/api/logs/clear`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Échec du nettoyage des logs.');
      setSuccess('Tous les logs système ont été vidés avec succès.');
      setLogs([]);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du nettoyage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [level, category, search]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, level, category, search]);

  const toggleExpand = (id: number) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const getLevelBadgeColor = (lvl: string) => {
    switch (lvl) {
      case 'ERROR':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'WARN':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'INFO':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'DATABASE':
        return <Database className="h-3 w-3" />;
      case 'UPLOAD':
        return <Upload className="h-3 w-3" />;
      case 'RATE_UPDATE':
        return <Settings className="h-3 w-3" />;
      case 'SIMULATION':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <TerminalIcon className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      key="logs_tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TerminalIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Audit & Logs Système
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Surveillez en temps réel les accès API, les modifications de tarifs de référence, les imports Excel et l'activité de la base de données.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 select-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors">
            <input 
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Rafraîchissement auto (5s)</span>
          </label>

          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchissement
          </button>

          <button
            onClick={clearLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg shadow-2xs hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Vider la console
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Level Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Niveau :</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-bold border-none focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="ALL">Tous</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Catégorie :</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-bold border-none focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="ALL">Toutes</option>
              <option value="DATABASE">DATABASE</option>
              <option value="UPLOAD">UPLOAD</option>
              <option value="RATE_UPDATE">RATE_UPDATE</option>
              <option value="SIMULATION">SIMULATION</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans les messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Terminal Display */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 ml-2">hotelmanager-api-console ~ logs ({logs.length})</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            <span>Actualisé à {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="max-h-[500px] overflow-y-auto p-4 font-mono text-xs divide-y divide-slate-900">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic">
              Aucun log système ne correspond à ces critères.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasDetails = log.details && Object.keys(log.details).length > 0;
              
              return (
                <div key={log.id} className="py-2.5 hover:bg-slate-900/50 transition-colors">
                  <div 
                    onClick={() => hasDetails && toggleExpand(log.id)}
                    className={`flex items-start gap-3 cursor-pointer ${hasDetails ? 'hover:text-slate-200' : 'cursor-default'}`}
                  >
                    {/* Expand indicator */}
                    <span className="text-slate-600 mt-0.5 shrink-0">
                      {hasDetails ? (
                        isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <span className="w-3.5 h-3.5 block" />
                      )}
                    </span>

                    {/* Timestamp */}
                    <span className="text-slate-500 shrink-0 select-none">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </span>

                    {/* Level */}
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border shrink-0 leading-none ${getLevelBadgeColor(log.level)}`}>
                      {log.level}
                    </span>

                    {/* Category */}
                    <span className="flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 text-[10px] rounded shrink-0 leading-none">
                      {getCategoryIcon(log.category)}
                      {log.category}
                    </span>

                    {/* Message */}
                    <span className="text-slate-300 break-words flex-1">
                      {log.message}
                    </span>
                  </div>

                  {/* Expanded JSON details */}
                  {isExpanded && hasDetails && (
                    <div className="ml-7 mt-2 p-3 bg-slate-900 rounded-lg border border-slate-850 overflow-x-auto">
                      <pre className="text-[10px] text-cyan-400 font-mono">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}

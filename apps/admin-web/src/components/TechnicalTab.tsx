import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Search, 
  Cpu, 
  Layers, 
  Terminal, 
  Flame, 
  Code, 
  ShieldAlert 
} from 'lucide-react';
import { dbModelsData, strengthsData, weaknessesData } from '../data';

export default function TechnicalTab() {
  const [selectedModel, setSelectedModel] = useState<typeof dbModelsData[0] | null>(dbModelsData[0]);
  const [searchModel, setSearchModel] = useState('');

  // Dev filter models
  const filteredModels = dbModelsData.filter(m => 
    m.name.toLowerCase().includes(searchModel.toLowerCase()) ||
    m.purpose.toLowerCase().includes(searchModel.toLowerCase())
  );

  return (
    <motion.div
      key="technical_tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      
      {/* ORIGINAL DATABASE MODEL INSPECTION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Models Catalog list */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Database className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Indexation des Modèles de Tables (SQLModel)
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {dbModelsData.length} modèles relationnels et structures complexes de données hôtelières
              </p>
            </div>
            
            {/* Search Index field */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Rechercher une table..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all w-full sm:w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Modèle / Table</th>
                  <th className="py-2.5 px-3 text-center">Champs</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredModels.map((m) => (
                  <tr 
                    key={m.name} 
                    onClick={() => setSelectedModel(m)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedModel?.name === m.name ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{m.name}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      {m.fieldsCount}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${
                        m.importance === 'Core' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : m.importance === 'Configuration' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : m.importance === 'Log'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {m.importance}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedModel(m); }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline font-sans cursor-pointer"
                      >
                        Examiner
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Model Focus Info Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Inspection détaillée de table</h3>
            
            {selectedModel ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-lg font-bold text-slate-800 font-mono">{selectedModel.name}</h4>
                  <span className="text-xs text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">SQLModel</span>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3.5 leading-relaxed">
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1 text-[11px]">Réseau d'importance :</span>
                    <div className="flex gap-1">
                      <span className="inline-flex rounded bg-slate-200/80 text-slate-700 px-2 py-0.5 text-[11px] font-mono border border-slate-300/30 font-bold">
                        {selectedModel.importance} DB Schema
                      </span>
                      <span className="inline-flex rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-mono border border-blue-100 font-bold">
                        {selectedModel.fieldsCount} Colonnes définies
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-550 font-semibold block mb-1 text-[11px]">Objectif métier :</span>
                    <p className="text-slate-700 font-sans leading-relaxed">{selectedModel.purpose}</p>
                  </div>

                  <div className="border-t border-slate-200/80 pt-3">
                    <span className="text-slate-500 font-semibold block mb-2 text-[11px]">Index SQLAlchemy Recommandé :</span>
                    <pre className="p-2.5 rounded bg-slate-900 text-cyan-400 overflow-x-auto font-mono text-[10.5px] border border-slate-950">
{`__table_args__ = (
    Index(
        "ix_${selectedModel.name.toLowerCase()}_hotel",
        "hotel_id",
        unique=False
    ),
)`}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Prêt à l'analyse.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ORIGINAL STRENGTHS & WEAKNESSES CODE AUDIT SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Strengths */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
            <h2 className="text-base font-bold text-slate-800">Forces Technologiques Diagnostiquées ({strengthsData.length})</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {strengthsData.map((s, idx) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-all duration-200 relative overflow-hidden group shadow-xs">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex items-start gap-4">
                  <span className="inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-600 border border-emerald-200">
                    {idx === 0 ? <Cpu className="h-4.5 w-4.5" /> : idx === 1 ? <Layers className="h-4.5 w-4.5" /> : <Terminal className="h-4.5 w-4.5" />}
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider font-mono">{s.category}</span>
                    <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                      {s.details.map((bullet, bidx) => (
                        <li key={bidx} className="text-slate-700 text-[11.5px] flex items-start gap-1.5 leading-normal">
                          <span className="text-emerald-500 font-bold block mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-red-200">
            <div className="w-1.5 h-5 bg-red-400 rounded-full"></div>
            <h2 className="text-base font-bold text-slate-800">Risques de Robustesse à corriger ({weaknessesData.length})</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {weaknessesData.map((w, idx) => (
              <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-red-300 transition-all duration-200 relative overflow-hidden group shadow-xs">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold font-mono border ${
                    w.impact === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    Impact {w.impact}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <span className="inline-flex rounded-lg bg-rose-50 p-2 text-rose-600 border border-rose-200">
                    {idx === 0 ? <Flame className="h-4.5 w-4.5" /> : idx === 1 ? <Code className="h-4.5 w-4.5" /> : <ShieldAlert className="h-4.5 w-4.5" />}
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider font-mono">{w.category}</span>
                    <h3 className="text-sm font-bold text-slate-900 pr-20">{w.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{w.description}</p>
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                      {w.details.map((bullet, bidx) => (
                        <li key={bidx} className="text-slate-700 text-[11.5px] flex items-start gap-1.5 leading-normal">
                          <span className="text-rose-500 font-bold block mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </motion.div>
  );
}

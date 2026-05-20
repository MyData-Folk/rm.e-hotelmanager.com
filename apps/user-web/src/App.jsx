import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  Hotel,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  Save,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  Sliders,
  Calendar,
  AlertTriangle
} from 'lucide-react';

const getApiUrl = () => {
  const hostname = window.location.hostname;
  if (
    hostname.includes('admin-rm.e-hotelmanager.com') ||
    hostname.includes('rm-front.e-hotelmanager.com') ||
    hostname.includes('back-rm.e-hotelmanager.com') ||
    hostname.includes('api-rm.e-hotelmanager.com')
  ) {
    return 'https://back-rm.e-hotelmanager.com';
  }
  if (
    hostname.includes('admin.hotelmanager.fr') ||
    hostname.includes('hotel.hotelmanager.fr') ||
    hostname.includes('api.hotelmanager.fr')
  ) {
    return 'https://api.hotelmanager.fr';
  }
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== 'undefined') return envUrl;
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const DEFAULT_FILTERS = {
  hotelId: 'folkestone',
  start: '2026-05-13',
  end: '2026-05-14',
  roomName: 'Double Classique',
  planCode: 'OTA-RO-NANR',
  partnerName: 'Booking.com (6562)',
  sourceMode: 'hybrid',
  promoDiscount: 0,
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Erreur API ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.detail || payload.error || message;
    } catch {
      // Keep the generic message.
    }
    throw new Error(message);
  }

  return response.json();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, tone }) {
  const toneClasses = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-850',
    blue: 'border-blue-200 bg-blue-50 text-blue-850',
    amber: 'border-amber-200 bg-amber-50 text-amber-850',
    slate: 'border-slate-250 bg-slate-50 text-slate-850',
  }[tone] || 'border-slate-200 bg-white text-slate-800';

  return (
    <div className={`p-5 rounded-2xl border shadow-2xs ${toneClasses} transition-all duration-200`}>
      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <strong className="text-xl sm:text-2xl font-bold font-mono tracking-tight">{value}</strong>
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    available: { label: 'Disponible', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sold_out: { label: 'Complet', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    not_available_for_sale: { label: 'Fermé', classes: 'bg-rose-50 text-rose-700 border-rose-250' },
    unknown: { label: 'Inconnu', classes: 'bg-slate-55 text-slate-700 border-slate-200' },
    out_of_range: { label: 'Hors plage', classes: 'bg-slate-55 text-slate-500 border-slate-200' },
  }[status] || { label: status || 'Inconnu', classes: 'bg-slate-55 text-slate-700 border-slate-200' };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${config.classes}`}>
      {config.label}
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [health, setHealth] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [partners, setPartners] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [rates, setRates] = useState([]);
  const [grid, setGrid] = useState(null);
  const [simulation, setSimulation] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Local changes tracking
  const [modifiedRates, setModifiedRates] = useState({});
  const [modifiedAvailability, setModifiedAvailability] = useState({});
  const [uploadingRates, setUploadingRates] = useState(false);
  const [fileNameUploaded, setFileNameUploaded] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [customDatesInput, setCustomDatesInput] = useState('');

  const partner = useMemo(
    () => partners.find((item) => item.name === filters.partnerName),
    [partners, filters.partnerName],
  );

  const availableRooms = useMemo(
    () => unique([
      ...availability.map((item) => item.room_name),
      ...rates.map((item) => item.room_name),
      filters.roomName,
    ]),
    [availability, rates, filters.roomName],
  );

  const availablePlans = useMemo(
    () => unique([
      ...(partner?.plan_codes || []),
      ...rates.map((item) => item.plan_code),
      filters.planCode,
    ]),
    [partner, rates, filters.planCode],
  );

  const dashboardSummary = useMemo(() => {
    const availableCells = availability.filter((item) => item.status === 'available');
    const totalStock = availableCells.reduce(
      (sum, item) => sum + (item.available_quantity || 0),
      0,
    );
    const prices = rates.map((item) => item.price).filter((value) => value !== null);
    const averageRate = prices.length
      ? prices.reduce((sum, value) => sum + value, 0) / prices.length
      : null;

    return {
      rooms: unique(availability.map((item) => item.room_name)).length,
      availableCells: availableCells.length,
      totalStock,
      averageRate,
    };
  }, [availability, rates]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  // Local updates triggers
  function updateModifiedRate(date, roomName, planCode, value) {
    const key = `${date}|${roomName}|${planCode}`;
    setModifiedRates(prev => {
      const next = { ...prev, [key]: value };
      if (value === '') delete next[key];
      return next;
    });
  }

  function updateModifiedAvailability(date, roomName, value) {
    const key = `${date}|${roomName}`;
    setModifiedAvailability(prev => {
      const next = { ...prev, [key]: value };
      if (value === '') delete next[key];
      return next;
    });
  }

  // API fetches optimized
  async function refreshData(nextFilters = filters) {
    setLoading(true);
    setMessage('');
    setSuccessMessage('');
    try {
      const query = new URLSearchParams({
        hotel_id: nextFilters.hotelId,
        start: nextFilters.start,
        end: nextFilters.end,
      });
      const gridQuery = new URLSearchParams({
        hotel_id: nextFilters.hotelId,
        start: nextFilters.start,
        end: nextFilters.end,
        rooms: nextFilters.roomName,
        plans: nextFilters.planCode,
        source_mode: nextFilters.sourceMode,
      });

      const [availabilityPayload, ratesPayload, gridPayload] = await Promise.all([
        apiRequest(`/availability?${query.toString()}`),
        apiRequest(`/imported-rates?${query.toString()}`),
        apiRequest(`/rates/grid?${gridQuery.toString()}`),
      ]);

      setAvailability(availabilityPayload);
      setRates(ratesPayload);
      setGrid(gridPayload);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function runSimulation() {
    setLoading(true);
    setMessage('');
    setSuccessMessage('');
    try {
      const payload = await apiRequest('/simulate', {
        method: 'POST',
        body: JSON.stringify({
          hotel_id: filters.hotelId,
          room_name: filters.roomName,
          plan_code: filters.planCode,
          partner_name: filters.partnerName,
          source_mode: filters.sourceMode,
          start: filters.start,
          end: filters.end,
          promo_discount: Number(filters.promoDiscount || 0),
        }),
      });
      setSimulation(payload);
      setActiveTab('simulation');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRates() {
    setLoading(true);
    setMessage('');
    setSuccessMessage('');

    const updatesList = Object.keys(modifiedRates).map(key => {
      const [date, roomType, planCode] = key.split("|");
      return {
        date,
        roomType,
        planCode,
        price: parseFloat(modifiedRates[key])
      };
    }).filter(u => !isNaN(u.price));

    if (updatesList.length === 0) {
      setMessage("Aucun tarif valide à enregistrer.");
      setLoading(false);
      return;
    }

    try {
      await apiRequest(`/api/hotels/${filters.hotelId}/rates/update-reference`, {
        method: 'POST',
        body: JSON.stringify({
          planCode: filters.planCode,
          updates: updatesList
        })
      });
      setSuccessMessage("Tarifs enregistrés avec succès ! Le backend a recalculé automatiquement les plans dépendants.");
      setModifiedRates({});
      await refreshData();
    } catch (error) {
      setMessage(`Échec de l'enregistrement des tarifs : ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveAvailability() {
    setLoading(true);
    setMessage('');
    setSuccessMessage('');

    const updatesList = Object.keys(modifiedAvailability).map(key => {
      const [date, roomType] = key.split("|");
      return {
        date,
        roomType,
        planCode: "OTA-RO-FLEX",
        leftForSale: String(modifiedAvailability[key])
      };
    });

    if (updatesList.length === 0) {
      setMessage("Aucune disponibilité à enregistrer.");
      setLoading(false);
      return;
    }

    try {
      await apiRequest(`/api/hotels/${filters.hotelId}/rates/update-reference`, {
        method: 'POST',
        body: JSON.stringify({
          planCode: "OTA-RO-FLEX",
          updates: updatesList
        })
      });
      setSuccessMessage("Disponibilités enregistrées avec succès !");
      setModifiedAvailability({});
      await refreshData();
    } catch (error) {
      setMessage(`Échec de l'enregistrement des disponibilités : ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSpreadsheetDropUpload = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBinaryFile(file);
    }
  };

  const handleSpreadsheetFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processBinaryFile(file);
    }
  };

  const processBinaryFile = (file) => {
    setFileNameUploaded(file.name);
    setUploadingRates(true);
    setMessage('');
    setSuccessMessage('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawArrayBuffer = evt.target?.result;
        const bytes = new Uint8Array(rawArrayBuffer);
        let binaryStr = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binaryStr += String.fromCharCode(bytes[i]);
        }
        const base64Content = window.btoa(binaryStr);
        const datesOverride = customDatesInput.split(",").map(d => d.trim()).filter(Boolean);

        const data = await apiRequest(`/api/hotels/${filters.hotelId}/upload-rates`, {
          method: 'POST',
          body: JSON.stringify({
            fileBase64: base64Content,
            fileName: file.name,
            datesInput: datesOverride.length > 0 ? datesOverride : undefined
          })
        });

        setSuccessMessage(data.message || "Fichier Excel importé et traité avec succès !");
        setCustomDatesInput('');
        refreshData();
      } catch (err) {
        setMessage(`Erreur lors de l'importation Excel : ${err.message}`);
      } finally {
        setUploadingRates(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Mount effect: load health & hotels list
  useEffect(() => {
    async function initMetadata() {
      try {
        const [healthPayload, hotelsPayload] = await Promise.all([
          apiRequest('/health'),
          apiRequest('/hotels')
        ]);
        setHealth(healthPayload);
        setHotels(hotelsPayload);
      } catch (err) {
        console.error("Initial load failed:", err);
      }
    }
    initMetadata();
  }, []);

  // Effect: When active hotel selection updates, fetch partners & refresh grid data
  useEffect(() => {
    if (!filters.hotelId) return;
    async function loadHotelDetails() {
      setLoading(true);
      try {
        const partnersPayload = await apiRequest(`/partners?hotel_id=${encodeURIComponent(filters.hotelId)}`);
        setPartners(partnersPayload);
        await refreshData(filters);
      } catch (err) {
        setMessage(`Échec de chargement des partenaires : ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    loadHotelDetails();
  }, [filters.hotelId]);

  const tabs = [
    { id: 'dashboard', icon: Activity, label: 'Tableau de bord', color: 'text-blue-500' },
    { id: 'simulation', icon: SlidersHorizontal, label: 'Simulation', color: 'text-purple-500' },
    { id: 'availability', icon: CalendarDays, label: 'Disponibilités', color: 'text-emerald-500' },
    { id: 'rates', icon: BarChart3, label: 'Grille tarifaire', color: 'text-amber-500' },
    { id: 'upload', icon: Upload, label: 'Importateur Excel', color: 'text-indigo-500' },
    { id: 'exports', icon: Download, label: 'Exports JSON', color: 'text-slate-500' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-50/35 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="mx-auto w-full max-w-7xl px-6 py-6 sm:py-7 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Title & Brand */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 border border-rose-200/60">
                  <Hotel className="h-3.5 w-3.5" />
                  MODE UTILISATEUR
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
                  v1.2.0 • Cockpit Client
                </span>
              </div>
              <h1 className="text-2.5xl font-bold tracking-tight text-slate-800">
                E-Hotelmanager — Cockpit de Rendement
              </h1>
              <p className="mt-1 text-slate-500 font-mono text-xs uppercase tracking-wider leading-none">
                TARIFS DE RÉFÉRENCE, DISPONIBILITÉS ET SIMULATEUR DE COMPARAISON NETTE
              </p>
            </div>

            {/* Hotel active select */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl self-start md:self-auto">
              <div className="space-y-0.5">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Établissement Actif</label>
                {hotels.length === 0 ? (
                  <span className="text-xs font-semibold text-slate-500">Chargement...</span>
                ) : (
                  <select 
                    value={filters.hotelId}
                    onChange={(e) => updateFilter('hotelId', e.target.value)}
                    className="font-bold text-sm text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                  >
                    {hotels.map((h) => (
                      <option key={h.hotel_id} value={h.hotel_id}>{h.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

          </div>

          {/* Alert messages */}
          <div className="mt-4">
            {message && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Erreur : </span>
                  {message}
                </div>
                <button onClick={() => setMessage('')} className="text-red-500 hover:text-red-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Succès : </span>
                  {successMessage}
                </div>
                <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* TABS NAV RAIL */}
          <div className="mt-6 flex flex-wrap gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 max-w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${tab.color}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* FILTER PANEL BAND */}
      <div className="mx-auto w-full max-w-7xl px-6 py-4 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Start Date */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Date Début</label>
              <input 
                type="date" 
                value={filters.start} 
                onChange={(e) => updateFilter('start', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Date Fin</label>
              <input 
                type="date" 
                value={filters.end} 
                onChange={(e) => updateFilter('end', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Room Name */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Chambre</label>
              <input 
                value={filters.roomName} 
                list="rooms"
                onChange={(e) => updateFilter('roomName', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white w-40"
              />
              <datalist id="rooms">
                {availableRooms.map((room) => <option key={room} value={room} />)}
              </datalist>
            </div>

            {/* Plan Code */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Plan</label>
              <input 
                value={filters.planCode} 
                list="plans"
                onChange={(e) => updateFilter('planCode', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white w-40"
              />
              <datalist id="plans">
                {availablePlans.map((plan) => <option key={plan} value={plan} />)}
              </datalist>
            </div>

            {/* Source Mode */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400">Source</label>
              <select 
                value={filters.sourceMode} 
                onChange={(e) => updateFilter('sourceMode', e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="hybrid">Hybride</option>
                <option value="calculated">Calculée</option>
                <option value="excel">Excel</option>
              </select>
            </div>

          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-550 mr-2">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              <span className="font-medium">{health?.status === 'ok' ? 'API active' : 'API hors ligne'}</span>
            </div>

            <button 
              onClick={() => refreshData()} 
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              Recharger
            </button>
          </div>
        </div>
      </div>

      {/* WORKSPACE & VIEW AREA */}
      <div className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
        <AnimatePresence mode="wait">
          
          {/* ==========================================
              TAB 1: DASHBOARD TABLEAU DE BORD
              ========================================== */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard_tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Stat label="Chambres suivies" value={dashboardSummary.rooms} tone="blue" />
                <Stat label="Cellules disponibles" value={dashboardSummary.availableCells} tone="green" />
                <Stat label="Stock total disponible" value={dashboardSummary.totalStock} tone="amber" />
                <Stat label="Prix moyen importé" value={formatMoney(dashboardSummary.averageRate)} tone="slate" />
              </div>

              {/* Grid split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Partners List */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Sliders className="h-4.5 w-4.5 text-blue-500" />
                    Partenaires OTA & Canaux
                  </h2>
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                    {partners.map((item) => {
                      const isSelected = item.name === filters.partnerName;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            updateFilter('partnerName', item.name);
                            if (item.plan_codes[0]) updateFilter('planCode', item.plan_codes[0]);
                          }}
                          className={`py-3 px-3 rounded-lg transition-colors cursor-pointer flex justify-between items-center ${
                            isSelected ? 'bg-blue-50/60 border-l-4 border-blue-500 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="text-xs text-slate-800 font-bold">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Commission : {item.commission}%</p>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md font-bold font-mono">
                            {item.plan_codes.length} plans
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compact availability list */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-emerald-500" />
                    Aperçu des Disponibilités de la Période
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Chambre</th>
                          <th className="py-2.5 px-3">Statut</th>
                          <th className="py-2.5 px-3 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {availability.slice(0, 10).map((item, idx) => (
                          <tr key={`${item.room_name}-${item.date}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{item.date}</td>
                            <td className="py-2.5 px-3 text-slate-800 font-semibold">{item.room_name}</td>
                            <td className="py-2.5 px-3"><StatusPill status={item.status} /></td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">{item.available_quantity ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================
              TAB 2: SIMULATION COCKPIT
              ========================================== */}
          {activeTab === 'simulation' && (
            <motion.div
              key="simulation_tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Simulateur de Rendement Net</h2>
                    <p className="text-xs text-slate-550">Simulez l'impact financier de vos commissions, remises promotionnelles et marges distributeurs.</p>
                  </div>
                  {simulation && (
                    <button 
                      onClick={() => downloadJson(`simulation-${filters.hotelId}-${filters.start}-${filters.end}.json`, simulation)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-purple-650" />
                      Exporter JSON
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  {/* Select Partner */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400">Partenaire Cible</label>
                    <select
                      value={filters.partnerName}
                      onChange={(e) => updateFilter('partnerName', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer w-64"
                    >
                      {partners.map((p) => (
                        <option key={p.id} value={p.name}>{p.name} ({p.commission}% commission)</option>
                      ))}
                    </select>
                  </div>

                  {/* Promo Discount Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400">Remise Promo % (Forcée)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={filters.promoDiscount}
                      onChange={(e) => updateFilter('promoDiscount', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white w-32"
                    />
                  </div>

                  <button 
                    onClick={runSimulation} 
                    disabled={loading}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Calculer la Simulation
                  </button>
                </div>
              </div>

              {simulation ? (
                <div className="space-y-6">
                  {/* Result Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Stat label="Total Chiffre d'Affaires Brut" value={formatMoney(simulation.summary.subtotal_brut)} tone="slate" />
                    <Stat label="Remises Totales Accordées" value={formatMoney(simulation.summary.total_discount || (simulation.summary.total_partner_discount + simulation.summary.total_promo_discount))} tone="amber" />
                    <Stat label="Commissions Estimées" value={formatMoney(simulation.summary.total_commission)} tone="blue" />
                    <Stat label="Revenu Net Distribué" value={formatMoney(simulation.summary.total_net)} tone="green" />
                  </div>

                  {/* Day by Day Panel */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Calcul Détaillé Jour par Jour</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Plan Tarifaire</th>
                            <th className="py-2.5 px-3 text-center">Stock</th>
                            <th className="py-2.5 px-3 text-right">Tarif Brut</th>
                            <th className="py-2.5 px-3 text-right">Net Restant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {simulation.results.map((item, idx) => (
                            <tr key={`${item.date}-${idx}`} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-bold text-slate-700 font-sans">{item.date_display}</td>
                              <td className="py-2.5 px-3"><span className="bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold text-[10px]">{item.plan_code}</span></td>
                              <td className="py-2.5 px-3 text-center">{item.stock ?? '-'}</td>
                              <td className="py-2.5 px-3 text-right text-slate-650">{formatMoney(item.gross_price)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatMoney(item.net_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-450 italic text-sm">
                  Sélectionnez un canal et lancez une simulation pour afficher la grille de rendement net par nuit.
                </div>
              )}
            </motion.div>
          )}

          {/* ==========================================
              TAB 3: AVAILABILITY DISPONIBILITÉS
              ========================================== */}
          {activeTab === 'availability' && (
            <motion.div
              key="availability_tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Gestion des Disponibilités (Inventaires)</h2>
                    <p className="text-xs text-slate-550">Ajustez les stocks en temps réel. Modifiez la colonne Stock puis sauvegardez.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => downloadJson(`availability-${filters.hotelId}-${filters.start}-${filters.end}.json`, availability)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer mr-2"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-650" />
                      Exporter JSON
                    </button>

                    {Object.keys(modifiedAvailability).length > 0 && (
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-1.5 px-3">
                        <span className="text-[11px] font-bold text-emerald-850">{Object.keys(modifiedAvailability).length} changement(s)</span>
                        <button 
                          onClick={() => setModifiedAvailability({})} 
                          disabled={loading}
                          className="p-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Annuler"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={saveAvailability} 
                          disabled={loading}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Enregistrer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Chambre</th>
                        <th className="py-2.5 px-3">Statut Actuel</th>
                        <th className="py-2.5 px-3 w-48">Stock disponible (Éditable)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {availability.map((item, idx) => {
                        const key = `${item.date}|${item.room_name}`;
                        const isDirty = modifiedAvailability[key] !== undefined;
                        const val = isDirty ? modifiedAvailability[key] : (item.available_quantity ?? '');
                        return (
                          <tr key={`${key}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-mono font-semibold text-slate-655">{item.date}</td>
                            <td className="py-3 px-3 text-slate-800 font-semibold">{item.room_name}</td>
                            <td className="py-3 px-3"><StatusPill status={item.status} /></td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={val}
                                placeholder="ex: 5 ou STOP"
                                disabled={loading}
                                onChange={(e) => updateModifiedAvailability(item.date, item.room_name, e.target.value)}
                                className={`w-32 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs text-slate-750 font-bold focus:outline-none focus:bg-white focus:border-blue-500 font-mono transition-all ${
                                  isDirty ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================
              TAB 4: RATES GRILLE TARIFAIRE
              ========================================== */}
          {activeTab === 'rates' && (
            <motion.div
              key="rates_tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Grille des Tarifs de Référence</h2>
                    <p className="text-xs text-slate-550">Modifiez le prix du plan de référence. Les formules en cascade recalculeront automatiquement les autres tarifs liés.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => downloadJson(`rates-${filters.hotelId}-${filters.start}-${filters.end}.json`, grid || {})}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer mr-2"
                    >
                      <Download className="h-3.5 w-3.5 text-amber-650" />
                      Exporter JSON
                    </button>

                    {Object.keys(modifiedRates).length > 0 && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-1.5 px-3">
                        <span className="text-[11px] font-bold text-amber-850">{Object.keys(modifiedRates).length} tarif(s)</span>
                        <button 
                          onClick={() => setModifiedRates({})} 
                          disabled={loading}
                          className="p-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Annuler"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={saveRates} 
                          disabled={loading}
                          className="flex items-center gap-1 px-2.5 py-1 bg-amber-650 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Enregistrer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Chambre</th>
                        <th className="py-2.5 px-3">Plan Tarifaire</th>
                        <th className="py-2.5 px-3">Source Utilisée</th>
                        <th className="py-2.5 px-3 w-48">Prix (€) (Éditable)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {(grid?.items || []).map((item, idx) => {
                        const key = `${item.date}|${item.room_name}|${item.plan_code}`;
                        const isDirty = modifiedRates[key] !== undefined;
                        const val = isDirty ? modifiedRates[key] : (item.price ?? '');
                        return (
                          <tr key={`${key}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-mono font-semibold text-slate-655">{item.date}</td>
                            <td className="py-3 px-3 text-slate-800 font-semibold">{item.room_name}</td>
                            <td className="py-3 px-3"><span className="inline-flex rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{item.plan_code}</span></td>
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{item.source_used || '-'}</td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="0.01"
                                value={val}
                                placeholder="ex: 150.00"
                                disabled={loading}
                                onChange={(e) => updateModifiedRate(item.date, item.room_name, item.plan_code, e.target.value)}
                                className={`w-32 bg-slate-50 border rounded-lg px-2.5 py-1.5 text-xs text-slate-750 font-bold focus:outline-none focus:bg-white focus:border-blue-500 font-mono transition-all ${
                                  isDirty ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200'
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==========================================
              TAB 5: EXCEL IMPORT LOADER
              ========================================== */}
          {activeTab === 'upload' && (
            <motion.div
              key="upload_tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Mise à jour en Masse par Tableur Excel</h2>
                  <p className="text-xs text-slate-550">Importez des tarifs de référence et disponibilités directement à partir de votre feuille Excel.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Form fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-650 uppercase">Dates cibles forcées (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="ex: 13/05/2026, 14/05/2026"
                        value={customDatesInput}
                        onChange={(e) => setCustomDatesInput(e.target.value)}
                        disabled={uploadingRates}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Si votre tableur n'indique pas explicitement des colonnes de dates, l'importateur attribuera ces dates chronologiques de gauche à droite.
                      </p>
                    </div>
                  </div>

                  {/* Drag-n-drop zone */}
                  <div
                    onDragEnter={() => setDragActive(true)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleSpreadsheetDropUpload}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-60 ${
                      dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/60'
                    }`}
                  >
                    {uploadingRates ? (
                      <div className="space-y-3 flex flex-col items-center">
                        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
                        <h3 className="text-xs font-bold text-slate-800">Traitement en cours...</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Validation du fichier Excel et synchronisation DB.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 flex flex-col items-center">
                        <FileSpreadsheet className="h-12 w-12 text-emerald-500" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Glissez-déposez votre tableur ici</h3>
                          <p className="text-xs text-slate-400 mt-1">Formats autorisés : .xlsx, .xls ou .csv</p>
                        </div>
                        
                        <input
                          type="file"
                          id="excel-upload-picker"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleSpreadsheetFileSelect}
                          className="hidden"
                        />
                        <label 
                          htmlFor="excel-upload-picker" 
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer transition-all"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Sélectionner un fichier
                        </label>
                      </div>
                    )}
                  </div>

                </div>

                {fileNameUploaded && !uploadingRates && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Dernier tableur appliqué : <strong>{fileNameUploaded}</strong></span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ==========================================
              TAB 6: CONSOLIDATED EXPORTS
              ========================================== */}
          {activeTab === 'exports' && (
            <motion.div
              key="exports_tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Exportation Globale de Données (JSON)</h2>
                  <p className="text-xs text-slate-550">Téléchargez des instantanés complets de votre cockpit sous format brut JSON pour vos outils d'analyse externes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Export card 1 */}
                  <div className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-400 transition-colors shadow-2xs bg-slate-50/40 flex flex-col justify-between h-44">
                    <div>
                      <span className="inline-flex rounded-lg bg-emerald-50 p-2 text-emerald-600 mb-3 border border-emerald-100">
                        <CalendarDays className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Stocks & Allotements</h3>
                      <p className="text-xs text-slate-600 font-semibold mt-1">Disponibilités de la plage active</p>
                    </div>
                    <button 
                      onClick={() => downloadJson(`availability-${filters.hotelId}-${filters.start}-${filters.end}.json`, availability)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exporter Disponibilités
                    </button>
                  </div>

                  {/* Export card 2 */}
                  <div className="border border-slate-200 rounded-2xl p-5 hover:border-amber-400 transition-colors shadow-2xs bg-slate-50/40 flex flex-col justify-between h-44">
                    <div>
                      <span className="inline-flex rounded-lg bg-amber-50 p-2 text-amber-600 mb-3 border border-amber-100">
                        <BarChart3 className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Grille des Prix</h3>
                      <p className="text-xs text-slate-600 font-semibold mt-1">Tous les plans et tarifs calculés</p>
                    </div>
                    <button 
                      onClick={() => downloadJson(`rates-${filters.hotelId}-${filters.start}-${filters.end}.json`, grid || {})}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-650 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exporter Grille
                    </button>
                  </div>

                  {/* Export card 3 */}
                  <div className="border border-slate-200 rounded-2xl p-5 hover:border-purple-400 transition-colors shadow-2xs bg-slate-50/40 flex flex-col justify-between h-44">
                    <div>
                      <span className="inline-flex rounded-lg bg-purple-50 p-2 text-purple-650 mb-3 border border-purple-100">
                        <SlidersHorizontal className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulations de Marges</h3>
                      <p className="text-xs text-slate-600 font-semibold mt-1">Dernier calcul de rendement net</p>
                    </div>
                    <button 
                      onClick={() => downloadJson(`simulation-${filters.hotelId}-${filters.start}-${filters.end}.json`, simulation || {})}
                      disabled={!simulation}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-450 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Exporter Simulation
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}

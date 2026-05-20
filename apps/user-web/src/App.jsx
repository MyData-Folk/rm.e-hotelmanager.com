import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
  AlertCircle
} from 'lucide-react';
import './style.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  return (
    <div className={`stat ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }) {
  const label = {
    available: 'Disponible',
    sold_out: 'Complet',
    not_available_for_sale: 'Fermé',
    unknown: 'Inconnu',
    out_of_range: 'Hors plage',
  }[status] || status || 'Inconnu';

  return <span className={`pill ${status || 'unknown'}`}>{label}</span>;
}

function App() {
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

  // New write capability states
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

  // Handle local edits tracking
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

      const [healthPayload, hotelsPayload, partnersPayload, availabilityPayload, ratesPayload, gridPayload] = await Promise.all([
        apiRequest('/health'),
        apiRequest('/hotels'),
        apiRequest(`/partners?hotel_id=${encodeURIComponent(nextFilters.hotelId)}`),
        apiRequest(`/availability?${query.toString()}`),
        apiRequest(`/imported-rates?${query.toString()}`),
        apiRequest(`/rates/grid?${gridQuery.toString()}`),
      ]);

      setHealth(healthPayload);
      setHotels(hotelsPayload);
      setPartners(partnersPayload);
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

  // Save modified rates to DB
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
      const data = await apiRequest(`/api/hotels/${filters.hotelId}/rates/update-reference`, {
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

  // Save modified availability to DB
  async function saveAvailability() {
    setLoading(true);
    setMessage('');
    setSuccessMessage('');

    const updatesList = Object.keys(modifiedAvailability).map(key => {
      const [date, roomType] = key.split("|");
      return {
        date,
        roomType,
        planCode: "OTA-RO-FLEX", // Reference plan used for inventories
        leftForSale: String(modifiedAvailability[key])
      };
    });

    if (updatesList.length === 0) {
      setMessage("Aucune disponibilité à enregistrer.");
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest(`/api/hotels/${filters.hotelId}/rates/update-reference`, {
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

  // Process Excel binary upload
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

  useEffect(() => {
    refreshData(DEFAULT_FILTERS);
  }, []);

  const tabs = [
    ['dashboard', Activity, 'Dashboard'],
    ['simulation', SlidersHorizontal, 'Simulation'],
    ['availability', CalendarDays, 'Disponibilités'],
    ['rates', BarChart3, 'Grille tarifaire'],
    ['upload', Upload, 'Importateur Excel'],
    ['exports', Download, 'Exports'],
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Hotel size={22} /></div>
          <div>
            <strong>RM e-HotelManager</strong>
            <span>Interface hôtelière</span>
          </div>
        </div>

        <nav className="nav-tabs">
          {tabs.map(([id, Icon, label]) => (
            <button
              key={id}
              className={activeTab === id ? 'active' : ''}
              onClick={() => setActiveTab(id)}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="api-status">
          <span className={health?.status === 'ok' ? 'dot ok' : 'dot'} />
          <span>{health?.status === 'ok' ? 'API connectée' : 'API en attente'}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Gestion de rendement hôtel</h1>
            <p>Ajustez les tarifs de référence, pilotez les stocks et simulez les gains nets de votre établissement.</p>
          </div>
          <button className="icon-button" onClick={() => refreshData()} disabled={loading} title="Rafraîchir">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <section className="filters-band">
          <label>
            Hôtel Actif
            <input
              value={filters.hotelId}
              list="hotels"
              onChange={(event) => updateFilter('hotelId', event.target.value)}
            />
          </label>
          <datalist id="hotels">
            {hotels.map((hotel) => (
              <option key={hotel.hotel_id} value={hotel.hotel_id}>{hotel.name}</option>
            ))}
          </datalist>

          <label>
            Début
            <input type="date" value={filters.start} onChange={(event) => updateFilter('start', event.target.value)} />
          </label>
          <label>
            Fin
            <input type="date" value={filters.end} onChange={(event) => updateFilter('end', event.target.value)} />
          </label>
          <label>
            Chambre
            <input
              value={filters.roomName}
              list="rooms"
              onChange={(event) => updateFilter('roomName', event.target.value)}
            />
          </label>
          <datalist id="rooms">
            {availableRooms.map((room) => <option key={room} value={room} />)}
          </datalist>
          <label>
            Plan
            <input
              value={filters.planCode}
              list="plans"
              onChange={(event) => updateFilter('planCode', event.target.value)}
            />
          </label>
          <datalist id="plans">
            {availablePlans.map((plan) => <option key={plan} value={plan} />)}
          </datalist>
          <label>
            Source
            <select value={filters.sourceMode} onChange={(event) => updateFilter('sourceMode', event.target.value)}>
              <option value="hybrid">Hybrid</option>
              <option value="calculated">Calculated</option>
              <option value="excel">Excel</option>
            </select>
          </label>
          <button className="primary-action" onClick={() => refreshData()} disabled={loading}>
            <Search size={17} />
            Charger
          </button>
        </section>

        {message && (
          <div className="alert-message error">
            <AlertCircle size={18} />
            <span>{message}</span>
            <button className="close-btn" onClick={() => setMessage('')}>&times;</button>
          </div>
        )}

        {successMessage && (
          <div className="alert-message success">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
            <button className="close-btn" onClick={() => setSuccessMessage('')}>&times;</button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <section className="view animate-fade-in">
            <div className="stat-grid">
              <Stat label="Chambres suivies" value={dashboardSummary.rooms} />
              <Stat label="Cellules disponibles" value={dashboardSummary.availableCells} tone="green" />
              <Stat label="Stock total" value={dashboardSummary.totalStock} />
              <Stat label="Prix moyen importé" value={formatMoney(dashboardSummary.averageRate)} />
            </div>

            <div className="split-layout">
              <section className="panel">
                <h2>Partenaires OTA</h2>
                <div className="partner-list">
                  {partners.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      className={item.name === filters.partnerName ? 'partner-row selected' : 'partner-row'}
                      onClick={() => {
                        updateFilter('partnerName', item.name);
                        if (item.plan_codes[0]) updateFilter('planCode', item.plan_codes[0]);
                      }}
                    >
                      <span>{item.name}</span>
                      <small>{item.commission}% commission · {item.plan_codes.length} plans</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h2>État période</h2>
                <div className="compact-table">
                  {availability.slice(0, 8).map((item) => (
                    <div className="table-row" key={`${item.room_name}-${item.date}`}>
                      <span>{item.date}</span>
                      <span>{item.room_name}</span>
                      <StatusPill status={item.status} />
                      <strong>{item.available_quantity ?? '-'}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === 'simulation' && (
          <section className="view animate-fade-in">
            <section className="simulation-bar">
              <label>
                Partenaire
                <input
                  value={filters.partnerName}
                  list="partners"
                  onChange={(event) => updateFilter('partnerName', event.target.value)}
                />
              </label>
              <datalist id="partners">
                {partners.map((item) => <option key={item.id} value={item.name} />)}
              </datalist>
              <label>
                Promo %
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.promoDiscount}
                  onChange={(event) => updateFilter('promoDiscount', event.target.value)}
                />
              </label>
              <button className="primary-action" onClick={runSimulation} disabled={loading}>
                <Play size={17} />
                Simuler
              </button>
            </section>

            {simulation ? (
              <>
                <div className="stat-grid animate-fade-in">
                  <Stat label="Brut" value={formatMoney(simulation.summary.subtotal_brut)} />
                  <Stat label="Remises" value={formatMoney(simulation.summary.total_discount || (simulation.summary.total_partner_discount + simulation.summary.total_promo_discount))} />
                  <Stat label="Commission" value={formatMoney(simulation.summary.total_commission)} />
                  <Stat label="Net" value={formatMoney(simulation.summary.total_net)} tone="green" />
                </div>
                <section className="panel animate-fade-in">
                  <h2>Résultats par nuit</h2>
                  <div className="data-grid rates-grid">
                    <span>Date</span>
                    <span>Plan</span>
                    <span>Stock</span>
                    <span>Prix brut</span>
                    <span>Net</span>
                    {simulation.results.map((item) => (
                      <React.Fragment key={`${item.date}-${item.plan_code}`}>
                        <strong>{item.date_display}</strong>
                        <span>{item.plan_code}</span>
                        <span>{item.stock ?? '-'}</span>
                        <span>{formatMoney(item.gross_price)}</span>
                        <strong>{formatMoney(item.net_price)}</strong>
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <section className="empty-state">Lance une simulation pour afficher les montants nets par nuit.</section>
            )}
          </section>
        )}

        {activeTab === 'availability' && (
          <section className="view panel animate-fade-in">
            <div className="panel-header-action">
              <h2>Disponibilités (Stocks)</h2>
              {Object.keys(modifiedAvailability).length > 0 && (
                <div className="dirty-actions-bar">
                  <span className="dirty-count">{Object.keys(modifiedAvailability).length} changement(s) en attente</span>
                  <button className="secondary-action shadow-xs" onClick={() => setModifiedAvailability({})} disabled={loading}>
                    <X size={15} /> Annuler
                  </button>
                  <button className="primary-action shadow-xs" onClick={saveAvailability} disabled={loading}>
                    <Save size={15} /> Enregistrer
                  </button>
                </div>
              )}
            </div>
            
            <p className="section-note">
              Astuce : Modifiez directement les cases de la colonne <strong>Stock</strong> (chiffre ou "STOP" pour fermer les ventes) puis cliquez sur Enregistrer.
            </p>

            <div className="data-grid availability-grid">
              <span>Date</span>
              <span>Chambre</span>
              <span>Statut Actuel</span>
              <span>Stock (Editable)</span>
              {availability.map((item) => {
                const key = `${item.date}|${item.room_name}`;
                const val = modifiedAvailability[key] !== undefined ? modifiedAvailability[key] : (item.available_quantity ?? '');
                return (
                  <React.Fragment key={key}>
                    <strong>{item.date}</strong>
                    <span>{item.room_name}</span>
                    <StatusPill status={item.status} />
                    <div className="input-cell-container">
                      <input
                        type="text"
                        className={`inline-edit-input ${modifiedAvailability[key] !== undefined ? 'dirty' : ''}`}
                        placeholder="ex: 5 ou STOP"
                        value={val}
                        onChange={(e) => updateModifiedAvailability(item.date, item.room_name, e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'rates' && (
          <section className="view panel animate-fade-in">
            <div className="panel-header-action">
              <h2>Grille tarifaire</h2>
              {Object.keys(modifiedRates).length > 0 && (
                <div className="dirty-actions-bar">
                  <span className="dirty-count">{Object.keys(modifiedRates).length} tarif(s) modifié(s)</span>
                  <button className="secondary-action shadow-xs" onClick={() => setModifiedRates({})} disabled={loading}>
                    <X size={15} /> Annuler
                  </button>
                  <button className="primary-action shadow-xs" onClick={saveRates} disabled={loading}>
                    <Save size={15} /> Enregistrer
                  </button>
                </div>
              )}
            </div>

            <p className="section-note">
              Note : Il est recommandé de modifier principalement le plan de référence (ex: <strong>{filters.planCode}</strong>). Les modifications sur ce plan déclencheront le recalcul automatique en cascade des autres tarifs liés.
            </p>

            <div className="data-grid rates-grid">
              <span>Date</span>
              <span>Chambre</span>
              <span>Plan</span>
              <span>Source</span>
              <span>Prix (€)</span>
              {(grid?.items || []).map((item) => {
                const key = `${item.date}|${item.room_name}|${item.plan_code}`;
                const val = modifiedRates[key] !== undefined ? modifiedRates[key] : (item.price ?? '');
                return (
                  <React.Fragment key={key}>
                    <strong>{item.date}</strong>
                    <span>{item.room_name}</span>
                    <span className="plan-badge-inline">{item.plan_code}</span>
                    <span>{item.source_used || '-'}</span>
                    <div className="input-cell-container">
                      <input
                        type="number"
                        step="0.01"
                        className={`inline-edit-input ${modifiedRates[key] !== undefined ? 'dirty' : ''}`}
                        placeholder="ex: 150.00"
                        value={val}
                        onChange={(e) => updateModifiedRate(item.date, item.room_name, item.plan_code, e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'upload' && (
          <section className="view panel animate-fade-in">
            <h2>Importation de Fichier Tarifs Excel (.xlsx)</h2>
            <p className="section-note">
              Uploadez la feuille Excel de tarifs de votre hôtel pour mettre à jour en masse la base de référence de prix et d'inventaires.
            </p>

            <div className="upload-container">
              <div className="upload-options-field">
                <label className="block-label">
                  Dates cibles forcées (optionnel, séparées par virgule)
                  <input
                    type="text"
                    placeholder="ex: 13/05/2026, 14/05/2026"
                    value={customDatesInput}
                    onChange={(e) => setCustomDatesInput(e.target.value)}
                    disabled={uploadingRates}
                    className="dates-override-input"
                  />
                </label>
                <small className="help-text">Laissez vide pour traiter toutes les dates contenues dans le fichier Excel.</small>
              </div>

              <div
                className={`drop-zone ${dragActive ? 'drag-active' : ''} ${uploadingRates ? 'uploading' : ''}`}
                onDragEnter={() => setDragActive(true)}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleSpreadsheetDropUpload}
              >
                {uploadingRates ? (
                  <div className="upload-loading-state">
                    <RefreshCw className="animate-spin text-emerald-600" size={36} />
                    <strong>Traitement du tableur en cours...</strong>
                    <span>Analyse des lignes et calcul des cascades</span>
                  </div>
                ) : (
                  <div className="upload-prompt-state">
                    <FileSpreadsheet size={48} className="text-emerald-500" />
                    <h3>Déposez votre fichier Excel ou CSV ici</h3>
                    <p>Formats acceptés : <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code></p>
                    
                    <input
                      type="file"
                      id="excel-file-picker"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleSpreadsheetFileSelect}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="excel-file-picker" className="primary-action cursor-pointer">
                      <Upload size={16} /> Choisir un fichier
                    </label>
                  </div>
                )}
              </div>
              
              {fileNameUploaded && !uploadingRates && (
                <div className="file-feedback">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Dernier fichier traité : <strong>{fileNameUploaded}</strong></span>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'exports' && (
          <section className="view">
            <div className="export-actions">
              <button onClick={() => downloadJson(`availability-${filters.hotelId}.json`, availability)}>
                <Download size={18} />
                Disponibilités JSON
              </button>
              <button onClick={() => downloadJson(`rates-${filters.hotelId}.json`, grid || {})}>
                <Download size={18} />
                Grille JSON
              </button>
              <button onClick={() => downloadJson(`simulation-${filters.hotelId}.json`, simulation || {})}>
                <Download size={18} />
                Simulation JSON
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

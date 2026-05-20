import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Database, 
  Layers, 
  ShieldAlert, 
  CheckCircle, 
  X, 
  Code, 
  Flame, 
  Sparkles, 
  Play, 
  RotateCw, 
  SlidersHorizontal, 
  ArrowRight, 
  Terminal, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  Download, 
  ExternalLink,
  Search,
  BookMarked,
  Info,
  Building,
  Upload,
  Save,
  Plus,
  Trash2,
  Settings,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  FileText,
  Percent,
  TrendingDown
} from 'lucide-react';
import { dbModelsData, strengthsData, weaknessesData, improvementsData } from './data';
import { 
  RateStep, 
  PlanRule, 
  PartnerConfig, 
  Rate, 
  HotelSummary, 
  HotelDetailed, 
  SimulationResult 
} from './types';
import { ddmmyyyyToYyyymmdd, yyyymmddToDdmmyyyy } from './utils';
import { hotelApi, API_URL } from './services/api';
import TechnicalTab from './components/TechnicalTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulation' | 'rates-grid' | 'config' | 'upload' | 'technical'>('simulation');
  
  // App-wide Hotel List and active selection
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [activeHotelId, setActiveHotelId] = useState<string>('');
  const [activeHotel, setActiveHotel] = useState<HotelDetailed | null>(null);
  const [loadingHotels, setLoadingHotels] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal to create hotel
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newHotelName, setNewHotelName] = useState<string>('');
  const [newHotelLocation, setNewHotelLocation] = useState<string>('Paris, France');
  const [copyRulesFromTemplate, setCopyRulesFromTemplate] = useState<boolean>(true);

  // --- TAB 1: SIMULATION cockpit states ---
  const [simStartDate, setSimStartDate] = useState<string>('');
  const [simEndDate, setSimEndDate] = useState<string>('');
  const [simRoomType, setSimRoomType] = useState<string>('');
  const [simPlanCode, setSimPlanCode] = useState<string>('');
  const [simPartnerName, setSimPartnerName] = useState<string>('');
  
  // Override toggles & custom inputs
  const [overrideDiscountEnabled, setOverrideDiscountEnabled] = useState<boolean>(false);
  const [overrideDiscountVal, setOverrideDiscountVal] = useState<number>(10);
  const [commissionsEnabled, setCommissionsEnabled] = useState<boolean>(true);
  const [overrideCommissionEnabled, setOverrideCommissionEnabled] = useState<boolean>(false);
  const [overrideCommissionVal, setOverrideCommissionVal] = useState<number>(15);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [expandedTraceDate, setExpandedTraceDate] = useState<string | null>(null);

  // --- TAB 2: EDIT REFERENCE RATES cockpit states ---
  const [referenceRatesUpdates, setReferenceRatesUpdates] = useState<{ [date: string]: { price: string; inventory: string } }>({});
  const [recaculatingRates, setRecalculatingRates] = useState<boolean>(false);
  const [searchGridRoom, setSearchGridRoom] = useState<string>('Double Classique');
  const [selectedGridPlan, setSelectedGridPlan] = useState<string>('OTA-RO-FLEX');
  const [gridMode, setGridMode] = useState<'rates' | 'inventory'>('rates');
  const [globalInventoryUpdates, setGlobalInventoryUpdates] = useState<{ [key: string]: string }>({});
  const [savingGlobalInventory, setSavingGlobalInventory] = useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [clearingRates, setClearingRates] = useState<boolean>(false);

  // --- TAB 3: HOTEL CONFIGURATION editor states ---
  const [editingPartners, setEditingPartners] = useState<{ [name: string]: PartnerConfig }>({});
  const [editingRules, setEditingRules] = useState<PlanRule[]>([]);
  const [editingRooms, setEditingRooms] = useState<string[]>([]);
  const [newRoomInput, setNewRoomInput] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Partner creation help structure
  const [newPartnerName, setNewPartnerName] = useState<string>('');
  const [newPartnerCommission, setNewPartnerCommission] = useState<number>(15);
  const [newPartnerPlans, setNewPartnerPlans] = useState<string>('OTA-RO-FLEX');

  // Rule creation template
  const [newRulePlanCode, setNewRulePlanCode] = useState<string>('MOBILE-RO-NANR');
  const [newRuleBaseSource, setNewRuleBaseSource] = useState<string>('OTA');

  // --- TAB 4: IMPORT EXCEL / CSV file states ---
  const [pastedCSVInput, setPastedCSVInput] = useState<string>('');
  const [uploadingRates, setUploadingRates] = useState<boolean>(false);
  const [uploadingPartners, setUploadingPartners] = useState<boolean>(false);
  const [uploadingRules, setUploadingRules] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileNameUploaded, setFileNameUploaded] = useState<string>('');
  const [customDatesInput, setCustomDatesInput] = useState<string>('13/05/2026, 14/05/2026');



  // ==========================================
  // FETCHERS & ACTIONS
  // ==========================================

  // Refresh Hotels list on Mount
  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setLoadingHotels(true);
    setErrorMessage(null);
    try {
      const data = await hotelApi.getHotels();
      setHotels(data);
      if (data.length > 0) {
        // Default select first hotel if active is empty
        const defaultHotel = activeHotelId ? data.find(h => h.id === activeHotelId) || data[0] : data[0];
        setActiveHotelId(defaultHotel.id);
      }
    } catch (err: any) {
      setErrorMessage(`Erreur lors du chargement des hôtels: ${err.message}`);
    } finally {
      setLoadingHotels(false);
    }
  };

  // Fetch individual hotel detailed information
  useEffect(() => {
    if (activeHotelId) {
      fetchHotelDetails(activeHotelId);
    }
  }, [activeHotelId]);

  const fetchHotelDetails = async (id: string) => {
    setLoadingDetails(true);
    setErrorMessage(null);
    try {
      const data = await hotelApi.getHotelDetails(id);
      setActiveHotel(data);

      // Auto-populate simulation defaults
      if (data.rooms.length > 0) {
        // Prefer "Double Classique" if present
        const doubleClassique = data.rooms.find(r => r.includes("Double Classique")) || data.rooms[0];
        setSimRoomType(doubleClassique);
        setSearchGridRoom(doubleClassique);
      }

      const partnerKeys = Object.keys(data.partners);
      if (partnerKeys.length > 0) {
        const defaultPartner = partnerKeys.find(p => p.toLowerCase().includes("booking")) || partnerKeys[0];
        setSimPartnerName(defaultPartner);
        
        const partnerConfig = data.partners[defaultPartner];
        if (partnerConfig && partnerConfig.codes.length > 0) {
          setSimPlanCode(partnerConfig.codes[0]);
        }
      }

      const dates = (Array.from(new Set(data.rates.map(r => r.date).filter(Boolean))) as string[]).sort((a: string, b: string) => {
        const pt = (dStr: string) => {
          if (!dStr || typeof dStr !== "string") return 0;
          const p = dStr.split("/");
          if (p.length !== 3) return 0;
          const day = parseInt(p[0]);
          const month = parseInt(p[1]);
          const year = parseInt(p[2]);
          if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;
          return new Date(year, month - 1, day).getTime();
        };
        return pt(a) - pt(b);
      });
      if (dates.length > 0) {
        setSimStartDate(dates[0]);
        setSimEndDate(dates[dates.length - 1] || dates[0]);
      }

      // Populate config tables
      setEditingPartners(JSON.parse(JSON.stringify(data.partners)));
      setEditingRules(JSON.parse(JSON.stringify(data.rules)));
      setEditingRooms(JSON.parse(JSON.stringify(data.rooms)));

      // Initialize reference edits values matching original DB price and leftForSale
      const editTracker: { [date: string]: { price: string; inventory: string } } = {};
      dates.forEach(d => {
        const match = data.rates.find(r => r.planCode === "OTA-RO-FLEX" && r.date === d);
        editTracker[d] = {
          price: match ? String(match.price || '') : '',
          inventory: match ? match.leftForSale : '5'
        };
      });
      setReferenceRatesUpdates(editTracker);
      setSimResult(null); // Reset simulation display on hotel swap

    } catch (err: any) {
      setErrorMessage(`Erreur lors du chargement des détails: ${err.message}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Run simulations on demand
  const triggerSimulation = async () => {
    if (!activeHotelId) return;
    setSimulating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      startDate: simStartDate,
      endDate: simEndDate,
      roomType: simRoomType,
      planCode: simPlanCode,
      partnerName: simPartnerName,
      overrideDiscount: overrideDiscountEnabled ? overrideDiscountVal : undefined,
      overrideCommission: overrideCommissionEnabled ? overrideCommissionVal : undefined,
      commissionsEnabled: commissionsEnabled
    };

    try {
      const data = await hotelApi.simulate(activeHotelId, payload);
      
      if (data.status === 'success') {
        setSimResult(data.simulation);
        if (data.simulation.days && data.simulation.days.length > 0) {
          setExpandedTraceDate(data.simulation.days[0].date); // expand first day trace by default
        }
      } else {
        throw new Error(data.error || "Simulation failed");
      }
    } catch (err: any) {
      setErrorMessage(`Échec de la simulation: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Update Reference prices Batch save
  const handleSaveReferenceRates = async () => {
    if (!activeHotelId || !activeHotel) return;
    setRecalculatingRates(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Filter relevant updates of price/inventory
    const updatesList = Object.keys(referenceRatesUpdates).map(date => {
      const item = referenceRatesUpdates[date];
      return {
        date,
        price: parseFloat(item.price),
        leftForSale: item.inventory
      };
    }).filter(u => !isNaN(u.price));

    const payload = {
      roomType: searchGridRoom,
      planCode: selectedGridPlan,
      updates: updatesList
    };

    try {
      const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/rates/update-reference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server rate calculation error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMessage(`Les modifications de tarifs de référence pour "${searchGridRoom} - ${selectedGridPlan}" ont été enregistrées avec succès. Le Backend a recalculé automatiquement tous les plans de route tarifaires dérivés.`);
        
        // Refresh active hotel rates state
        fetchHotelDetails(activeHotelId);
      } else {
        throw new Error(data.error || "Recalculation failed");
      }
    } catch (err: any) {
      setErrorMessage(`Erreur de recalculation: ${err.message}`);
    } finally {
      setRecalculatingRates(false);
    }
  };

  // Wipe all rates for the active hotel (virgin slate)
  const handleClearHotelRates = async () => {
    if (!activeHotelId) return;
    setClearingRates(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/rates/clear`, {
        method: 'POST'
      });
      if (!res.ok) {
        throw new Error(`Clear rates error: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMessage(data.message);
        setShowConfirmClear(false);
        fetchHotelDetails(activeHotelId);
      } else {
        throw new Error(data.error || "Wipe failed");
      }
    } catch (err: any) {
      setErrorMessage(`Erreur lors du vidage des tarifs: ${err.message}`);
    } finally {
      setClearingRates(false);
    }
  };

  // Update Global Rooms Inventory Batch save
  const handleSaveGlobalInventory = async () => {
    if (!activeHotelId || !activeHotel) return;
    setSavingGlobalInventory(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Build the updates list using the keys from globalInventoryUpdates
    const updatesList = Object.keys(globalInventoryUpdates).map(key => {
      const [roomType, date] = key.split("|");
      return {
        roomType,
        planCode: "OTA-RO-FLEX", // base reference plan used for inventory overrides
        date,
        leftForSale: globalInventoryUpdates[key]
      };
    });

    if (updatesList.length === 0) {
      setErrorMessage("Aucune modification de disponibilité à enregistrer.");
      setSavingGlobalInventory(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/rates/update-reference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planCode: "OTA-RO-FLEX",
          updates: updatesList
        })
      });

      if (!res.ok) {
        throw new Error(`Server inventory calculation error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.status === 'success') {
        setSuccessMessage(`Les modifications globales de disponibilités pour ${updatesList.length} types de chambre/dates ont été enregistrées avec succès en base de données.`);
        setGlobalInventoryUpdates({}); // Reset modified changes tracker
        fetchHotelDetails(activeHotelId); // Refresh state
      } else {
        throw new Error(data.error || "Inventory save failed");
      }
    } catch (err: any) {
      setErrorMessage(`Erreur d'enregistrement d'inventaire: ${err.message}`);
    } finally {
      setSavingGlobalInventory(false);
    }
  };

  // Create active new hotel
  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim()) return;

    setLoadingHotels(true);
    setErrorMessage(null);
    try {
      const data = await hotelApi.createHotel({
        name: newHotelName,
        location: newHotelLocation,
        templateHotelId: copyRulesFromTemplate ? "folkestone-opera" : undefined
      });

      setSuccessMessage(`Nouvel hôtel "${data.name}" créé avec succès ! Ses règles de cascading & partenaires types ont été configurées.`);
      setShowCreateModal(false);
      setNewHotelName('');
      
      // Reload list and switch active selection
      await fetchHotels();
      setActiveHotelId(data.id);

    } catch (err: any) {
      setErrorMessage(`Échec de la création: ${err.message}`);
    } finally {
      setLoadingHotels(false);
    }
  };

  // Delete current selected hotel
  const handleDeleteHotel = async () => {
    if (!activeHotelId || !confirm(`Voulez-vous vraiment supprimer définitivement l'hôtel "${activeHotel?.name}" ?`)) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await hotelApi.deleteHotel(activeHotelId);

      setSuccessMessage(`L'établissement a été entièrement retiré de la stack.`);
      setSimResult(null);
      // reload
      await fetchHotels();
    } catch (err: any) {
      setErrorMessage(`Erreur suppression: ${err.message}`);
    }
  };

  // Save the entire Rules & Partners general Configurations tab
  const handleSaveGeneralConfig = async () => {
    if (!activeHotelId) return;
    setSavingConfig(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partners: editingPartners,
          rules: editingRules,
          rooms: editingRooms
        })
      });

      if (!res.ok) {
        throw new Error(`Enregistrement échoué : ${res.statusText}`);
      }

      const data = await res.json();
      setSuccessMessage("La configuration globale de l'hôtel (Chambres, Partenaires & Multiplicateurs) a été sauvegardée. Toutes les grilles tarifaires en base ont été recalculées instantanément.");
      setActiveHotel(data.hotel);
    } catch (err: any) {
      setErrorMessage(`Échec d'enregistrement: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Paste raw rates block submit
  const handlePasteRatesSync = async () => {
    if (!activeHotelId || !pastedCSVInput.trim()) return;
    setUploadingRates(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const datesOverride = customDatesInput.split(",").map(d => d.trim()).filter(Boolean);

    try {
      const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/upload-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          csvText: pastedCSVInput,
          datesInput: datesOverride.length > 0 ? datesOverride : undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || res.statusText);
      }

      const data = await res.json();
      setSuccessMessage(data.message);
      setPastedCSVInput('');
      fetchHotelDetails(activeHotelId); // reload updated parameters
    } catch (err: any) {
      setErrorMessage(`Erreur de synchronisation CSV: ${err.message}`);
    } finally {
      setUploadingRates(false);
    }
  };

  // Upload actual XLSX spreadsheet / binary files
  const handleSpreadsheetDropUpload = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBinaryFile(file);
    }
  };

  const handleSpreadsheetFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processBinaryFile(file);
    }
  };

  const processBinaryFile = (file: File) => {
    setFileNameUploaded(file.name);
    setUploadingRates(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawArrayBuffer = evt.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(rawArrayBuffer);
        let binaryStr = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binaryStr += String.fromCharCode(bytes[i]);
        }
        const base64Content = window.btoa(binaryStr);

        // Send binary rates to database
        const datesOverride = customDatesInput.split(",").map(d => d.trim()).filter(Boolean);

        const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/upload-rates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileBase64: base64Content,
            fileName: file.name,
            datesInput: datesOverride.length > 0 ? datesOverride : undefined
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || res.statusText);
        }

        const data = await res.json();
        setSuccessMessage(data.message);
        fetchHotelDetails(activeHotelId); // sync state

      } catch (err: any) {
        setErrorMessage(`Erreur de lecture du fichier Excel: ${err.message}`);
      } finally {
        setUploadingRates(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadPartnersJson = (file: File) => {
    if (!activeHotelId) return;
    setUploadingPartners(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawText = evt.target?.result as string;
        const parsed = JSON.parse(rawText);

        const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/upload-partners`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            partnersData: parsed
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || res.statusText);
        }

        const data = await res.json();
        setSuccessMessage(data.message);
        fetchHotelDetails(activeHotelId);

      } catch (err: any) {
        setErrorMessage(`Erreur JSON Partenaires: ${err.message}`);
      } finally {
        setUploadingPartners(false);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadRulesJson = (file: File) => {
    if (!activeHotelId) return;
    setUploadingRules(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const isCsv = file.name.endsWith('.csv') || file.name.endsWith('.txt');
      try {
        const rawText = evt.target?.result as string;
        let bodyObj: any = {};

        if (isCsv) {
          bodyObj = { csvText: rawText };
        } else {
          const parsed = JSON.parse(rawText);
          bodyObj = { rulesData: parsed };
        }

        const res = await fetch(`${API_URL}/api/hotels/${activeHotelId}/upload-rules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyObj)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || res.statusText);
        }

        const data = await res.json();
        setSuccessMessage(data.message);
        fetchHotelDetails(activeHotelId);

      } catch (err: any) {
        setErrorMessage(`Erreur Formules (${isCsv ? "CSV" : "JSON"}): ${err.message}`);
      } finally {
        setUploadingRules(false);
      }
    };
    reader.readAsText(file);
  };

  // Helper selectors listings
  const partnerKeys = activeHotel ? Object.keys(activeHotel.partners) : [];
  
  // Plans that correspond to target partner, or fallback to all hotel rules
  const plansForSelectedPartner = activeHotel && simPartnerName
    ? activeHotel.partners[simPartnerName]?.codes || []
    : [];

  const uniqueHotelDates = activeHotel 
    ? (Array.from(new Set(activeHotel.rates.map(r => r.date).filter(Boolean))) as string[]).sort((a: string, b: string) => {
        const pt = (dStr: string) => {
          if (!dStr || typeof dStr !== "string") return 0;
          const p = dStr.split("/");
          if (p.length !== 3) return 0;
          const day = parseInt(p[0]);
          const month = parseInt(p[1]);
          const year = parseInt(p[2]);
          if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;
          return new Date(year, month - 1, day).getTime();
        };
        return pt(a) - pt(b);
      })
    : [];

  // Recalculate grid inputs when search parameter changes
  useEffect(() => {
    if (activeHotel) {
      const editTracker: { [date: string]: { price: string; inventory: string } } = {};
      uniqueHotelDates.forEach(d => {
        const match = activeHotel.rates.find(r => r.roomType === searchGridRoom && r.planCode === selectedGridPlan && r.date === d);
        editTracker[d] = {
          price: match ? String(match.price || '') : '',
          inventory: match ? match.leftForSale : '5'
        };
      });
      setReferenceRatesUpdates(editTracker);
    }
  }, [searchGridRoom, selectedGridPlan, activeHotel]);



  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/35 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="mx-auto w-full max-w-7xl px-6 py-6 sm:py-7 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Title & App Metadata */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-200/60">
                  <Building className="h-3.5 w-3.5" />
                  MOTEUR RM EXPÉRIMENTÉ
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600 border border-indigo-100">
                  v1.2.0 • Stack Full-Stack Node/React
                </span>
              </div>
              <h1 className="text-2.5xl font-bold tracking-tight text-slate-800">
                RM E-Hotel Manager — Workspace Co-Pilot
              </h1>
              <p className="mt-1 text-slate-500 font-mono text-xs uppercase tracking-wider leading-none">
                SIMULATIONS DE RENDEMENT, IMPORTATION EXCEL ET CASCADING TARIFAIRE
              </p>
            </div>

            {/* Hotel Quick Selection Panel */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl self-start md:self-auto">
              <div className="space-y-0.5">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Établissement Actif</label>
                {loadingHotels ? (
                  <span className="text-xs font-semibold text-slate-500">Chargement...</span>
                ) : (
                  <select 
                    value={activeHotelId}
                    onChange={(e) => setActiveHotelId(e.target.value)}
                    className="font-bold text-sm text-slate-800 focus:outline-none bg-transparent cursor-pointer"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name} ({h.location})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quick Utility buttons */}
              <div className="flex gap-1 pl-2 border-l border-slate-200">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  title="Créer un nouvel hôtel"
                  className="p-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau
                </button>
                <button 
                  onClick={handleDeleteHotel}
                  title="Supprimer cet hôtel de la stack"
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-105 border border-rose-200 text-rose-600 cursor-pointer transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* GLOBAL FEEDBACK NOTIFICATIONS */}
          <div className="mt-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Erreur rencontrée : </span>
                  {errorMessage}
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-900 text-xs rounded-lg flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Succès : </span>
                  {successMessage}
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* HIGH-POLISHED TAB RAIL */}
          <div className="mt-6 flex flex-wrap gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 max-w-fit">
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg cursor-pointer ${
                activeTab === 'simulation'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
              Simulateur de Rendement
            </button>
            <button
              onClick={() => setActiveTab('rates-grid')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg cursor-pointer ${
                activeTab === 'rates-grid'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
              Grille de Référence
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-3.5 w-3.5 text-emerald-500" />
              Config Partenaires & Règles
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="h-3.5 w-3.5 text-purple-500" />
              Importateur Excel / CSV
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-200 rounded-lg cursor-pointer ${
                activeTab === 'technical'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-slate-500" />
              Rapport d'Audit & SQL Schema
            </button>
          </div>

        </div>
      </div>

      {/* CREATE NEW HOTEL DIALOG MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl relative"
            >
              <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
              
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Building className="h-5 w-5 text-blue-600" />
                Créer un Établissement Hôtelier
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Configurez une entité hôte de base. Elle héritera instantanément d'une sémantique d'automatisation.
              </p>

              <form onSubmit={handleCreateHotel} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nom de l'hôtel</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: Folkestone Opera Garden"
                    value={newHotelName}
                    onChange={(e) => setNewHotelName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Localisation / Emplacement</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: Paris, France"
                    value={newHotelLocation}
                    onChange={(e) => setNewHotelLocation(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                  <input 
                    type="checkbox" 
                    id="copySeeds"
                    checked={copyRulesFromTemplate}
                    onChange={(e) => setCopyRulesFromTemplate(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="copySeeds" className="text-xs text-blue-900 select-none cursor-pointer">
                    Copier les 40+ plans, règles de calcul cascades & partenaires du <strong>Folkestone Opera Cafe</strong> par défaut.
                  </label>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-bold"
                  >
                    Valider & Éditer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
        
        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center p-24 text-center space-y-3 bg-white border border-slate-250 rounded-2xl">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Chargement des tarifs et configurations de l'hôtel...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ==========================================
                TAB 1: SIMULATION COCKPIT 
                ========================================== */}
            {activeTab === 'simulation' && (
              <motion.div
                key="simulation_tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                
                {/* SELECTORS BANNER PANEL */}
                <div className="bg-white border border-slate-220 p-5 rounded-2xl shadow-xs relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-800">Paramètres de Simulation de Recettes & Marges</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    
                    {/* Date Selector Start */}
                    <div className="space-y-1 relative">
                      <label className="block text-xs font-bold text-slate-500">Date de Début</label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500 shadow-2xs">
                        <input 
                          type="text"
                          value={simStartDate}
                          onChange={(e) => setSimStartDate(e.target.value)}
                          placeholder="JJ/MM/AAAA"
                          className="w-full text-xs p-2 bg-transparent focus:outline-none pr-8 font-mono text-slate-700 font-semibold"
                        />
                        <div className="absolute right-2 top-2 flex items-center justify-center cursor-pointer">
                          <input 
                            type="date"
                            value={ddmmyyyyToYyyymmdd(simStartDate)}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSimStartDate(yyyymmddToDdmmyyyy(e.target.value));
                              }
                            }}
                            className="absolute opacity-0 w-6 h-6 cursor-pointer z-10"
                          />
                          <Calendar className="h-4 w-4 text-slate-400 hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Date Selector End */}
                    <div className="space-y-1 relative">
                      <label className="block text-xs font-bold text-slate-500">Date de Fin</label>
                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500 shadow-2xs">
                        <input 
                          type="text"
                          value={simEndDate}
                          onChange={(e) => setSimEndDate(e.target.value)}
                          placeholder="JJ/MM/AAAA"
                          className="w-full text-xs p-2 bg-transparent focus:outline-none pr-8 font-mono text-slate-700 font-semibold"
                        />
                        <div className="absolute right-2 top-2 flex items-center justify-center cursor-pointer">
                          <input 
                            type="date"
                            value={ddmmyyyyToYyyymmdd(simEndDate)}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSimEndDate(yyyymmddToDdmmyyyy(e.target.value));
                              }
                            }}
                            className="absolute opacity-0 w-6 h-6 cursor-pointer z-10"
                          />
                          <Calendar className="h-4 w-4 text-slate-400 hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>

                    {/* Room Category */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-500">Catégorie de Chambre</label>
                      <select 
                        value={simRoomType}
                        onChange={(e) => setSimRoomType(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        {activeHotel?.rooms.map((room) => (
                          <option key={room} value={room}>{room}</option>
                        ))}
                      </select>
                    </div>

                    {/* Distributeur / Partner Selection */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-500">Canal / Partenaire</label>
                      <select 
                        value={simPartnerName}
                        onChange={(e) => {
                          setSimPartnerName(e.target.value);
                          const partnerItem = activeHotel?.partners[e.target.value];
                          if (partnerItem && partnerItem.codes.length > 0) {
                            setSimPlanCode(partnerItem.codes[0]);
                          }
                        }}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        {partnerKeys.map((pName) => (
                          <option key={pName} value={pName}>{pName}</option>
                        ))}
                      </select>
                    </div>

                    {/* Plan Code options for Partner */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-500">Plan Tarifaire Correspondant</label>
                      <select 
                        value={simPlanCode}
                        onChange={(e) => setSimPlanCode(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        {plansForSelectedPartner.map((plan) => (
                          <option key={`plan-${plan}`} value={plan}>{plan}</option>
                        ))}
                        {plansForSelectedPartner.length === 0 && (
                          <option value="">Aucun plan associé</option>
                        )}
                      </select>
                    </div>

                  </div>

                  {/* OVERRIDES DRAWER */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-5 justify-between items-center text-xs">
                    
                    {/* Discounts adjustments */}
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="ovDisc" 
                          checked={overrideDiscountEnabled}
                          onChange={(e) => setOverrideDiscountEnabled(e.target.checked)}
                          className="rounded text-blue-600 h-4 w-4"
                        />
                        <label htmlFor="ovDisc" className="font-bold text-slate-700">Ajuster la Remise manuellement (%) :</label>
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        disabled={!overrideDiscountEnabled}
                        value={overrideDiscountVal}
                        onChange={(e) => setOverrideDiscountVal(parseInt(e.target.value) || 0)}
                        className="w-16 p-1 bg-slate-50 border border-slate-200 rounded text-center font-semibold text-slate-800 disabled:opacity-45"
                      />
                    </div>

                    {/* Commission Toggles */}
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="commEnabled" 
                          checked={commissionsEnabled}
                          onChange={(e) => setCommissionsEnabled(e.target.checked)}
                          className="rounded text-blue-600 h-4 w-4"
                        />
                        <label htmlFor="commEnabled" className="font-bold text-slate-700">Déduire les Commissions du Chiffre d'Affaires</label>
                      </div>
                      
                      {commissionsEnabled && (
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="ovComm" 
                            checked={overrideCommissionEnabled}
                            onChange={(e) => setOverrideCommissionEnabled(e.target.checked)}
                            className="rounded text-blue-600 h-4 w-4"
                          />
                          <label htmlFor="ovComm" className="text-slate-600">Surcharger Commission (%) :</label>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            disabled={!overrideCommissionEnabled}
                            value={overrideCommissionVal}
                            onChange={(e) => setOverrideCommissionVal(parseInt(e.target.value) || 0)}
                            className="w-16 p-1 bg-slate-50 border border-slate-200 rounded text-center font-semibold text-slate-800 disabled:opacity-45"
                          />
                        </div>
                      )}
                    </div>

                    {/* Launch Trigger */}
                    <button
                      onClick={triggerSimulation}
                      disabled={simulating || plansForSelectedPartner.length === 0}
                      className="ml-auto flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all shadow-sm group cursor-pointer"
                    >
                      {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Lancer Simulation
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </button>

                  </div>
                </div>

                {/* SIMULATION RESULTS SCREEN */}
                {simResult ? (
                  <div className="space-y-6">
                    
                    {/* RESULTS DASHBOARD BANNER */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      
                      {/* Yield Card Total Public */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[10px] uppercase font-bold tracking-wider">Prix Public Total</span>
                          <DollarSign className="h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-2xl font-bold text-slate-800 mt-2">{simResult.summary.totalPublic.toLocaleString()} €</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">Taux catalogue global</span>
                      </div>

                      {/* Yield Card Client Rate after Discount */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[10px] uppercase font-bold tracking-wider">Recette Client (Net)</span>
                          <Percent className="h-4 w-4 text-amber-500" />
                        </div>
                        <p className="text-2xl font-bold text-teal-600 mt-2">{simResult.summary.totalDiscounted.toLocaleString()} €</p>
                        <span className="text-[10px] text-amber-600 mt-1 block">Remise de {simResult.discountPercentage}% appliquée</span>
                      </div>

                      {/* Yield Card Commission Expense */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[10px] uppercase font-bold tracking-wider">Commissions OTA</span>
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        </div>
                        <p className="text-2xl font-bold text-rose-600 mt-2">{simResult.summary.totalCommissionValue.toLocaleString()} €</p>
                        <span className="text-[10px] text-rose-500 mt-1 block">Commission moyenne: {simResult.commissionPercentage}%</span>
                      </div>

                      {/* Yield Card Net yield for hotel */}
                      <div className="bg-gradient-to-br from-blue-900 to-indigo-950 border border-slate-850 p-4 rounded-2xl text-white shadow-md">
                        <div className="flex items-center justify-between text-blue-300">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Rentrée Net Client</span>
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        </div>
                        <p className="text-2xl font-extrabold text-white mt-2">{simResult.summary.totalNetYield.toLocaleString()} €</p>
                        <span className="text-[10px] text-blue-300 mt-1 block">Rendement de {simResult.summary.yieldRetentionRate}% du brut</span>
                      </div>

                      {/* Inventory Limits status badge inside Bento */}
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs col-span-2 md:col-span-4 lg:col-span-1 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status Inventaire</span>
                        
                        {simResult.summary.stopSalesActive ? (
                          <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg text-xs mt-2 text-center flex items-center justify-center gap-1">
                            <ShieldAlert className="h-4 w-4 text-rose-500 animate-pulse" />
                            STOP SALES ACTIF
                          </div>
                        ) : (
                          <div className="p-2 bg-emerald-50 border border-emerald-150 text-emerald-700 font-bold rounded-lg text-xs mt-2 text-center flex items-center justify-center gap-1">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            DISPO OK (dispo min: {simResult.summary.minInventoryAvailable})
                          </div>
                        )}
                        <span className="text-[10px] text-slate-405 mt-1 block text-center">Durée: {simResult.nightsCount} nuits simuleés</span>
                      </div>

                    </div>

                    {/* LIST OF SIMULATED DAYS AND WATERFALL TRACE */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Day summary rows */}
                      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Relevé de prix par date</h3>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3 text-center">Inv</th>
                                <th className="py-2.5 px-3 text-right">Brut public</th>
                                <th className="py-2.5 px-3 text-right">Net client</th>
                                <th className="py-2.5 px-3 text-right">Commission</th>
                                <th className="py-2.5 px-3 text-right text-teal-600 font-bold">Rendement Net</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {simResult.days.map((day) => (
                                <tr 
                                  key={day.date}
                                  onClick={() => setExpandedTraceDate(day.date)}
                                  className={`hover:bg-slate-50 cursor-pointer transition-all ${
                                    expandedTraceDate === day.date ? "bg-blue-50/45 border-l-2 border-blue-550" : ""
                                  }`}
                                >
                                  <td className="py-3 px-3 font-semibold text-slate-800">{day.date}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`px-1.5 py-0.5 rounded-sm text-[10.5px] font-bold ${
                                      day.inventory === 'STOP' || day.inventory === '0' 
                                        ? 'bg-rose-100 text-rose-700' 
                                        : 'bg-slate-150 text-slate-700'
                                    }`}>
                                      {day.inventory}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right">{day.publicPrice.toFixed(2)} €</td>
                                  <td className="py-3 px-3 text-right text-slate-800 font-semibold">{day.discountedPrice.toFixed(2)} €</td>
                                  <td className="py-3 px-3 text-right text-rose-500">{day.commissionCost.toFixed(2)} €</td>
                                  <td className="py-3 px-3 text-right text-teal-600 font-bold">{day.netReward.toFixed(2)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-150 flex items-start gap-2.5 text-xs text-slate-500 leading-normal font-sans">
                          <Info className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span>Sélectionnez une ligne dans le tableau à gauche pour voir la cascade méticuleuse de calcul de l'algorithme hôtelier sur cette date.</span>
                        </div>
                      </div>

                      {/* Cascading math breakdown sidebar */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Détail Cascade Algorithme</h3>
                          
                          {expandedTraceDate && simResult && simResult.days.find(d => d.date === expandedTraceDate) ? (() => {
                            const matchedDay = simResult.days.find(d => d.date === expandedTraceDate)!;
                            return (
                              <div className="space-y-4">
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <span className="text-xs font-bold text-slate-500">Date examinée :</span>
                                    <span className="text-base font-extrabold text-slate-800 ml-2">{matchedDay.date}</span>
                                  </div>
                                  <div>
                                    {matchedDay.isFromExcel ? (
                                      <span className="text-[9px] uppercase tracking-wider font-sans font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                        Fichier Excel
                                      </span>
                                    ) : (
                                      <span className="text-[9px] uppercase tracking-wider font-sans font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 animate-pulse">
                                        Par Formule
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs space-y-1">
                                  <div className="flex justify-between text-slate-400">
                                    <span>Tarif de Base de Référence :</span>
                                    <span className="font-bold text-slate-700">{matchedDay.basePriceUsed.toFixed(2)} €</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-slate-400">
                                    <span>Plan parent d'origine :</span>
                                    <span className="text-blue-650 bg-blue-50 px-1 rounded font-semibold">{matchedDay.basePlanUsed}</span>
                                  </div>
                                </div>

                                {/* Flow Steps */}
                                <div className="space-y-2">
                                  <span className="block text-xs font-bold text-slate-500 border-b border-slate-100 pb-1.5">Étapes cumulées de calcul</span>
                                  
                                  {matchedDay.stepsTrace.map((st, idx) => (
                                    <div key={idx} className="flex gap-3 items-start p-2 bg-slate-50/50 rounded-lg text-xs hover:bg-slate-50 border border-slate-150/40 font-mono">
                                      <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">{idx + 1}</span>
                                      <div className="flex-1">
                                        <p className="font-sans font-bold text-slate-800">{st.label}</p>
                                        <p className="text-slate-550 text-[11px] mt-0.5">{st.formula}  =   <strong className="text-slate-700">{st.output.toFixed(2)} €</strong></p>
                                      </div>
                                    </div>
                                  ))}

                                  {matchedDay.stepsTrace.length === 0 && (
                                    <div className="py-6 text-center text-slate-450 border-2 border-dashed border-slate-100 text-xs">
                                      Aucune étape active de cascading paramétrée pour ce plan. Le tarif de base est copié tel quel.
                                    </div>
                                  )}
                                </div>

                                {/* Final waterfall totals */}
                                <div className="border-t border-slate-150 pt-3 text-xs font-mono space-y-2">
                                  <div className="flex justify-between">
                                    <span className="font-sans">Prix Public Résolu :</span>
                                    <span className="font-bold text-slate-800">{matchedDay.publicPrice.toFixed(2)} €</span>
                                  </div>
                                  <div className="flex justify-between text-teal-650">
                                    <span className="font-sans">Moins la Remise ({simResult.discountPercentage}%) :</span>
                                    <span>-{(matchedDay.publicPrice * (simResult.discountPercentage / 100)).toFixed(2)} €</span>
                                  </div>
                                  <div className="flex justify-between text-rose-600">
                                    <span className="font-sans">Moins Commission ({simResult.commissionPercentage}%) :</span>
                                    <span>-{matchedDay.commissionCost.toFixed(2)} €</span>
                                  </div>
                                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2 font-bold bg-blue-50/40 p-2 rounded-lg">
                                    <span className="font-sans text-blue-900">Encaissé Réel (Yield) :</span>
                                    <span className="text-emerald-700">{matchedDay.netReward.toFixed(2)} €</span>
                                  </div>
                                </div>

                              </div>
                            );
                          })() : (
                            <div className="text-center py-12 text-slate-400 text-xs">
                              Aucune date de trace sélectionnée.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="p-16 text-center border-2 border-dashed border-slate-205 bg-white rounded-2xl flex flex-col items-center justify-center space-y-3">
                    <SlidersHorizontal className="h-10 w-10 text-slate-300 animate-pulse" />
                    <div>
                      <h3 className="font-bold text-slate-700">Prêt pour la Simulation</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-lg">
                        Choisissez une période tarifaire ainsi qu'un distributeur ci-dessus et cliquez sur <strong>Lancer la Simulation</strong> pour analyser les écarts et la rentabilité en temps-réel.
                      </p>
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* ==========================================
                TAB 2: BASE REFERENCE RATES EDITOR GRID 
                ========================================== */}
            {activeTab === 'rates-grid' && (
              <motion.div
                key="grid_tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                
                {/* MODE CHANGER SEGMENT BAR WITH CLEAR SYSTEM */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:max-w-lg border border-slate-200">
                    <button
                      onClick={() => setGridMode('rates')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                        gridMode === 'rates'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      📈 Grille de Tarifs de Référence
                    </button>
                    <button
                      onClick={() => setGridMode('inventory')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                        gridMode === 'inventory'
                          ? 'bg-white text-blue-700 shadow-xs border border-blue-100/50'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      🗓️ Gestionnaire des Disponibilités (L.F.S)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {showConfirmClear ? (
                      <div className="flex items-center gap-1.5 p-1 bg-rose-50 border border-rose-250 rounded-xl animate-bounce">
                        <span className="text-[10px] font-bold text-rose-700 px-2">Vider toute la base ?</span>
                        <button
                          onClick={handleClearHotelRates}
                          disabled={clearingRates}
                          className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition cursor-pointer"
                        >
                          {clearingRates ? "Vider..." : "Confirmer"}
                        </button>
                        <button
                          onClick={() => setShowConfirmClear(false)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-350 transition cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowConfirmClear(true)}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                        title="Vider tous les tarifs de base"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        Vider tous les tarifs (Outil Vierge)
                      </button>
                    )}
                  </div>
                </div>

                {gridMode === 'rates' ? (
                  <>
                    {/* TOOLBAR */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        
                        <div className="space-y-1">
                          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-amber-500" />
                            Éditeur & Recalculateur de Tarifs de Référence
                          </h2>
                          <p className="text-xs text-slate-500">
                            Saisissez les taux de base et les dispos. La modification du tarif de référence <strong>OTA-RO-FLEX</strong> calculera automatiquement tous les tarifs dérivés en base de données.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          {/* Room filter for Grid */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Type de Chambre à éditer</span>
                            <select 
                              value={searchGridRoom}
                              onChange={(e) => setSearchGridRoom(e.target.value)}
                              className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            >
                              {activeHotel?.rooms.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>

                          {/* Reference Plan Code filter for Grid */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Plan Racine Direct</span>
                            <select 
                              value={selectedGridPlan}
                              onChange={(e) => setSelectedGridPlan(e.target.value)}
                              className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value="OTA-RO-FLEX">OTA-RO-FLEX (Référence Client)</option>
                              <option value="RACK-RO-FLEX">RACK-RO-FLEX (Référence Rack)</option>
                              <option value="OTA-RO-NANR">OTA-RO-NANR (Prépayé Direct)</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* EDITING VALUES CARD */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative">
                      
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-450 uppercase tracking-widest block font-mono">
                          GRILLE ACTIVE : {searchGridRoom} • {selectedGridPlan}
                        </span>
                        
                        <button
                          onClick={handleSaveReferenceRates}
                          disabled={recaculatingRates}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          {recaculatingRates ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Sauvegarder & Recalculer l'Index
                        </button>
                      </div>

                      {/* MATRIX GRID LIST */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {uniqueHotelDates.map((date) => {
                          const itemData = referenceRatesUpdates[date] || { price: '', inventory: '5' };
                          
                          return (
                            <div key={date} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 hover:border-amber-300 transition-colors">
                              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                <span className="text-[11px] font-bold text-slate-800">{date}</span>
                                <span className="text-[9px] font-bold font-mono text-amber-600 bg-amber-50 px-1.5 rounded-sm">Référence</span>
                              </div>

                              {/* Editable Price */}
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-450 uppercase font-bold block">Tarif de base (Price EUR)</label>
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    placeholder="ex: 161.00"
                                    value={itemData.price}
                                    onChange={(e) => {
                                      setReferenceRatesUpdates({
                                        ...referenceRatesUpdates,
                                        [date]: { ...itemData, price: e.target.value }
                                      });
                                    }}
                                    className="w-full text-xs p-1.5 pr-5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                                  />
                                  <span className="absolute right-1.5 top-2 text-[10px] text-slate-400">€</span>
                                </div>
                              </div>

                              {/* Editable Left for Sale */}
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-450 uppercase font-bold block">Chambres dispo (L.F.S)</label>
                                <input 
                                  type="text" 
                                  placeholder="ex: 3 ou STOP"
                                  value={itemData.inventory}
                                  onChange={(e) => {
                                    setReferenceRatesUpdates({
                                      ...referenceRatesUpdates,
                                      [date]: { ...itemData, inventory: e.target.value }
                                    });
                                  }}
                                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded font-mono text-center font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          );
                        })}

                        {uniqueHotelDates.length === 0 && (
                          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                            Aucune date de tarif n'est actuellement paramétrée en base pour cet hôtel. Allez sur l'onglet <strong>Importateur</strong> pour charger une grille Excel.
                          </div>
                        )}
                      </div>

                      {/* RECIPROCATING LIVE VISU */}
                      <div className="mt-6 border-t border-slate-100 pt-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Aperçu des Tarifs Dérivés pour les dates modifiées (Exemple indicatif)
                        </h3>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-650">
                            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3">Plan dérivé</th>
                                <th className="py-2.5 px-3">Source de base</th>
                                {uniqueHotelDates.map(d => (
                                  <th key={d} className="py-2.5 px-3 text-right">{d}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeHotel?.rules.slice(0, 4).map(rule => (
                                <tr key={rule.planCode} className="hover:bg-slate-50 font-mono">
                                  <td className="py-3 px-3 font-bold text-slate-700">{rule.planCode}</td>
                                  <td className="py-3 px-3"><span className="bg-slate-155 text-slate-600 px-1 rounded-sm text-[10px]">{rule.baseSource}-RO-FLEX</span></td>
                                  {uniqueHotelDates.map(d => {
                                    const rateObj = activeHotel.rates.find(r => r.roomType === searchGridRoom && r.planCode === rule.planCode && r.date === d);
                                    return (
                                      <td key={`pre-${d}`} className="py-3 px-3 text-right text-slate-800 font-semibold">
                                        {rateObj && rateObj.price !== null ? `${rateObj.price.toFixed(2)} €` : "Non calculé"}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </>
                ) : (
                  /* GLOBAL INVENTORY MATRIX GRID */
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          Gestionnaire Global des Disponibilités par Type de Chambre et par Date
                        </h3>
                        <p className="text-xs text-slate-500">
                          Saisissez directement l'inventaire restant (L.F.S) ou appliquez <strong>STOP</strong> pour suspendre les ventes (Plan : <strong>OTA-RO-FLEX</strong>).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {Object.keys(globalInventoryUpdates).length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                              Modifications non enregistrées : {Object.keys(globalInventoryUpdates).length}
                            </span>
                            <button
                              onClick={() => setGlobalInventoryUpdates({})}
                              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        )}
                        
                        <button
                          onClick={handleSaveGlobalInventory}
                          disabled={savingGlobalInventory || Object.keys(globalInventoryUpdates).length === 0}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          {savingGlobalInventory ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Sauvegarder l'inventaire global ({Object.keys(globalInventoryUpdates).length})
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-205 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              <th className="py-3 px-4 font-bold text-slate-700 min-w-[240px] sticky left-0 bg-slate-50 z-10 border-r border-slate-200/60 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                                Type de Chambre / Date
                              </th>
                              {uniqueHotelDates.map((date) => (
                                <th key={date} className="py-3 px-3 text-center min-w-[100px] border-r border-slate-200/40">
                                  {date}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {activeHotel?.rooms.map((roomType) => (
                              <tr key={roomType} className="hover:bg-slate-50 transition-colors group">
                                <td className="py-3 px-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200/60 shadow-[2px_0_5px_rgba(0,0,0,0.03)] group-hover:bg-slate-50">
                                  {roomType}
                                </td>

                                {uniqueHotelDates.map((date) => {
                                  const key = `${roomType}|${date}`;
                                  const originalMatch = activeHotel.rates.find(
                                    (r) => r.roomType === roomType && r.date === date && r.planCode === "OTA-RO-FLEX"
                                  );
                                  const originalValue = originalMatch ? originalMatch.leftForSale : "5";
                                  
                                  const isModified = globalInventoryUpdates[key] !== undefined;
                                  const cellValue = isModified ? globalInventoryUpdates[key] : originalValue;

                                  const isStop = String(cellValue).trim().toUpperCase() === "STOP" || cellValue === "0";
                                  const isLow = cellValue === "1" || cellValue === "2";
                                  
                                  let cellBg = "bg-emerald-50/70 border-emerald-200 text-emerald-800";
                                  if (isStop) {
                                    cellBg = "bg-rose-50 border-rose-200 text-rose-700 font-extrabold";
                                  } else if (isLow) {
                                    cellBg = "bg-amber-50 border-amber-200 text-amber-800";
                                  }

                                  return (
                                    <td key={date} className={`py-2.5 px-3 text-center border-r border-slate-200/40 ${isModified ? 'bg-amber-50/20' : ''}`}>
                                      <div className="flex flex-col items-center justify-center gap-1">
                                        <input
                                          type="text"
                                          value={cellValue}
                                          onChange={(e) => {
                                            const nextVal = e.target.value;
                                            if (nextVal === originalValue) {
                                              const updated = { ...globalInventoryUpdates };
                                              delete updated[key];
                                              setGlobalInventoryUpdates(updated);
                                            } else {
                                              setGlobalInventoryUpdates({
                                                ...globalInventoryUpdates,
                                                [key]: nextVal
                                              });
                                            }
                                          }}
                                          className={`w-16 p-1 text-center font-mono text-xs font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all ${cellBg}`}
                                        />
                                        
                                        <button
                                          onClick={() => {
                                            const nextVal = isStop ? "5" : "STOP";
                                            if (nextVal === originalValue) {
                                              const updated = { ...globalInventoryUpdates };
                                              delete updated[key];
                                              setGlobalInventoryUpdates(updated);
                                            } else {
                                              setGlobalInventoryUpdates({
                                                ...globalInventoryUpdates,
                                                [key]: nextVal
                                              });
                                            }
                                          }}
                                          className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
                                            isStop 
                                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                                              : "bg-rose-100 hover:bg-rose-200 text-rose-750"
                                          }`}
                                        >
                                          {isStop ? "Vendre" : "STOP"}
                                        </button>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {uniqueHotelDates.length === 0 && (
                        <div className="py-16 text-center text-slate-450 bg-slate-50/40">
                          Aucun tarif ni disponibilité en base de données pour cet hôtel. Allez sur l'onglet <strong>Importateur</strong> pour charger les tarifs depuis un fichier Excel.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* ==========================================
                TAB 3: RULES & HOTEL GENERAL CONFIGURATION 
                ========================================== */}
            {activeTab === 'config' && (
              <motion.div
                key="config_tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                
                {/* SETTINGS CARD */}
                <div className="bg-white border border-slate-205 p-5 rounded-2xl shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-emerald-500" />
                        Configuration Générale : {activeHotel?.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Ajustez l'éventail des chambres physiques de l'hôtel, paramétrez les marges de distribution de vos partenaires, et éditez les étapes de cascading des grilles.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveGeneralConfig}
                      disabled={savingConfig}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Sauvegarder la Configuration globale
                    </button>
                  </div>

                  {/* SPLIT PANELS */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT PANEL: Rooms List & Partners Catalog */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Sub card 1: Rooms setup */}
                      <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-slate-500 uppercase block">Catégories de Chambres Physiques</span>
                        
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="ex: Chambre Prestige Balcon"
                            value={newRoomInput}
                            onChange={(e) => setNewRoomInput(e.target.value)}
                            className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => {
                              if (!newRoomInput.trim()) return;
                              if (editingRooms.includes(newRoomInput.trim())) return;
                              setEditingRooms([...editingRooms, newRoomInput.trim()]);
                              setNewRoomInput('');
                            }}
                            className="px-3 bg-emerald-100 hover:bg-emerald-150 border border-emerald-250 text-emerald-700 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Ajouter
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1 bg-white border border-slate-150 p-2 rounded-lg divide-y divide-slate-100">
                          {editingRooms.map((room) => (
                            <div key={room} className="flex items-center justify-between py-1.5 text-xs text-slate-705">
                              <span>{room}</span>
                              <button 
                                onClick={() => setEditingRooms(editingRooms.filter(r => r !== room))}
                                className="text-rose-500 hover:text-rose-700 p-1 font-bold"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {editingRooms.length === 0 && (
                            <span className="text-slate-400 block text-center py-4 text-[11px]">Aucune chambre paramétrée</span>
                          )}
                        </div>
                      </div>

                      {/* Sub card 2: Partners configuration list */}
                      <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-slate-500 uppercase block">Fiches Canaux & Commissions</span>
                        
                        {/* Add Partner trigger form */}
                        <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                          <p className="font-bold text-slate-600 text-[11px] uppercase">Raccorder Nouveau Partenaire</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              placeholder="Folkestone Direct"
                              value={newPartnerName}
                              onChange={(e) => setNewPartnerName(e.target.value)}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
                            />
                            <input 
                              type="number" 
                              placeholder="Commission %"
                              value={newPartnerCommission}
                              onChange={(e) => setNewPartnerCommission(parseInt(e.target.value) || 0)}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Codes associés (ex: OTA-RO-FLEX,OTA-BB-FLEX-2P)"
                              value={newPartnerPlans}
                              onChange={(e) => setNewPartnerPlans(e.target.value)}
                              className="flex-1 p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newPartnerName.trim()) return;
                                const codes = newPartnerPlans.split(',').map(c => c.trim()).filter(Boolean);
                                setEditingPartners({
                                  ...editingPartners,
                                  [newPartnerName.trim()]: {
                                    commission: newPartnerCommission,
                                    codes
                                  }
                                });
                                setNewPartnerName('');
                                setNewPartnerPlans('OTA-RO-FLEX');
                              }}
                              className="px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer"
                            >
                              Créer
                            </button>
                          </div>
                        </div>

                        {/* Editable Partners list */}
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {Object.keys(editingPartners).map((pName) => {
                            const pConf = editingPartners[pName];
                            return (
                              <div key={pName} className="p-3 bg-white border border-slate-150 rounded-lg text-xs space-y-1.5 font-sans relative">
                                <button
                                  onClick={() => {
                                    const next = { ...editingPartners };
                                    delete next[pName];
                                    setEditingPartners(next);
                                  }}
                                  className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                
                                <p className="font-bold text-slate-800">{pName}</p>
                                
                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                  <div>
                                    <span className="text-slate-450 block font-bold uppercase text-[9px]">Commission (%)</span>
                                    <input 
                                      type="number" 
                                      value={pConf.commission}
                                      onChange={(e) => {
                                        setEditingPartners({
                                          ...editingPartners,
                                          [pName]: { ...pConf, commission: parseInt(e.target.value) || 0 }
                                        });
                                      }}
                                      className="p-1 bg-slate-50 border border-slate-200 rounded w-full font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-slate-450 block font-bold uppercase text-[9px]">Remise défaut (%)</span>
                                    <input 
                                      type="number" 
                                      value={pConf.defaultDiscount?.percentage || 0}
                                      onChange={(e) => {
                                        const discPct = parseInt(e.target.value) || 0;
                                        setEditingPartners({
                                          ...editingPartners,
                                          [pName]: { 
                                            ...pConf, 
                                            defaultDiscount: {
                                              percentage: discPct,
                                              excludePlansContaining: pConf.defaultDiscount?.excludePlansContaining || []
                                            } 
                                          }
                                        });
                                      }}
                                      className="p-1 bg-slate-50 border border-slate-200 rounded w-full font-semibold"
                                    />
                                  </div>
                                </div>
                                <span className="text-slate-450 block font-bold uppercase text-[9px] pt-1">Plans rattachés en cascade :</span>
                                <span className="text-indigo-600 font-mono font-semibold block bg-indigo-50/50 p-1.5 rounded border border-indigo-100/40 text-[10px] break-all leading-relaxed">
                                  {pConf.codes.join(" • ")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* RIGHT PANEL: Cascading Rate rules editor */}
                    <div className="lg:col-span-7 bg-slate-50 border border-slate-200/80 p-5 rounded-xl space-y-4">
                      
                      <div className="flex justify-between items-center border-b border-slate-200/75 pb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase block">Règles Arithmétiques de Cascades Tarifaires ({editingRules.length})</span>
                        
                        {/* Quick Add Rule Drawer block */}
                        <div className="flex gap-2 text-[10.5px]">
                          <input 
                            type="text" 
                            placeholder="Code (ex: MOBILE-BB)"
                            value={newRulePlanCode}
                            onChange={(e) => setNewRulePlanCode(e.target.value.toUpperCase())}
                            className="p-1 bg-white border border-slate-200 rounded"
                          />
                          <select 
                            value={newRuleBaseSource}
                            onChange={(e) => setNewRuleBaseSource(e.target.value)}
                            className="p-1 bg-white border border-slate-200 rounded"
                          >
                            <option value="OTA">Base OTA</option>
                            <option value="RACK">Base RACK</option>
                          </select>
                          <button
                            onClick={() => {
                              if (!newRulePlanCode.trim()) return;
                              if (editingRules.some(r => r.planCode === newRulePlanCode.trim())) return;
                              setEditingRules([...editingRules, {
                                planCode: newRulePlanCode.trim(),
                                baseSource: newRuleBaseSource,
                                steps: [
                                  { operation: 'multiply', value: 1.15 }
                                ]
                              }]);
                              setNewRulePlanCode('MOBILE-RO-FLEX');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded px-2 text-[10px] cursor-pointer"
                          >
                            Créer Règle
                          </button>
                        </div>
                      </div>

                      {/* EDITABLE ACTIVE RULES */}
                      <div className="max-h-[34rem] overflow-y-auto space-y-3 pr-1">
                        {editingRules.map((rule, ruleIdx) => (
                          <div key={rule.planCode} className="p-4 bg-white border border-slate-150 rounded-lg hover:border-slate-300 transition-colors text-xs space-y-3 relative font-sans">
                            <button
                              onClick={() => {
                                setEditingRules(editingRules.filter(r => r.planCode !== rule.planCode));
                              }}
                              className="absolute top-2.5 right-2.5 text-rose-500 hover:text-rose-700"
                            >
                              <X className="h-4 w-4" />
                            </button>

                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 text-sm font-mono">{rule.planCode}</span>
                              <span className="text-[10px] text-slate-450 uppercase font-bold">hérite du parent</span>
                              <select 
                                value={rule.baseSource}
                                onChange={(e) => {
                                  const list = [...editingRules];
                                  list[ruleIdx].baseSource = e.target.value;
                                  setEditingRules(list);
                                }}
                                className="p-1 bg-slate-50 border border-slate-200 rounded text-[10.5px] font-bold"
                              >
                                <option value="OTA">OTA-RO-FLEX</option>
                                <option value="RACK">RACK-RO-FLEX</option>
                              </select>
                            </div>

                            {/* Sequential Steps in Rule */}
                            <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                                <span>Étapes séquentielles d'ajustements</span>
                                <button
                                  onClick={() => {
                                    const list = [...editingRules];
                                    list[ruleIdx].steps.push({ operation: 'add', value: 15 });
                                    setEditingRules(list);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-bold"
                                >
                                  + Ajouter Ajustement
                                </button>
                              </div>

                              <div className="space-y-1.5 font-mono">
                                {rule.steps.map((step, stepIdx) => (
                                  <div key={stepIdx} className="flex items-center gap-2 p-1.5 rounded bg-slate-50 border border-slate-150 text-[11px]">
                                    <span className="text-[9.5px] text-slate-400 font-bold w-4">{stepIdx + 1}</span>
                                    
                                    <select 
                                      value={step.operation}
                                      onChange={(e) => {
                                        const list = [...editingRules];
                                        list[ruleIdx].steps[stepIdx].operation = e.target.value as any;
                                        setEditingRules(list);
                                      }}
                                      className="bg-white border border-slate-200 rounded text-[10.5px] p-0.5"
                                    >
                                      <option value="multiply">Multiplier par (Coeff)</option>
                                      <option value="add">Ajouter Surcharge (+ EUR)</option>
                                      <option value="subtract">Soustraire Réduction (- EUR)</option>
                                    </select>

                                    <input 
                                      type="number" 
                                      step="any"
                                      value={step.value}
                                      onChange={(e) => {
                                        const list = [...editingRules];
                                        list[ruleIdx].steps[stepIdx].value = parseFloat(e.target.value) || 0;
                                        setEditingRules(list);
                                      }}
                                      className="w-16 bg-white border border-slate-200 rounded text-center p-0.5 font-semibold"
                                    />

                                    <button
                                      onClick={() => {
                                        const list = [...editingRules];
                                        list[ruleIdx].steps.splice(stepIdx, 1);
                                        setEditingRules(list);
                                      }}
                                      className="ml-auto text-rose-550 hover:text-rose-700"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}

                                {rule.steps.length === 0 && (
                                  <span className="text-slate-400 block text-center py-2 text-[10px] font-sans">Aucun ajustement arithmétique. Le tarif brut est hérité brut.</span>
                                )}
                              </div>
                            </div>

                          </div>
                        ))}

                        {editingRules.length === 0 && (
                          <div className="py-12 text-center text-slate-450 text-xs">
                            Aucun plan de cascading paramétré en base.
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </div>

              </motion.div>
            )}

            {/* ==========================================
                TAB 4: SPREADSHEETS IMPORT FORMS
                ========================================== */}
            {activeTab === 'upload' && (
              <motion.div
                key="upload_tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                
                {/* SETTINGS CARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Binary Excel files Drag/Drop Panel */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                    
                    <div className="space-y-1 pb-3 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-purple-500" />
                        Charger un fichier Excel Hôtelier
                      </h2>
                      <p className="text-xs text-slate-500 leading-normal">
                        Importez un réel fichier Excel (format <code>.xlsx</code> ou <code>.xls</code>) exporté de votre PMS hôtelier ou contenant vos tarifs de référence sur plusieurs dates.
                      </p>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleSpreadsheetDropUpload}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                        dragActive ? "border-purple-500 bg-purple-50/20" : "border-slate-300 bg-slate-50 hover:bg-slate-100/60"
                      }`}
                    >
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv"
                        onChange={handleSpreadsheetFileSelect}
                        className="hidden" 
                        id="binaryRatesUploadInput" 
                      />
                      <label htmlFor="binaryRatesUploadInput" className="cursor-pointer flex flex-col items-center space-y-2">
                        <FileText className={`h-11 w-11 ${dragActive ? "text-purple-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-700">Sélectionnez ou Déposez de vrais spreads XLSX / XLS ici</span>
                        <span className="text-[10px] text-slate-400 block">Les colonnes de dates seront lues et fusionnées automatiquement</span>
                      </label>
                    </div>

                    {fileNameUploaded && (
                      <div className="p-2.5 bg-blue-50 border border-blue-105 text-blue-900 rounded-lg text-xs font-mono flex items-center justify-between">
                        <span>Fichier traité : <strong>{fileNameUploaded}</strong></span>
                        <span className="text-[10px] uppercase font-bold text-blue-600 block bg-white px-2 py-0.5 rounded border">Excel parsed</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase">Configuration forcé de Dates (Optionnel)</label>
                      <input 
                        type="text" 
                        value={customDatesInput}
                        onChange={(e) => setCustomDatesInput(e.target.value)}
                        placeholder="13/05/2026, 14/05/2026"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Si votre fichier Excel n'a pas de ligne d'en-tête contenant explicitement des dates au format ISO ou DD/MM/YYYY, l'importateur attribuera ces dates chronologiques par ordre de colonnes de gauche à droite.
                      </p>
                    </div>

                  </div>

                  {/* Pasting raw plain rates sync text area */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    
                    <div className="space-y-1 pb-2 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-purple-500" />
                        Paster / Synchroniser Texte CSV Bruts
                      </h2>
                      <p className="text-xs text-slate-500 leading-normal">
                        Vous pouvez également copier-coller un bloc de données textuelles délimitées par des points-virgules pour rafraîchir instantanément la base.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <textarea
                        rows={10}
                        value={pastedCSVInput}
                        onChange={(e) => setPastedCSVInput(e.target.value)}
                        placeholder={`Drapeau Classique;;Left for sale;3;3
Double Classique;OTA-RO-FLEX - OTA RO FLEX;Price (EUR);161,00;188,00`}
                        className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-200 border border-slate-950 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <button
                      onClick={handlePasteRatesSync}
                      disabled={uploadingRates || !pastedCSVInput.trim()}
                      className="w-full flex items-center justify-center gap-1.5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      {uploadingRates ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Synchroniser / Parser le bloc CSV
                    </button>

                  </div>

                </div>

                {/* JSON CONFIGURATION UPLOADS (OTAs & Cascading Rules) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  
                  {/* OTA Partners Config upload */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="space-y-1 pb-3 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-indigo-500" />
                        Importer Config OTA & Commissions (JSON)
                      </h2>
                      <p className="text-xs text-slate-500 leading-normal">
                        Uploadez un fichier JSON contenant la liste de vos OTAs partenaires, leurs plans associés, ainsi que leurs taux de remise et de commission.
                      </p>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/65 rounded-xl p-5 text-center cursor-pointer transition-all">
                      <input 
                        type="file" 
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPartnersJson(file);
                        }}
                        className="hidden" 
                        id="jsonPartnersUploadInput" 
                      />
                      <label htmlFor="jsonPartnersUploadInput" className="cursor-pointer flex flex-col items-center space-y-2">
                        <FileText className="h-9 w-9 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">Choisir le fichier JSON des OTAs</span>
                        <span className="text-[10px] text-slate-400 font-mono">Structure: &#123; "Booking.com": &#123; "commission": 15, ... &#125; &#125;</span>
                      </label>
                    </div>

                    {uploadingPartners && (
                      <div className="text-center py-2 text-xs text-indigo-600 font-medium flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Chargement de la configuration des partenaires...
                      </div>
                    )}
                  </div>

                  {/* Calculation Rules Config upload */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="space-y-1 pb-3 border-b border-slate-100">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
                        Importer Formules de Calcul (CSV / JSON)
                      </h2>
                      <p className="text-xs text-slate-500 leading-normal">
                        Uploadez les règles de cascading de vos plans tarifaires (additions/soustractions de surcharges, de petits-déjeuners, multiplicateurs de remises, etc.).
                      </p>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/65 rounded-xl p-5 text-center cursor-pointer transition-all">
                      <input 
                        type="file" 
                        accept=".json,.csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadRulesJson(file);
                        }}
                        className="hidden" 
                        id="jsonRulesUploadInput" 
                      />
                      <label htmlFor="jsonRulesUploadInput" className="cursor-pointer flex flex-col items-center space-y-2">
                        <FileText className="h-9 w-9 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors">Choisir le fichier CSV ou JSON des Formules</span>
                        <span className="text-[10px] text-slate-400 font-mono">Format supporté: PlanCode,BaseSource,Step1Type,Step1Value...</span>
                      </label>
                    </div>

                    {uploadingRules && (
                      <div className="text-center py-2 text-xs text-indigo-600 font-medium flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Application des règles de cascade...
                      </div>
                    )}
                  </div>

                </div>

              </motion.div>
            )}

            {/* ==========================================
                TAB 5: DEVELOPER & TECHNICAL AUDIT SUB-REPORT 
                ========================================== */}
            {activeTab === 'technical' && <TechnicalTab />}

          </AnimatePresence>
        )}

      </main>

    </div>
  );
}

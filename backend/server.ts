import express from "express";
import path from "path";
import fs from "fs";
import * as xlsx from "xlsx";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/hoteldb"
});

/**
 * Try to parse any cell value (cellDate Date object, string, or serial number) into a DD/MM/YYYY format string.
 * This is extremely robust and avoids missing up to 90 dates.
 */
function tryParseToDDMMYYYY(val: any): string | null {
  if (val === undefined || val === null) return null;

  // 1. If it's already a JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const day = String(val.getDate()).padStart(2, "0");
    const month = String(val.getMonth() + 1).padStart(2, "0");
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // 2. Try simple clean string regex checks
  let strVal = String(val).trim();
  if (!strVal) return null;

  // Regex format DD/MM/YYYY or DD-MM-YYYY
  const regexDDMMYYYY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
  const match1 = strVal.match(regexDDMMYYYY);
  if (match1) {
    return `${match1[1].padStart(2, "0")}/${match1[2].padStart(2, "0")}/${match1[3]}`;
  }

  // Regex format YYYY/MM/DD or YYYY-MM-DD
  const regexYYYYMMDD = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/;
  const match2 = strVal.match(regexYYYYMMDD);
  if (match2) {
    return `${match2[3].padStart(2, "0")}/${match2[2].padStart(2, "0")}/${match2[1]}`;
  }

  // Regex format DD/MM/YY or DD-MM-YY
  const regexDDMMYY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/;
  const match3 = strVal.match(regexDDMMYY);
  if (match3) {
    const yr = parseInt(match3[3]);
    const fullYear = yr < 50 ? `20${match3[3]}` : `19${match3[3]}`;
    return `${match3[1].padStart(2, "0")}/${match3[2].padStart(2, "0")}/${fullYear}`;
  }

  // Format MM/DD/YYYY or M/D/YYYY
  const parts = strVal.split(/[/-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0]);
    const p1 = parseInt(parts[1]);
    const p2 = parseInt(parts[2]);
    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (p2 >= 100 && p2 <= 9999) {
        if (p0 > 12) {
          return `${String(p0).padStart(2, "0")}/${String(p1).padStart(2, "0")}/${p2}`;
        }
        if (p1 > 12) {
          return `${String(p1).padStart(2, "0")}/${String(p0).padStart(2, "0")}/${p2}`;
        }
        return `${String(p0).padStart(2, "0")}/${String(p1).padStart(2, "0")}/${p2}`;
      } else if (p0 >= 100 && p0 <= 9999) {
        return `${String(p2).padStart(2, "0")}/${String(p1).padStart(2, "0")}/${p0}`;
      }
    }
  }

  // 3. Check for Excel Date Serial Number (e.g. 46152 for May 13 2026)
  const numericVal = Number(strVal);
  if (!isNaN(numericVal) && numericVal > 30000 && numericVal < 60000) {
    const dateObj = new Date((numericVal - 25569) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // 4. Fallback to native Date parsing if not matching
  const timestamp = Date.parse(strVal);
  if (!isNaN(timestamp)) {
    const dateObj = new Date(timestamp);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return null;
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8000;

const ALLOWED_ORIGIN_HOSTS = [
  "rm-front.e-hotelmanager.com",
  "rm.e-hotelmanager.com",
  "admin-rm.e-hotelmanager.com",
  "back-rm.e-hotelmanager.com",
  "api-rm.e-hotelmanager.com",
  "hotel.hotelmanager.fr",
  "admin.hotelmanager.fr",
  "api.hotelmanager.fr",
  "localhost",
  "127.0.0.1"
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      
      const isAllowed = 
        ALLOWED_ORIGIN_HOSTS.includes(hostname) || 
        hostname.endsWith("e-hotelmanager.com") || 
        hostname.endsWith("hotelmanager.fr") ||
        process.env.ENV !== "production";
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS: Origin ${origin} (hostname ${hostname}) not allowed`);
        callback(null, false);
      }
    } catch (err) {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key", "Accept"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Structure interfaces
interface RateStep {
  operation: 'multiply' | 'add' | 'subtract';
  value: number;
}

interface PlanRule {
  planCode: string;
  baseSource: string;
  steps: RateStep[];
}

interface PartnerConfig {
  commission: number;
  codes: string[];
  defaultDiscount?: {
    percentage: number;
    excludePlansContaining: string[];
  };
}

interface Rate {
  roomType: string;
  planCode: string;
  planName: string;
  date: string; // DD/MM/YYYY
  price: number | null;
  leftForSale: string;
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  rooms: string[];
  partners: { [partnerName: string]: PartnerConfig };
  rules: PlanRule[];
  rates: Rate[];
}

// Global cache in-memory
let hotelsCache: Hotel[] = [];

// Raw initial seeds in case JSON table doesn't exist yet
import { RAW_RATES_CSV, RAW_PLAN_RULES_CSV, RAW_PARTNERS_JSON } from "./src/folkestoneRawData.js";

/**
 * Parses raw rates semicolon-separated CSV into typed rates for two default days May 13/14 2026.
 */
function parseInitialRatesCSV(csvText: string): Rate[] {
  const lines = csvText.split('\n');
  const results: Rate[] = [];
  const leftForSaleMap: { [room: string]: { day13: string; day14: string } } = {};
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    const cols = line.split(';');
    if (cols.length < 4) continue;
    
    const roomType = cols[0].trim();
    if (!roomType || roomType.startsWith('FOLKESTONE')) continue;
    
    // Inventory
    const isLFS = cols[2] && (cols[2].trim().toLowerCase() === 'left for sale' || cols[2].trim().toLowerCase().includes('dispo') || cols[2].trim().toLowerCase().includes('l.f.s') || cols[2].trim().toLowerCase() === 'lfs');
    if (cols[2] && isLFS) {
      const d13 = cols[3] ? cols[3].trim() : 'X';
      const d14 = cols[4] ? cols[4].trim() : 'X';
      leftForSaleMap[roomType] = { day13: d13, day14: d14 };
      continue;
    }
    
    // Price
    const planCol = cols[1] ? cols[1].trim() : '';
    const metric = cols[2] ? cols[2].trim() : '';
    const isPrice = metric.toLowerCase() === 'price (eur)' || metric.toLowerCase().includes('price') || metric.toLowerCase().includes('tarif') || metric.toLowerCase().includes('prix');
    
    if (planCol && isPrice) {
      const planParts = planCol.split(' - ');
      const planCode = planParts[0]?.trim() || planCol;
      const planName = planParts[1]?.trim() || planCol;
      
      const val13 = cols[3]?.replace(',', '.') || '';
      const val14 = cols[4]?.replace(',', '.') || '';
      
      const price13 = parseFloat(val13);
      const price14 = parseFloat(val14);
      
      const inventory = leftForSaleMap[roomType] || { day13: 'X', day14: 'X' };
      
      // Seed Day 13 rate
      results.push({
        roomType,
        planCode,
        planName,
        date: "13/05/2026",
        price: isNaN(price13) ? null : price13,
        leftForSale: inventory.day13
      });
      
      // Seed Day 14 rate
      results.push({
        roomType,
        planCode,
        planName,
        date: "14/05/2026",
        price: isNaN(price14) ? null : price14,
        leftForSale: inventory.day14
      });
    }
  }
  
  return results;
}

/**
 * Parses initial rules
 */
function parseInitialPlanRules(csvText: string): PlanRule[] {
  const lines = csvText.split('\n');
  const results: PlanRule[] = [];
  if (lines.length < 2) return [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    if (cols.length < 2) continue;
    
    const planCode = cols[0].trim();
    const baseSource = cols[1].trim();
    if (planCode.toLowerCase() === 'plancode') continue;
    
    const steps: RateStep[] = [];
    for (let s = 1; s <= 5; s++) {
      const typeColIndex = 2 + (s - 1) * 2;
      const valColIndex = typeColIndex + 1;
      if (typeColIndex < cols.length && valColIndex < cols.length) {
        const type = cols[typeColIndex]?.trim().toLowerCase();
        const rawVal = cols[valColIndex]?.trim();
        if (type && rawVal) {
          const val = parseFloat(rawVal);
          if (!isNaN(val)) {
            const operation = type === 'multiplier' ? 'multiply' : (type === 'subtract' || val < 0 ? 'subtract' : 'add');
            steps.push({
              operation: operation as any,
              value: Math.abs(val)
            });
          }
        }
      }
    }
    results.push({ planCode, baseSource, steps });
  }
  return results;
}

/**
 * Parses initial partners
 */
function parseInitialPartners(jsonText: string): { [name: string]: PartnerConfig } {
  try {
    const rawObj = JSON.parse(jsonText);
    const partners: { [name: string]: PartnerConfig } = {};
    if (rawObj.partners) {
      Object.keys(rawObj.partners).forEach(key => {
        const p = rawObj.partners[key];
        partners[key] = {
          commission: typeof p.commission === 'number' ? p.commission : 0,
          codes: Array.isArray(p.codes) ? p.codes : [],
          defaultDiscount: p.defaultDiscount ? {
            percentage: typeof p.defaultDiscount.percentage === 'number' ? p.defaultDiscount.percentage : 0,
            excludePlansContaining: Array.isArray(p.defaultDiscount.excludePlansContaining) ? p.defaultDiscount.excludePlansContaining : []
          } : undefined
        };
      });
    }
    return partners;
  } catch (err) {
    return {};
  }
}

// Database Helpers
async function saveHotelToDb(hotel: Hotel) {
  try {
    await pool.query(`
      INSERT INTO hotels (id, data)
      VALUES ($1, $2)
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data
    `, [hotel.id, JSON.stringify(hotel)]);
  } catch (err) {
    console.error(`Failed to save hotel '${hotel.id}' to Postgres:`, err);
  }
}

async function deleteHotelFromDb(id: string) {
  try {
    await pool.query("DELETE FROM hotels WHERE id = $1", [id]);
  } catch (err) {
    console.error(`Failed to delete hotel '${id}' from Postgres:`, err);
  }
}

let inMemoryLogs: any[] = [];

async function logToDb(level: string, category: string, message: string, details?: any) {
  const timestamp = new Date();
  const logEntry = {
    id: inMemoryLogs.length + 1,
    timestamp,
    level,
    category,
    message,
    details: details || null
  };
  
  inMemoryLogs.unshift(logEntry);
  if (inMemoryLogs.length > 500) {
    inMemoryLogs.pop();
  }

  try {
    await pool.query(`
      INSERT INTO api_logs (level, category, message, details)
      VALUES ($1, $2, $3, $4)
    `, [level, category, message, details ? JSON.stringify(details) : null]);
  } catch (err) {
    // Fail silently (in-memory logger active)
  }
}

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(10) NOT NULL,
        category VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        details JSONB
      )
    `);
    console.log("PostgreSQL tables verified or created.");
    await logToDb("INFO", "DATABASE", "Serveur démarré et base de données initialisée.");
    await loadDatabase();
  } catch (err) {
    console.error("Failed to initialize database:", err);
    // Non-fatal: start with in-memory seed data and retry in background
    bootWithSeedData();
  }
}

function bootWithSeedData() {
  if (hotelsCache.length === 0) {
    console.warn("[DB FALLBACK] Starting with in-memory seed data (PostgreSQL unavailable).");
    const seedHotel: Hotel = {
      id: "folkestone",
      name: "Folkestone Opera",
      location: "Paris, France",
      rooms: [
        "Double Classique",
        "Double Single Use Classique",
        "Twin Classique",
        "Double Classique Terrasse",
        "Double Deluxe",
        "Twin Deluxe",
        "Double Deluxe Terrasse",
        "Deux Chambres Adjacentes 4 personnes"
      ],
      partners: parseInitialPartners(RAW_PARTNERS_JSON),
      rules: parseInitialPlanRules(RAW_PLAN_RULES_CSV),
      rates: parseInitialRatesCSV(RAW_RATES_CSV)
    };
    hotelsCache = [seedHotel];
  }

  // Retry DB connection every 15 seconds silently
  const retryTimer = setInterval(async () => {
    try {
      await pool.query("SELECT 1");
      console.log("[DB RETRY] PostgreSQL is now reachable — initializing database.");
      clearInterval(retryTimer);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS hotels (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          level VARCHAR(10) NOT NULL,
          category VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          details JSONB
        )
      `);
      await logToDb("INFO", "DATABASE", "Connexion PostgreSQL établie en arrière-plan.");
      await loadDatabase();
    } catch {
      // still not reachable, keep trying silently
    }
  }, 15000);
}

async function loadDatabase() {
  try {
    const res = await pool.query("SELECT data FROM hotels");
    if (res.rows.length > 0) {
      hotelsCache = res.rows.map(row => row.data);
      console.log(`Database loaded with ${hotelsCache.length} hotels from PostgreSQL.`);
    } else {
      console.warn("PostgreSQL empty, creating seed 'Folkestone Opera' hotel...");
      
      const seedHotel: Hotel = {
        id: "folkestone-opera",
        name: "Folkestone Opera",
        location: "Paris, France",
        rooms: [
          "Double Classique",
          "Double Single Use Classique",
          "Twin Classique",
          "Double Classique Terrasse",
          "Double Deluxe",
          "Twin Deluxe",
          "Double Deluxe Terrasse",
          "Deux Chambres Adjacentes 4 personnes"
        ],
        partners: parseInitialPartners(RAW_PARTNERS_JSON),
        rules: parseInitialPlanRules(RAW_PLAN_RULES_CSV),
        rates: []
      };
      
      hotelsCache = [seedHotel];
      await saveHotelToDb(seedHotel);
      console.log("Seeded database with 'folkestone-opera' in Postgres.");
    }
  } catch (err) {
    console.error("Error loading database from Postgres:", err);
  }
}

// Helper to look up hotels in cache with fallbacks
const getHotel = (hotelId: string) => {
  if (!hotelId) return hotelsCache[0];
  const exact = hotelsCache.find(h => h.id === hotelId);
  if (exact) return exact;
  const partial = hotelsCache.find(h => h.id.includes(hotelId) || hotelId.includes(h.id));
  if (partial) return partial;
  return hotelsCache[0];
};

/**
 * Rate Calculation Core Engine
 * Recalculates Derived rates for a given Hotel and subset of dates based on its plan rules.
 */
function calculateHotelRates(hotel: Hotel, datesToRecalculate?: string[]): Rate[] {
  const dates = datesToRecalculate || Array.from(new Set(hotel.rates.map(r => r.date)));
  const rules = hotel.rules;
  
  const rateLookupMap = new Map<string, Rate>();
  hotel.rates.forEach(r => {
    rateLookupMap.set(`${r.roomType}|${r.planCode}|${r.date}`, r);
  });

  // Optimize: group rates by roomType + date to avoid scanning the entire map on every iteration
  const ratesByRoomAndDate = new Map<string, Rate[]>();
  hotel.rates.forEach(r => {
    const key = `${r.roomType}|${r.date}`;
    if (!ratesByRoomAndDate.has(key)) {
      ratesByRoomAndDate.set(key, []);
    }
    ratesByRoomAndDate.get(key)!.push(r);
  });

  const roomTypes = hotel.rooms;

  dates.forEach(date => {
    roomTypes.forEach(roomType => {
      const roomDateKey = `${roomType}|${date}`;
      const candidates = ratesByRoomAndDate.get(roomDateKey) || [];

      rules.forEach(rule => {
        let basePlanCode = `${rule.baseSource}-RO-FLEX`;
        let baseRateObj = rateLookupMap.get(`${roomType}|${basePlanCode}|${date}`);
        
        if (!baseRateObj) {
          // Optimize: find matching prefix in candidates (only rates for this room + date) instead of all rates
          const matchPrefix = candidates.find(r => 
            r.planCode.startsWith(rule.baseSource) &&
            r.planCode.includes("RO") &&
            r.planCode.includes("FLEX")
          );
          if (matchPrefix) baseRateObj = matchPrefix;
        }
        
        if (!baseRateObj) {
          baseRateObj = rateLookupMap.get(`${roomType}|OTA-RO-FLEX|${date}`) || 
                        rateLookupMap.get(`${roomType}|RACK-RO-FLEX|${date}`);
        }

        const basePrice = baseRateObj ? baseRateObj.price : null;
        if (basePrice === null || basePrice === undefined) {
          return;
        }

        let currentPrice = basePrice;
        rule.steps.forEach(step => {
          if (step.operation === "multiply") {
            currentPrice = currentPrice * step.value;
          } else if (step.operation === "add") {
            currentPrice = currentPrice + step.value;
          } else if (step.operation === "subtract") {
            currentPrice = currentPrice - step.value;
          }
        });

        const finalCalculatedPrice = Math.round(currentPrice * 100) / 100;

        const key = `${roomType}|${rule.planCode}|${date}`;
        const existing = rateLookupMap.get(key);
        
        const leftForSale = baseRateObj ? baseRateObj.leftForSale : "X";
        
        if (existing) {
          existing.price = finalCalculatedPrice;
          existing.leftForSale = leftForSale;
        } else {
          const newRate: Rate = {
            roomType,
            planCode: rule.planCode,
            planName: rule.planCode.replace(/-/g, " "),
            date,
            price: finalCalculatedPrice,
            leftForSale
          };
          hotel.rates.push(newRate);
          rateLookupMap.set(key, newRate);
          candidates.push(newRate); // add to candidates as well in case subsequent rules need it
        }
      });
    });
  });

  return hotel.rates;
}

// Shared simulation logic
function performSimulation(hotel: Hotel, params: {
  startDate?: string,
  endDate?: string,
  roomType?: string,
  planCode?: string,
  partnerName: string,
  overrideDiscount?: number,
  overrideCommission?: number,
  commissionsEnabled?: boolean
}) {
  const { 
    startDate,
    endDate,
    roomType, 
    planCode, 
    partnerName,
    overrideDiscount,
    overrideCommission,
    commissionsEnabled
  } = params;

  const listDates: string[] = [];
  
  const robustParseDate = (dStr: string) => {
    if (!dStr || typeof dStr !== "string") return new Date(0);
    let day = 1, month = 1, year = 1970;
    if (dStr.includes("-")) {
      const parts = dStr.split("-");
      year = parseInt(parts[0]) || 1970;
      month = parseInt(parts[1]) || 1;
      day = parseInt(parts[2]) || 1;
    } else if (dStr.includes("/")) {
      const parts = dStr.split("/");
      day = parseInt(parts[0]) || 1;
      month = parseInt(parts[1]) || 1;
      year = parseInt(parts[2]) || 1970;
    } else {
      const parsed = Date.parse(dStr);
      if (!isNaN(parsed)) return new Date(parsed);
    }
    return new Date(year, month - 1, day);
  };

  const allUniqueDates = Array.from(new Set(hotel.rates.map(r => r.date))).sort((a,b) => {
    return robustParseDate(a).getTime() - robustParseDate(b).getTime();
  });

  if (startDate && endDate) {
    const sTime = robustParseDate(startDate).getTime();
    const eTime = robustParseDate(endDate).getTime();

    allUniqueDates.forEach(dStr => {
      const t = robustParseDate(dStr).getTime();
      if (t >= sTime && t <= eTime) {
        listDates.push(dStr);
      }
    });
  } else {
    if (allUniqueDates.length > 0) {
      listDates.push(allUniqueDates[0]);
    }
  }

  if (listDates.length === 0 && allUniqueDates.length > 0) {
    listDates.push(allUniqueDates[0]);
  }

  const selectedRoom = roomType || "Double Classique";
  const selectedPlan = planCode || "OTA-RO-NANR";

  const partnerConfig = hotel.partners[partnerName] || { commission: 0, codes: [] };
  
  let commPercentage = commissionsEnabled !== false 
    ? (typeof overrideCommission === "number" ? overrideCommission : partnerConfig.commission)
    : 0;

  let discountPercentage = 0;
  if (overrideDiscount !== undefined && overrideDiscount !== null) {
    discountPercentage = overrideDiscount;
  } else if (partnerConfig.defaultDiscount) {
    const exclude = partnerConfig.defaultDiscount.excludePlansContaining || [];
    const isExcluded = exclude.some(ex => selectedPlan.toLowerCase().includes(ex.toLowerCase()));
    if (!isExcluded) {
      discountPercentage = partnerConfig.defaultDiscount.percentage;
    }
  }

  const dayByDayCalculations: any[] = [];
  let totalPublicRates = 0;
  let totalDiscountedRates = 0;
  let totalCommissionCost = 0;
  let minInventoryAvailable = 999;
  let stopSalesActive = false;

  listDates.forEach(date => {
    const storedRate = hotel.rates.find(r => r.roomType === selectedRoom && r.planCode === selectedPlan && r.date === date);
    const planRule = hotel.rules.find(r => r.planCode === selectedPlan);

    let publicPrice = 0;
    let inventory = "X";
    let isFromExcel = false;
    let basePriceUsed = 0;
    let basePlanUsed = "Direct NonDérivé";
    let stepsTrace: { label: string; formula: string; output: number }[] = [];

    if (storedRate && storedRate.price !== null && storedRate.price !== undefined) {
      publicPrice = storedRate.price;
      inventory = storedRate.leftForSale;
      isFromExcel = true;
      basePlanUsed = "Importé d'Excel / Modifié";
      basePriceUsed = publicPrice;
    } else {
      if (planRule) {
        let basePlanCode = `${planRule.baseSource}-RO-FLEX`;
        let baseRateObj = hotel.rates.find(r => r.roomType === selectedRoom && r.planCode === basePlanCode && r.date === date);
        
        if (!baseRateObj) {
          baseRateObj = hotel.rates.find(r => 
            r.roomType === selectedRoom && 
            r.date === date && 
            r.planCode.startsWith(planRule.baseSource) &&
            r.planCode.includes("RO")
          );
        }

        if (baseRateObj && baseRateObj.price !== null && baseRateObj.price !== undefined) {
          basePriceUsed = baseRateObj.price;
          basePlanUsed = baseRateObj.planCode;
          inventory = baseRateObj.leftForSale;
        } else {
          basePriceUsed = 150.00;
          basePlanUsed = `${planRule.baseSource}-RO-FLEX (Valeur par défaut)`;
          inventory = "X";
        }

        let currentPrice = basePriceUsed;
        planRule.steps.forEach((step, index) => {
          const prev = currentPrice;
          if (step.operation === "multiply") {
            currentPrice = currentPrice * step.value;
            stepsTrace.push({
              label: `Règle ${index + 1} (${step.value >= 1 ? "+" : "-"}${Math.abs(Math.round((step.value - 1) * 100))}% )`,
              formula: `${prev.toFixed(2)} € × ${step.value}`,
              output: Math.round(currentPrice * 100) / 100
            });
          } else if (step.operation === "add") {
            currentPrice = currentPrice + step.value;
            stepsTrace.push({
              label: `Règle ${index + 1} Surcharge +${step.value} €`,
              formula: `${prev.toFixed(2)} € + ${step.value} €`,
              output: Math.round(currentPrice * 100) / 100
            });
          } else if (step.operation === "subtract") {
            currentPrice = currentPrice - step.value;
            stepsTrace.push({
              label: `Règle ${index + 1} Réduction -${step.value} €`,
              formula: `${prev.toFixed(2)} € - ${step.value} €`,
              output: Math.round(currentPrice * 100) / 100
            });
          }
        });
        publicPrice = Math.round(currentPrice * 100) / 100;
      } else {
        publicPrice = 150.00;
        inventory = "X";
        basePriceUsed = 150.00;
        basePlanUsed = "Aucune formule";
      }
    }

    if (inventory !== "X" && inventory !== "STOP") {
      const invNum = parseInt(inventory);
      if (!isNaN(invNum) && invNum < minInventoryAvailable) {
        minInventoryAvailable = invNum;
      }
    } else if (inventory === "STOP") {
      stopSalesActive = true;
    }

    const discountedRate = publicPrice * (1 - discountPercentage / 100);
    const commissionCost = discountedRate * (commPercentage / 100);
    const netReward = discountedRate - commissionCost;

    totalPublicRates += publicPrice;
    totalDiscountedRates += discountedRate;
    totalCommissionCost += commissionCost;

    dayByDayCalculations.push({
      date,
      publicPrice,
      inventory,
      isFromExcel,
      discountedPrice: Math.round(discountedRate * 100) / 100,
      commissionCost: Math.round(commissionCost * 100) / 100,
      netReward: Math.round(netReward * 100) / 100,
      basePlanUsed,
      basePriceUsed,
      stepsTrace
    });
  });

  const totalNetYield = totalDiscountedRates - totalCommissionCost;
  const yieldRetentionRate = totalPublicRates > 0 ? (totalNetYield / totalPublicRates) * 100 : 100;

  return {
    listDates,
    selectedRoom,
    selectedPlan,
    discountPercentage,
    commPercentage,
    totalPublicRates,
    totalDiscountedRates,
    totalCommissionCost,
    totalNetYield,
    yieldRetentionRate,
    minInventoryAvailable,
    stopSalesActive,
    dayByDayCalculations
  };
}

// ==========================================
// COMPATIBILITY ENDPOINTS (USER-WEB FRONTEND)
// ==========================================

// 1. GET /health
app.get("/health", (req, res) => {
  res.json({
    status: 'ok',
    service: 'rm.e-hotelmanager-api',
    version: '0.1.0',
  });
});

// 2. GET /hotels
app.get("/hotels", (req, res) => {
  const result = hotelsCache.map(h => ({
    hotel_id: h.id,
    name: h.name,
    timezone: "Europe/Paris",
    currency: "EUR"
  }));
  res.json(result);
});

// 3. GET /partners
app.get("/partners", (req, res) => {
  const hotelId = req.query.hotel_id as string;
  const hotel = getHotel(hotelId);
  if (!hotel) return res.status(404).json({ error: "Hôtel introuvable." });

  const result = Object.entries(hotel.partners).map(([name, config], index) => {
    return {
      id: index + 1,
      hotel_id: hotel.id,
      name: name,
      external_id: null,
      commission: config.commission,
      default_discount_percentage: config.defaultDiscount?.percentage || 0,
      plan_codes: config.codes
    };
  });
  res.json(result);
});

// 4. GET /availability
app.get("/availability", (req, res) => {
  const hotelId = req.query.hotel_id as string;
  const start = req.query.start as string; // YYYY-MM-DD
  const end = req.query.end as string; // YYYY-MM-DD
  const hotel = getHotel(hotelId);
  if (!hotel) return res.status(404).json({ error: "Hôtel introuvable." });

  const toISO = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddmmyyyy;
  };

  const availabilityMap = new Map<string, any>();

  hotel.rates.forEach(r => {
    const rIsoDate = toISO(r.date);
    if (rIsoDate >= start && rIsoDate <= end) {
      const key = `${rIsoDate}|${r.roomType}`;
      if (!availabilityMap.has(key)) {
        const lfs = r.leftForSale || "X";
        let status = "unknown";
        let availableQuantity = null;

        if (lfs === "X") {
          status = "unknown";
        } else if (lfs === "STOP" || lfs === "0") {
          status = "sold_out";
          availableQuantity = 0;
        } else {
          const num = parseInt(lfs);
          if (!isNaN(num)) {
            availableQuantity = num;
            status = num > 0 ? "available" : "sold_out";
          } else {
            status = "not_available_for_sale";
          }
        }

        availabilityMap.set(key, {
          id: availabilityMap.size + 1,
          hotel_id: hotel.id,
          import_id: 1,
          date: rIsoDate,
          room_name: r.roomType,
          raw_value: lfs,
          available_quantity: availableQuantity,
          status: status,
          label: lfs
        });
      }
    }
  });

  res.json(Array.from(availabilityMap.values()));
});

// 5. GET /imported-rates
app.get("/imported-rates", (req, res) => {
  const hotelId = req.query.hotel_id as string;
  const start = req.query.start as string;
  const end = req.query.end as string;
  const hotel = getHotel(hotelId);
  if (!hotel) return res.status(404).json({ error: "Hôtel introuvable." });

  const toISO = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddmmyyyy;
  };

  const results = hotel.rates
    .filter(r => {
      const isoDate = toISO(r.date);
      return isoDate >= start && isoDate <= end;
    })
    .map((r, index) => {
      return {
        id: index + 1,
        hotel_id: hotel.id,
        import_id: 1,
        date: toISO(r.date),
        room_name: r.roomType,
        plan_code: r.planCode,
        price: r.price,
        raw_value: r.price !== null ? String(r.price) : "",
        source: "excel",
        created_at: new Date().toISOString()
      };
    });

  res.json(results);
});

// 6. GET /rates/grid
app.get("/rates/grid", (req, res) => {
  const hotelId = req.query.hotel_id as string;
  const start = req.query.start as string; // YYYY-MM-DD
  const end = req.query.end as string; // YYYY-MM-DD
  const roomsQuery = req.query.rooms as string; // CSV
  const plansQuery = req.query.plans as string; // CSV
  const sourceMode = (req.query.source_mode as string) || "hybrid";

  const hotel = getHotel(hotelId);
  if (!hotel) return res.status(404).json({ error: "Hôtel introuvable." });

  const toISO = (ddmmyyyy: string) => {
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ddmmyyyy;
  };

  const roomsList = roomsQuery ? roomsQuery.split(",").map(r => r.trim()).filter(Boolean) : [];
  const plansList = plansQuery ? plansQuery.split(",").map(p => p.trim()).filter(Boolean) : [];

  // Filter and output rates
  // We need derived rates as well! So let's recalculate derived rates to make sure the rates array is populated!
  const datesInRange = Array.from(new Set(
    hotel.rates
      .map(r => r.date)
      .filter(d => {
        const iso = toISO(d);
        return iso >= start && iso <= end;
      })
  ));
  calculateHotelRates(hotel, datesInRange);

  const filteredRates = hotel.rates.filter(r => {
    const rIsoDate = toISO(r.date);
    const dateMatch = rIsoDate >= start && rIsoDate <= end;
    const roomMatch = roomsList.length === 0 || roomsList.includes(r.roomType);
    const planMatch = plansList.length === 0 || plansList.includes(r.planCode);
    return dateMatch && roomMatch && planMatch;
  });

  const items = filteredRates.map(r => {
    const isDerived = hotel.rules.some(rule => rule.planCode === r.planCode);
    return {
      date: toISO(r.date),
      room_name: r.roomType,
      plan_code: r.planCode,
      source_used: isDerived ? "calculated" : "excel",
      price: r.price
    };
  });

  res.json({ items });
});

// 7. POST /simulate
app.post("/simulate", (req, res) => {
  const { hotel_id, room_name, plan_code, partner_name, source_mode, start, end, promo_discount, apply_commission } = req.body;
  const hotel = getHotel(hotel_id);
  if (!hotel) return res.status(404).json({ error: "Hôtel introuvable." });

  // Settle inputs
  const sim = performSimulation(hotel, {
    startDate: start,
    endDate: end,
    roomType: room_name,
    planCode: plan_code,
    partnerName: partner_name,
    overrideDiscount: undefined, // fallback to partner default discount
    overrideCommission: undefined,
    commissionsEnabled: apply_commission !== false
  });

  res.json({
    summary: {
      subtotal_brut: sim.totalPublicRates,
      total_partner_discount: sim.totalPublicRates - sim.totalDiscountedRates,
      total_promo_discount: 0,
      total_discount: sim.totalPublicRates - sim.totalDiscountedRates,
      total_commission: sim.totalCommissionCost,
      total_net: sim.totalNetYield
    },
    results: sim.dayByDayCalculations.map(day => ({
      date_display: day.date,
      plan_code: sim.selectedPlan,
      stock: day.inventory,
      gross_price: day.publicPrice,
      net_price: day.netReward
    }))
  });
});

// ==========================================
// ADMIN COCKPIT API REST ENDPOINTS
// ==========================================

// 1. GET ALL HOTELS
app.get("/api/hotels", (req, res) => {
  const result = hotelsCache.map(h => {
    const dates = Array.from(new Set(h.rates.map(r => r.date)));
    return {
      id: h.id,
      name: h.name,
      location: h.location,
      roomsCount: h.rooms.length,
      partnersCount: Object.keys(h.partners).length,
      rulesCount: h.rules.length,
      ratesCount: h.rates.length,
      datesRange: dates.sort()
    };
  });
  res.json(result);
});

// 2. CREATE A NEW HOTEL
app.post("/api/hotels", async (req, res) => {
  const { name, location, templateHotelId } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Le nom de l'hôtel est obligatoire" });
  }

  const newId = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (hotelsCache.some(h => h.id === newId)) {
    return res.status(400).json({ error: "Un hôtel avec ce nom existe déjà." });
  }

  let partnersTemplate = {};
  let rulesTemplate: PlanRule[] = [];
  let roomsTemplate: string[] = ["Double Classique", "Suite Deluxe", "Twin Elegance"];
  let ratesTemplate: Rate[] = [];

  const templateHotel = hotelsCache.find(h => h.id === templateHotelId) || hotelsCache[0];
  if (templateHotel) {
    partnersTemplate = JSON.parse(JSON.stringify(templateHotel.partners));
    rulesTemplate = JSON.parse(JSON.stringify(templateHotel.rules));
    roomsTemplate = JSON.parse(JSON.stringify(templateHotel.rooms));
    
    const today = "20/05/2026";
    const tomorrow = "21/05/2026";
    roomsTemplate.forEach(room => {
      ratesTemplate.push({
        roomType: room,
        planCode: "OTA-RO-FLEX",
        planName: "OTA RO FLEX",
        date: today,
        price: 150.00,
        leftForSale: "5"
      });
      ratesTemplate.push({
        roomType: room,
        planCode: "OTA-RO-FLEX",
        planName: "OTA RO FLEX",
        date: tomorrow,
        price: 165.00,
        leftForSale: "5"
      });
    });
  }

  const newHotel: Hotel = {
    id: newId,
    name,
    location: location || "France",
    rooms: roomsTemplate,
    partners: partnersTemplate,
    rules: rulesTemplate,
    rates: ratesTemplate
  };

  calculateHotelRates(newHotel);
  hotelsCache.push(newHotel);
  await saveHotelToDb(newHotel);

  res.status(201).json({ status: "success", hotel: newHotel });
});

// 3. GET A SPECIFIC HOTEL BY ID WITH CONFIGS & RATES
app.get("/api/hotels/:id", (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }
  res.json(hotel);
});

// 4. PUT CONFIGURATION OF A HOTEL (PARTNERS & RULES & ROOMS)
app.put("/api/hotels/:id/config", async (req, res) => {
  const { name, location, partners, rules, rooms } = req.body;
  const hotelIndex = hotelsCache.findIndex(h => h.id === req.params.id);
  
  if (hotelIndex === -1) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  const hotel = hotelsCache[hotelIndex];
  if (name) hotel.name = name;
  if (location) hotel.location = location;
  if (partners) hotel.partners = partners;
  if (rules) hotel.rules = rules;
  if (rooms) hotel.rooms = rooms;

  calculateHotelRates(hotel);
  await saveHotelToDb(hotel);

  res.json({ status: "success", hotel });
});

// 5. DELETE A HOTEL
app.delete("/api/hotels/:id", async (req, res) => {
  const hotelIndex = hotelsCache.findIndex(h => h.id === req.params.id);
  if (hotelIndex === -1) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  if (hotelsCache.length <= 1) {
    return res.status(400).json({ error: "Impossible de supprimer le dernier hôtel restant de votre base." });
  }

  hotelsCache.splice(hotelIndex, 1);
  await deleteHotelFromDb(req.params.id);

  res.json({ status: "success", message: "Hôtel supprimé." });
});

// 6. UPLOAD EXCEL / CSV RATES
app.post("/api/hotels/:id/upload-rates", async (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  const { csvText, fileBase64, fileName, datesInput } = req.body;
  let parsedRatesList: Rate[] = [];
  let datesFound: string[] = [];

  try {
    if (fileBase64) {
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      if (rows.length === 0) {
        return res.status(400).json({ error: "Le fichier Excel est vide." });
      }

      console.log(`Processing Excel: ${fileName}. Rows: ${rows.length}`);
      
      let headerRowIndex = 0;
      let maxDatesCount = 0;
      let colIndicesWithDates: { index: number; dateStr: string }[] = [];

      for (let r = 0; r < Math.min(rows.length, 15); r++) {
        const currentRow = rows[r] || [];
        const currentDates: { index: number; dateStr: string }[] = [];
        for (let c = 2; c < currentRow.length; c++) {
          const parsedDate = tryParseToDDMMYYYY(currentRow[c]);
          if (parsedDate) {
            currentDates.push({ index: c, dateStr: parsedDate });
          }
        }
        if (currentDates.length > maxDatesCount) {
          maxDatesCount = currentDates.length;
          colIndicesWithDates = currentDates;
          headerRowIndex = r;
        }
      }

      if (colIndicesWithDates.length === 0) {
        const headerRow = rows[0] || [];
        for (let c = 3; c < headerRow.length; c++) {
          const parsedDate = tryParseToDDMMYYYY(headerRow[c]);
          if (parsedDate) {
            colIndicesWithDates.push({ index: c, dateStr: parsedDate });
          }
        }
      }

      if (colIndicesWithDates.length === 0) {
        const customDates: string[] = Array.isArray(datesInput) ? datesInput : ["13/05/2026", "14/05/2026"];
        for (let idx = 0; idx < customDates.length; idx++) {
          colIndicesWithDates.push({ index: 3 + idx, dateStr: customDates[idx] });
        }
      }

      datesFound = colIndicesWithDates.map(item => item.dateStr);

      const excelLeftForSale: { [room: string]: { [date: string]: string } } = {};

      rows.forEach(cells => {
        if (!cells || cells.length < 3) return;
        const roomType = String(cells[0] || "").trim();
        const indicator = String(cells[2] || "").trim().toLowerCase();
        const isLeftForSale = indicator === "left for sale" || indicator.includes("dispo") || indicator.includes("l.f.s") || indicator === "lfs" || indicator.includes("libre") || indicator.includes("vente");

        if (roomType && isLeftForSale) {
          excelLeftForSale[roomType] = {};
          colIndicesWithDates.forEach(cItem => {
            const rawInv = cells[cItem.index] !== undefined ? String(cells[cItem.index]).trim() : "X";
            excelLeftForSale[roomType][cItem.dateStr] = rawInv;
          });
        }
      });

      rows.forEach(cells => {
        if (!cells || cells.length < 4) return;
        const roomType = String(cells[0] || "").trim();
        const rateCol = String(cells[1] || "").trim();
        const indicator = String(cells[2] || "").trim().toLowerCase();
        const isPrice = indicator === "price (eur)" || indicator.includes("price") || indicator.includes("tarif") || indicator.includes("prix");

        if (roomType && rateCol && isPrice) {
          const planParts = rateCol.split(" - ");
          const planCode = planParts[0]?.trim() || rateCol;
          const planName = planParts[1]?.trim() || rateCol;

          colIndicesWithDates.forEach(cItem => {
            const rawPriceStr = String(cells[cItem.index] || "")
              .replace(",", ".")
              .replace(/[^0-9.]/g, "");
            const parsedPrice = parseFloat(rawPriceStr);
            const priceVal = isNaN(parsedPrice) ? null : parsedPrice;

            const roomInvMap = excelLeftForSale[roomType] || {};
            const leftForSale = roomInvMap[cItem.dateStr] || "X";

            parsedRatesList.push({
              roomType,
              planCode,
              planName,
              date: cItem.dateStr,
              price: priceVal,
              leftForSale
            });
          });
        }
      });
    } else if (csvText) {
      const lines = csvText.split("\n");
      const leftForSaleMap: { [room: string]: { [colIndex: number]: string } } = {};
      
      const customDates: string[] = Array.isArray(datesInput) ? datesInput : ["13/05/2026", "14/05/2026"];
      const headerRow = lines[0]?.split(";") || [];
      const colIndicesWithDates: { index: number; dateStr: string }[] = [];

      for (let c = 3; c < headerRow.length; c++) {
        const val = headerRow[c]?.trim();
        const parsedDate = tryParseToDDMMYYYY(val);
        if (parsedDate) {
          colIndicesWithDates.push({ index: c, dateStr: parsedDate });
        }
      }

      if (colIndicesWithDates.length === 0) {
        customDates.forEach((d, index) => {
          colIndicesWithDates.push({ index: 3 + index, dateStr: d });
        });
      }

      datesFound = colIndicesWithDates.map(c => c.dateStr);

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        const cols = line.split(";");
        if (cols.length < 4) continue;

        const roomType = cols[0].trim();
        if (!roomType || roomType.startsWith("FOLKESTONE") || roomType.toLowerCase().startsWith("room")) continue;

        const metric = cols[2] ? cols[2].trim().toLowerCase() : "";
        const isLeftForSale = metric === "left for sale" || metric.includes("dispo") || metric.includes("l.f.s") || metric === "lfs" || metric.includes("libre") || metric.includes("vente");

        if (cols[2] && isLeftForSale) {
          leftForSaleMap[roomType] = {};
          colIndicesWithDates.forEach(cd => {
            leftForSaleMap[roomType][cd.index] = cols[cd.index] !== undefined ? cols[cd.index].trim() : "X";
          });
          continue;
        }

        const planCol = cols[1]?.trim() || "";
        const isPrice = metric === "price (eur)" || metric.includes("price") || metric.includes("tarif") || metric.includes("prix");

        if (planCol && isPrice) {
          const planParts = planCol.split(" - ");
          const planCode = planParts[0]?.trim() || planCol;
          const planName = planParts[1]?.trim() || planCol;

          colIndicesWithDates.forEach(cd => {
            const rawVal = cols[cd.index]?.replace(",", ".") || "";
            const price = parseFloat(rawVal);
            const priceVal = isNaN(price) ? null : price;

            const roomInv = leftForSaleMap[roomType] || {};
            const leftForSale = roomInv[cd.index] || "X";

            parsedRatesList.push({
              roomType,
              planCode,
              planName,
              date: cd.dateStr,
              price: priceVal,
              leftForSale
            });
          });
        }
      }
    } else {
      return res.status(400).json({ error: "Aucun fichier Excel ou texte CSV fourni." });
    }

    if (parsedRatesList.length === 0) {
      return res.status(400).json({ error: "Aucun tarif n'a pu être extrait. Veuillez vérifier le format." });
    }

    const keySet = new Set(parsedRatesList.map(r => `${r.roomType}|${r.planCode}|${r.date}`));
    
    hotel.rates = hotel.rates.filter(existing => {
      const key = `${existing.roomType}|${existing.planCode}|${existing.date}`;
      return !keySet.has(key);
    });

    hotel.rates.push(...parsedRatesList);

    const uniqueRoomsInUpload = Array.from(new Set(parsedRatesList.map(r => r.roomType)));
    uniqueRoomsInUpload.forEach(r => {
      if (!hotel.rooms.includes(r)) {
        hotel.rooms.push(r);
      }
    });

    calculateHotelRates(hotel, datesFound);
    await saveHotelToDb(hotel);

    await logToDb("INFO", "UPLOAD", `Importation Excel réussie pour l'hôtel ${hotel.name} (${parsedRatesList.length} tarifs, dates: ${datesFound.join(", ")})`, {
      fileName: fileName || "Import",
      tarifsCount: parsedRatesList.length,
      dates: datesFound
    });

    res.json({
      status: "success",
      message: `Tarifs importés avec succès. ${parsedRatesList.length} cellules de prix chargées pour ${datesFound.length} dates différentes (${datesFound.join(", ")}).`,
      dates: datesFound,
      ratesCount: parsedRatesList.length,
      hotel
    });

  } catch (err: any) {
    console.error("Error occurred while parsing rate upload:", err);
    await logToDb("ERROR", "UPLOAD", `Erreur d'importation Excel pour l'hôtel ${hotel.id} : ${err.message}`, {
      stack: err.stack,
      fileName
    });
    res.status(500).json({ error: `Échec du traitement du fichier: ${err.message}` });
  }
});

// 6b. UPLOAD JSON OTA PARTNERS CONFIG
app.post("/api/hotels/:id/upload-partners", async (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  const { partnersJson, partnersData } = req.body;
  let dataToParse = partnersData;

  try {
    if (partnersJson) {
      dataToParse = JSON.parse(partnersJson);
    }

    if (!dataToParse) {
      return res.status(400).json({ error: "Aucune donnée de partenaires fournie." });
    }

    let rawPartnersMap: any = {};
    if (Array.isArray(dataToParse)) {
      dataToParse.forEach((p: any) => {
        if (p.partnerName) {
          rawPartnersMap[p.partnerName] = p;
        }
      });
    } else if (dataToParse.partners) {
      rawPartnersMap = dataToParse.partners;
    } else {
      rawPartnersMap = dataToParse;
    }

    const updatedPartners: { [name: string]: PartnerConfig } = {};
    Object.keys(rawPartnersMap).forEach(key => {
      const val = rawPartnersMap[key];
      updatedPartners[key] = {
        commission: typeof val.commission === 'number' ? val.commission : 0,
        codes: Array.isArray(val.codes) ? val.codes : [],
        defaultDiscount: val.defaultDiscount ? {
          percentage: typeof val.defaultDiscount.percentage === 'number' ? val.defaultDiscount.percentage : 0,
          excludePlansContaining: Array.isArray(val.defaultDiscount.excludePlansContaining) ? val.defaultDiscount.excludePlansContaining : []
        } : undefined
      };
    });

    if (Object.keys(updatedPartners).length === 0) {
      return res.status(400).json({ error: "Le JSON ne contient aucun partenaire valide." });
    }

    hotel.partners = updatedPartners;

    calculateHotelRates(hotel);
    await saveHotelToDb(hotel);

    res.json({
      status: "success",
      message: `${Object.keys(updatedPartners).length} configurations de partenaires enregistrées avec succès.`,
      partnersCount: Object.keys(updatedPartners).length,
      hotel
    });
  } catch (err: any) {
    res.status(400).json({ error: `JSON invalide: ${err.message}` });
  }
});

// 6c. UPLOAD JSON OR CSV CALCULATION RULES CONFIG
app.post("/api/hotels/:id/upload-rules", async (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  const { rulesJson, rulesData, csvText } = req.body;

  try {
    let updatedRules: PlanRule[] = [];

    if (csvText) {
      updatedRules = parseInitialPlanRules(csvText);
    } else {
      let dataToParse = rulesData;
      if (rulesJson) {
        dataToParse = JSON.parse(rulesJson);
      }

      if (!dataToParse) {
        return res.status(400).json({ error: "Aucune formule de calcul fournie." });
      }

      let rawRulesList: any[] = [];
      if (Array.isArray(dataToParse)) {
        rawRulesList = dataToParse;
      } else if (dataToParse.rules && Array.isArray(dataToParse.rules)) {
        rawRulesList = dataToParse.rules;
      } else if (typeof dataToParse === "object") {
        Object.keys(dataToParse).forEach(k => {
          rawRulesList.push({
            planCode: k,
            ...dataToParse[k]
          });
        });
      }

      rawRulesList.forEach((r: any) => {
        if (!r.planCode || !r.baseSource) return;
        
        const steps: RateStep[] = [];
        if (Array.isArray(r.steps)) {
          r.steps.forEach((s: any) => {
            if (s.operation && s.value !== undefined) {
              steps.push({
                operation: s.operation,
                value: Number(s.value)
              });
            }
          });
        }
        updatedRules.push({
          planCode: r.planCode,
          baseSource: r.baseSource,
          steps
        });
      });
    }

    if (updatedRules.length === 0) {
      return res.status(400).json({ error: "Aucune formule de calcul valide trouvée dans votre fichier." });
    }

    hotel.rules = updatedRules;

    calculateHotelRates(hotel);
    await saveHotelToDb(hotel);

    res.json({
      status: "success",
      message: `${updatedRules.length} formules de calcul configurées avec succès. Les tarifs dérivés ont été recalculés.`,
      rulesCount: updatedRules.length,
      hotel
    });
  } catch (err: any) {
    res.status(400).json({ error: `Erreur lors de l'application des formules: ${err.message}` });
  }
});

// 6d. CLEAR ALL RATES (VIRGIN TOOL STATE)
app.post("/api/hotels/:id/rates/clear", async (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  hotel.rates = [];
  await saveHotelToDb(hotel);

  res.json({
    status: "success",
    message: "Tous les tarifs et disponibilités ont été vidés de la base de données. Votre outil est maintenant vierge et prêt pour de nouveaux imports.",
    hotel
  });
});

// 7. PUT/POST EDIT REFERENCE RATE & AUTOMATE RECALCULATION
app.post("/api/hotels/:id/rates/update-reference", async (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  const { roomType, planCode, date, newPrice, leftForSale, updates } = req.body;

  const resolvedRoomType = roomType || "Double Classique";
  const resolvedPlanCode = planCode || "OTA-RO-FLEX";

  let datesToRecalculate: string[] = [];

  if (Array.isArray(updates)) {
    updates.forEach((item: any) => {
      if (!item.date) return;
      datesToRecalculate.push(item.date);
      
      const itemRoomType = item.roomType || resolvedRoomType;
      const itemPlanCode = item.planCode || resolvedPlanCode;

      const match = hotel.rates.find(r => 
        r.roomType === itemRoomType && 
        r.planCode === itemPlanCode && 
        r.date === item.date
      );

      if (match) {
        if (item.price !== undefined && item.price !== null) {
          match.price = parseFloat(item.price);
        }
        if (item.leftForSale !== undefined && item.leftForSale !== null) {
          match.leftForSale = String(item.leftForSale);
        }
      } else {
        hotel.rates.push({
          roomType: itemRoomType,
          planCode: itemPlanCode,
          planName: itemPlanCode.replace(/-/g, ' '),
          date: item.date,
          price: (item.price !== undefined && item.price !== null) ? parseFloat(item.price) : 150.00,
          leftForSale: (item.leftForSale !== undefined && item.leftForSale !== null) ? String(item.leftForSale) : "5"
        });
      }
    });
  } else {
    if (!date) {
      return res.status(400).json({ error: "La date de modification de base est obligatoire." });
    }
    datesToRecalculate.push(date);

    const match = hotel.rates.find(r => 
      r.roomType === resolvedRoomType && 
      r.planCode === resolvedPlanCode && 
      r.date === date
    );

    if (match) {
      if (newPrice !== undefined) match.price = parseFloat(newPrice);
      if (leftForSale !== undefined) match.leftForSale = String(leftForSale);
    } else {
      hotel.rates.push({
        roomType: resolvedRoomType,
        planCode: resolvedPlanCode,
        planName: "OTA RO FLEX",
        date: date,
        price: newPrice !== undefined ? parseFloat(newPrice) : 150,
        leftForSale: leftForSale !== undefined ? String(leftForSale) : "5"
      });
    }
  }

  calculateHotelRates(hotel, datesToRecalculate);
  await saveHotelToDb(hotel);

  await logToDb("INFO", "RATE_UPDATE", `Mise à jour des tarifs/dispos pour ${hotel.name} (${datesToRecalculate.length} dates : ${datesToRecalculate.join(", ")})`, {
    hotelId: hotel.id,
    dates: datesToRecalculate,
    updatesCount: datesToRecalculate.length
  });

  res.json({
    status: "success",
    message: `Référence mise à jour. Les autres plans pour la date ou les dates (${datesToRecalculate.join(", ")}) ont été recalculés séquentiellement en arrière-plan.`,
    hotel
  });
});

// 8. SIMULATOR CALCULATOR ACROSS DATES (ADMIN PORTAL PATH)
app.post("/api/hotels/:id/simulate", (req, res) => {
  const hotel = hotelsCache.find(h => h.id === req.params.id);
  if (!hotel) {
    return res.status(404).json({ error: "Hôtel introuvable." });
  }

  const { 
    startDate,
    endDate,
    roomType, 
    planCode, 
    partnerName,
    overrideDiscount,
    overrideCommission,
    commissionsEnabled
  } = req.body;

  const sim = performSimulation(hotel, {
    startDate,
    endDate,
    roomType,
    planCode,
    partnerName,
    overrideDiscount,
    overrideCommission,
    commissionsEnabled
  });

  res.json({
    status: "success",
    simulation: {
      startDate: sim.listDates[0] || startDate,
      endDate: sim.listDates[sim.listDates.length - 1] || endDate,
      nightsCount: sim.listDates.length,
      roomType: sim.selectedRoom,
      planCode: sim.selectedPlan,
      partnerName,
      discountPercentage: sim.discountPercentage,
      commissionPercentage: sim.commPercentage,
      summary: {
        totalPublic: Math.round(sim.totalPublicRates * 100) / 100,
        totalDiscounted: Math.round(sim.totalDiscountedRates * 100) / 100,
        totalCommissionValue: Math.round(sim.totalCommissionCost * 100) / 100,
        totalNetYield: Math.round(sim.totalNetYield * 100) / 100,
        yieldRetentionRate: Math.round(sim.yieldRetentionRate * 10) / 10,
        minInventoryAvailable: sim.minInventoryAvailable === 999 ? "X" : sim.minInventoryAvailable,
        stopSalesActive: sim.stopSalesActive
      },
      days: sim.dayByDayCalculations
    }
  });
});

// GET SYSTEM LOGS
app.get("/api/logs", async (req, res) => {
  const levelFilter = req.query.level as string;
  const categoryFilter = req.query.category as string;
  const searchFilter = req.query.search as string;

  try {
    let queryText = "SELECT * FROM api_logs WHERE 1=1";
    const queryParams: any[] = [];

    if (levelFilter && levelFilter !== "ALL") {
      queryParams.push(levelFilter);
      queryText += ` AND level = $${queryParams.length}`;
    }
    if (categoryFilter && categoryFilter !== "ALL") {
      queryParams.push(categoryFilter);
      queryText += ` AND category = $${queryParams.length}`;
    }
    if (searchFilter) {
      queryParams.push(`%${searchFilter}%`);
      queryText += ` AND (message ILIKE $${queryParams.length} OR CAST(details AS TEXT) ILIKE $${queryParams.length})`;
    }

    queryText += " ORDER BY timestamp DESC LIMIT 200";

    const dbResult = await pool.query(queryText, queryParams);
    return res.json(dbResult.rows);
  } catch (err) {
    let filtered = [...inMemoryLogs];
    if (levelFilter && levelFilter !== "ALL") {
      filtered = filtered.filter(l => l.level === levelFilter);
    }
    if (categoryFilter && categoryFilter !== "ALL") {
      filtered = filtered.filter(l => l.category === categoryFilter);
    }
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(l => 
        l.message.toLowerCase().includes(searchLower) ||
        (l.details && JSON.stringify(l.details).toLowerCase().includes(searchLower))
      );
    }
    return res.json(filtered.slice(0, 200));
  }
});

// CLEAR SYSTEM LOGS
app.post("/api/logs/clear", async (req, res) => {
  inMemoryLogs = [];
  try {
    await pool.query("DELETE FROM api_logs");
    await logToDb("INFO", "DATABASE", "Historique des logs système vidé par l'administrateur.");
    res.json({ status: "success", message: "Logs effacés avec succès dans la base de données." });
  } catch (err: any) {
    await logToDb("INFO", "DATABASE", "Historique des logs effacé en mémoire locale.");
    res.json({ status: "success", message: "Logs effacés en mémoire locale (échec de suppression DB)." });
  }
});

async function startServer() {
  // Start HTTP server immediately — DB init is non-blocking
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hotel Management Standalone API server listening on http://0.0.0.0:${PORT}`);
  });

  // Attempt DB init (non-fatal — server continues even if DB is unavailable)
  try {
    await initDb();
  } catch (err) {
    console.error("[STARTUP] DB init failed, running in-memory mode:", err);
    bootWithSeedData();
  }
}

startServer();

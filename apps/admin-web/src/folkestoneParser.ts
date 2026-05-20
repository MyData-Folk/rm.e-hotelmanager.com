// Client-side parser for Folkestone Opera's CSV and JSON configuration files

export interface ParsedRate {
  roomType: string;
  planCode: string;
  planName: string;
  leftForSale13: string;
  leftForSale14: string;
  price13: number | null;
  price14: number | null;
}

export interface RuleStep {
  operation: 'multiply' | 'add' | 'subtract';
  value: number;
}

export interface ParsedPlanRule {
  planCode: string;
  baseSource: string;
  steps: RuleStep[];
}

export interface PartnerConfig {
  commission: number;
  codes: string[];
  defaultDiscount?: {
    percentage: number;
    excludePlansContaining: string[];
  };
}

export interface ParsedPartners {
  partners: {
    [name: string]: PartnerConfig;
  };
  roomsOrder: string[];
}

/**
 * Parses the Semicolon-Separated CSV for Room Rates
 */
export function parseRatesCSV(csvText: string): ParsedRate[] {
  const lines = csvText.split('\n');
  const results: ParsedRate[] = [];
  
  // Track last seen inventory "Left for sale" for each room category
  const leftForSaleMap: { [room: string]: { day13: string; day14: string } } = {};
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    const cols = line.split(';');
    if (cols.length < 4) continue;
    
    const roomType = cols[0].trim();
    if (!roomType || roomType.startsWith('FOLKESTONE')) continue; // skip header line
    
    // Check if it represents room inventory "Left for sale"
    if (cols[2] && cols[2].trim().toLowerCase() === 'left for sale') {
      const d13 = cols[3] ? cols[3].trim() : 'X';
      const d14 = cols[4] ? cols[4].trim() : 'X';
      leftForSaleMap[roomType] = { day13: d13, day14: d14 };
      continue;
    }
    
    // Check if it represents a rate code
    const planCol = cols[1] ? cols[1].trim() : '';
    const metric = cols[2] ? cols[2].trim() : '';
    
    if (planCol && metric.toLowerCase() === 'price (eur)') {
      const planParts = planCol.split(' - ');
      const planCode = planParts[0]?.trim() || planCol;
      const planName = planParts[1]?.trim() || planCol;
      
      const val13 = cols[3]?.replace(',', '.') || '';
      const val14 = cols[4]?.replace(',', '.') || '';
      
      const price13 = parseFloat(val13);
      const price14 = parseFloat(val14);
      
      const inventory = leftForSaleMap[roomType] || { day13: 'X', day14: 'X' };
      
      results.push({
        roomType,
        planCode,
        planName,
        leftForSale13: inventory.day13,
        leftForSale14: inventory.day14,
        price13: isNaN(price13) ? null : price13,
        price14: isNaN(price14) ? null : price14
      });
    }
  }
  
  return results;
}

/**
 * Parses the Comma-Separated CSV for Plan Rules (Rule steps stack)
 */
export function parsePlanRulesCSV(csvText: string): ParsedPlanRule[] {
  const lines = csvText.split('\n');
  const results: ParsedPlanRule[] = [];
  
  if (lines.length < 2) return [];
  
  // Header line index finder
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(',');
    if (cols.length < 2) continue;
    
    const planCode = cols[0].trim();
    const baseSource = cols[1].trim();
    if (planCode.toLowerCase() === 'plancode') continue; // header safety
    
    const steps: RuleStep[] = [];
    
    // Read successive Step types & values (Step1Type, Step1Value, etc.) up to 5 steps
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
    
    results.push({
      planCode,
      baseSource,
      steps
    });
  }
  
  return results;
}

/**
 * Parses the JSON config for partners
 */
export function parsePartnersJSON(jsonText: string): ParsedPartners {
  try {
    const rawObj = JSON.parse(jsonText);
    const partners: { [name: string]: PartnerConfig } = {};
    const roomsOrder: string[] = [];
    
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
    
    if (rawObj.displayOrder && Array.isArray(rawObj.displayOrder.rooms)) {
      rawObj.displayOrder.rooms.forEach((r: any) => {
        if (typeof r === 'string') roomsOrder.push(r);
      });
    }
    
    return { partners, roomsOrder };
  } catch (err) {
    console.error("Error parsing partners JSON:", err);
    return { partners: {}, roomsOrder: [] };
  }
}

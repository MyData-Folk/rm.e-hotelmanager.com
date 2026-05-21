import { 
  RateStep, 
  PlanRule, 
  PartnerConfig, 
  Rate, 
  HotelSummary, 
  HotelDetailed, 
  SimulationResult 
} from './types';

export interface RateStep {
  operation: 'multiply' | 'add' | 'subtract';
  value: number;
}

export interface PlanRule {
  planCode: string;
  baseSource: string;
  steps: RateStep[];
}

export interface PartnerConfig {
  commission: number;
  codes: string[];
  defaultDiscount?: {
    percentage: number;
    excludePlansContaining: string[];
  };
}

export interface Rate {
  roomType: string;
  planCode: string;
  planName: string;
  date: string; // DD/MM/YYYY
  price: number | null;
  leftForSale: string;
}

export interface HotelSummary {
  id: string;
  name: string;
  location: string;
}

export interface HotelDetailed extends HotelSummary {
  rooms: string[];
  roomCapacity?: { [roomType: string]: number };
  partners: { [partnerName: string]: PartnerConfig };
  rules: PlanRule[];
  rates: Rate[];
}

export interface SimulationDay {
  date: string;
  publicPrice: number;
  discountedPrice: number;
  commissionCost: number;
  netReward: number;
  inventory: string;
  isFromExcel: boolean;
  basePlanUsed: string;
  basePriceUsed: number;
  stepsTrace: { label: string; formula: string; output: number }[];
}

export interface SimulationResult {
  startDate: string;
  endDate: string;
  nightsCount: number;
  roomType: string;
  planCode: string;
  partnerName: string;
  discountPercentage: number;
  commissionPercentage: number;
  summary: {
    totalPublic: number;
    totalDiscounted: number;
    totalCommissionValue: number;
    totalNetYield: number;
    yieldRetentionRate: number;
    minInventoryAvailable: number | string;
    stopSalesActive: boolean;
  };
  days: SimulationDay[];
}
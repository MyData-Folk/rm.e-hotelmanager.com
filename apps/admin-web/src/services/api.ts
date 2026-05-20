import { HotelSummary, HotelDetailed, SimulationResult, PartnerConfig } from '../types';

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
  return '';
};

export const API_URL = getApiUrl();

export const hotelApi = {
  /**
   * Fetch list of all hotel summaries.
   */
  async getHotels(): Promise<HotelSummary[]> {
    const response = await fetch(`${API_URL}/api/hotels`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des hôtels: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Fetch detailed hotel by ID.
   */
  async getHotelDetails(id: string): Promise<HotelDetailed> {
    const response = await fetch(`${API_URL}/api/hotels/${id}`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des détails de l'hôtel: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  },

  /**
   * Create a new hotel.
   */
  async createHotel(payload: { name: string; location: string; templateHotelId?: string }): Promise<HotelSummary> {
    const res = await fetch(`${API_URL}/api/hotels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur de création: ${res.statusText}`);
    }
    const data = await res.json();
    return data.hotel;
  },

  /**
   * Delete hotel by ID.
   */
  async deleteHotel(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/api/hotels/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur lors de la suppression: ${res.statusText}`);
    }
  },

  /**
   * Run yield simulation cockpit.
   */
  async simulate(
    hotelId: string, 
    payload: {
      startDate: string;
      endDate: string;
      roomType: string;
      planCode: string;
      partnerName: string;
      overrideDiscount?: number;
      overrideCommission?: number;
      commissionsEnabled: boolean;
    }
  ): Promise<SimulationResult> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur de simulation: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Save reference rate and left-for-sale updates.
   */
  async updateReferenceRate(
    hotelId: string,
    payload: {
      roomType: string;
      updates: { [date: string]: { price?: string; inventory?: string } };
    }
  ): Promise<{ hotel: HotelDetailed }> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/rates/update-reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur de mise à jour des tarifs: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Save partners & default rules configurations.
   */
  async updateHotelConfig(
    hotelId: string,
    payload: {
      partners: { [name: string]: PartnerConfig };
      rooms: string[];
    }
  ): Promise<{ status: string; hotel: HotelDetailed }> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur de configuration: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Submit base rates spreadsheet upload.
   */
  async uploadRatesSpreadsheet(hotelId: string, spreadsheetBase64: string): Promise<{ ratesCount: number; dates: string[] }> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/upload-rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetBase64 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur lors de l'upload des tarifs: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Clear all rates (back to virgin state / empty rates list).
   */
  async clearAllRates(hotelId: string): Promise<{ message: string; hotel: HotelDetailed }> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/rates/clear`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur lors de la réinitialisation: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Submit partners list config upload as JSON (or JSON string).
   */
  async uploadPartnersFile(hotelId: string, partnerData: any): Promise<{ message: string; hotel: HotelDetailed }> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/upload-partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerData })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur lors de l'upload des distributeurs: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Submit calculation rules cascade upload (CSV raw text or JSON object).
   */
  async uploadRulesFile(hotelId: string, payload: { csvText?: string; rulesData?: any }): Promise<{ message: string; hotel: HotelDetailed }> {
    const res = await fetch(`${API_URL}/api/hotels/${hotelId}/upload-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur lors de l'upload des formules de calcul: ${res.statusText}`);
    }
    return res.json();
  }
};

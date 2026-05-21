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
  roomCapacity?: { [roomType: string]: number };
  partners: { [partnerName: string]: PartnerConfig };
  rules: PlanRule[];
  rates: Rate[];
}

// ... rest of server.ts file stays the same ...

// Update /availability endpoint to return roomCapacity
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

  const roomCapacityMap = hotel.roomCapacity || {};
  res.json({ items: Array.from(availabilityMap.values()), room_capacity: roomCapacityMap });
});

// Update hotel config endpoint to support roomCapacity
app.put("/api/hotels/:id/config", async (req, res) => {
  const { name, location, partners, rules, rooms, roomCapacity } = req.body;
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
  if (roomCapacity) hotel.roomCapacity = roomCapacity;

  calculateHotelRates(hotel);
  await saveHotelToDb(hotel);

  res.json({ status: "success", hotel });
});

app.post("/api/hotels", async (req, res) => {
  const { name, location, templateHotelId, roomCapacity } = req.body;
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
    roomCapacity: roomCapacity || (templateHotel ? JSON.parse(JSON.stringify(templateHotel.roomCapacity || {})) : {}),
    partners: partnersTemplate,
    rules: rulesTemplate,
    rates: ratesTemplate
  };

  calculateHotelRates(newHotel);
  hotelsCache.push(newHotel);
  await saveHotelToDb(newHotel);

  res.status(201).json({ status: "success", hotel: newHotel });
});
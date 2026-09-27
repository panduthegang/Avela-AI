import { GoogleGenAI } from '@google/genai';
import { EventRequirements } from '../types/banquet';

const STORAGE_KEY = 'avela_gemini_api_key';

export function getApiKey(): string {
  const customKey = localStorage.getItem(STORAGE_KEY);
  if (customKey && customKey.trim()) {
    return customKey.trim();
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKey(): boolean {
  const key = getApiKey();
  return Boolean(key && key.trim().length > 5);
}

export interface ExtractedAIResponse {
  requirements: EventRequirements;
  acknowledgmentMessage: string;
  followUpQuestionsMessage?: string;
  conciergeResponse: string;
  suggestedFollowUps?: string[];
  rawJson?: string;
  isFallback?: boolean;
}

const AVELA_SYSTEM_INSTRUCTION = `
You are Avela, an exclusive luxury banquet & celebration concierge.
CRITICAL IDENTITY RULES:
- Your name is strictly "Avela".
- NEVER refer to yourself as Gemini, Google, an AI model, a language model, or an LLM.
- You speak with warmth, hospitality, and sophisticated precision.

CRITICAL EXTRACTION & HALLUCINATION RULES:
1. Extract event specifications strictly from the user's inquiry into a rigid JSON structure.
2. If any piece of information is missing or ambiguous, output "Not Provided" (or null for numbers) instead of inventing it.
3. NEVER invent package prices, room prices, banquet facilities (e.g., do not invent swimming pools, helipads), discounts, or customer preferences.
4. Detect any conflicting information (e.g. "small gathering of 600 people" or contradictory dates).
5. In "conciergeResponse":
   - Avela MUST actively ask the customer for the missing information in clear numbered questions!
   - Acknowledge what was provided, then clearly state:
     "To help me recommend the ideal verified banquet properties and prepare an itemized quotation, could you please clarify:
     1. [Question about missing City]
     2. [Question about missing Event Date]
     3. [Question about missing Budget]"
   - If critical information like Date, City, or Budget is missing, explicitly explain that package selection and quotations will be finalized once these details are confirmed.
6. In "suggestedFollowUps":
   - Provide 3 to 6 practical QUICK ANSWERS formatted as user replies that the user can click to answer the missing information!
   - Examples: "City: Ahmedabad", "Date: 20 December 2026", "Budget: ₹6,00,000", "Meal: Dinner", "Time: Evening", "Decoration Required".
   - DO NOT format them as questions from the user to Avela!

You MUST return ONLY valid raw JSON with NO markdown code fences, NO backticks, following this exact schema:
{
  "eventType": string (e.g. "Wedding", "Corporate", "Reception", or "Not Provided"),
  "city": string (e.g. "Ahmedabad" or "Not Provided"),
  "date": string (e.g. "20 December" or "2026-12-20" or "Not Provided"),
  "time": string (e.g. "Evening", "Lunch", "Morning", or "Not Provided"),
  "guestCount": number or null (e.g. 450),
  "foodType": string (e.g. "Jain", "Vegetarian", "Not Provided"),
  "meal": string (e.g. "Dinner", "Lunch", "Hi-Tea", or "Not Provided"),
  "decorationRequired": boolean or null (true if requested, false if explicitly refused, null if not mentioned),
  "roomsRequired": number or null (e.g. 10),
  "budget": number or null (in numerical INR e.g. 600000. Extract from terms like 6 lakhs, 4 lakh, 6,00,000, 6L),
  "missingInformation": array of strings (e.g. ["City", "Event Date", "Approximate Budget"]),
  "conflictingInformation": array of strings (empty if none),
  "conciergeResponse": string (A warm message acknowledging extracted info, then actively asking for missing details in numbered questions),
  "suggestedFollowUps": array of strings (Quick answers user can click, e.g. ["City: Ahmedabad", "Date: 20 December 2026", "Budget: ₹6,00,000"])
}
`;

/**
 * Normalizes and deduplicates missing information labels into standard terms
 */
export function normalizeMissingInfo(rawItems: string[]): string[] {
  const map: Record<string, string> = {
    'city': 'City / Location',
    'location': 'City / Location',
    'date': 'Event Date & Year',
    'event date': 'Event Date & Year',
    'year': 'Event Date & Year',
    'time': 'Time of Day',
    'guest count': 'Guest Count',
    'food': 'Food / Dietary Preference',
    'jain': 'Food / Dietary Preference',
    'meal': 'Meal (Lunch/Dinner)',
    'decor': 'Decoration Style',
    'decoration': 'Decoration Style',
    'rooms': 'Rooms Required',
    'budget': 'Customer Budget',
    'approximate budget': 'Customer Budget',
    'event type': 'Event Type'
  };

  const normalized = new Set<string>();
  rawItems.forEach((item) => {
    const clean = item.trim().toLowerCase();
    let found = false;
    for (const [key, val] of Object.entries(map)) {
      if (clean.includes(key)) {
        normalized.add(val);
        found = true;
        break;
      }
    }
    if (!found && item.trim()) {
      normalized.add(item.trim());
    }
  });

  return Array.from(normalized);
}

/**
 * Validates and sanitizes raw AI JSON into guaranteed safe EventRequirements
 */
export function sanitizeRequirements(data: Record<string, unknown>): EventRequirements {
  const cleanNumber = (val: unknown): number | null => {
    if (typeof val === 'number' && !isNaN(val) && val >= 0) return Math.round(val);
    if (typeof val === 'string') {
      const parsed = parseInt(val.replace(/[^0-9]/g, ''), 10);
      return !isNaN(parsed) && parsed >= 0 ? parsed : null;
    }
    return null;
  };

  const cleanString = (val: unknown, fallback = 'Not Provided'): string => {
    if (typeof val === 'string' && val.trim() && val.trim().toLowerCase() !== 'unknown' && val.trim().toLowerCase() !== 'null') {
      return val.trim();
    }
    return fallback;
  };

  const cleanBool = (val: unknown): boolean | null => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === 'yes' || lower === 'required') return true;
      if (lower === 'false' || lower === 'no' || lower === 'not required') return false;
    }
    return null;
  };

  const rawMissing: string[] = [];
  if (Array.isArray(data.missingInformation)) {
    data.missingInformation.forEach((item) => {
      if (typeof item === 'string' && item.trim()) rawMissing.push(item.trim());
    });
  }

  // Automatic verification of missing essentials if not caught
  const guestCount = cleanNumber(data.guestCount);
  const budget = cleanNumber(data.budget);
  const roomsRequired = cleanNumber(data.roomsRequired);
  const eventType = cleanString(data.eventType);
  const city = cleanString(data.city);
  const date = cleanString(data.date);
  const foodType = cleanString(data.foodType);

  if (eventType === 'Not Provided') rawMissing.push('event type');
  if (city === 'Not Provided') rawMissing.push('city');
  if (date === 'Not Provided') rawMissing.push('event date');
  if (guestCount === null) rawMissing.push('guest count');
  if (budget === null) rawMissing.push('budget');

  const deduplicatedMissing = normalizeMissingInfo(rawMissing);

  const conflicting: string[] = [];
  if (Array.isArray(data.conflictingInformation)) {
    data.conflictingInformation.forEach((item) => {
      if (typeof item === 'string' && item.trim()) conflicting.push(item.trim());
    });
  }

  return {
    eventType,
    city,
    date,
    time: cleanString(data.time),
    guestCount,
    foodType,
    meal: cleanString(data.meal),
    decorationRequired: cleanBool(data.decorationRequired),
    roomsRequired,
    budget,
    missingInformation: deduplicatedMissing,
    conflictingInformation: conflicting
  };
}

export const CITY_ALIASES: Record<string, string> = {
  ahmedabad: 'Ahmedabad',
  ahemdabad: 'Ahmedabad',
  ahmadabad: 'Ahmedabad',
  amdavad: 'Ahmedabad',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  ncr: 'Delhi',
  bangalore: 'Bangalore',
  bengaluru: 'Bangalore',
  jaipur: 'Jaipur',
  udaipur: 'Udaipur',
  surat: 'Surat',
  pune: 'Pune',
  goa: 'Goa',
  hyderabad: 'Hyderabad',
  chennai: 'Chennai',
  madras: 'Chennai',
  kolkata: 'Kolkata',
  calcutta: 'Kolkata',
  vadodara: 'Vadodara',
  baroda: 'Vadodara',
  rajkot: 'Rajkot',
  gandhinagar: 'Gandhinagar',
  gurgaon: 'Gurgaon',
  gurugram: 'Gurgaon',
  noida: 'Noida',
  chandigarh: 'Chandigarh'
};

const MONTH_MAP: Record<string, string> = {
  jan: 'January', january: 'January',
  feb: 'February', february: 'February',
  mar: 'March', march: 'March',
  apr: 'April', april: 'April',
  may: 'May',
  jun: 'June', june: 'June',
  jul: 'July', july: 'July',
  aug: 'August', august: 'August',
  sep: 'September', sept: 'September', september: 'September',
  oct: 'October', october: 'October',
  nov: 'November', november: 'November',
  dec: 'December', december: 'December'
};

export function normalizeDateString(raw: string): string {
  let cleaned = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [abbr, full] of Object.entries(MONTH_MAP)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, full);
      break;
    }
  }
  return cleaned;
}

export function extractCity(text: string): string | null {
  const prefixMatch = text.match(/(?:city|location|venue|place)[\s:]+([a-zA-Z\s]+?)(?:,|$|\.|\n|date|meal|rooms?|food|budget|guests?|time)/i);
  if (prefixMatch && prefixMatch[1].trim()) {
    const raw = prefixMatch[1].trim();
    const rawLower = raw.toLowerCase();
    if (CITY_ALIASES[rawLower]) {
      return CITY_ALIASES[rawLower];
    }
    return raw.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  const lower = text.toLowerCase();
  const aliasKeys = Object.keys(CITY_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliasKeys) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(lower)) {
      return CITY_ALIASES[alias];
    }
  }

  return null;
}

export function extractDate(text: string): string | null {
  const prefixMatch = text.match(/(?:date|dated|on\s+date)[\s:]+([0-9a-zA-Z\s,/-]+?)(?:,|$|\.|\n|meal|rooms?|city|food|budget|guests?|time)/i);
  if (prefixMatch && prefixMatch[1].trim()) {
    return normalizeDateString(prefixMatch[1].trim());
  }

  const monthMatchA = text.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))(?:\s+\d{2,4})?)/i);
  if (monthMatchA) {
    return normalizeDateString(monthMatchA[1]);
  }

  const monthMatchB = text.match(/((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember))\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{2,4})?)/i);
  if (monthMatchB) {
    return normalizeDateString(monthMatchB[1]);
  }

  const numDate = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (numDate) {
    return numDate[1];
  }

  const standaloneMonth = text.match(/(?:in|on)?\s*(\d{1,2})?\s*(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?/i);
  if (standaloneMonth) {
    const day = standaloneMonth[1] ? standaloneMonth[1] + ' ' : '';
    const m = standaloneMonth[2].charAt(0).toUpperCase() + standaloneMonth[2].slice(1).toLowerCase();
    const yr = standaloneMonth[3] ? ' ' + standaloneMonth[3] : '';
    return `${day}${m}${yr}`.trim();
  }

  return null;
}

export function extractRooms(text: string): number | null {
  // 1. Explicit positive number first: "10 rooms", "20 rooms", "10 deluxe rooms", "5 suites"
  const numFirst = text.match(/(\d+)\s*(?:rooms?|suites?|deluxe|accommodations?)/i);
  if (numFirst) {
    return parseInt(numFirst[1], 10);
  }

  // 2. Word first with digits: "rooms 10", "rooms: 10", "room: 5", "accommodation: 15"
  const wordFirst = text.match(/(?:rooms?|accommodation|stay|suites?)[\s:]+(\d+)/i);
  if (wordFirst) {
    return parseInt(wordFirst[1], 10);
  }

  // 3. Zero rooms - MUST have word boundary so "10 rooms" or "20 rooms" doesn't falsely match "0 rooms"!
  if (
    /\b(?:no|zero|without)\s+(?:rooms?|accommodation|stay|suites?)\b/i.test(text) ||
    /\b0\s*(?:rooms?|accommodation|stay|suites?)\b/i.test(text) ||
    /(?:rooms?|accommodation|stay)[\s:]*\b(?:none|no|0|zero)\b/i.test(text)
  ) {
    return 0;
  }

  return null;
}

export function extractMeal(text: string): string | null {
  const prefixMatch = text.match(/(?:meal|catering\s*slot)[\s:]*(dinner|lunch|breakfast|hi-tea|high\s*tea)/i);
  if (prefixMatch) {
    const m = prefixMatch[1].toLowerCase();
    if (m.includes('lunch')) return 'Lunch';
    if (m.includes('dinner')) return 'Dinner';
    if (m.includes('breakfast')) return 'Breakfast';
    if (m.includes('tea')) return 'Hi-Tea';
  }

  const lower = text.toLowerCase();
  if (/\bdinner\b/i.test(lower)) return 'Dinner';
  if (/\blunch\b/i.test(lower)) return 'Lunch';
  if (/\b(?:hi-tea|high\s*tea)\b/i.test(lower)) return 'Hi-Tea';
  if (/\bbreakfast\b/i.test(lower)) return 'Breakfast';

  return null;
}

export function extractTime(text: string): string | null {
  const prefixMatch = text.match(/(?:time|timing)[\s:]*([a-zA-Z0-9\s:]+?)(?:,|$|\.|\n|meal|rooms?|city|food|budget|guests?|date)/i);
  if (prefixMatch && prefixMatch[1].trim()) {
    const raw = prefixMatch[1].trim();
    if (raw.length <= 20) return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  const lower = text.toLowerCase();
  if (/\bevening\b/i.test(lower) || /\bnight\b/i.test(lower)) return 'Evening';
  if (/\bafternoon\b/i.test(lower)) return 'Afternoon';
  if (/\bmorning\b/i.test(lower) || /\bday\b/i.test(lower)) return 'Morning';

  return null;
}

export function extractGuests(text: string): number | null {
  const prefixMatch = text.match(/(?:guests?|people|pax|attendees|members|gathering)[\s:]+(\d+)/i);
  if (prefixMatch) {
    return parseInt(prefixMatch[1], 10);
  }

  const numFirst = text.match(/(\d+)\s*(?:guests?|people|pax|attendees|members)/i);
  if (numFirst) {
    return parseInt(numFirst[1], 10);
  }

  return null;
}

export function extractFood(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bjain\b/i.test(lower)) return 'Jain';
  if (/\b(?:pure\s*veg|vegetarian|veg)\b/i.test(lower) && !/\bnon-veg/i.test(lower)) return 'Vegetarian';
  if (/\bnon-veg/i.test(lower)) return 'Non-Vegetarian';
  return null;
}

export function extractBudget(text: string): number | null {
  const lakhWithKeyword = text.match(/(?:budget|cost|price|package|under|around|approx)[\s:]*(?:₹|inr|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l)\b/i);
  if (lakhWithKeyword) {
    return Math.round(parseFloat(lakhWithKeyword[1]) * 100000);
  }

  const lakhWithCurrency = text.match(/(?:₹|inr|rs\.?)\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac)\b/i);
  if (lakhWithCurrency) {
    return Math.round(parseFloat(lakhWithCurrency[1]) * 100000);
  }

  const standaloneLakh = text.match(/\b(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac)\b/i);
  if (standaloneLakh) {
    return Math.round(parseFloat(standaloneLakh[1]) * 100000);
  }

  const budgetNum = text.match(/(?:budget|cost|price|package|approx)[\s:]*(?:₹|inr|rs\.?)?\s*([\d,]+)/i);
  if (budgetNum) {
    const val = parseInt(budgetNum[1].replace(/,/g, ''), 10);
    if (val >= 10000) return val;
  }

  const currencyNum = text.match(/(?:₹|inr|rs\.?)\s*([\d,]+)/i);
  if (currencyNum) {
    const val = parseInt(currencyNum[1].replace(/,/g, ''), 10);
    if (val >= 10000) return val;
  }

  return null;
}

export function extractDecoration(text: string): boolean | null {
  const lower = text.toLowerCase();
  if (/(?:no|without|skip)\s*(?:decor|decoration|flowers?|stage)/i.test(lower)) return false;
  if (/(?:decor|decoration|flowers?|stage|backdrop)[\s:]*(?:yes|required|needed|true)/i.test(lower)) return true;
  if (/\b(?:decor|decoration)\s+required\b/i.test(lower)) return true;
  return null;
}

export function extractEventType(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('wedding') || lower.includes('marriage') || lower.includes('shaadi')) {
    return 'Wedding';
  } else if (lower.includes('corporate') || lower.includes('conference') || lower.includes('seminar') || lower.includes('summit')) {
    return 'Corporate';
  } else if (lower.includes('reception') || lower.includes('sangeet') || lower.includes('engagement') || lower.includes('anniversary')) {
    return 'Reception / Celebration';
  }
  return null;
}

export function extractUpdatesFromText(text: string): Partial<EventRequirements> {
  const updates: Partial<EventRequirements> = {};

  const evType = extractEventType(text);
  if (evType) updates.eventType = evType;

  const city = extractCity(text);
  if (city) updates.city = city;

  const date = extractDate(text);
  if (date) updates.date = date;

  const rooms = extractRooms(text);
  if (rooms !== null) updates.roomsRequired = rooms;

  const meal = extractMeal(text);
  if (meal) updates.meal = meal;

  const time = extractTime(text);
  if (time) updates.time = time;

  const guests = extractGuests(text);
  if (guests !== null) updates.guestCount = guests;

  const food = extractFood(text);
  if (food) updates.foodType = food;

  const budget = extractBudget(text);
  if (budget !== null) updates.budget = budget;

  const decor = extractDecoration(text);
  if (decor !== null) updates.decorationRequired = decor;

  return updates;
}

export function computeMissingInformation(req: Partial<EventRequirements> | EventRequirements): string[] {
  const missing: string[] = [];
  if (!req.eventType || req.eventType === 'Not Provided') missing.push('Event Type');
  if (!req.city || req.city === 'Not Provided') missing.push('City / Location');
  if (!req.date || req.date === 'Not Provided') missing.push('Event Date & Year');
  if (req.guestCount === null || req.guestCount === undefined) missing.push('Guest Count');
  if (!req.foodType || req.foodType === 'Not Provided') missing.push('Food / Dietary Preference');
  if (req.budget === null || req.budget === undefined) missing.push('Customer Budget');
  if (req.roomsRequired === null && (req.eventType === 'Wedding' || req.eventType?.includes('Celebration'))) {
    missing.push('Rooms Required');
  }
  return missing;
}

export function applyUpdatesToRequirements(
  current: EventRequirements,
  updates: Partial<EventRequirements>
): { updatedRequirements: EventRequirements; changed: boolean } {
  let changed = false;
  const next: EventRequirements = { ...current };

  if (updates.eventType && updates.eventType !== 'Not Provided' && updates.eventType !== next.eventType) {
    next.eventType = updates.eventType;
    changed = true;
  }
  if (updates.city && updates.city !== 'Not Provided' && updates.city !== next.city) {
    next.city = updates.city;
    changed = true;
  }
  if (updates.date && updates.date !== 'Not Provided' && updates.date !== next.date) {
    next.date = updates.date;
    changed = true;
  }
  if (updates.time && updates.time !== 'Not Provided' && updates.time !== next.time) {
    next.time = updates.time;
    changed = true;
  }
  if (typeof updates.guestCount === 'number' && updates.guestCount > 0 && updates.guestCount !== next.guestCount) {
    next.guestCount = updates.guestCount;
    changed = true;
  }
  if (updates.foodType && updates.foodType !== 'Not Provided' && updates.foodType !== next.foodType) {
    next.foodType = updates.foodType;
    changed = true;
  }
  if (updates.meal && updates.meal !== 'Not Provided' && updates.meal !== next.meal) {
    next.meal = updates.meal;
    changed = true;
  }
  if (typeof updates.decorationRequired === 'boolean' && updates.decorationRequired !== next.decorationRequired) {
    next.decorationRequired = updates.decorationRequired;
    changed = true;
  }
  if (typeof updates.roomsRequired === 'number' && updates.roomsRequired >= 0 && updates.roomsRequired !== next.roomsRequired) {
    next.roomsRequired = updates.roomsRequired;
    changed = true;
  }
  if (typeof updates.budget === 'number' && updates.budget > 0 && updates.budget !== next.budget) {
    next.budget = updates.budget;
    changed = true;
  }

  // Always recompute missing information dynamically
  next.missingInformation = computeMissingInformation(next);

  return { updatedRequirements: next, changed };
}

/**
 * Intelligent deterministic heuristic parser used as fallback
 * when API is unreachable or key is not provided yet.
 */
export function extractRequirementsFallback(query: string): ExtractedAIResponse {
  const updates = extractUpdatesFromText(query);

  const eventType = updates.eventType || 'Not Provided';
  const city = updates.city || 'Not Provided';
  const date = updates.date || 'Not Provided';
  const time = updates.time || 'Not Provided';
  const guestCount = updates.guestCount !== undefined ? updates.guestCount : null;
  const foodType = updates.foodType || 'Not Provided';
  const meal = updates.meal || 'Not Provided';
  const decorationRequired = updates.decorationRequired !== undefined ? updates.decorationRequired : (eventType === 'Wedding' ? true : null);
  const roomsRequired = updates.roomsRequired !== undefined ? updates.roomsRequired : null;
  const budget = updates.budget !== undefined ? updates.budget : null;

  const tempReq: EventRequirements = {
    eventType,
    city,
    date,
    time,
    guestCount,
    foodType,
    meal,
    decorationRequired,
    roomsRequired,
    budget,
    missingInformation: [],
    conflictingInformation: []
  };

  const deduplicatedMissing = computeMissingInformation(tempReq);
  tempReq.missingInformation = deduplicatedMissing;

  // Formulate active numbered questions for Avela's reply
  const missingQuestions: string[] = [];
  if (city === 'Not Provided') missingQuestions.push('Which city would you like to host your event in?');
  if (date === 'Not Provided') missingQuestions.push('What is the preferred event date and year?');
  if (guestCount === null) missingQuestions.push('What is your estimated guest count?');
  if (foodType === 'Not Provided') missingQuestions.push('What are your catering preferences (Pure Vegetarian or Jain)?');
  if (budget === null) missingQuestions.push('What is your approximate overall budget for this event?');
  if (roomsRequired === null && (eventType === 'Wedding' || eventType.includes('Celebration'))) {
    missingQuestions.push('How many guest accommodation rooms will you need?');
  }

  let ackMsg = `Welcome to Avela Concierge. I have registered your ${eventType !== 'Not Provided' ? eventType.toLowerCase() : 'event'} specifications`;
  if (guestCount !== null) ackMsg += ` for ${guestCount} guests`;
  if (foodType !== 'Not Provided') ackMsg += ` with ${foodType} catering`;
  if (roomsRequired !== null) ackMsg += ` and ${roomsRequired} guest rooms`;
  ackMsg += `. Here is your extracted event profile:`;

  let followUpMsg: string | undefined = undefined;
  if (missingQuestions.length > 0) {
    followUpMsg = `To help me recommend the ideal verified banquet properties and prepare an itemized quotation, could you please clarify:\n`;
    missingQuestions.forEach((q, i) => {
      followUpMsg += `\n${i + 1}. ${q}`;
    });
    followUpMsg += `\n\nPlease reply in the chat with your preferred details so I can proceed with matching the banquet properties.`;
  }

  let responseText = `${ackMsg}\n\n${followUpMsg || 'All event specifications are verified.'}`;

  return {
    requirements: tempReq,
    acknowledgmentMessage: ackMsg,
    followUpQuestionsMessage: followUpMsg,
    conciergeResponse: responseText,
    isFallback: true
  };
}

/**
 * Executes Gemini analysis to extract structured requirements and formulate Avela's reply.
 */
export async function analyzeInquiryWithGemini(query: string): Promise<ExtractedAIResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    // Graceful fallback to deterministic intelligent parser without crashing
    return extractRequirementsFallback(query);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
Customer Inquiry:
"${query}"

Please extract the event specifications according to the required JSON schema. Remember:
- You are Avela.
- Never mention Gemini, Google, or an LLM.
- If information is not in the customer's text, output "Not Provided" or null.
- In "conciergeResponse": Avela MUST warmly ask the customer the numbered questions for any missing information!
- Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: promptText,
      config: {
        systemInstruction: AVELA_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    
    // Clean potential markdown blocks
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedJson = JSON.parse(cleaned);
    const sanitizedReq = sanitizeRequirements(parsedJson);

    // Formulate active numbered questions from missing fields
    const missingQuestions: string[] = [];
    if (sanitizedReq.city === 'Not Provided') missingQuestions.push('Which city will your event take place in?');
    if (sanitizedReq.date === 'Not Provided') missingQuestions.push('What is the preferred event date and year?');
    if (sanitizedReq.guestCount === null) missingQuestions.push('What is your estimated guest count?');
    if (sanitizedReq.foodType === 'Not Provided') missingQuestions.push('What are your catering preferences (Pure Vegetarian or Jain)?');
    if (sanitizedReq.budget === null) missingQuestions.push('What is your approximate overall budget for this event?');
    if (sanitizedReq.roomsRequired === null && (sanitizedReq.eventType === 'Wedding' || sanitizedReq.eventType.includes('Celebration'))) {
      missingQuestions.push('How many guest accommodation rooms will you need?');
    }

    let ackMsg = `Welcome to Avela Concierge. I have registered your ${sanitizedReq.eventType !== 'Not Provided' ? sanitizedReq.eventType.toLowerCase() : 'event'} specifications`;
    if (sanitizedReq.guestCount !== null) ackMsg += ` for ${sanitizedReq.guestCount} guests`;
    if (sanitizedReq.foodType !== 'Not Provided') ackMsg += ` with ${sanitizedReq.foodType} catering`;
    if (sanitizedReq.roomsRequired !== null) ackMsg += ` and ${sanitizedReq.roomsRequired} guest rooms`;
    ackMsg += `. Here is your extracted event profile:`;

    let followUpMsg: string | undefined = undefined;
    if (missingQuestions.length > 0) {
      followUpMsg = `To help me recommend the ideal verified banquet properties and prepare an itemized quotation, could you please clarify:\n`;
      missingQuestions.forEach((q, i) => {
        followUpMsg += `\n${i + 1}. ${q}`;
      });
      followUpMsg += `\n\nPlease reply in the chat with your preferred details so I can proceed with matching the banquet properties.`;
    }

    const conciergeMsg: string = typeof parsedJson.conciergeResponse === 'string' && parsedJson.conciergeResponse.trim()
      ? parsedJson.conciergeResponse
      : `${ackMsg}\n\n${followUpMsg || 'All event specifications are verified.'}`;

    return {
      requirements: sanitizedReq,
      acknowledgmentMessage: ackMsg,
      followUpQuestionsMessage: followUpMsg,
      conciergeResponse: conciergeMsg,
      rawJson: cleaned,
      isFallback: false
    };
  } catch (error) {
    console.warn('Gemini API call failed, switching to local deterministic engine:', error);
    // Graceful error recovery: Return deterministic extraction
    return extractRequirementsFallback(query);
  }
}

/**
 * Handles conversational follow-up questions from the user in chat
 */
export async function answerFollowUpWithGemini(
  conversationHistory: { sender: 'user' | 'assistant'; text: string }[],
  currentRequirements: EventRequirements
): Promise<{ text: string; updatedRequirements?: Partial<EventRequirements> }> {
  const lastUserMsg = conversationHistory[conversationHistory.length - 1]?.text || '';
  const localUpdates = extractUpdatesFromText(lastUserMsg);

  const apiKey = getApiKey();

  if (!apiKey) {
    let reply = 'Thank you for providing these details. I have updated your celebration profile.';
    const updatedKeys = Object.keys(localUpdates);
    if (updatedKeys.length > 0) {
      reply = `I have registered your ${updatedKeys.join(', ')} specifications. Updating your banquet evaluation and quotations now...`;
    }

    return {
      text: reply,
      updatedRequirements: localUpdates
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are Avela, luxury event concierge.
Current Extracted Event Requirements:
${JSON.stringify(currentRequirements, null, 2)}

Recent Conversation:
${conversationHistory.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

Task:
Respond graciously to the customer's latest query.
If the customer has provided any new information (such as city, date, timing, meal, budget, guest count, dietary preference, room count), output a JSON object:
{
  "reply": "Your response to the user as Avela (no mention of AI/Gemini)",
  "extractedUpdates": {
    "city": string or null (e.g. "Ahmedabad"),
    "date": string or null (e.g. "26 September 2026"),
    "time": string or null (e.g. "Evening"),
    "guestCount": number or null (e.g. 700),
    "foodType": string or null (e.g. "Jain"),
    "meal": string or null (e.g. "Lunch" or "Dinner"),
    "decorationRequired": boolean or null,
    "roomsRequired": number or null (e.g. 10),
    "budget": number or null (e.g. 600000)
  }
}
Return raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: promptText,
      config: {
        systemInstruction: AVELA_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

    const cleaned = (response.text || '{}').trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    const aiUpdates = (parsed && typeof parsed.extractedUpdates === 'object' && parsed.extractedUpdates) || {};
    const mergedUpdates: Partial<EventRequirements> = {
      ...aiUpdates,
      ...localUpdates
    };

    return {
      text: parsed.reply || 'Your event details have been noted and verified.',
      updatedRequirements: mergedUpdates
    };
  } catch (err) {
    console.warn('Gemini chat follow-up error, relying on deterministic extractor:', err);
    return {
      text: 'I have noted your preferences and updated your banquet inquiry profile accordingly.',
      updatedRequirements: localUpdates
    };
  }
}

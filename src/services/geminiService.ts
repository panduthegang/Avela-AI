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
  conciergeResponse: string;
  suggestedFollowUps: string[];
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

/**
 * Intelligent deterministic heuristic parser used as fallback
 * when API is unreachable or key is not provided yet.
 */
export function extractRequirementsFallback(query: string): ExtractedAIResponse {
  const lower = query.toLowerCase();

  // Guest count extraction (e.g. 450 guests, 300 pax, 500 people)
  let guestCount: number | null = null;
  const guestMatch = query.match(/(\d+)\s*(?:guests?|people|pax|attendees|members)/i) || query.match(/guests?[\s:]+(\d+)/i);
  if (guestMatch) {
    guestCount = parseInt(guestMatch[1], 10);
  }

  // Budget extraction (e.g. 6 lakhs, 6,00,000, 600000, ₹6,00,000)
  let budget: number | null = null;
  const lakhMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l)\b/i);
  if (lakhMatch) {
    budget = Math.round(parseFloat(lakhMatch[1]) * 100000);
  } else {
    const rawBudgetMatch = query.match(/(?:budget|cost|price|package|under|around)[\s:]*(?:₹|inr|rs\.?)?\s*([\d,]+)/i) ||
      query.match(/(?:₹|inr|rs\.?)\s*([\d,]+)/i);
    if (rawBudgetMatch) {
      const num = parseInt(rawBudgetMatch[1].replace(/,/g, ''), 10);
      if (num > 10000) budget = num;
    }
  }

  // Rooms extraction
  let roomsRequired: number | null = null;
  const roomsMatch = query.match(/(\d+)\s*(?:rooms?|suites?|deluxe)/i) || query.match(/rooms?[\s:]+(\d+)/i);
  if (roomsMatch) {
    roomsRequired = parseInt(roomsMatch[1], 10);
  }

  // City extraction
  let city = 'Not Provided';
  const cities = ['Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Udaipur', 'Surat', 'Pune', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata'];
  for (const c of cities) {
    if (lower.includes(c.toLowerCase())) {
      city = c;
      break;
    }
  }

  // Event type extraction
  let eventType = 'Not Provided';
  if (lower.includes('wedding') || lower.includes('marriage') || lower.includes('shaadi')) {
    eventType = 'Wedding';
  } else if (lower.includes('corporate') || lower.includes('conference') || lower.includes('seminar') || lower.includes('summit')) {
    eventType = 'Corporate';
  } else if (lower.includes('reception') || lower.includes('sangeet') || lower.includes('engagement') || lower.includes('anniversary')) {
    eventType = 'Reception / Celebration';
  }

  // Food type extraction
  let foodType = 'Not Provided';
  if (lower.includes('jain')) {
    foodType = 'Jain';
  } else if (lower.includes('veg') || lower.includes('vegetarian')) {
    foodType = 'Vegetarian';
  }

  // Meal extraction
  let meal = 'Not Provided';
  if (lower.includes('dinner') || lower.includes('evening banquet')) {
    meal = 'Dinner';
  } else if (lower.includes('lunch') || lower.includes('afternoon')) {
    meal = 'Lunch';
  }

  // Time extraction
  let time = 'Not Provided';
  if (lower.includes('evening') || lower.includes('night')) {
    time = 'Evening';
  } else if (lower.includes('morning') || lower.includes('afternoon') || lower.includes('day')) {
    time = 'Afternoon';
  }

  // Date extraction
  let date = 'Not Provided';
  const dateMatch = query.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?)/i) ||
    query.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (dateMatch) {
    date = dateMatch[1];
  } else if (lower.includes('december') || lower.includes('november') || lower.includes('january')) {
    const monthMatch = query.match(/(?:on|in)?\s*(\d{1,2})?\s*(december|november|january|february|march|april|may|june|july|august|september|october)/i);
    if (monthMatch) {
      date = `${monthMatch[1] ? monthMatch[1] + ' ' : ''}${monthMatch[2]}`;
    }
  }

  // Decoration
  let decorationRequired: boolean | null = null;
  if (lower.includes('no decor') || lower.includes('without decor')) {
    decorationRequired = false;
  } else if (lower.includes('decor') || lower.includes('flower') || lower.includes('stage') || lower.includes('backdrop') || eventType === 'Wedding') {
    decorationRequired = true;
  }

  const rawMissing: string[] = [];
  if (eventType === 'Not Provided') rawMissing.push('event type');
  if (city === 'Not Provided') rawMissing.push('city');
  if (date === 'Not Provided') rawMissing.push('event date');
  if (guestCount === null) rawMissing.push('guest count');
  if (foodType === 'Not Provided') rawMissing.push('food');
  if (budget === null) rawMissing.push('budget');
  if (roomsRequired === null && (eventType === 'Wedding' || eventType.includes('Celebration'))) rawMissing.push('rooms');

  const deduplicatedMissing = normalizeMissingInfo(rawMissing);

  // Formulate active numbered questions for Avela's reply
  const missingQuestions: string[] = [];
  if (city === 'Not Provided') missingQuestions.push('Which city would you like to host your event in?');
  if (date === 'Not Provided') missingQuestions.push('What is the preferred event date and year?');
  if (guestCount === null) missingQuestions.push('What is your estimated guest count?');
  if (foodType === 'Not Provided') missingQuestions.push('What are your catering preferences (Pure Vegetarian or Jain)?');
  if (budget === null) missingQuestions.push('What is your approximate overall budget for this event?');
  if (roomsRequired === null && (eventType === 'Wedding' || eventType.includes('Celebration'))) missingQuestions.push('How many guest accommodation rooms will you need?');

  // Formulate user quick-answer chips
  const quickAnswers: string[] = [];
  if (city === 'Not Provided') quickAnswers.push('City: Ahmedabad');
  if (date === 'Not Provided') quickAnswers.push('Date: 20 December 2026');
  if (budget === null) {
    quickAnswers.push('Budget: ₹6,00,000');
    quickAnswers.push('Budget: ₹4,00,000');
  }
  if (guestCount === null) quickAnswers.push('Guests: 450');
  if (foodType === 'Not Provided') quickAnswers.push('Food: Jain');
  if (roomsRequired === null) quickAnswers.push('Rooms: 10');
  if (time === 'Not Provided') quickAnswers.push('Time: Evening');
  if (meal === 'Not Provided') quickAnswers.push('Meal: Dinner');

  const req: EventRequirements = {
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
    missingInformation: deduplicatedMissing,
    conflictingInformation: []
  };

  let responseText = `Welcome to Avela Concierge. I have registered your ${eventType !== 'Not Provided' ? eventType.toLowerCase() : 'event'} profile`;
  if (guestCount !== null) responseText += ` for ${guestCount} guests`;
  if (foodType !== 'Not Provided') responseText += ` with ${foodType} catering`;
  if (roomsRequired !== null) responseText += ` and ${roomsRequired} guest rooms`;
  responseText += `.`;

  if (missingQuestions.length > 0) {
    responseText += `\n\nTo recommend the most suitable verified banquet packages and calculate an itemized quotation, I need a few more details from you:\n`;
    missingQuestions.forEach((q, i) => {
      responseText += `\n${i + 1}. ${q}`;
    });
    responseText += `\n\nPlease reply in the chat with your preferred details so I can proceed with matching the banquet properties.`;
  } else {
    responseText += `\n\nAll event specifications are verified. I have matched your profile against our verified property dataset and generated your itemized quotation below:`;
  }

  return {
    requirements: req,
    conciergeResponse: responseText,
    suggestedFollowUps: quickAnswers.slice(0, 5),
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
- In "suggestedFollowUps": Output quick user replies (e.g. "City: Ahmedabad", "Date: 20 December 2026", "Budget: ₹6,00,000").
- Output raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

    // If the LLM returned questions instead of user answers, generate user quick answers
    let followUps: string[] = [];
    if (Array.isArray(parsedJson.suggestedFollowUps) && parsedJson.suggestedFollowUps.length > 0) {
      followUps = parsedJson.suggestedFollowUps.filter((f: string) => !f.endsWith('?'));
    }

    if (followUps.length === 0) {
      if (sanitizedReq.city === 'Not Provided') followUps.push('City: Ahmedabad');
      if (sanitizedReq.date === 'Not Provided') followUps.push('Date: 20 December 2026');
      if (sanitizedReq.budget === null) {
        followUps.push('Budget: ₹6,00,000');
        followUps.push('Budget: ₹4,00,000');
      }
      if (sanitizedReq.guestCount === null) followUps.push('Guests: 450');
      if (sanitizedReq.foodType === 'Not Provided') followUps.push('Food: Jain');
      if (sanitizedReq.time === 'Not Provided') followUps.push('Time: Evening');
      if (sanitizedReq.meal === 'Not Provided') followUps.push('Meal: Dinner');
    }

    const conciergeMsg: string = typeof parsedJson.conciergeResponse === 'string' && parsedJson.conciergeResponse.trim()
      ? parsedJson.conciergeResponse
      : `Welcome to Avela Concierge. I have registered your event requirements.`;

    return {
      requirements: sanitizedReq,
      conciergeResponse: conciergeMsg,
      suggestedFollowUps: followUps.slice(0, 5),
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
  const apiKey = getApiKey();

  if (!apiKey) {
    const lastUserMsg = conversationHistory[conversationHistory.length - 1]?.text || '';
    const lower = lastUserMsg.toLowerCase();
    const updates: Partial<EventRequirements> = {};

    // City
    const cities = ['Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Udaipur', 'Surat', 'Pune', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata'];
    for (const c of cities) {
      if (lower.includes(c.toLowerCase())) {
        updates.city = c;
        break;
      }
    }

    // Budget
    const lakhMatch = lastUserMsg.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l)\b/i);
    if (lakhMatch) {
      updates.budget = Math.round(parseFloat(lakhMatch[1]) * 100000);
    } else {
      const numMatch = lastUserMsg.match(/(?:budget|cost|price|package|around|under)?[\s:]*(?:₹|inr|rs\.?)?\s*([\d,]+)/i);
      if (numMatch) {
        const parsed = parseInt(numMatch[1].replace(/,/g, ''), 10);
        if (parsed > 10000) updates.budget = parsed;
      }
    }

    // Date
    const dateMatch = lastUserMsg.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?)/i) ||
      lastUserMsg.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (dateMatch) {
      updates.date = dateMatch[1];
    } else if (lower.includes('december') || lower.includes('november')) {
      const m = lastUserMsg.match(/(?:on|in)?\s*(\d{1,2})?\s*(december|november|january)/i);
      if (m) updates.date = `${m[1] ? m[1] + ' ' : ''}${m[2]}`;
    }

    // Guests
    const gMatch = lastUserMsg.match(/(\d+)\s*(?:guests?|people|pax|attendees)/i);
    if (gMatch) updates.guestCount = parseInt(gMatch[1], 10);

    // Food
    if (lower.includes('jain')) updates.foodType = 'Jain';
    else if (lower.includes('veg')) updates.foodType = 'Vegetarian';

    // Rooms
    if (lower.includes('no room') || lower.includes('0 room') || lower.includes('without room')) {
      updates.roomsRequired = 0;
    } else {
      const rMatch = lastUserMsg.match(/(\d+)\s*(?:rooms?|suites?)/i);
      if (rMatch) updates.roomsRequired = parseInt(rMatch[1], 10);
    }

    // Meal & Time
    if (lower.includes('dinner')) updates.meal = 'Dinner';
    if (lower.includes('lunch')) updates.meal = 'Lunch';
    if (lower.includes('evening')) updates.time = 'Evening';

    let reply = 'Thank you for providing these details. I have updated your celebration profile.';
    if (Object.keys(updates).length > 0) {
      const updatedKeys = Object.keys(updates).join(', ');
      reply = `I have registered your ${updatedKeys} specifications. Updating your banquet evaluation and quotations now...`;
    }

    return {
      text: reply,
      updatedRequirements: updates
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
If the customer has provided any new information (such as setting their budget, confirming dates, adjusting guest counts, specifying Jain food, or room count), output a JSON object:
{
  "reply": "Your response to the user as Avela (no mention of AI/Gemini)",
  "extractedUpdates": {
    "budget": number or null (only if mentioned/updated),
    "guestCount": number or null (only if mentioned/updated),
    "roomsRequired": number or null (only if mentioned/updated),
    "foodType": string (only if updated),
    "date": string (only if updated)
  }
}
Return raw JSON only.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction: AVELA_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json'
      }
    });

    const cleaned = (response.text || '{}').trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);

    return {
      text: parsed.reply || 'Your event details have been noted.',
      updatedRequirements: parsed.extractedUpdates
    };
  } catch (err) {
    console.warn('Gemini chat follow-up error:', err);
    return {
      text: 'I have noted your preferences and updated your banquet inquiry profile accordingly.'
    };
  }
}

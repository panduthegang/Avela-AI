import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  Key,
  Check,
  CheckCheck,
  Sparkles
} from 'lucide-react';
import {
  EventRequirements,
  PackageEligibility
} from '../types/banquet';
import {
  analyzeInquiryWithGemini,
  answerFollowUpWithGemini,
  hasApiKey
} from '../services/geminiService';
import {
  analyzeAllPackages
} from '../services/quotationEngine';
import EventAnalysisCard from './EventAnalysisCard';
import ApiKeyModal from './ApiKeyModal';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  analysisData?: {
    requirements: EventRequirements;
    eligibilityList: PackageEligibility[];
  };
}

interface ChatPageProps {
  initialQuery: string;
  onBack: () => void;
}

export default function ChatPage({ initialQuery, onBack }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [heldVenue, setHeldVenue] = useState<string | null>(null);
  const [currentRequirements, setCurrentRequirements] = useState<EventRequirements | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyActive, setKeyActive] = useState(hasApiKey());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initial message analysis on component load
  useEffect(() => {
    let isMounted = true;
    const runInitialAnalysis = async () => {
      const query = initialQuery.trim() || 'Wedding in Ahmedabad on 20 December evening for 450 guests, Jain dinner, decoration required, 10 rooms, budget 6,00,000';
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Initial user query
      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: currentTime,
        status: 'read'
      };

      setMessages([userMsg]);
      setIsTyping(true);

      try {
        // Step 1: AI Requirement Extraction (Gemini / Avela Engine)
        const aiResult = await analyzeInquiryWithGemini(query);
        if (!isMounted) return;

        // Step 2: Deterministic Package Eligibility & Quotation calculation (Rule 9 & 10)
        const analysis = analyzeAllPackages(aiResult.requirements);

        setCurrentRequirements(aiResult.requirements);

        const asstMsg: ChatMessage = {
          id: `msg-asst-${Date.now()}`,
          sender: 'assistant',
          text: aiResult.conciergeResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          analysisData: {
            requirements: aiResult.requirements,
            eligibilityList: analysis.all
          }
        };

        setMessages((prev) => [...prev, asstMsg]);
      } catch (err) {
        console.error('Analysis error:', err);
        const errorMsg: ChatMessage = {
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: 'I encountered an issue analyzing your event inquiry. Please verify your connection or try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        if (isMounted) setIsTyping(false);
      }
    };

    runInitialAnalysis();

    return () => {
      isMounted = false;
    };
  }, [initialQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: currentTime,
      status: 'delivered'
    };

    const updatedThread = [...messages, newMsg];
    setMessages(updatedThread);
    setInputText('');
    setIsTyping(true);

    try {
      const activeReq = currentRequirements || {
        eventType: 'Wedding',
        city: 'Ahmedabad',
        date: '20 December',
        time: 'Evening',
        guestCount: 450,
        foodType: 'Jain',
        meal: 'Dinner',
        decorationRequired: true,
        roomsRequired: 10,
        budget: 600000,
        missingInformation: []
      };

      const history = updatedThread.map((m) => ({
        sender: m.sender,
        text: m.text
      }));

      const replyData = await answerFollowUpWithGemini(history, activeReq);

      // Check if any requirements got updated
      let newReq = { ...activeReq };
      let updated = false;

      if (replyData.updatedRequirements) {
        Object.entries(replyData.updatedRequirements).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            (newReq as Record<string, unknown>)[key] = val;
            updated = true;
          }
        });
      }

      // Heuristic extraction for quick answer clicks & text inputs
      const lower = text.toLowerCase();

      // City update
      const cities = ['Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Jaipur', 'Udaipur', 'Surat', 'Pune', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata'];
      for (const c of cities) {
        if (lower.includes(c.toLowerCase())) {
          newReq.city = c;
          newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('city') && !m.toLowerCase().includes('location'));
          updated = true;
          break;
        }
      }

      // Date update
      const dateMatch = text.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+\d{4})?)/i) ||
        text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
      if (dateMatch) {
        newReq.date = dateMatch[1];
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('date') && !m.toLowerCase().includes('year'));
        updated = true;
      }

      // Budget update (e.g. 6 lakhs, 4 lakh, 600000, ₹4,00,000)
      const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l)\b/i);
      if (lakhMatch) {
        newReq.budget = Math.round(parseFloat(lakhMatch[1]) * 100000);
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('budget'));
        updated = true;
      } else {
        const numMatch = text.match(/(?:budget|cost|price|package|around|under)?[\s:]*(?:₹|inr|rs\.?)?\s*([\d,]+)/i);
        if (numMatch) {
          const bVal = parseInt(numMatch[1].replace(/,/g, ''), 10);
          if (bVal > 10000) {
            newReq.budget = bVal;
            newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('budget'));
            updated = true;
          }
        }
      }

      // Room update
      if (lower.includes('no room') || lower.includes('0 room') || lower.includes('without room')) {
        newReq.roomsRequired = 0;
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('room'));
        updated = true;
      } else {
        const rMatch = text.match(/(\d+)\s*rooms?/i);
        if (rMatch) {
          newReq.roomsRequired = parseInt(rMatch[1], 10);
          newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('room'));
          updated = true;
        }
      }

      // Food update
      if (lower.includes('jain')) {
        newReq.foodType = 'Jain';
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('food') && !m.toLowerCase().includes('dietary'));
        updated = true;
      } else if (lower.includes('veg') || lower.includes('vegetarian')) {
        newReq.foodType = 'Vegetarian';
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('food') && !m.toLowerCase().includes('dietary'));
        updated = true;
      }

      // Guest Count update
      const gMatch = text.match(/(\d+)\s*(?:guests?|people|pax|attendees)/i);
      if (gMatch) {
        newReq.guestCount = parseInt(gMatch[1], 10);
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('guest'));
        updated = true;
      }

      // Meal & Time update
      if (lower.includes('dinner')) {
        newReq.meal = 'Dinner';
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('meal'));
        updated = true;
      }
      if (lower.includes('lunch')) {
        newReq.meal = 'Lunch';
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('meal'));
        updated = true;
      }
      if (lower.includes('evening')) {
        newReq.time = 'Evening';
        newReq.missingInformation = newReq.missingInformation.filter((m) => !m.toLowerCase().includes('time'));
        updated = true;
      }

      let analysisPayload: ChatMessage['analysisData'] | undefined = undefined;

      if (updated) {
        const newAnalysis = analyzeAllPackages(newReq);
        setCurrentRequirements(newReq);
        analysisPayload = {
          requirements: newReq,
          eligibilityList: newAnalysis.all
        };
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'read' } : m))
      );

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: replyData.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        analysisData: analysisPayload
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error('Follow-up error:', err);
      const fallbackReply: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        sender: 'assistant',
        text: 'I have logged your request and our banquet concierge team is coordinating with the property directors.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleHold = (venueName: string) => {
    setHeldVenue(venueName);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userConfirm: ChatMessage = {
      id: `hold-usr-${Date.now()}`,
      sender: 'user',
      text: `Please place a 24-hour complimentary hold on "${venueName}".`,
      timestamp: time,
      status: 'read'
    };

    setMessages((prev) => [...prev, userConfirm]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const confirmationMsg: ChatMessage = {
        id: `hold-confirm-${Date.now()}`,
        sender: 'assistant',
        text: `24-Hour complimentary hold successfully initiated for "${venueName}".\n\n` +
          `Hold Reference: AVL-2026-${Math.floor(100000 + Math.random() * 900000)}\n` +
          `• Zero deposit required for 24 hours.\n` +
          `• The banquet director has reserved this date slot for your celebration scale.\n` +
          `• Next step: Review catering menu options or schedule a property walkthrough.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, confirmationMsg]);
    }, 900);
  };

  return (
    <div className="fixed inset-0 h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden font-sans">
      
      {/* Background Graphic Image for Desktop & Tablets */}
      <div
        className="absolute inset-0 z-0 hidden sm:block bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/dkev7ein3/image/upload/v1790440624/Hero_mccrdk.png')`,
          backgroundColor: '#1b1b36',
        }}
        aria-hidden="true"
      />

      {/* Background Graphic Image for Mobile */}
      <div
        className="absolute inset-0 z-0 block sm:hidden bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/dkev7ein3/image/upload/v1790493781/Hero-Mobile_ewjxhr.png')`,
          backgroundColor: '#1b1b36',
        }}
        aria-hidden="true"
      />

      {/* Atmospheric gentle depth overlay */}
      <div 
        className="absolute inset-0 z-0 bg-gradient-to-b from-[#181a30]/35 via-[#121324]/20 to-[#101221]/50 pointer-events-none" 
        aria-hidden="true"
      />

      {/* 1. STICKY FROSTED GLASS HEADER */}
      <header className="relative shrink-0 z-30 w-full bg-[#121024]/45 backdrop-blur-2xl border-b border-white/15 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button returning to Hero */}
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Return to home page"
            aria-label="Back to home page"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Logo Petal Emblem matching Hero */}
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Avela logo icon"
            >
              <path d="M7 4C7 4 4 8 4 12C4 16 7 20 7 20C7 20 5 15.5 5 12C5 8.5 7 4 7 4Z" opacity="0.75" />
              <path d="M12 3C12 3 9 7.5 9 12C9 16.5 12 21 12 21C12 21 10 16 10 12C10 8 12 3 12 3Z" opacity="0.9" />
              <path d="M17 2C17 2 14 7 14 12C14 17 17 22 17 22C17 22 15 16.5 15 12C15 7.5 17 2 17 2Z" />
            </svg>
          </div>

          {/* Assistant Info */}
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm sm:text-base font-medium truncate">
              Avela Banquet Concierge
            </span>
            <span className="text-xs text-white/70 font-normal truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isTyping ? 'Avela is synthesizing event data...' : 'Deterministic quotation engine active'}</span>
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* API Key Status / Config trigger */}
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-normal transition-colors border border-white/20"
            title="Configure Gemini API Key"
          >
            <Key className="w-3.5 h-3.5 text-[#dbc6f9]" />
            <span className="hidden sm:inline">API Key</span>
            <span
              className={`w-2 h-2 rounded-full ${keyActive ? 'bg-emerald-400' : 'bg-amber-400'}`}
              title={keyActive ? 'Gemini API Key active' : 'Using Local Heuristic Engine'}
            />
          </button>

          {/* Exit Chat button */}
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-1.5 text-xs rounded-xl bg-white/10 hover:bg-white/20 text-white font-normal transition-colors border border-white/20"
          >
            Exit Chat
          </button>
        </div>
      </header>

      {/* Held Venue Notification Banner */}
      {heldVenue && (
        <div className="relative shrink-0 z-20 bg-emerald-950/70 backdrop-blur-xl border-b border-emerald-500/30 text-emerald-100 px-4 py-2.5 text-xs sm:text-sm font-normal flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <Check className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="truncate">
              24-Hour complimentary hold active for: <strong className="font-medium text-white">{heldVenue}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setHeldVenue(null)}
            className="text-xs text-emerald-300 hover:text-white underline ml-3 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. INNER SCROLL CONTAINER */}
      <div className="relative z-10 flex-1 overflow-y-auto w-full scroll-smooth">
        <main className="px-4 sm:px-6 py-6 space-y-5 max-w-4xl w-full mx-auto">
          
          {/* Subtle Confidentiality & Deterministic Notice */}
          <div className="flex justify-center my-1">
            <div className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] text-white/80 font-normal text-center max-w-lg shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#dbc6f9]" />
              <span>Avela Event Intelligence · All quotations computed deterministically from verified package tariffs</span>
            </div>
          </div>

          {/* Message Thread */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`relative max-w-[96%] sm:max-w-[90%] md:max-w-[85%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed shadow-lg font-normal transition-all ${
                    isUser
                      ? 'bg-[#1b1534]/90 backdrop-blur-xl border border-white/20 text-white rounded-tr-xs shadow-[0_12px_30px_rgba(20,15,45,0.3)]'
                      : 'frosted-glass-input text-[#141029] rounded-tl-xs shadow-[0_16px_40px_rgba(20,15,45,0.22)]'
                  }`}
                >
                  {/* Text Content */}
                  <p className={`whitespace-pre-line text-[13px] sm:text-sm font-normal leading-relaxed ${
                    isUser ? 'text-white' : 'text-[#141029]'
                  }`}>
                    {msg.text}
                  </p>

                  {/* EMBEDDED EVENT ANALYSIS & QUOTATION BREAKDOWN */}
                  {msg.analysisData && (
                    <div className="mt-4 pt-3 border-t border-black/5">
                      <EventAnalysisCard
                        requirements={msg.analysisData.requirements}
                        eligibilityList={msg.analysisData.eligibilityList}
                        onHoldPackage={(pkgName) => handleHold(pkgName)}
                        heldPackage={heldVenue}
                      />
                    </div>
                  )}

                  {/* Timestamp & Status */}
                  <div className={`flex items-center justify-end gap-1 mt-2 text-[10px] select-none ${
                    isUser ? 'text-white/60' : 'text-slate-500'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {isUser && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#dbc6f9] inline" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-white/60 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="rounded-2xl frosted-glass-input px-4 py-2.5 shadow-md flex items-center gap-1.5 text-xs text-slate-700 font-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px] text-slate-600">Avela is compiling analysis...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>
      </div>

      {/* 3. STICKY FROSTED GLASS COMPOSER */}
      <footer className="relative shrink-0 z-30 w-full px-4 sm:px-6 pb-4 sm:pb-5 pt-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="max-w-4xl mx-auto frosted-glass-input rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 shadow-2xl transition-all"
        >
          {/* Main Input Text Field */}
          <div className="flex-1 min-w-0 pl-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Avela: e.g. 'Can we switch to 500 guests?' or 'What about parking?'..."
              className="w-full bg-transparent border-0 p-0 text-sm text-[#141029] placeholder-[#574e76]/70 focus:outline-none focus:ring-0 font-normal leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="h-9 px-4 rounded-xl bg-[#1b1534] hover:bg-[#28204b] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 text-xs sm:text-sm font-normal shadow-md transition-all active:scale-95 cursor-pointer"
            title="Send message to Avela"
          >
            <span>Send</span>
            <ArrowUp className="w-3.5 h-3.5 rotate-45 text-[#dbc6f9]" />
          </button>
        </form>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={() => setKeyActive(hasApiKey())}
      />
    </div>
  );
}

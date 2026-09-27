import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowUp,
  X,
  Users,
  DollarSign,
  MapPin,
  CheckCircle2,
  Wine,
  Heart,
  RotateCcw,
  Sparkle
} from 'lucide-react';

interface VenueMatch {
  id: string;
  name: string;
  tagline: string;
  capacity: string;
  budget: string;
  matchScore: number;
  location: string;
  features: string[];
  cateringHighlight: string;
  imageUrl: string;
  availability: string;
}

const SAMPLE_VENUES: VenueMatch[] = [
  {
    id: 'venue-1',
    name: 'The Glasshouse & Botanical Ballroom',
    tagline: 'Sunlit conservatory with crystal chandeliers and manicured lawn',
    capacity: '150 – 380 Guests',
    budget: '$12,500 – $16,000 package',
    matchScore: 99,
    location: 'Lakeside District, Central Park West',
    features: ['Bridal Dressing Suite', 'Outdoor Cocktail Lawn', 'Dimmable Ambient Rigging', 'Valet Parking'],
    cateringHighlight: '5-Course Gourmet Plated Menu with Artisanal Pastry Bar',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    availability: 'Available on your selected weekend'
  },
  {
    id: 'venue-2',
    name: 'The Lumina Skyline Banquet & Terrace',
    tagline: 'Modern panoramic glass rotunda with 360-degree city twilight views',
    capacity: '200 – 450 Guests',
    budget: '$14,000 – $19,500 package',
    matchScore: 96,
    location: 'Metropolitan Tower, 42nd Fl',
    features: ['High-Fidelity Audio/Visual', 'Private Elevator Foyer', 'Open-Air Sky Terrace', 'Custom Monogram Projection'],
    cateringHighlight: 'Chef-Curated Global Stations & Bespoke Mixology Bar',
    imageUrl: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=800&q=80',
    availability: '3 prime dates left in Autumn'
  },
  {
    id: 'venue-3',
    name: 'Sovereign Heritage Hall & Gardens',
    tagline: 'Timeless architectural grandeur with hand-carved arches and warm uplighting',
    capacity: '250 – 600 Guests',
    budget: '$16,500 – $22,000 package',
    matchScore: 93,
    location: 'Historic Estate Gardens',
    features: ['Grand Mezzanine Balcony', 'Dedicated Banquet Concierge', 'Acoustic Soundproofing', 'Full Commercial Kitchen'],
    cateringHighlight: 'Royal Multi-Cuisine Feast with Live Interactive Cooking Stations',
    imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80',
    availability: 'Instant hold available'
  }
];

interface HeroProps {
  onStartChat?: (query: string) => void;
}

export default function Hero({ onStartChat }: HeroProps) {
  const [prompt, setPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState('');
  const [searchResults, setSearchResults] = useState<VenueMatch[] | null>(null);
  const [savedVenues, setSavedVenues] = useState<string[]>([]);
  const [reservedVenueId, setReservedVenueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'instant-hold'>('all');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 72), 160)}px`;
    }
  }, [prompt]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = prompt.trim() || 'Luxury evening banquet hall for 250 wedding guests with ballroom, lawn, and catering';

    if (onStartChat) {
      onStartChat(query);
      return;
    }

    setIsSearching(true);
    setSearchStep('Analyzing event specifications & aesthetic vibe...');

    setTimeout(() => {
      setSearchStep('Querying availability across 180+ verified banquet halls...');
    }, 600);

    setTimeout(() => {
      setSearchStep('Tailoring catering packages & seating arrangements...');
    }, 1200);

    setTimeout(() => {
      setIsSearching(false);
      setSearchResults(SAMPLE_VENUES);
      setTimeout(() => {
        const el = document.getElementById('ai-results-anchor');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }, 1800);
  };

  const toggleSaveVenue = (id: string) => {
    setSavedVenues((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleInstantHold = (id: string) => {
    setReservedVenueId(id);
    setTimeout(() => {
      setReservedVenueId(null);
    }, 4500);
  };

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden">
      {/* Background Graphic Image for Desktop & Tablets */}
      <div
        className="absolute inset-0 z-0 hidden sm:block bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/dkev7ein3/image/upload/v1790440624/Hero_mccrdk.png')`,
          backgroundColor: '#1b1b36',
        }}
        aria-hidden="true"
      />

      {/* Background Graphic Image for Mobile (940x1672) */}
      <div
        className="absolute inset-0 z-0 block sm:hidden bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/dkev7ein3/image/upload/v1790493781/Hero-Mobile_ewjxhr.png')`,
          backgroundColor: '#1b1b36',
        }}
        aria-hidden="true"
      />

      {/* Atmospheric gentle depth overlay so text & input retain crystal-clear legibility */}
      <div 
        className="absolute inset-0 z-0 bg-gradient-to-b from-[#181a30]/25 via-transparent to-[#121324]/35 pointer-events-none" 
        aria-hidden="true"
      />

      {/* Top Bar / Header:
          Only clean brand identity on top-left, and API configuration trigger on top-right
      */}
      <header className="relative z-20 w-full px-5 sm:px-8 md:px-12 py-6 flex items-center justify-between">
        {/* Brand Logo matching the dribbble inspiration's 3-petal mark */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-sm">
            <svg
              className="w-5 h-5 text-white"
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
          <div className="flex flex-col">
            <span className="text-white text-lg sm:text-xl font-medium tracking-tight">
              Avela
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 pt-2 pb-16 max-w-4xl mx-auto w-full text-center">
        
        {/* Main Headline */}
        <h1 
          className="text-white text-3xl sm:text-5xl md:text-[56px] leading-[1.12] tracking-tight font-medium max-w-3xl mb-4 sm:mb-5 text-center text-balance drop-shadow-sm"
          style={{ textWrap: 'balance' }}
        >
          The assistant that keeps your work moving.
        </h1>

        {/* Subtitle */}
        <p className="text-white/85 text-sm sm:text-base md:text-lg max-w-2xl font-normal leading-relaxed mb-8 sm:mb-10 text-center text-balance">
          Let your AI assistant manage the busywork, organize your day, and keep everything on track.
        </p>

        {/* AI INPUT BOX - Ethereal Frosted Glass */}
        <div className="w-full max-w-2xl text-left">
          <div className="relative rounded-2xl sm:rounded-3xl frosted-glass-input p-4 sm:p-5 transition-all duration-300">
            
            {/* Prompt Textarea */}
            <div className="relative flex items-start gap-2.5 sm:gap-3">
              <div className="pt-1.5 text-indigo-600 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>

              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="e.g. 'Wedding in Ahmedabad on 20 December evening for 450 guests, Jain dinner, decoration required, 10 rooms, budget 6,00,000'"
                  rows={2}
                  className="w-full bg-transparent text-[#141029] placeholder-[#574e76]/70 text-sm sm:text-base font-normal resize-none focus:outline-none p-0 leading-relaxed min-h-[64px] selection:bg-indigo-200/50"
                />
              </div>

              {/* Clear button if text is entered */}
              {prompt.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="text-slate-500 hover:text-slate-800 p-1 rounded-md transition-colors"
                  aria-label="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bottom Controls / Toolbar */}
            <div className="flex items-center justify-between pt-3 px-1 gap-2 border-t border-black/5 mt-2">
              <span className="text-xs text-[#4c446c] font-normal flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Banquet Concierge</span>
              </span>

              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline text-xs text-[#5e5580]/80 font-normal">
                  Press ↵ Enter
                </span>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#1e153b] hover:bg-[#2b1f52] active:scale-95 text-white font-normal text-xs sm:text-sm transition-all shadow-[0_4px_16px_rgba(30,21,59,0.25)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  {isSearching ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white">Analyze with Avela</span>
                      <ArrowUp className="w-3.5 h-3.5 rotate-45 text-[#DBC6F9]" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Quick Scenario Chips for Mandatory Test Cases */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 justify-center text-xs">
            <span className="text-white/60 text-[11px] font-normal w-full text-center mb-1">
              Run Mandatory Test Cases:
            </span>
            <button
              type="button"
              onClick={() => {
                const sample = 'I need a wedding for 450 people with Jain food and 10 rooms.';
                setPrompt(sample);
                if (onStartChat) onStartChat(sample);
              }}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] transition-all backdrop-blur-md border border-white/20 cursor-pointer"
            >
              TC1: 450 Pax, Jain, 10 Rooms
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = 'We are planning a corporate event for 150 people. Vegetarian food. No rooms required.';
                setPrompt(sample);
                if (onStartChat) onStartChat(sample);
              }}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] transition-all backdrop-blur-md border border-white/20 cursor-pointer"
            >
              TC2: Corporate 150, 0 Rooms
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = 'I need a wedding for 700 guests and Jain food.';
                setPrompt(sample);
                if (onStartChat) onStartChat(sample);
              }}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] transition-all backdrop-blur-md border border-white/20 cursor-pointer"
            >
              TC3: 700 Pax, Jain Food
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = 'I need a wedding hall.';
                setPrompt(sample);
                if (onStartChat) onStartChat(sample);
              }}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] transition-all backdrop-blur-md border border-white/20 cursor-pointer"
            >
              TC4: Wedding Hall (Missing Info)
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = 'I need a wedding for 450 guests, Jain food, 10 rooms, and my budget is 4 lakh.';
                setPrompt(sample);
                if (onStartChat) onStartChat(sample);
              }}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] transition-all backdrop-blur-md border border-white/20 cursor-pointer"
            >
              TC5: 450 Pax, Jain, Budget ₹4L
            </button>
          </div>
        </div>

        {/* AI Searching status feedback */}
        {isSearching && (
          <div className="mt-8 flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 text-white max-w-md w-full animate-fade-in">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <div className="text-sm font-normal tracking-wide text-center">
              {searchStep}
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {/* Matched Venues Panel */}
        {searchResults && !isSearching && (
          <div id="ai-results-anchor" className="mt-12 w-full text-left scroll-mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/20 gap-3">
              <div>
                <div className="flex items-center gap-2 text-white/80 text-xs font-normal">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Matched 3 Premier Banquets for your celebration</span>
                </div>
                <h2 className="text-white text-xl sm:text-2xl font-medium mt-1">
                  AI Recommended Banquet Venues
                </h2>
              </div>

              {/* Clean Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md transition-colors font-normal ${
                    activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  All Matches
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('verified')}
                  className={`px-3 py-1 rounded-md transition-colors font-normal ${
                    activeTab === 'verified' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Top Rated
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('instant-hold')}
                  className={`px-3 py-1 rounded-md transition-colors font-normal ${
                    activeTab === 'instant-hold' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  Instant Hold
                </button>
              </div>
            </div>

            {/* Reserved notification banner if booked */}
            {reservedVenueId && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span className="text-xs sm:text-sm font-normal">
                    24-hour complimentary date hold initiated! Our banquet concierge is synchronizing the menu proposal with the venue director.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReservedVenueId(null)}
                  className="text-emerald-200 hover:text-white text-xs ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Venues Grid */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {searchResults.map((venue) => {
                const isSaved = savedVenues.includes(venue.id);
                return (
                  <div
                    key={venue.id}
                    className="group flex flex-col justify-between rounded-2xl frosted-glass-input p-5 shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    <div>
                      {/* Image Preview with match badge */}
                      <div className="relative w-full h-44 rounded-xl overflow-hidden mb-4 bg-slate-200">
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-normal flex items-center gap-1">
                          <Sparkle className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>{venue.matchScore}% Match</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleSaveVenue(venue.id)}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                          aria-label="Save venue to favorites"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isSaved ? 'text-rose-500 fill-rose-500' : 'text-white'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Header details */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span className="truncate">{venue.location}</span>
                      </div>

                      <h3 className="text-slate-900 text-base sm:text-lg font-medium leading-snug mb-1">
                        {venue.name}
                      </h3>

                      <p className="text-slate-600 text-xs font-normal line-clamp-2 mb-3">
                        {venue.tagline}
                      </p>

                      {/* Capacity & Price stats */}
                      <div className="pt-2 pb-3 border-y border-slate-100 text-xs space-y-1.5 text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Capacity</span>
                          </span>
                          <span className="font-normal text-slate-800">
                            {venue.capacity}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Estimated Package</span>
                          </span>
                          <span className="font-normal text-slate-800">
                            {venue.budget}
                          </span>
                        </div>
                      </div>

                      {/* Catering highlight */}
                      <div className="mt-3 p-2.5 rounded-lg bg-indigo-50/80 text-indigo-950 text-xs font-normal flex items-start gap-2">
                        <Wine className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{venue.cateringHighlight}</span>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {venue.features.map((feat, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-normal"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom CTA for each venue */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onStartChat) {
                            onStartChat(`I would like to place a 24-hour hold on "${venue.name}" for our celebration.`);
                          } else {
                            handleInstantHold(venue.id);
                          }
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-normal text-center transition-colors shadow-sm"
                      >
                        {reservedVenueId === venue.id ? 'Holding Date...' : 'Hold Date with AI'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onStartChat) {
                            onStartChat(`Can you give me the full catering package breakdown and floor plan for "${venue.name}"?`);
                          } else {
                            setPrompt(`Get full banquet proposal and floor plan breakdown for ${venue.name}`);
                            window.scrollTo({ top: 180, behavior: 'smooth' });
                          }
                        }}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        title="Ask AI Concierge for floor plan and catering details"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Follow-up search button */}
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setSearchResults(null);
                  setPrompt('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs font-normal transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start New Banquet Inquiry</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Subtle footer */}
      <footer className="relative z-10 w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-white/60 font-normal text-center">
        <span>© {new Date().getFullYear()} Avela Banquet AI · Tailored Event & Banquet Concierge</span>
        <span className="hidden sm:inline text-white/30">·</span>
        <a
          href="https://harshrathod-portfolio.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/80 hover:text-white transition-colors underline underline-offset-4 decoration-white/30 hover:decoration-white font-normal"
        >
          Designed & Developed by Harsh Rathod ↗
        </a>
      </footer>
    </section>
  );
}

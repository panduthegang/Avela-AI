import React, { useState, useRef } from 'react';
import { 
  CornerDownRight, 
  Send, 
  X,
  Menu,
  CheckCircle2
} from 'lucide-react';

export default function Hero() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Product' | 'Solutions' | 'Venues' | 'Pricing'>('Product');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleQuerySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setToastMessage('Query submitted! Finding matching banquets...');
      setTimeout(() => setToastMessage(null), 4000);
    }, 600);
  };

  return (
    <div 
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat text-white flex flex-col justify-between selection:bg-rose-500/30 selection:text-white"
      style={{
        backgroundImage: `url('https://res.cloudinary.com/dkev7ein3/image/upload/v1790440624/Hero_mccrdk.png')`,
        backgroundColor: '#131422',
        fontFamily: 'DM Sans'
      }}
    >
      {/* Subtle protective gradient scrim to maintain contrast across floral background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0d1a]/55 via-transparent to-[#0a0c16]/75 pointer-events-none" />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-emerald-400/40 shadow-2xl text-white text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="leading-snug">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP NAVIGATION BAR */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7">
        <div className="flex items-center justify-between">
          
          {/* Logo & Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-lg shadow-black/10 transition-transform hover:scale-105 cursor-pointer">
              <svg 
                className="w-5 h-5 text-white" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 2C8.5 2 4 6 4 12c0 4.5 3 8.5 7 9.8V15c-1.5 0-2.5-.5-3-1.5 1.5-.5 2.5-1.5 3-3V6c0-.5.5-1 1-1s1 .5 1 1v4.5c.5 1.5 1.5 2.5 3 3-.5 1-1.5 1.5-3 1.5v6.8c4-1.3 7-5.3 7-9.8 0-6-4.5-10-8-10z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Avela
            </span>
          </div>

          {/* Translucent Frosted Glass Pill Menu */}
          <nav className="hidden md:flex items-center p-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg shadow-black/5">
            {(['Product', 'Solutions', 'Venues', 'Pricing'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-white/25 text-white shadow-sm font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                  {tab}
                </button>
              );
            })}
          </nav>

          {/* Action Button & Mobile Menu Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              className="group flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white text-slate-900 text-xs sm:text-sm font-semibold shadow-lg shadow-white/10 hover:bg-white/95 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-slate-700 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
              <span>Try for free</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-3 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/20 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2">
            {(['Product', 'Solutions', 'Venues', 'Pricing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* MAIN HERO SECTION */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-5xl mx-auto w-full text-center">
        
        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-white leading-[1.1] text-balance max-w-4xl drop-shadow-md">
          The assistant that keeps your banquet moving.
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-5 text-base sm:text-lg md:text-xl text-white/85 max-w-2xl font-normal leading-relaxed text-balance">
          Let your AI assistant discover luxury ballrooms, customize catering menus, coordinate guest counts, and negotiate the best package.
        </p>

        {/* THE AI INPUT QUERY BOX */}
        <div className="w-full mt-8 sm:mt-10 max-w-3xl text-left">
          <div className="relative rounded-2xl sm:rounded-3xl glass-input p-3 sm:p-4 transition-all duration-300 group focus-within:border-white/45 focus-within:ring-2 focus-within:ring-white/20">
            {/* Prompt Textarea */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuerySubmit();
                  }
                }}
                placeholder="Describe your ideal banquet... e.g., 'Find a crystal ballroom for 350 guests with lawn for cocktail hour, vegetarian catering, and bridal suite under $20,000'"
                rows={3}
                className="w-full bg-transparent text-white placeholder-white/50 text-sm sm:text-base font-normal resize-none focus:outline-none px-2 py-1 leading-relaxed selection:bg-rose-500/40"
              />
            </div>

            {/* Bottom Controls / Toolbar */}
            <div className="flex items-center justify-end pt-2 px-1 gap-2">
              <span className="hidden sm:inline text-[11px] text-white/40">
                Press ↵ Enter
              </span>
              
              <button
                type="button"
                onClick={() => handleQuerySubmit()}
                disabled={isSubmitting || !query.trim()}
                className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-white text-slate-900 font-semibold text-xs sm:text-sm hover:bg-white/95 active:scale-95 transition-all shadow-md shadow-white/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <span>Ask AI</span>
                    <Send className="w-3.5 h-3.5 text-slate-800" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Spacer to keep balanced vertical centering */}
      <div className="h-10 sm:h-14" />
    </div>
  );
}

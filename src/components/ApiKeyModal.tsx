import React, { useState } from 'react';
import { Key, Check, X, Sparkles } from 'lucide-react';
import { getApiKey, setApiKey, clearApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onKeyUpdated }: ApiKeyModalProps) {
  const currentKey = getApiKey();
  const [inputVal, setInputVal] = useState(currentKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(inputVal);
    setSavedSuccess(true);
    onKeyUpdated();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    clearApiKey();
    setInputVal('');
    onKeyUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="frosted-glass-input rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-white/80 text-left text-slate-900 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-black/5 transition-colors"
          aria-label="Close API Key Settings"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-indigo-700 text-xs font-normal mb-1">
          <Key className="w-4 h-4 text-indigo-600" />
          <span>Avela Intelligence Setup</span>
        </div>

        <h3 className="text-slate-900 text-xl font-medium mb-1.5">
          Gemini API Configuration
        </h3>

        <p className="text-slate-600 text-xs font-normal leading-relaxed mb-4">
          You can paste your Gemini API key below, or set <code className="px-1.5 py-0.5 rounded bg-black/5 text-indigo-900 font-mono">VITE_GEMINI_API_KEY</code> in your <code className="px-1.5 py-0.5 rounded bg-black/5 text-indigo-900 font-mono">.env</code> file.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Identity & Fallback Guarantee</span>
            </div>
            <p className="text-slate-600 font-normal">
              Avela will respond with its exclusive luxury concierge persona. If an API key is not configured, Avela continues to run smoothly using its built-in deterministic heuristic analysis.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Key saved successfully! Synchronizing with Avela...</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {currentKey && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Clear Key
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-normal hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1b1534] hover:bg-[#28204b] text-white text-xs font-normal shadow-sm transition-all"
            >
              Save Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  EventRequirements,
  PackageEligibility
} from '../types/banquet';
import { formatINR } from '../services/quotationEngine';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Utensils,
  Sparkles,
  BedDouble,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Calculator
} from 'lucide-react';

interface EventAnalysisCardProps {
  requirements: EventRequirements;
  eligibilityList: PackageEligibility[];
  onHoldPackage?: (packageName: string) => void;
  heldPackage?: string | null;
}

export default function EventAnalysisCard({
  requirements,
  eligibilityList,
  onHoldPackage,
  heldPackage
}: EventAnalysisCardProps) {
  const [showIneligible, setShowIneligible] = useState(false);

  const eligiblePackages = eligibilityList.filter((p) => p.isEligible);
  const ineligiblePackages = eligibilityList.filter((p) => !p.isEligible);

  // Criteria check: Packages and quotations are only suggested when essential data is collected
  const hasGuestCount = requirements.guestCount !== null && requirements.guestCount > 0;
  const hasBudget = requirements.budget !== null && requirements.budget > 0;
  const isDataCompleteForQuotation = hasGuestCount && hasBudget;

  const reqItem = (
    label: string,
    value: string | number | null | undefined,
    icon: React.ReactNode,
    isProvided: boolean
  ) => {
    return (
      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 border border-white/80 shadow-xs text-xs">
        <div className="text-indigo-600 shrink-0 mt-0.5">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-slate-500 font-normal text-[11px] uppercase tracking-wider">{label}</div>
          <div className="mt-0.5 truncate">
            {isProvided ? (
              <span className="text-slate-900 font-medium text-xs sm:text-sm">
                {typeof value === 'number' && label.includes('Budget')
                  ? formatINR(value)
                  : String(value)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-normal">
                <HelpCircle className="w-3 h-3" />
                <span>Not Provided / Unknown</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-5 animate-fade-in text-left">
      
      {/* 1. AI REQUIREMENT EXTRACTION SECTION */}
      <div className="frosted-glass-input rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-white/70">
        <div className="pb-3 border-b border-black/5">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-normal">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Avela Intelligence · Structured Requirement Extraction</span>
          </div>
          <h3 className="text-slate-900 text-lg sm:text-xl font-medium mt-0.5">
            Extracted Event Profile
          </h3>
        </div>

        {/* 10 Core Required Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-4">
          {reqItem(
            'Event Type',
            requirements.eventType,
            <Sparkles className="w-3.5 h-3.5" />,
            requirements.eventType !== 'Not Provided'
          )}
          {reqItem(
            'City',
            requirements.city,
            <MapPin className="w-3.5 h-3.5" />,
            requirements.city !== 'Not Provided'
          )}
          {reqItem(
            'Event Date',
            requirements.date,
            <Calendar className="w-3.5 h-3.5" />,
            requirements.date !== 'Not Provided'
          )}
          {reqItem(
            'Time',
            requirements.time,
            <Clock className="w-3.5 h-3.5" />,
            requirements.time !== 'Not Provided'
          )}
          {reqItem(
            'Guest Count',
            requirements.guestCount !== null ? `${requirements.guestCount} Guests` : null,
            <Users className="w-3.5 h-3.5" />,
            requirements.guestCount !== null
          )}
          {reqItem(
            'Food Requirement',
            requirements.foodType,
            <Utensils className="w-3.5 h-3.5" />,
            requirements.foodType !== 'Not Provided'
          )}
          {reqItem(
            'Meal',
            requirements.meal,
            <Utensils className="w-3.5 h-3.5" />,
            requirements.meal !== 'Not Provided'
          )}
          {reqItem(
            'Decoration Required',
            requirements.decorationRequired === null
              ? null
              : requirements.decorationRequired
              ? 'Required (Standard Inclusions)'
              : 'Not Required',
            <Sparkles className="w-3.5 h-3.5" />,
            requirements.decorationRequired !== null
          )}
          {reqItem(
            'Rooms Required',
            requirements.roomsRequired !== null ? `${requirements.roomsRequired} Rooms` : null,
            <BedDouble className="w-3.5 h-3.5" />,
            requirements.roomsRequired !== null
          )}
          {reqItem(
            'Customer Budget',
            requirements.budget !== null ? requirements.budget : null,
            <Wallet className="w-3.5 h-3.5" />,
            requirements.budget !== null
          )}
        </div>

        {/* Missing Information Alerts */}
        {requirements.missingInformation.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-900">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Identified Missing Information ({requirements.missingInformation.length} items):</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {requirements.missingInformation.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white/80 border border-amber-200 text-amber-900 text-[11px] font-normal"
                >
                  • {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. PACKAGE ELIGIBILITY & QUOTATIONS:
          Strictly displayed ONLY when all required data (or budget & guest count) is collected!
          If information is missing, nothing is suggested or quoted.
      */}
      {isDataCompleteForQuotation && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="text-xs text-white/70 font-normal flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Deterministic Application Engine · Rule 9 & 10 Verified</span>
              </div>
              <h3 className="text-white text-lg sm:text-xl font-medium mt-0.5">
                Package Eligibility & Quotations ({eligiblePackages.length} Compatible)
              </h3>
            </div>
          </div>

          {/* Compatible Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eligiblePackages.map((item) => {
              const pkg = item.package;
              const quote = item.quotation;
              const isHeld = heldPackage === pkg.name;

              return (
                <div
                  key={pkg.id}
                  className="frosted-glass-input rounded-2xl p-5 shadow-xl flex flex-col justify-between border border-white/80 transition-all duration-300"
                >
                  <div>
                    {/* Package Header with Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Eligible Match</span>
                        </span>
                        <h4 className="text-slate-900 text-base sm:text-lg font-medium mt-1">
                          {pkg.name}
                        </h4>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-normal">
                        Cap: {pkg.capacity} Pax
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs font-normal mb-3 line-clamp-2">
                      {pkg.description}
                    </p>

                    {/* Highlights */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {pkg.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700 text-[10px] font-normal"
                        >
                          {h}
                        </span>
                      ))}
                    </div>

                    {/* Validation Checks Passed */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/50 mb-4 text-xs space-y-1">
                      {item.reasons.passed.map((reason, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-emerald-900 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* ITEM-BY-ITEM QUOTATION CALCULATION (Rule 10: Deterministic application code) */}
                    <div className="p-3.5 rounded-xl bg-white/90 border border-indigo-100 text-xs space-y-2 shadow-xs">
                      <div className="flex items-center justify-between text-indigo-900 font-medium pb-1.5 border-b border-black/5">
                        <span className="flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Itemized Quotation Breakdown</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Deterministic</span>
                      </div>

                      {/* Food calculation */}
                      <div className="flex items-center justify-between text-slate-700">
                        <span>
                          Food: {quote.guestCount} guests × {formatINR(quote.dinnerPrice)}
                        </span>
                        <span className="font-medium text-slate-900">{formatINR(quote.foodCost)}</span>
                      </div>

                      {/* Decoration calculation */}
                      <div className="flex items-center justify-between text-slate-700">
                        <span>
                          Decoration: {quote.decorationIncluded ? 'Package Décor' : 'No Décor'}
                        </span>
                        <span className="font-medium text-slate-900">
                          {quote.decorationIncluded ? formatINR(quote.decorationCost) : '₹0'}
                        </span>
                      </div>

                      {/* Rooms calculation */}
                      <div className="flex items-center justify-between text-slate-700">
                        <span>
                          Rooms: {quote.roomsCount} rooms × {formatINR(quote.roomPrice)}
                        </span>
                        <span className="font-medium text-slate-900">{formatINR(quote.roomCost)}</span>
                      </div>

                      {/* Total Quotation */}
                      <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                        <span className="text-slate-900 font-medium text-xs">Estimated Total:</span>
                        <span className="text-slate-900 font-medium text-sm sm:text-base">
                          {formatINR(quote.estimatedTotal)}
                        </span>
                      </div>

                      {/* BUDGET COMPARISON (Rule 11: Never modify package prices) */}
                      {quote.customerBudget !== null && (
                        <div className="pt-2 border-t border-black/5 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Customer Budget:</span>
                            <span className="font-normal">{formatINR(quote.customerBudget)}</span>
                          </div>

                          {quote.budgetStatus === 'under_budget' && (
                            <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                              <span className="font-normal">Budget Difference:</span>
                              <span className="font-medium">
                                {formatINR(Math.abs(quote.budgetDifference!))} under budget
                              </span>
                            </div>
                          )}

                          {quote.budgetStatus === 'over_budget' && (
                            <div className="flex items-center justify-between text-amber-800 bg-amber-50 px-2 py-1 rounded">
                              <span className="font-normal">Budget Difference:</span>
                              <span className="font-medium">
                                {formatINR(Math.abs(quote.budgetDifference!))} above budget
                              </span>
                            </div>
                          )}

                          {quote.budgetStatus === 'exact_budget' && (
                            <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                              <span>Budget Match:</span>
                              <span className="font-medium">Matches exact budget</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card CTA */}
                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onHoldPackage?.(pkg.name)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#1b1534] hover:bg-[#2c2253] text-white text-xs font-normal text-center transition-all shadow-xs active:scale-95"
                    >
                      {isHeld ? 'Hold Active (24h)' : 'Place 24h Date Hold'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INELIGIBLE PACKAGES DISQUALIFICATION DETAILS */}
          {ineligiblePackages.length > 0 && (
            <div className="mt-4 pt-2">
              <button
                type="button"
                onClick={() => setShowIneligible(!showIneligible)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
              >
                <span>{showIneligible ? 'Hide' : 'Review'} {ineligiblePackages.length} Ineligible Packages & Disqualification Reasons</span>
                {showIneligible ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showIneligible && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3 animate-fade-in">
                  {ineligiblePackages.map((item) => {
                    const pkg = item.package;
                    return (
                      <div
                        key={pkg.id}
                        className="rounded-2xl bg-white/80 p-4 border border-white/60 shadow-sm opacity-90"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-medium inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Not Eligible</span>
                          </span>
                          <span className="text-[11px] text-slate-500">Cap: {pkg.capacity}</span>
                        </div>

                        <h5 className="text-slate-800 font-medium text-sm mb-1">{pkg.name}</h5>
                        <p className="text-slate-500 text-[11px] mb-2.5">
                          Food: {pkg.foodSupported.join(', ')} · Max Rooms: {pkg.maxRooms}
                        </p>

                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-rose-800 block">
                            Disqualification Reasons:
                          </span>
                          {item.reasons.failed.map((reason, i) => (
                            <div key={i} className="flex items-start gap-1 text-rose-900 text-[11px]">
                              <span className="text-rose-500">•</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

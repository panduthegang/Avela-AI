export interface EventRequirements {
  eventType: string; // e.g. "Wedding", "Corporate", "Reception", "Not Provided"
  city: string; // e.g. "Ahmedabad", "Not Provided"
  date: string; // e.g. "2026-12-20", "20 December", "Not Provided"
  time: string; // e.g. "Evening", "Lunch", "Not Provided"
  guestCount: number | null; // e.g. 450
  foodType: string; // e.g. "Jain", "Vegetarian", "Not Provided"
  meal: string; // e.g. "Dinner", "Lunch", "Not Provided"
  decorationRequired: boolean | null; // true, false, or null if Unknown
  roomsRequired: number | null; // e.g. 10
  budget: number | null; // in INR (₹)
  missingInformation: string[];
  conflictingInformation?: string[];
  rawInterpretation?: string;
}

export type PackageCategory = 'Wedding' | 'Corporate' | 'General';

export interface BanquetPackage {
  id: string;
  code: 'PACKAGE_A' | 'PACKAGE_B' | 'PACKAGE_C' | 'PACKAGE_D' | 'PACKAGE_E';
  name: string;
  category: PackageCategory;
  capacity: number; // Max guests
  foodSupported: string[]; // ['Vegetarian'] or ['Vegetarian', 'Jain']
  dinnerPricePerGuest: number; // INR
  decorationPrice: number; // INR
  roomPricePerRoom: number; // INR
  maxRooms: number;
  description: string;
  imageUrl: string;
  highlights: string[];
}

export interface QuotationBreakdown {
  guestCount: number;
  dinnerPrice: number;
  foodCost: number;
  decorationCost: number;
  decorationIncluded: boolean;
  roomsCount: number;
  roomPrice: number;
  roomCost: number;
  estimatedTotal: number;
  customerBudget: number | null;
  budgetDifference: number | null; // positive = over budget, negative = under budget
  budgetStatus: 'under_budget' | 'over_budget' | 'exact_budget' | 'no_budget';
}

export interface PackageEligibility {
  package: BanquetPackage;
  isEligible: boolean;
  reasons: {
    passed: string[];
    failed: string[];
  };
  quotation: QuotationBreakdown;
}

export interface AnalysisResult {
  requirements: EventRequirements;
  eligibilityList: PackageEligibility[];
  eligiblePackages: PackageEligibility[];
  ineligiblePackages: PackageEligibility[];
  suggestedFollowUps: string[];
  summaryNote: string;
}

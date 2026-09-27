import { BanquetPackage, EventRequirements, PackageEligibility, QuotationBreakdown } from '../types/banquet';
import { BANQUET_PACKAGES } from '../data/packages';

/**
 * Calculates deterministic quotation for a given package and event requirements.
 * Follows Rule 10 strictly: All calculations are deterministic application code.
 *
 * Food Cost = Guest Count × Dinner Price
 * Decoration Cost = Package Decoration Price (if required or default)
 * Room Cost = Required Rooms × Room Price
 * Estimated Total = Food Cost + Decoration Cost + Room Cost
 */
export function calculateQuotation(
  pkg: BanquetPackage,
  req: EventRequirements
): QuotationBreakdown {
  // Validate guest count (default to 0 if absent or invalid)
  const validGuestCount = Math.max(0, req.guestCount || 0);

  // Validate rooms required (default to 0 if absent or invalid)
  const validRooms = Math.max(0, req.roomsRequired || 0);

  // Validate budget
  const customerBudget = req.budget !== null && req.budget > 0 ? req.budget : null;

  // Food cost calculation
  const foodCost = validGuestCount * pkg.dinnerPricePerGuest;

  // Decoration cost calculation:
  // If explicitly set to false, 0; otherwise (true or default/not provided) uses package decoration price
  const decorationIncluded = req.decorationRequired !== false;
  const decorationCost = decorationIncluded ? pkg.decorationPrice : 0;

  // Room cost calculation
  const roomCost = validRooms * pkg.roomPricePerRoom;

  // Total estimate
  const estimatedTotal = foodCost + decorationCost + roomCost;

  // Budget comparison (Rule 11)
  let budgetDifference: number | null = null;
  let budgetStatus: QuotationBreakdown['budgetStatus'] = 'no_budget';

  if (customerBudget !== null) {
    const diff = estimatedTotal - customerBudget;
    budgetDifference = diff;

    if (diff < 0) {
      budgetStatus = 'under_budget'; // e.g., ₹15,000 under budget
    } else if (diff > 0) {
      budgetStatus = 'over_budget'; // e.g., ₹25,000 above budget
    } else {
      budgetStatus = 'exact_budget';
    }
  }

  return {
    guestCount: validGuestCount,
    dinnerPrice: pkg.dinnerPricePerGuest,
    foodCost,
    decorationCost,
    decorationIncluded,
    roomsCount: validRooms,
    roomPrice: pkg.roomPricePerRoom,
    roomCost,
    estimatedTotal,
    customerBudget,
    budgetDifference,
    budgetStatus
  };
}

/**
 * Evaluates package eligibility against event requirements following Rule 9:
 * 1. Guest count must not exceed package capacity.
 * 2. If Jain food is required, the package must support Jain food.
 * 3. Required rooms must not exceed maximum rooms.
 * 4. Event type should be compatible with the package category where applicable.
 */
export function evaluatePackageEligibility(
  pkg: BanquetPackage,
  req: EventRequirements
): PackageEligibility {
  const passed: string[] = [];
  const failed: string[] = [];

  const guestCount = req.guestCount || 0;
  const roomsRequired = req.roomsRequired || 0;
  const foodTypeLower = (req.foodType || '').toLowerCase();
  const eventTypeLower = (req.eventType || '').toLowerCase();

  // 1. Capacity check
  if (guestCount > 0) {
    if (guestCount <= pkg.capacity) {
      passed.push(`Guest capacity satisfied (${guestCount} guests ≤ ${pkg.capacity} max)`);
    } else {
      failed.push(`Capacity exceeded (${guestCount} guests requested > ${pkg.capacity} package limit)`);
    }
  } else {
    passed.push(`Capacity: Up to ${pkg.capacity} guests`);
  }

  // 2. Food type / Jain check
  const requiresJain = foodTypeLower.includes('jain');
  const supportsJain = pkg.foodSupported.map((f) => f.toLowerCase()).includes('jain');

  if (requiresJain) {
    if (supportsJain) {
      passed.push(`Supports specialized Jain culinary preparation`);
    } else {
      failed.push(`Does not offer Jain food (package only supports ${pkg.foodSupported.join(', ')})`);
    }
  } else {
    passed.push(`Culinary options compatible (${pkg.foodSupported.join(', ')})`);
  }

  // 3. Rooms check
  if (roomsRequired > 0) {
    if (roomsRequired <= pkg.maxRooms) {
      passed.push(`Rooms requirement satisfied (${roomsRequired} rooms ≤ ${pkg.maxRooms} max)`);
    } else {
      failed.push(`Rooms limit exceeded (${roomsRequired} rooms requested > ${pkg.maxRooms} available)`);
    }
  } else {
    passed.push(`Accommodates up to ${pkg.maxRooms} guest rooms`);
  }

  // 4. Event type compatibility
  const isCorporateRequest = eventTypeLower.includes('corporate') || eventTypeLower.includes('conference') || eventTypeLower.includes('seminar');
  const isWeddingRequest = eventTypeLower.includes('wedding') || eventTypeLower.includes('reception') || eventTypeLower.includes('sangeet') || eventTypeLower.includes('marriage');

  if (isCorporateRequest) {
    if (pkg.category === 'Corporate') {
      passed.push(`Tailored corporate package category`);
    } else {
      failed.push(`Package is styled for ${pkg.category} events, not corporate seminars`);
    }
  } else if (isWeddingRequest) {
    if (pkg.category === 'Wedding') {
      passed.push(`Tailored wedding & celebration package category`);
    } else {
      failed.push(`Package is styled for ${pkg.category} functions, not wedding celebrations`);
    }
  } else {
    passed.push(`Category: ${pkg.category}`);
  }

  const isEligible = failed.length === 0;
  const quotation = calculateQuotation(pkg, req);

  return {
    package: pkg,
    isEligible,
    reasons: { passed, failed },
    quotation
  };
}

/**
 * Runs full eligibility check on all packages and returns split results
 */
export function analyzeAllPackages(req: EventRequirements): {
  all: PackageEligibility[];
  eligible: PackageEligibility[];
  ineligible: PackageEligibility[];
} {
  const all = BANQUET_PACKAGES.map((pkg) => evaluatePackageEligibility(pkg, req));
  const eligible = all.filter((p) => p.isEligible);
  const ineligible = all.filter((p) => !p.isEligible);

  return { all, eligible, ineligible };
}

/**
 * Formats Indian Currency with INR commas (e.g. ₹5,85,000)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

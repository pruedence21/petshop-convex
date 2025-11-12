# 🏨 Hotel Module Documentation - Pet Shop Management System

Comprehensive documentation for the Hotel module, covering pet boarding, accommodation management, daily care services, and billing workflows.

## 📋 Table of Contents

- [Module Overview](#module-overview)
- [Room Management](#room-management)
- [Booking System](#booking-system)
- [Check-in Process](#check-in-process)
- [Daily Care Services](#daily-care-services)
- [Guest Management](#guest-management)
- [Billing & Payments](#billing--payments)
- [Facility Operations](#facility-operations)
- [Reports & Analytics](#reports--analytics)

## 🎯 Module Overview

The Hotel module provides a complete pet boarding and accommodation management system. It handles room reservations, guest check-ins, daily care services, and billing for pet boarding facilities within pet shops.

### Key Features

- **Smart Room Management**: Real-time availability and automated assignment
- **Comprehensive Booking System**: Online and phone reservations
- **Daily Care Tracking**: Feeding, medication, and activity logs
- **Guest Monitoring**: Health checks and incident reporting
- **Billing Integration**: Automatic charge calculation and payment processing
- **Owner Communication**: Updates and notifications

### Business Benefits

- **Additional Revenue Stream**: Boarding services increase profitability
- **Customer Convenience**: One-stop shop for pet services
- **Operational Efficiency**: Streamlined boarding workflows
- **Professional Service**: Comprehensive care documentation
- **Customer Loyalty**: Enhanced service experience

## 🏠 Room Management

### Room Structure

#### Room Types and Categories
```typescript
interface HotelRoom {
  id: string;
  roomNumber: string;
  roomType: RoomType;
  roomCategory: RoomCategory;
  capacity: number; // maximum number of pets
  dimensions: RoomDimensions;
  
  // Pricing
  baseRate: number; // per night base rate
  rateStructure: "FLAT" | "SIZE_BASED" | "WEIGHT_BASED" | "PREMIUM";
  
  // Features and Amenities
  amenities: RoomAmenity[];
  features: string[];
  petSizeLimit: PetSizeCategory;
  speciesAllowed: PetSpecies[];
  
  // Equipment and Supplies
  standardSupplies: string[];
  specialEquipment?: string[];
  
  // Availability and Status
  isActive: boolean;
  maintenanceStatus: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER";
  lastCleaned: number;
  lastInspection: number;
  
  // Operational Data
  totalNightsOccupied: number;
  averageOccupancyRate: number;
  lastGuestCheckout: number;
  
  createdAt: number;
  updatedAt: number;
}

enum RoomType {
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
  SUITE = "SUITE",
  MEDICAL = "MEDICAL",
  QUARANTINE = "QUARANTINE"
}

enum RoomCategory {
  DOG_STANDARD = "DOG_STANDARD",
  DOG_PREMIUM = "DOG_PREMIUM",
  DOG_SUITE = "DOG_SUITE",
  CAT_COMFORT = "CAT_COMFORT",
  CAT_PREMIUM = "CAT_PREMIUM",
  CAT_SUITE = "CAT_SUITE",
  MIXED_FAMILY = "MIXED_FAMILY",
  SPECIAL_NEEDS = "SPECIAL_NEEDS"
}

enum PetSizeCategory {
  SMALL = "SMALL",      // Under 20 lbs
  MEDIUM = "MEDIUM",    // 20-50 lbs
  LARGE = "LARGE",      // 50-80 lbs
  EXTRA_LARGE = "EXTRA_LARGE" // Over 80 lbs
}

enum PetSpecies {
  DOG = "DOG",
  CAT = "CAT",
  SMALL_ANIMAL = "SMALL_ANIMAL"
}
```

#### Room Features and Pricing
```typescript
const ROOM_TYPES = {
  DOG_STANDARD: {
    name: "Standard Dog Room",
    capacity: 1,
    baseRate: 35000, // $35.00 per night
    rateStructure: "SIZE_BASED",
    petSizeLimit: "LARGE",
    speciesAllowed: ["DOG"],
    amenities: [
      "Comfortable bedding",
      "Food and water bowls",
      "Daily housekeeping",
      "Climate control"
    ],
    dimensions: { length: 6, width: 4, height: 8 } // feet
  },
  
  DOG_PREMIUM: {
    name: "Premium Dog Suite",
    capacity: 2,
    baseRate: 55000, // $55.00 per night
    rateStructure: "FLAT",
    petSizeLimit: "LARGE",
    speciesAllowed: ["DOG"],
    amenities: [
      "Premium bedding",
      "Premium food and water bowls",
      "Daily housekeeping",
      "Climate control",
      "TV/entertainment",
      "Daily playtime session",
      "Camera monitoring"
    ],
    dimensions: { length: 8, width: 6, height: 8 }
  },
  
  CAT_COMFORT: {
    name: "Cat Comfort Room",
    capacity: 1,
    baseRate: 25000, // $25.00 per night
    rateStructure: "FLAT",
    petSizeLimit: "SMALL",
    speciesAllowed: ["CAT"],
    amenities: [
      "Cat tree/scratching post",
      "Litter box maintenance",
      "Comfortable bedding",
      "Food and water bowls",
      "Climate control",
      "Quiet environment"
    ],
    dimensions: { length: 5, width: 4, height: 8 }
  },
  
  MIXED_FAMILY: {
    name: "Family Suite",
    capacity: 4,
    baseRate: 85000, // $85.00 per night
    rateStructure: "PREMIUM",
    petSizeLimit: "MEDIUM",
    speciesAllowed: ["DOG", "CAT", "SMALL_ANIMAL"],
    amenities: [
      "Large space for multiple pets",
      "Individual feeding areas",
      "Climate control",
      "Daily housekeeping",
      "Premium bedding",
      "Exercise area access"
    ],
    dimensions: { length: 12, width: 8, height: 8 }
  }
};
```

### Room Availability Management

#### Real-time Availability Checking
```typescript
interface AvailabilityQuery {
  checkInDate: number;
  checkOutDate: number;
  numberOfPets: number;
  species: PetSpecies;
  sizeCategory?: PetSizeCategory;
  specialNeeds?: string[];
  roomType?: RoomType;
  maxRate?: number;
}

interface AvailableRoom {
  room: HotelRoom;
  availableNights: number;
  estimatedRate: number;
  availabilityScore: number; // 1-100, higher is better
  compatibilityScore: number; // 1-100, how well it fits requirements
}

const findAvailableRooms = async (query: AvailabilityQuery): Promise<AvailableRoom[]> => {
  // Get all active rooms that match basic criteria
  let availableRooms = await ctx.db
    .query("hotelRooms")
    .withIndex("by_active", q => q.eq("isActive", true))
    .filter(room => {
      // Species compatibility
      if (!room.speciesAllowed.includes(query.species)) return false;
      
      // Capacity check
      if (query.numberOfPets > room.capacity) return false;
      
      // Size limit check
      if (query.sizeCategory && 
          getSizePriority(query.sizeCategory) > getSizePriority(room.petSizeLimit)) {
        return false;
      }
      
      // Special needs compatibility
      if (query.specialNeeds && query.specialNeeds.length > 0) {
        const roomCanHandleNeeds = query.specialNeeds.every(need =>
          room.amenities.includes(need) || room.features.includes(need)
        );
        if (!roomCanHandleNeeds) return false;
      }
      
      // Room type preference
      if (query.roomType && room.roomType !== query.roomType) return false;
      
      return true;
    })
    .collect();
  
  // Filter out rooms with conflicts in the requested date range
  const roomsWithConflicts = await Promise.all(
    availableRooms.map(async (room) => {
      const conflicts = await getRoomConflicts(room._id, query.checkInDate, query.checkOutDate);
      return { room, conflicts };
    })
  );
  
  availableRooms = roomsWithConflicts
    .filter(({ conflicts }) => conflicts.length === 0)
    .map(({ room }) => room);
  
  // Calculate availability scores and rates
  const roomAvailability = await Promise.all(
    availableRooms.map(async (room) => {
      const availabilityScore = await calculateRoomAvailabilityScore(room);
      const compatibilityScore = calculateCompatibilityScore(room, query);
      const estimatedRate = await calculateRoomRate(room, query);
      
      return {
        room,
        availableNights: calculateNights(query.checkInDate, query.checkOutDate),
        estimatedRate,
        availabilityScore,
        compatibilityScore
      };
    })
  );
  
  // Sort by best fit (combination of availability, compatibility, and rate)
  return roomAvailability
    .sort((a, b) => {
      const scoreA = (a.availabilityScore + a.compatibilityScore) / 2;
      const scoreB = (b.availabilityScore + b.compatibilityScore) / 2;
      return scoreB - scoreA; // Higher scores first
    });
};

const getRoomConflicts = async (
  roomId: string,
  checkInDate: number,
  checkOutDate: number
): Promise<HotelBooking[]> => {
  const overlappingBookings = await ctx.db
    .query("hotelBookings")
    .withIndex("by_room_dates", q => q.eq("roomId", roomId))
    .filter(booking => {
      // Check for date overlap
      return (checkInDate < booking.checkOutDate && 
              checkOutDate > booking.checkInDate &&
              booking.status !== "CANCELLED");
    })
    .collect();
  
  return overlappingBookings;
};

const calculateRoomAvailabilityScore = async (room: HotelRoom): Promise<number> => {
  // Factors that improve availability score:
  // - Recently cleaned (last 24 hours)
  // - Not recently used (high turnover can be disruptive)
  // - Good maintenance status
  // - High historical occupancy rate (popular room)
  
  const now = Date.now();
  const hoursSinceCleaned = (now - room.lastCleaned) / (1000 * 60 * 60);
  const hoursSinceUsed = (now - room.lastGuestCheckout) / (1000 * 60 * 60);
  
  let score = 50; // Base score
  
  // Cleanliness bonus
  if (hoursSinceCleaned <= 24) score += 20;
  else if (hoursSinceCleaned <= 48) score += 10;
  else if (hoursSinceCleaned > 72) score -= 10;
  
  // Rest period bonus
  if (hoursSinceUsed >= 2) score += 15;
  if (hoursSinceUsed >= 6) score += 10;
  
  // Maintenance status
  if (room.maintenanceStatus === "AVAILABLE") score += 10;
  else if (room.maintenanceStatus === "MAINTENANCE") score -= 30;
  else if (room.maintenanceStatus === "OUT_OF_ORDER") score -= 100;
  
  // Historical popularity (occupancy rate)
  if (room.averageOccupancyRate >= 0.8) score += 5;
  else if (room.averageOccupancyRate <= 0.3) score -= 5;
  
  return Math.max(0, Math.min(100, score));
};
```

#### Room Assignment Optimization
```typescript
const assignOptimalRoom = async (
  bookingId: string,
  preferences: RoomPreferences
): Promise<{ assignedRoom: HotelRoom; assignmentReason: string }> => {
  const booking = await ctx.db.get(bookingId);
  if (!booking) throw new Error("Booking not found");
  
  // Get guest information for optimal matching
  const pet = await ctx.db.get(booking.petId);
  const customer = await ctx.db.get(booking.customerId);
  
  // Build availability query
  const availabilityQuery: AvailabilityQuery = {
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    numberOfPets: 1, // Currently one pet per booking
    species: pet.species,
    sizeCategory: determineSizeCategory(pet.weight),
    specialNeeds: extractSpecialNeeds(pet, booking.specialInstructions),
    maxRate: preferences.maxRate,
    roomType: preferences.preferredRoomType
  };
  
  // Find available rooms
  const availableRooms = await findAvailableRooms(availabilityQuery);
  
  if (availableRooms.length === 0) {
    throw new Error("No available rooms match the criteria");
  }
  
  // Apply assignment algorithm
  const bestRoom = await selectBestRoom(availableRooms, pet, customer, preferences);
  
  // Update booking with assigned room
  await ctx.db.patch(bookingId, {
    roomId: bestRoom.room._id,
    assignmentReason: bestRoom.assignmentReason,
    roomRate: bestRoom.room.baseRate
  });
  
  // Reserve the room
  await ctx.db.insert("roomReservations", {
    roomId: bestRoom.room._id,
    bookingId,
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    reservationStatus: "CONFIRMED",
    reservedAt: Date.now()
  });
  
  return {
    assignedRoom: bestRoom.room,
    assignmentReason: bestRoom.assignmentReason
  };
};

const selectBestRoom = async (
  availableRooms: AvailableRoom[],
  pet: CustomerPet,
  customer: Customer,
  preferences: RoomPreferences
): Promise<{ room: HotelRoom; assignmentReason: string }> => {
  // Scoring factors
  const scores = availableRooms.map(({ room, availabilityScore, compatibilityScore }) => {
    let totalScore = 0;
    let reasons: string[] = [];
    
    // Availability score (30% weight)
    totalScore += availabilityScore * 0.3;
    
    // Compatibility score (25% weight)
    totalScore += compatibilityScore * 0.25;
    
    // Customer loyalty preference (20% weight)
    const loyaltyBonus = getLoyaltyRoomBonus(customer.loyaltyTier, room.roomType);
    totalScore += loyaltyBonus * 0.2;
    if (loyaltyBonus > 0) reasons.push(`Loyalty bonus for ${customer.loyaltyTier} tier`);
    
    // Rate preference (15% weight)
    const rateScore = calculateRateScore(room.baseRate, preferences.maxRate);
    totalScore += rateScore * 0.15;
    
    // Special needs compatibility (10% weight)
    const specialNeedsScore = calculateSpecialNeedsScore(room, pet, preferences);
    totalScore += specialNeedsScore * 0.1;
    if (specialNeedsScore > 0) reasons.push("Meets special requirements");
    
    return { room, totalScore, reasons };
  });
  
  // Select room with highest score
  const bestRoom = scores.reduce((best, current) => 
    current.totalScore > best.totalScore ? current : best
  );
  
  return {
    room: bestRoom.room,
    assignmentReason: bestRoom.reasons.length > 0 ? 
      bestRoom.reasons.join(", ") : "Best available match"
  };
};
```

## 📅 Booking System

### Booking Process

#### Booking Structure
```typescript
interface HotelBooking {
  id: string;
  bookingNumber: string;
  
  // Customer and Pet Information
  customerId: string;
  petId: string;
  emergencyContact: EmergencyContact;
  
  // Booking Details
  checkInDate: number;
  checkOutDate: number;
  numberOfNights: number;
  roomId?: string;
  roomType: RoomType;
  
  // Services and Rates
  services: HotelBookingService[];
  baseRate: number;
  serviceCharges: number;
  subtotal: number;
  taxes: number;
  totalAmount: number;
  
  // Payment
  depositRequired: number;
  depositPaid: number;
  balance: number;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  
  // Status Tracking
  status: BookingStatus;
  bookingSource: "PHONE" | "WALK_IN" | "ONLINE" | "REFERRAL";
  
  // Special Requirements
  specialInstructions?: string;
  medicalNeeds?: MedicalNeeds;
  dietaryRequirements?: string[];
  behavioralNotes?: string;
  
  // Check-in/Check-out
  actualCheckIn?: number;
  actualCheckOut?: number;
  checkInCondition?: PetCondition;
  checkOutCondition?: PetCondition;
  
  // Notes and Updates
  notes: BookingNote[];
  updateHistory: BookingUpdate[];
  
  createdAt: number;
  updatedAt: number;
}

enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CHECKED_IN = "CHECKED_IN",
  IN_HOUSE = "IN_HOUSE",
  CHECKED_OUT = "CHECKED_OUT",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW"
}

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

interface HotelBookingService {
  serviceId: string;
  serviceName: string;
  category: "FEEDING" | "MEDICATION" | "EXERCISE" | "GROOMING" | "ENTERTAINMENT" | "SPECIAL_CARE";
  quantity: number;
  unitRate: number;
  subtotal: number;
  isRecurring: boolean;
  schedule?: ServiceSchedule;
}

interface ServiceSchedule {
  frequency: "DAILY" | "TWICE_DAILY" | "AS_NEEDED";
  times?: string[]; // ["08:00", "18:00"]
  specialInstructions?: string;
}

interface MedicalNeeds {
  medications: PetMedication[];
  medicalConditions: string[];
  specialCare: string[];
  veterinarianContact: string;
  dietaryRestrictions: string[];
}

interface PetMedication {
  name: string;
  dosage: string;
  frequency: string;
  administrationMethod: string;
  sideEffects: string[];
  specialInstructions: string;
}
```

#### Online Booking Flow
```typescript
const createBooking = async (bookingData: {
  customerId: string;
  petId: string;
  checkInDate: number;
  checkOutDate: number;
  services: string[];
  specialInstructions?: string;
  emergencyContact: EmergencyContact;
}) => {
  // Validate booking data
  const validation = await validateBookingData(bookingData);
  if (!validation.isValid) {
    throw new ValidationError(validation.errors);
  }
  
  // Check room availability
  const availabilityQuery: AvailabilityQuery = {
    checkInDate: bookingData.checkInDate,
    checkOutDate: bookingData.checkOutDate,
    numberOfPets: 1,
    species: (await ctx.db.get(bookingData.petId)).species
  };
  
  const availableRooms = await findAvailableRooms(availabilityQuery);
  if (availableRooms.length === 0) {
    throw new Error("No rooms available for the selected dates");
  }
  
  // Select best room based on pet needs and customer preferences
  const pet = await ctx.db.get(bookingData.petId);
  const customer = await ctx.db.get(bookingData.customerId);
  const room = await selectOptimalRoomForBooking(availableRooms, pet, customer);
  
  // Calculate rates and services
  const bookingServices = await calculateBookingServices(bookingData.services, pet);
  const rates = await calculateBookingRates(room.room, bookingData, bookingServices);
  
  // Create booking record
  const bookingNumber = await generateBookingNumber(ctx);
  const booking = await ctx.db.insert("hotelBookings", {
    bookingNumber,
    customerId: bookingData.customerId,
    petId: bookingData.petId,
    emergencyContact: bookingData.emergencyContact,
    checkInDate: bookingData.checkInDate,
    checkOutDate: bookingData.checkOutDate,
    numberOfNights: calculateNights(bookingData.checkInDate, bookingData.checkOutDate),
    roomType: room.room.roomType,
    services: bookingServices,
    baseRate: rates.baseRate,
    serviceCharges: rates.serviceCharges,
    subtotal: rates.subtotal,
    taxes: rates.taxes,
    totalAmount: rates.totalAmount,
    depositRequired: rates.depositRequired,
    balance: rates.totalAmount - rates.depositRequired,
    paymentStatus: rates.depositRequired > 0 ? "PENDING" : "PAID",
    status: rates.depositRequired > 0 ? "PENDING" : "CONFIRMED",
    bookingSource: "ONLINE",
    specialInstructions: bookingData.specialInstructions,
    notes: [],
    updateHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Send booking confirmation
  await sendBookingConfirmation(booking);
  
  // Schedule pre-arrival communications
  await schedulePreArrivalCommunications(booking._id);
  
  return booking;
};

const validateBookingData = async (bookingData: any): Promise<{
  isValid: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];
  
  // Basic validation
  if (!bookingData.customerId) errors.push("Customer ID is required");
  if (!bookingData.petId) errors.push("Pet ID is required");
  if (!bookingData.checkInDate) errors.push("Check-in date is required");
  if (!bookingData.checkOutDate) errors.push("Check-out date is required");
  
  // Date validation
  if (bookingData.checkInDate && bookingData.checkOutDate) {
    if (bookingData.checkInDate >= bookingData.checkOutDate) {
      errors.push("Check-out date must be after check-in date");
    }
    
    if (bookingData.checkInDate < Date.now()) {
      errors.push("Check-in date cannot be in the past");
    }
    
    // Advance booking requirements
    const daysInAdvance = (bookingData.checkInDate - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysInAdvance < 1) {
      errors.push("Bookings must be made at least 24 hours in advance");
    }
  }
  
  // Emergency contact validation
  if (bookingData.emergencyContact) {
    if (!bookingData.emergencyContact.name) errors.push("Emergency contact name required");
    if (!bookingData.emergencyContact.phone) errors.push("Emergency contact phone required");
    if (!bookingData.emergencyContact.relationship) errors.push("Emergency contact relationship required");
  }
  
  // Pet validation
  if (bookingData.petId) {
    const pet = await ctx.db.get(bookingData.petId);
    if (!pet) {
      errors.push("Pet not found");
    } else {
      // Vaccination requirements
      const vaccinationCompliance = await checkVaccinationRequirements(pet._id);
      if (!vaccinationCompliance.isCompliant) {
        errors.push(`Vaccination compliance required: ${vaccinationCompliance.missing.join(", ")}`);
      }
      
      // Health status check
      if (pet.isSick || pet.hasContagiousCondition) {
        errors.push("Pet must be healthy for boarding");
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

#### Booking Modifications
```typescript
const modifyBooking = async (
  bookingId: string,
  modifications: BookingModification
) => {
  const booking = await ctx.db.get(bookingId);
  if (!booking) throw new Error("Booking not found");
  
  const originalBooking = { ...booking };
  let updatedBooking = { ...booking };
  
  // Apply modifications based on type
  switch (modifications.type) {
    case "DATE_CHANGE":
      updatedBooking = await modifyBookingDates(booking, modifications);
      break;
    case "ROOM_CHANGE":
      updatedBooking = await modifyRoomAssignment(booking, modifications);
      break;
    case "SERVICE_CHANGE":
      updatedBooking = await modifyBookingServices(booking, modifications);
      break;
    case "PET_CHANGE":
      updatedBooking = await modifyGuestPet(booking, modifications);
      break;
  }
  
  // Recalculate pricing if applicable
  if (["DATE_CHANGE", "ROOM_CHANGE", "SERVICE_CHANGE"].includes(modifications.type)) {
    const updatedRates = await recalculateBookingRates(updatedBooking);
    Object.assign(updatedBooking, updatedRates);
  }
  
  // Check cancellation policy
  const modificationPolicy = getModificationPolicy(booking, modifications);
  const fees = modificationPolicy.fees;
  
  // Apply modification fees
  if (fees.adjustmentFee > 0) {
    updatedBooking.balance += fees.adjustmentFee;
  }
  
  // Process refunds or additional charges
  const financialAdjustment = calculateFinancialAdjustment(originalBooking, updatedBooking, fees);
  
  if (financialAdjustment.refundAmount > 0) {
    await processBookingRefund(bookingId, financialAdjustment.refundAmount, "MODIFICATION");
  } else if (financialAdjustment.additionalCharge > 0) {
    await processBookingCharge(bookingId, financialAdjustment.additionalCharge, "MODIFICATION");
  }
  
  // Update booking record
  await ctx.db.patch(bookingId, {
    ...updatedBooking,
    balance: updatedBooking.totalAmount - updatedBooking.depositPaid + financialAdjustment.additionalCharge,
    lastModified: Date.now(),
    modifiedBy: modifications.requestedBy
  });
  
  // Record modification
  await ctx.db.insert("bookingModifications", {
    bookingId,
    modificationType: modifications.type,
    originalValues: getModificationDiff(originalBooking, updatedBooking),
    modificationDetails: modifications,
    fees: fees,
    processedBy: modifications.processedBy,
    processedAt: Date.now()
  });
  
  // Send modification confirmation
  await sendModificationConfirmation(booking, modifications, financialAdjustment);
  
  return {
    booking: updatedBooking,
    financialAdjustment,
    policy: modificationPolicy
  };
};
```

## 🚪 Check-in Process

### Guest Arrival Workflow

#### Check-in Procedure
```typescript
interface CheckInData {
  bookingId: string;
  actualCheckInTime: number;
  petCondition: PetCondition;
  medications: CheckInMedication[];
  specialCareInstructions: string;
  depositReceived?: number;
  paymentMethod?: string;
  notes?: string;
}

interface PetCondition {
  overallHealth: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  appetite: "NORMAL" | "REDUCED" | "POOR";
  energyLevel: "HIGH" | "NORMAL" | "LOW";
  behavioralNotes: string;
  physicalCondition: string;
  specialObservations: string;
}

const processCheckIn = async (checkInData: CheckInData) => {
  const booking = await ctx.db.get(checkInData.bookingId);
  if (!booking) throw new Error("Booking not found");
  
  if (booking.status !== "CONFIRMED") {
    throw new Error("Booking must be confirmed before check-in");
  }
  
  // Verify pet identification
  const pet = await ctx.db.get(booking.petId);
  if (!pet) throw new Error("Pet not found");
  
  // Update booking status
  await ctx.db.patch(checkInData.bookingId, {
    status: "CHECKED_IN",
    actualCheckIn: checkInData.actualCheckInTime,
    checkInCondition: checkInData.petCondition,
    notes: [
      ...booking.notes,
      {
        note: `Check-in completed: ${checkInData.notes}`,
        createdBy: getCurrentUserId(),
        createdAt: Date.now(),
        noteType: "CHECK_IN"
      }
    ]
  });
  
  // Process deposit if applicable
  if (checkInData.depositReceived && checkInData.depositReceived > 0) {
    await processDepositPayment(
      booking._id,
      checkInData.depositReceived,
      checkInData.paymentMethod!
    );
  }
  
  // Set up medication schedule if provided
  if (checkInData.medications.length > 0) {
    await setupMedicationSchedule(booking._id, checkInData.medications);
  }
  
  // Create daily care log
  const dailyLog = await ctx.db.insert("hotelDailyLogs", {
    bookingId: booking._id,
    petId: booking.petId,
    logDate: getStartOfDay(checkInData.actualCheckInTime),
    checkInRecord: {
      condition: checkInData.petCondition,
      medications: checkInData.medications,
      specialInstructions: checkInData.specialCareInstructions,
      checkedInBy: getCurrentUserId(),
      checkedInAt: checkInData.actualCheckInTime
    },
    feeding: [],
    medication: [],
    activities: [],
    notes: []
  });
  
  // Update room status to occupied
  if (booking.roomId) {
    await ctx.db.patch(booking.roomId, {
      currentGuest: booking._id,
      guestCheckIn: checkInData.actualCheckInTime,
      status: "OCCUPIED"
    });
  }
  
  // Send check-in confirmation to owner
  await sendCheckInConfirmation(booking, checkInData);
  
  // Schedule first meal and activity
  await scheduleFirstDayCare(booking._id, checkInData.actualCheckInTime);
  
  return {
    bookingId: booking._id,
    dailyLogId: dailyLog._id,
    checkInCompleted: true
  };
};
```

#### Initial Pet Assessment
```typescript
const conductPetAssessment = async (
  bookingId: string,
  assessment: PetAssessment
): Promise<AssessmentResult> => {
  const booking = await ctx.db.get(bookingId);
  const pet = await ctx.db.get(booking.petId);
  
  // Conduct comprehensive assessment
  const assessmentResults = {
    behavioralCompatibility: assessBehavioralCompatibility(pet, booking.specialInstructions),
    healthStatus: assessHealthStatus(pet, assessment.healthCheck),
    dietaryCompatibility: assessDietaryNeeds(pet, booking.specialInstructions),
    environmentalNeeds: assessEnvironmentalNeeds(pet),
    socialCompatibility: assessSocialNeeds(pet),
    specialCareRequirements: extractSpecialCareRequirements(booking, assessment)
  };
  
  // Calculate compatibility score
  const compatibilityScore = calculateCompatibilityScore(assessmentResults);
  
  // Generate recommendations
  const recommendations = generateCareRecommendations(assessmentResults, pet);
  
  // Create care plan
  const carePlan = await createCarePlan(booking._id, recommendations, assessmentResults);
  
  // Update daily log with assessment
  const dailyLog = await getCurrentDayLog(booking._id);
  await ctx.db.patch(dailyLog._id, {
    initialAssessment: {
      results: assessmentResults,
      compatibilityScore,
      recommendations,
      carePlan: carePlan._id,
      assessedBy: getCurrentUserId(),
      assessedAt: Date.now()
    }
  });
  
  // Alert staff to any special needs
  if (recommendations.length > 0) {
    await notifyStaffOfSpecialNeeds(booking._id, recommendations);
  }
  
  return {
    compatibilityScore,
    recommendations,
    carePlanId: carePlan._id,
    requiresSpecialAttention: compatibilityScore < 70
  };
};

const generateCareRecommendations = (
  assessment: AssessmentResults,
  pet: CustomerPet
): CareRecommendation[] => {
  const recommendations: CareRecommendation[] = [];
  
  // Behavioral recommendations
  if (assessment.behavioralCompatibility.anxietyLevel > 7) {
    recommendations.push({
      type: "BEHAVIORAL",
      priority: "HIGH",
      description: "Monitor for separation anxiety",
      action: "Provide extra attention and comfort items",
      frequency: "Daily",
      assignedTo: "All Staff"
    });
  }
  
  // Health recommendations
  if (assessment.healthStatus.medications.length > 0) {
    recommendations.push({
      type: "MEDICAL",
      priority: "CRITICAL",
      description: "Medication administration required",
      action: "Follow prescribed medication schedule",
      frequency: "As prescribed",
      assignedTo: "Trained Staff Only"
    });
  }
  
  // Dietary recommendations
  if (assessment.dietaryCompatibility.specialDiet) {
    recommendations.push({
      type: "DIETARY",
      priority: "HIGH",
      description: "Special dietary requirements",
      action: assessment.dietaryCompatibility.instructions,
      frequency: "Every meal",
      assignedTo: "All Staff"
    });
  }
  
  // Social recommendations
  if (assessment.socialCompatibility.prefersSolitude) {
    recommendations.push({
      type: "SOCIAL",
      priority: "MEDIUM",
      description: "Prefers quiet, solitary environment",
      action: "Limit group activities, provide quiet space",
      frequency: "Daily",
      assignedTo: "All Staff"
    });
  }
  
  return recommendations;
};
```

## 🍽️ Daily Care Services

### Feeding Management

#### Feeding Schedules and Tracking
```typescript
interface FeedingSchedule {
  id: string;
  bookingId: string;
  petId: string;
  
  // Schedule Details
  frequency: "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY" | "AS_NEEDED";
  feedingTimes: string[]; // ["08:00", "18:00"]
  foodType: "REGULAR" | "SPECIAL_DIET" | "MEDICAL_DIET" | "Fasting";
  
  // Food Details
  brand: string;
  specificFood: string;
  portionSize: string; // measured amount
  preparation: "DRY" | "WET" | "MIXED" | "SPECIAL_PREPARATION";
  
  // Instructions
  specialInstructions: string;
  appetiteNotes: string;
  dietaryRestrictions: string[];
  allergies: string[];
  
  // Monitoring
  appetiteLevel: "EXCELLENT" | "GOOD" | "POOR" | "REFUSED";
  consumptionRate: number; // percentage of portion eaten
  behavioralNotes?: string;
  
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface FeedingLog {
  id: string;
  bookingId: string;
  petId: string;
  scheduleId?: string;
  
  // Feeding Details
  feedingTime: number;
  foodProvided: string;
  portionSize: string;
  amountConsumed: number; // in grams or measured units
  consumptionPercentage: number;
  
  // Observations
  appetiteBehavior: "NORMAL" | "RELUCTANT" | "REFUSED" | "EXCESSIVE";
  digestiveResponse: "NORMAL" | "SOFT_STOOL" | "DIARRHEA" | "CONSTIPATION" | "VOMITING";
  behavioralNotes: string;
  
  // Staff Information
  fedBy: string;
  supervisedBy?: string;
  notes: string;
  
  createdAt: number;
}

const manageFeedingSchedule = async (
  bookingId: string,
  feedingPlan: FeedingPlan
) => {
  const booking = await ctx.db.get(bookingId);
  const pet = await ctx.db.get(booking.petId);
  
  // Validate feeding plan
  const validation = validateFeedingPlan(feedingPlan, pet);
  if (!validation.isValid) {
    throw new Error(`Invalid feeding plan: ${validation.errors.join(", ")}`);
  }
  
  // Create feeding schedule
  const schedule = await ctx.db.insert("feedingSchedules", {
    bookingId,
    petId: booking.petId,
    frequency: feedingPlan.frequency,
    feedingTimes: feedingPlan.times,
    foodType: feedingPlan.foodType,
    brand: feedingPlan.brand,
    specificFood: feedingPlan.specificFood,
    portionSize: feedingPlan.portionSize,
    preparation: feedingPlan.preparation,
    specialInstructions: feedingPlan.instructions,
    appetiteNotes: feedingPlan.appetiteNotes,
    dietaryRestrictions: feedingPlan.dietaryRestrictions,
    allergies: feedingPlan.allergies,
    appetiteLevel: "NORMAL",
    consumptionRate: 100,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Schedule feeding reminders
  await scheduleFeedingReminders(bookingId, schedule._id, feedingPlan.times);
  
  // Update daily log
  await updateDailyLogWithFeedingPlan(bookingId, schedule);
  
  return schedule;
};

const logFeeding = async (
  feedingData: FeedingLogData
) => {
  const log = await ctx.db.insert("feedingLogs", {
    bookingId: feedingData.bookingId,
    petId: feedingData.petId,
    scheduleId: feedingData.scheduleId,
    feedingTime: feedingData.feedingTime,
    foodProvided: feedingData.foodProvided,
    portionSize: feedingData.portionSize,
    amountConsumed: feedingData.amountConsumed,
    consumptionPercentage: feedingData.consumptionPercentage,
    appetiteBehavior: feedingData.appetiteBehavior,
    digestiveResponse: feedingData.digestiveResponse,
    behavioralNotes: feedingData.behavioralNotes,
    fedBy: getCurrentUserId(),
    notes: feedingData.notes,
    createdAt: Date.now()
  });
  
  // Update feeding schedule with latest observations
  if (feedingData.scheduleId) {
    await ctx.db.patch(feedingData.scheduleId, {
      appetiteLevel: mapAppetiteBehaviorToLevel(feedingData.appetiteBehavior),
      consumptionRate: feedingData.consumptionPercentage,
      behavioralNotes: feedingData.behavioralNotes,
      updatedAt: Date.now()
    });
  }
  
  // Check for appetite concerns
  if (feedingData.appetiteBehavior === "REFUSED" || feedingData.consumptionPercentage < 50) {
    await flagAppetiteConcern(feedingData.bookingId, feedingData);
    await notifyManagerOfFeedingIssue(feedingData.bookingId, feedingData);
  }
  
  // Update daily log
  await addFeedingToDailyLog(feedingData.bookingId, log);
  
  return log;
};
```

### Medication Administration

#### Medication Tracking System
```typescript
interface MedicationSchedule {
  id: string;
  bookingId: string;
  petId: string;
  
  // Medication Details
  medicationName: string;
  genericName?: string;
  dosage: string;
  administrationRoute: "ORAL" | "TOPICAL" | "INJECTION" | "INHALATION";
  
  // Schedule
  frequency: string; // "twice daily", "every 8 hours", "as needed"
  specificTimes: string[]; // ["08:00", "20:00"]
  duration: string; // "7 days", "until gone"
  
  // Instructions
  specialInstructions: string;
  foodInstructions: "WITH_FOOD" | "WITHOUT_FOOD" | "EITHER";
  timingInstructions: string; // "Give with breakfast and dinner"
  
  // Safety
  contraindications: string[];
  sideEffects: string[];
  emergencyContact: string;
  
  // Tracking
  totalDoses: number;
  dosesAdministered: number;
  dosesRemaining: number;
  nextDueTime?: number;
  
  status: "ACTIVE" | "COMPLETED" | "SUSPENDED" | "CANCELLED";
  createdAt: number;
  updatedAt: number;
}

interface MedicationAdministration {
  id: string;
  scheduleId: string;
  bookingId: string;
  petId: string;
  
  // Administration Details
  scheduledTime: number;
  actualTime: number;
  medicationName: string;
  dosage: string;
  route: string;
  
  // Administration
  administeredBy: string;
  supervisedBy?: string;
  method: string;
  easeOfAdministration: "EASY" | "MODERATE" | "DIFFICULT" | "REFUSED";
  
  // Response
  immediateResponse: "NORMAL" | "ADVERSE" | "REFUSED" | "VOMITED";
  adverseReactions?: string;
  behavioralResponse: string;
  followUpRequired: boolean;
  
  notes: string;
  createdAt: number;
}

const setupMedicationSchedule = async (
  bookingId: string,
  medications: CheckInMedication[]
) => {
  const booking = await ctx.db.get(bookingId);
  const schedules: MedicationSchedule[] = [];
  
  for (const medication of medications) {
    const schedule = await ctx.db.insert("medicationSchedules", {
      bookingId,
      petId: booking.petId,
      medicationName: medication.name,
      genericName: medication.genericName,
      dosage: medication.dosage,
      administrationRoute: medication.route,
      frequency: medication.frequency,
      specificTimes: medication.times || generateMedicationTimes(medication.frequency),
      duration: medication.duration,
      specialInstructions: medication.instructions,
      foodInstructions: medication.foodInstructions,
      timingInstructions: medication.timingInstructions,
      contraindications: medication.contraindications || [],
      sideEffects: medication.sideEffects || [],
      emergencyContact: medication.emergencyContact,
      totalDoses: calculateTotalDoses(medication),
      dosesAdministered: 0,
      dosesRemaining: calculateTotalDoses(medication),
      status: "ACTIVE",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    schedules.push(schedule);
    
    // Schedule administration reminders
    await scheduleMedicationReminders(schedule._id, medication);
  }
  
  // Update daily log with medication setup
  await updateDailyLogWithMedicationSchedule(bookingId, schedules);
  
  // Notify staff about medications
  await notifyStaffOfMedications(bookingId, schedules);
  
  return schedules;
};

const administerMedication = async (
  administrationData: MedicationAdministrationData
) => {
  // Verify medication schedule is active
  const schedule = await ctx.db.get(administrationData.scheduleId);
  if (!schedule || schedule.status !== "ACTIVE") {
    throw new Error("Medication schedule not found or not active");
  }
  
  // Check if due for administration
  const now = Date.now();
  if (schedule.nextDueTime && now < schedule.nextDueTime - (15 * 60 * 1000)) {
    // Allow early administration (±15 minutes)
    console.warn("Medication administered early");
  }
  
  // Record administration
  const administration = await ctx.db.insert("medicationAdministrations", {
    scheduleId: administrationData.scheduleId,
    bookingId: schedule.bookingId,
    petId: schedule.petId,
    scheduledTime: administrationData.scheduledTime,
    actualTime: now,
    medicationName: schedule.medicationName,
    dosage: schedule.dosage,
    route: schedule.administrationRoute,
    administeredBy: getCurrentUserId(),
    supervisedBy: administrationData.supervisedBy,
    method: administrationData.method,
    easeOfAdministration: administrationData.easeOfAdministration,
    immediateResponse: administrationData.immediateResponse,
    adverseReactions: administrationData.adverseReactions,
    behavioralResponse: administrationData.behavioralResponse,
    followUpRequired: administrationData.followUpRequired,
    notes: administrationData.notes,
    createdAt: now
  });
  
  // Update schedule
  const newDosesAdministered = schedule.dosesAdministered + 1;
  const newDosesRemaining = schedule.dosesRemaining - 1;
  
  await ctx.db.patch(administrationData.scheduleId, {
    dosesAdministered: newDosesAdministered,
    dosesRemaining: newDosesRemaining,
    nextDueTime: calculateNextDueTime(schedule),
    updatedAt: now
  });
  
  // Check if medication course is complete
  if (newDosesRemaining <= 0) {
    await ctx.db.patch(administrationData.scheduleId, {
      status: "COMPLETED",
      updatedAt: now
    });
  }
  
  // Handle adverse reactions
  if (administrationData.immediateResponse === "ADVERSE" || administrationData.adverseReactions) {
    await handleAdverseMedicationReaction(schedule, administrationData);
  }
  
  // Update daily log
  await addMedicationToDailyLog(schedule.bookingId, administration);
  
  // Notify owner of medication administration
  await notifyOwnerOfMedication(schedule.bookingId, administration);
  
  return administration;
};
```

### Activity and Exercise

#### Exercise and Enrichment Programs
```typescript
interface ExercisePlan {
  id: string;
  bookingId: string;
  petId: string;
  
  // Exercise Details
  exerciseType: "WALK" | "PLAY" | "SOCIALIZATION" | "TRAINING" | "FREE_PLAY";
  intensity: "LOW" | "MODERATE" | "HIGH";
  duration: number; // minutes
  
  // Schedule
  frequency: "ONCE_DAILY" | "TWICE_DAILY" | "THREE_TIMES_DAILY" | "AS_NEEDED";
  preferredTimes: string[]; // ["09:00", "15:00", "19:00"]
  
  // Specific Activities
  activities: string[];
  equipment: string[];
  location: "INDOOR" | "OUTDOOR" | "BOTH";
  
  // Pet-Specific Requirements
  breedConsiderations: string;
  sizeConsiderations: string;
  energyLevel: "LOW" | "MODERATE" | "HIGH";
  specialNeeds: string[];
  
  // Safety and Behavior
  behavioralNotes: string;
  socialCompatibility: "SOLITARY" | "COMFORTABLE" | "SOCIAL" | "EXCITABLE";
  safetyConsiderations: string[];
  
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ExerciseLog {
  id: string;
  planId: string;
  bookingId: string;
  petId: string;
  
  // Exercise Session
  startTime: number;
  endTime: number;
  actualDuration: number;
  exerciseType: string;
  
  // Activities Performed
  activitiesCompleted: string[];
  equipmentUsed: string[];
  location: string;
  
  // Pet Response
  energyLevel: "LOW" | "MODERATE" | "HIGH" | "EXHAUSTED";
  enthusiasm: "RELUCTANT" | "MODERATE" | "ENTHUSIASTIC";
  behavior: "CALM" | "PLAYFUL" | "EXCITED" | "ANXIOUS" | "AGGRESSIVE";
  
  // Safety and Notes
  incidents: string[];
  staffNotes: string;
  anyConcerns: boolean;
  
  // Staff Information
  conductedBy: string;
  supervisedBy?: string;
  
  createdAt: number;
}

const createExercisePlan = async (
  bookingId: string,
  exerciseData: ExerciseData
) => {
  const booking = await ctx.db.get(bookingId);
  const pet = await ctx.db.get(booking.petId);
  
  // Assess pet's exercise needs
  const exerciseNeeds = assessExerciseNeeds(pet, exerciseData.healthStatus, exerciseData.behavioralNotes);
  
  const plan = await ctx.db.insert("exercisePlans", {
    bookingId,
    petId: booking.petId,
    exerciseType: exerciseNeeds.primaryType,
    intensity: exerciseNeeds.intensity,
    duration: exerciseNeeds.recommendedDuration,
    frequency: exerciseNeeds.frequency,
    preferredTimes: exerciseNeeds.optimalTimes,
    activities: exerciseNeeds.recommendedActivities,
    equipment: exerciseNeeds.requiredEquipment,
    location: exerciseNeeds.preferredLocation,
    breedConsiderations: getBreedExerciseConsiderations(pet.breed),
    sizeConsiderations: getSizeExerciseConsiderations(pet.weight),
    energyLevel: exerciseNeeds.energyLevel,
    specialNeeds: exerciseNeeds.specialRequirements,
    behavioralNotes: exerciseData.behavioralNotes,
    socialCompatibility: exerciseData.socialBehavior,
    safetyConsiderations: exerciseNeeds.safetyRequirements,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Schedule exercise sessions
  await scheduleExerciseSessions(plan._id, exerciseNeeds);
  
  // Update daily log
  await updateDailyLogWithExercisePlan(bookingId, plan);
  
  return plan;
};

const logExerciseSession = async (
  exerciseData: ExerciseLogData
) => {
  const log = await ctx.db.insert("exerciseLogs", {
    planId: exerciseData.planId,
    bookingId: exerciseData.bookingId,
    petId: exerciseData.petId,
    startTime: exerciseData.startTime,
    endTime: exerciseData.endTime,
    actualDuration: exerciseData.actualDuration,
    exerciseType: exerciseData.exerciseType,
    activitiesCompleted: exerciseData.activitiesCompleted,
    equipmentUsed: exerciseData.equipmentUsed,
    location: exerciseData.location,
    energyLevel: exerciseData.energyLevel,
    enthusiasm: exerciseData.enthusiasm,
    behavior: exerciseData.behavior,
    incidents: exerciseData.incidents || [],
    staffNotes: exerciseData.staffNotes,
    anyConcerns: exerciseData.anyConcerns || false,
    conductedBy: getCurrentUserId(),
    supervisedBy: exerciseData.supervisedBy,
    createdAt: Date.now()
  });
  
  // Update exercise plan based on session results
  if (exerciseData.anyConcerns || exerciseData.incidents.length > 0) {
    await updateExercisePlanForConcerns(exerciseData.planId, exerciseData);
  }
  
  // Add to daily log
  await addExerciseToDailyLog(exerciseData.bookingId, log);
  
  // Notify staff of any concerns
  if (exerciseData.anyConcerns) {
    await notifyStaffOfExerciseConcerns(exerciseData.bookingId, exerciseData);
  }
  
  return log;
};
```

## 📊 Reports & Analytics

### Hotel Performance Metrics

#### Key Performance Indicators
```typescript
interface HotelKPIs {
  // Occupancy Metrics
  occupancyRate: number;
  averageLengthOfStay: number;
  roomUtilizationRate: number;
  doubleOccupancyRate: number;
  
  // Financial Metrics
  totalRevenue: number;
  revenuePerAvailableRoom: number;
  averageDailyRate: number;
  revenueByRoomType: { [roomType: string]: number };
  
  // Operational Metrics
  checkInTimeAccuracy: number; // percentage of on-time check-ins
  customerSatisfactionScore: number;
  staffProductivityScore: number;
  incidentRate: number;
  
  // Service Metrics
  serviceUtilizationRate: { [service: string]: number };
  averageServiceRevenue: number;
  dietaryComplianceRate: number;
  medicationComplianceRate: number;
  
  // Quality Metrics
  cleanlinessScore: number;
  maintenanceResponseTime: number;
  customerComplaintRate: number;
  repeatBookingRate: number;
}

const generateHotelDashboard = async (
  startDate: number,
  endDate: number,
  branchId?: string
): Promise<HotelKPIs> => {
  const bookings = await getBookingsForPeriod(startDate, endDate, branchId);
  const rooms = await getHotelRooms(branchId);
  
  // Calculate occupancy metrics
  const occupancyRate = calculateOccupancyRate(bookings, rooms, startDate, endDate);
  const averageLengthOfStay = calculateAverageLengthOfStay(bookings);
  const roomUtilizationRate = calculateRoomUtilizationRate(bookings, rooms);
  const doubleOccupancyRate = calculateDoubleOccupancyRate(bookings);
  
  // Calculate financial metrics
  const totalRevenue = bookings
    .filter(b => b.status === "CHECKED_OUT")
    .reduce((sum, b) => sum + b.totalAmount, 0);
  
  const revenuePerAvailableRoom = totalRevenue / (rooms.length * calculateNights(startDate, endDate));
  const averageDailyRate = calculateAverageDailyRate(bookings);
  const revenueByRoomType = calculateRevenueByRoomType(bookings);
  
  // Calculate operational metrics
  const checkInTimeAccuracy = calculateCheckInAccuracy(bookings);
  const customerSatisfactionScore = await calculateCustomerSatisfaction(bookings);
  const staffProductivityScore = await calculateStaffProductivity(bookings);
  const incidentRate = calculateIncidentRate(bookings);
  
  // Calculate service metrics
  const serviceUtilizationRate = calculateServiceUtilization(bookings);
  const averageServiceRevenue = calculateAverageServiceRevenue(bookings);
  const dietaryComplianceRate = calculateDietaryCompliance(bookings);
  const medicationComplianceRate = calculateMedicationCompliance(bookings);
  
  // Calculate quality metrics
  const cleanlinessScore = calculateCleanlinessScore(rooms);
  const maintenanceResponseTime = calculateMaintenanceResponseTime(rooms);
  const customerComplaintRate = calculateCustomerComplaintRate(bookings);
  const repeatBookingRate = calculateRepeatBookingRate(bookings);
  
  return {
    occupancyRate,
    averageLengthOfStay,
    roomUtilizationRate,
    doubleOccupancyRate,
    totalRevenue,
    revenuePerAvailableRoom,
    averageDailyRate,
    revenueByRoomType,
    checkInTimeAccuracy,
    customerSatisfactionScore,
    staffProductivityScore,
    incidentRate,
    serviceUtilizationRate,
    averageServiceRevenue,
    dietaryComplianceRate,
    medicationComplianceRate,
    cleanlinessScore,
    maintenanceResponseTime,
    customerComplaintRate,
    repeatBookingRate
  };
};
```

---

**Related Documentation**:
- [User Guide](./05-user-guide.md) - Complete business workflows
- [API Reference](./04-api-reference.md) - Technical API details
- [Installation Guide](./02-installation-guide.md) - System setup
- [System Architecture](./06-system-architecture.md) - Technical overview
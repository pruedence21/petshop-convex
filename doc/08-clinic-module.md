# 🏥 Clinic Module Documentation - Pet Shop Management System

Comprehensive documentation for the Clinic module, covering veterinary services, appointment management, medical records, and treatment workflows.

## 📋 Table of Contents

- [Module Overview](#module-overview)
- [Appointment Management](#appointment-management)
- [Medical Records](#medical-records)
- [Service Management](#service-management)
- [Staff Scheduling](#staff-scheduling)
- [Treatment Workflows](#treatment-workflows)
- [Prescription Management](#prescription-management)
- [Vaccination Tracking](#vaccination-tracking)
- [Billing & Payments](#billing--payments)
- [Reports & Analytics](#reports--analytics)

## 🎯 Module Overview

The Clinic module provides a complete veterinary practice management system, enabling pet shops to offer medical services alongside retail operations. It integrates scheduling, medical records, treatments, and billing into a unified workflow.

### Key Features

- **Smart Scheduling**: Conflict detection and optimization
- **Medical Records**: Complete pet health history
- **Treatment Tracking**: Comprehensive care documentation
- **Vaccination Management**: Automated reminders and compliance
- **Prescription System**: Digital prescriptions and pharmacy integration
- **Staff Coordination**: Veterinarian and technician scheduling
- **Billing Integration**: Service billing with payment processing

### Business Benefits

- **Diversified Revenue**: Medical services increase profitability
- **Customer Retention**: Comprehensive pet care builds loyalty
- **Operational Efficiency**: Streamlined medical workflows
- **Compliance**: Vaccination tracking and health compliance
- **Professional Image**: Comprehensive medical record keeping

## 📅 Appointment Management

### Appointment System

#### Appointment Types
```typescript
enum AppointmentType {
  CONSULTATION = "CONSULTATION",
  VACCINATION = "VACCINATION", 
  TREATMENT = "TREATMENT",
  SURGERY = "SURGERY",
  GROOMING = "GROOMING",
  EMERGENCY = "EMERGENCY",
  FOLLOW_UP = "FOLLOW_UP",
  ROUTINE_CHECKUP = "ROUTINE_CHECKUP"
}

enum AppointmentStatus {
  SCHEDULED = "SCHEDULED",
  CONFIRMED = "CONFIRMED", 
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW"
}
```

#### Appointment Structure
```typescript
interface ClinicAppointment {
  id: string;
  appointmentNumber: string;
  customerId: string;
  petId: string;
  branchId: string;
  appointmentDate: number;
  duration: number; // minutes
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  veterinarianId: string;
  technicianId?: string;
  services: ClinicServiceItem[];
  estimatedCost: number;
  actualCost?: number;
  notes?: string;
  specialInstructions?: string;
  reminderSent: boolean;
  confirmationStatus: "PENDING" | "CONFIRMED" | "DECLINED";
  createdAt: number;
  updatedAt: number;
}

interface ClinicServiceItem {
  serviceId: string;
  serviceName: string;
  category: "MEDICAL" | "SURGICAL" | "GROOMING" | "PREVENTIVE";
  quantity: number;
  unitPrice: number;
  subtotal: number;
  cogs: number;
  duration: number;
  technicianRequired: boolean;
}
```

### Smart Scheduling

#### Availability Management
```typescript
interface VeterinarianAvailability {
  veterinarianId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:00"
  isAvailable: boolean;
  maxDailyAppointments: number;
  servicePreferences: string[]; // preferred service types
}

interface TimeSlot {
  startTime: number;
  endTime: number;
  isAvailable: boolean;
  veterinarianId?: string;
  appointmentId?: string;
  serviceType?: string;
}

const findAvailableSlots = async (
  veterinarianId: string,
  serviceType: string,
  requestedDate: number,
  duration: number
): Promise<TimeSlot[]> => {
  const veterinarian = await ctx.db.get(veterinarianId);
  const dayOfWeek = new Date(requestedDate).getDay();
  
  const availability = await ctx.db
    .query("veterinarianAvailability")
    .withIndex("by_veterinarian_day", q => 
      q.eq("veterinarianId", veterinarianId)
       .eq("dayOfWeek", dayOfWeek)
    )
    .unique();
  
  if (!availability || !availability.isAvailable) {
    return [];
  }
  
  // Generate available time slots
  const slots: TimeSlot[] = [];
  const date = new Date(requestedDate);
  const [startHour, startMinute] = availability.startTime.split(":").map(Number);
  const [endHour, endMinute] = availability.endTime.split(":").map(Number);
  
  let currentSlotStart = new Date(date);
  currentSlotStart.setHours(startHour, startMinute, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMinute, 0, 0);
  
  while (currentSlotStart.getTime() + (duration * 60 * 1000) <= dayEnd.getTime()) {
    const slotEnd = new Date(currentSlotStart.getTime() + (duration * 60 * 1000));
    
    // Check for conflicts
    const hasConflict = await hasAppointmentConflict(
      veterinarianId,
      currentSlotStart.getTime(),
      slotEnd.getTime()
    );
    
    if (!hasConflict) {
      slots.push({
        startTime: currentSlotStart.getTime(),
        endTime: slotEnd.getTime(),
        isAvailable: true,
        veterinarianId,
        serviceType
      });
    }
    
    // Move to next slot (15-minute intervals)
    currentSlotStart = new Date(currentSlotStart.getTime() + (15 * 60 * 1000));
  }
  
  return slots;
};
```

#### Conflict Detection
```typescript
const hasAppointmentConflict = async (
  veterinarianId: string,
  startTime: number,
  endTime: number,
  excludeAppointmentId?: string
): Promise<boolean> => {
  const conflictingAppointments = await ctx.db
    .query("clinicAppointments")
    .withIndex("by_veterinarian_date", q => 
      q.eq("veterinarianId", veterinarianId)
    )
    .filter(appointment => {
      // Exclude the appointment being edited
      if (excludeAppointmentId && appointment._id === excludeAppointmentId) {
        return false;
      }
      
      // Check for time overlap
      const appointmentEnd = appointment.appointmentDate + (appointment.duration * 60 * 1000);
      return (startTime < appointmentEnd && endTime > appointment.appointmentDate);
    })
    .collect();
  
  return conflictingAppointments.length > 0;
};

const validateAppointmentScheduling = async (appointmentData: {
  veterinarianId: string;
  appointmentDate: number;
  duration: number;
  services: ClinicServiceItem[];
}) => {
  const errors: string[] = [];
  
  // Check veterinarian availability
  const dayOfWeek = new Date(appointmentData.appointmentDate).getDay();
  const availability = await ctx.db
    .query("veterinarianAvailability")
    .withIndex("by_veterinarian_day", q => 
      q.eq("veterinarianId", appointmentData.veterinarianId)
       .eq("dayOfWeek", dayOfWeek)
    )
    .unique();
  
  if (!availability || !availability.isAvailable) {
    errors.push("Veterinarian not available on this day");
  }
  
  // Check for scheduling conflicts
  const hasConflict = await hasAppointmentConflict(
    appointmentData.veterinarianId,
    appointmentData.appointmentDate,
    appointmentData.appointmentDate + (appointmentData.duration * 60 * 1000)
  );
  
  if (hasConflict) {
    errors.push("Appointment time conflicts with existing appointment");
  }
  
  // Check veterinarian can perform required services
  const veterinarian = await ctx.db.get(appointmentData.veterinarianId);
  const requiredServices = appointmentData.services.map(s => s.category);
  const veterinarianSpecialties = veterinarian?.specialties || [];
  
  const missingSpecialties = requiredServices.filter(
    specialty => !veterinarianSpecialties.includes(specialty)
  );
  
  if (missingSpecialties.length > 0) {
    errors.push(`Veterinarian not qualified for: ${missingSpecialties.join(", ")}`);
  }
  
  return { isValid: errors.length === 0, errors };
};
```

### Appointment Booking Flow

#### Customer Booking
```typescript
const bookAppointment = async (bookingData: {
  customerId: string;
  petId: string;
  appointmentType: AppointmentType;
  preferredDate: number;
  preferredTime?: string;
  services: string[];
  notes?: string;
}) => {
  // 1. Get available slots for preferred date
  const availableSlots = await getAvailableSlotsForDate(
    bookingData.preferredDate,
    bookingData.services
  );
  
  if (availableSlots.length === 0) {
    throw new Error("No available slots on the preferred date");
  }
  
  // 2. Select best slot (prefer specified time or first available)
  let selectedSlot = availableSlots[0];
  if (bookingData.preferredTime) {
    const preferredTimestamp = new Date(
      new Date(bookingData.preferredDate).toDateString() + " " + bookingData.preferredTime
    ).getTime();
    
    const exactMatch = availableSlots.find(
      slot => Math.abs(slot.startTime - preferredTimestamp) < 15 * 60 * 1000
    );
    
    if (exactMatch) {
      selectedSlot = exactMatch;
    }
  }
  
  // 3. Get service details and calculate cost
  const services = await Promise.all(
    bookingData.services.map(serviceId => ctx.db.get(serviceId))
  );
  
  const serviceItems = services.map(service => ({
    serviceId: service._id,
    serviceName: service.name,
    category: service.category,
    quantity: 1,
    unitPrice: service.price,
    subtotal: service.price,
    cogs: service.cogs || 0,
    duration: service.duration,
    technicianRequired: service.requiresTechnician
  }));
  
  const totalDuration = serviceItems.reduce((sum, s) => sum + s.duration, 0);
  const estimatedCost = serviceItems.reduce((sum, s) => sum + s.subtotal, 0);
  
  // 4. Create appointment
  const appointment = await ctx.db.insert("clinicAppointments", {
    appointmentNumber: await generateAppointmentNumber(ctx),
    customerId: bookingData.customerId,
    petId: bookingData.petId,
    branchId: getCurrentBranchId(),
    appointmentDate: selectedSlot.startTime,
    duration: totalDuration,
    appointmentType: bookingData.appointmentType,
    status: "SCHEDULED",
    veterinarianId: selectedSlot.veterinarianId,
    services: serviceItems,
    estimatedCost,
    notes: bookingData.notes,
    specialInstructions: "",
    reminderSent: false,
    confirmationStatus: "PENDING",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // 5. Send confirmation
  await sendAppointmentConfirmation(appointment);
  
  return appointment;
};
```

#### Automated Reminders
```typescript
const scheduleAppointmentReminders = async (appointmentId: string) => {
  const appointment = await ctx.db.get(appointmentId);
  const customer = await ctx.db.get(appointment.customerId);
  const pet = await ctx.db.get(appointment.petId);
  
  const reminderTimes = [
    { type: "24HOUR", hours: 24 },
    { type: "2HOUR", hours: 2 }
  ];
  
  for (const reminder of reminderTimes) {
    const reminderTime = appointment.appointmentDate - (reminder.hours * 60 * 60 * 1000);
    
    // Schedule reminder
    await ctx.db.insert("scheduledReminders", {
      appointmentId,
      reminderType: reminder.type,
      scheduledFor: reminderTime,
      recipientId: customer._id,
      recipientType: "CUSTOMER",
      message: generateReminderMessage(appointment, pet, reminder.type),
      sent: false,
      method: customer.preferredContact
    });
  }
};

const generateReminderMessage = (
  appointment: ClinicAppointment,
  pet: CustomerPet,
  reminderType: string
): string => {
  const date = new Date(appointment.appointmentDate);
  const time = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  const appointmentInfo = `
Appointment Reminder - ${reminderType}

Dear ${pet.name}'s owner,

This is a reminder for your pet's upcoming appointment:

🐾 Pet: ${pet.name} (${pet.species})
📅 Date: ${date.toLocaleDateString()}
⏰ Time: ${time}
👨‍⚕️ Veterinarian: ${appointment.veterinarianId}
📋 Services: ${appointment.services.map(s => s.serviceName).join(", ")}

Please arrive 10 minutes early to complete check-in.

To reschedule or cancel, please call us at least 2 hours in advance.

Thank you!
Pet Shop Clinic Team
  `.trim();
  
  return appointmentInfo;
};
```

## 📋 Medical Records

### Record Structure

#### Medical Record Types
```typescript
enum MedicalRecordType {
  EXAMINATION = "EXAMINATION",
  VACCINATION = "VACCINATION",
  TREATMENT = "TREATMENT",
  SURGERY = "SURGERY",
  MEDICATION = "MEDICATION",
  DENTAL = "DENTAL",
  EMERGENCY = "EMERGENCY",
  CONSULTATION = "CONSULTATION"
}

interface PetMedicalRecord {
  id: string;
  petId: string;
  appointmentId?: string;
  recordDate: number;
  recordType: MedicalRecordType;
  veterinarianId: string;
  
  // Basic Information
  reasonForVisit: string;
  presentingComplaint: string;
  
  // Physical Examination
  physicalExam: PhysicalExamination;
  
  // Diagnosis
  primaryDiagnosis: string;
  differentialDiagnosis: string[];
  icd10Code?: string;
  
  // Treatment
  treatmentPlan: string;
  medications: MedicationPrescription[];
  procedures: Procedure[];
  instructions: string;
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: number;
  followUpInstructions?: string;
  
  // Additional Information
  vitalSigns: VitalSigns;
  weight: number;
  notes: string;
  attachments: string[]; // Convex storage IDs
  
  // Compliance
  vaccinationCompliance?: VaccinationCompliance;
  nextDueDate?: number;
  
  createdAt: number;
  updatedAt: number;
}

interface PhysicalExamination {
  general: string; // alert, responsive, etc.
  cardiovascular: string;
  respiratory: string;
  gastrointestinal: string;
  genitourinary: string;
  musculoskeletal: string;
  neurological: string;
  integumentary: string; // skin, coat
  eyes: string;
  ears: string;
  oral: string;
}

interface VitalSigns {
  temperature: number; // Fahrenheit
  heartRate: number; // bpm
  respiratoryRate: number; // breaths per minute
  bloodPressure?: string;
  capillaryRefillTime: number; // seconds
  mucousMembraneColor: string;
  hydrationStatus: string;
}
```

#### Vaccination Records
```typescript
interface VaccinationRecord {
  id: string;
  petId: string;
  vaccineType: VaccineType;
  vaccineName: string;
  manufacturer: string;
  lotNumber: string;
  expirationDate: number;
  administrationDate: number;
  nextDueDate: number;
  veterinarianId: string;
  clinicId: string;
  route: "INTRAMUSCULAR" | "SUBCUTANEOUS" | "ORAL" | "NASAL";
  site: string; // injection site
  reactions?: string;
  certificateNumber: string;
  isBooster: boolean;
  complianceStatus: "COMPLIANT" | "DUE_SOON" | "OVERDUE";
}

enum VaccineType {
  // Core Vaccines (Dogs)
  RABIES = "RABIES",
  DISTEMPER = "DISTEMPER",
  PARVOVIRUS = "PARVOVIRUS",
  ADENOVIRUS = "ADENOVIRUS",
  
  // Core Vaccines (Cats)  
  PANLEUKOPENIA = "PANLEUKOPENIA",
  CALICIVIRUS = "CALICIVIRUS",
  HERPESVIRUS = "HERPESVIRUS",
  
  // Non-Core Vaccines
  BORDETELLA = "BORDETELLA",
  LEPTOSPIROSIS = "LEPTOSPIROSIS",
  LYME = "LYME",
  INFLUENZA = "INFLUENZA",
  FELV = "FELV" // Feline Leukemia
}

interface VaccinationSchedule {
  species: "DOG" | "CAT";
  vaccineType: VaccineType;
  firstDoseAge: number; // weeks
  secondDoseAge: number; // weeks
  boosterInterval: number; // weeks
  annualBooster: boolean;
  requirements: string[];
}
```

### Record Management

#### Creating Medical Records
```typescript
const createMedicalRecord = async (recordData: {
  petId: string;
  appointmentId?: string;
  recordType: MedicalRecordType;
  veterinarianId: string;
  examinationData: {
    reasonForVisit: string;
    physicalExam: Partial<PhysicalExamination>;
    vitalSigns: Partial<VitalSigns>;
    weight: number;
  };
  diagnosis: {
    primaryDiagnosis: string;
    differentialDiagnosis: string[];
    icd10Code?: string;
  };
  treatment: {
    treatmentPlan: string;
    medications: MedicationPrescription[];
    procedures: Procedure[];
    instructions: string;
  };
  followUp: {
    followUpRequired: boolean;
    followUpDate?: number;
    followUpInstructions?: string;
  };
}) => {
  // Validate veterinarian authorization
  const veterinarian = await ctx.db.get(recordData.veterinarianId);
  if (!veterinarian || veterinarian.licenseStatus !== "ACTIVE") {
    throw new Error("Invalid or inactive veterinarian");
  }
  
  // Create medical record
  const medicalRecord = await ctx.db.insert("petMedicalRecords", {
    petId: recordData.petId,
    appointmentId: recordData.appointmentId,
    recordDate: Date.now(),
    recordType: recordData.recordType,
    veterinarianId: recordData.veterinarianId,
    reasonForVisit: recordData.examinationData.reasonForVisit,
    presentingComplaint: recordData.examinationData.reasonForVisit,
    physicalExam: recordData.examinationData.physicalExam,
    primaryDiagnosis: recordData.diagnosis.primaryDiagnosis,
    differentialDiagnosis: recordData.diagnosis.differentialDiagnosis,
    icd10Code: recordData.diagnosis.icd10Code,
    treatmentPlan: recordData.treatment.treatmentPlan,
    medications: recordData.treatment.medications,
    procedures: recordData.treatment.procedures,
    instructions: recordData.treatment.instructions,
    followUpRequired: recordData.followUp.followUpRequired,
    followUpDate: recordData.followUp.followUpDate,
    followUpInstructions: recordData.followUp.followUpInstructions,
    vitalSigns: recordData.examinationData.vitalSigns,
    weight: recordData.examinationData.weight,
    notes: "",
    attachments: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  
  // Update vaccination records if applicable
  if (recordData.recordType === "VACCINATION") {
    await updateVaccinationRecords(recordData.petId, recordData.treatment.medications);
  }
  
  // Schedule follow-up if required
  if (recordData.followUp.followUpRequired && recordData.followUp.followUpDate) {
    await scheduleFollowUp(recordData.petId, recordData.followUp.followUpDate);
  }
  
  // Create task for staff follow-up
  if (recordData.treatment.medications.length > 0) {
    await createMedicationFollowUpTask(recordData.petId, recordData.treatment.medications);
  }
  
  return medicalRecord;
};
```

#### Medical History Retrieval
```typescript
const getPetMedicalHistory = async (petId: string, options?: {
  recordType?: MedicalRecordType;
  startDate?: number;
  endDate?: number;
  limit?: number;
  includeAttachments?: boolean;
}): Promise<PetMedicalRecord[]> => {
  let query = ctx.db
    .query("petMedicalRecords")
    .withIndex("by_pet_date", q => q.eq("petId", petId))
    .order("desc"); // Most recent first
  
  // Apply filters
  if (options?.recordType) {
    query = query.filter(record => record.recordType === options.recordType);
  }
  
  if (options?.startDate) {
    query = query.filter(record => record.recordDate >= options.startDate!);
  }
  
  if (options?.endDate) {
    query = query.filter(record => record.recordDate <= options.endDate!);
  }
  
  const records = await query.collect();
  
  // Apply limit
  const limitedRecords = options?.limit ? records.slice(0, options.limit) : records;
  
  // Load attachments if requested
  if (options?.includeAttachments) {
    for (const record of limitedRecords) {
      if (record.attachments && record.attachments.length > 0) {
        record.attachmentUrls = await Promise.all(
          record.attachments.map(async (attachmentId) => {
            const url = await ctx.storage.getUrl(attachmentId);
            return url;
          })
        );
      }
    }
  }
  
  return limitedRecords;
};

const getVaccinationCompliance = async (petId: string): Promise<VaccinationComplianceReport> => {
  const vaccinationRecords = await ctx.db
    .query("vaccinationRecords")
    .withIndex("by_pet", q => q.eq("petId", petId))
    .collect();
  
  const pet = await ctx.db.get(petId);
  const currentDate = Date.now();
  
  const compliance = vaccinationRecords.map(record => {
    const daysUntilDue = Math.ceil((record.nextDueDate - currentDate) / (1000 * 60 * 60 * 24));
    
    return {
      vaccineType: record.vaccineType,
      vaccineName: record.vaccineName,
      lastAdministration: record.administrationDate,
      nextDueDate: record.nextDueDate,
      daysUntilDue,
      status: daysUntilDue < 0 ? "OVERDUE" : 
             daysUntilDue <= 30 ? "DUE_SOON" : "COMPLIANT",
      isOverdue: daysUntilDue < 0,
      daysOverdue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0
    };
  });
  
  return {
    petId,
    petName: pet.name,
    species: pet.species,
    complianceSummary: {
      totalVaccines: compliance.length,
      compliant: compliance.filter(c => c.status === "COMPLIANT").length,
      dueSoon: compliance.filter(c => c.status === "DUE_SOON").length,
      overdue: compliance.filter(c => c.status === "OVERDUE").length
    },
    vaccines: compliance,
    generatedAt: currentDate
  };
};
```

## 🏷️ Service Management

### Service Categories

#### Service Structure
```typescript
interface ClinicService {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  subcategory: string;
  
  // Pricing
  basePrice: number;
  costPrice: number; // for COGS calculation
  priceStructure: "FLAT" | "WEIGHT_BASED" | "TIME_BASED" | "COMPLEXITY_BASED";
  
  // Duration and Requirements
  averageDuration: number; // minutes
  preparationTime: number; // minutes
  recoveryTime?: number; // minutes
  
  // Staff Requirements
  veterinarianRequired: boolean;
  technicianRequired: boolean;
  assistantRequired: boolean;
  
  // Equipment and Room
  requiredEquipment: string[];
  roomType: "EXAMINATION" | "SURGERY" | "TREATMENT" | "DENTAL" | "GROOMING";
  
  // Medical Requirements
  prerequisites: string[]; // required vaccinations, age limits, etc.
  contraindications: string[];
  ageRestrictions?: {
    minAge: number; // weeks
    maxAge?: number; // weeks
  };
  
  // Availability
  isActive: boolean;
  bookingAdvanceDays: number; // how far in advance it can be booked
  maxDailyBookings: number;
  
  // Veterinary Requirements
  requiredSpecialties: string[];
  difficultyLevel: "BASIC" | "INTERMEDIATE" | "ADVANCED" | "SPECIALIST";
  
  createdAt: number;
  updatedAt: number;
}

enum ServiceCategory {
  CONSULTATION = "CONSULTATION",
  VACCINATION = "VACCINATION",
  SURGERY = "SURGERY",
  DENTAL = "DENTAL",
  DIAGNOSTIC = "DIAGNOSTIC",
  THERAPY = "THERAPY",
  GROOMING = "GROOMING",
  EMERGENCY = "EMERGENCY",
  PREVENTIVE = "PREVENTIVE",
  SPECIALIST = "SPECIALIST"
}
```

#### Predefined Services
```typescript
const CLINIC_SERVICES: ClinicService[] = [
  {
    id: "consultation_general",
    name: "General Consultation",
    description: "Comprehensive health examination and consultation",
    category: "CONSULTATION",
    subcategory: "Wellness",
    basePrice: 45000, // $45.00
    costPrice: 5000,
    priceStructure: "FLAT",
    averageDuration: 30,
    preparationTime: 5,
    veterinarianRequired: true,
    technicianRequired: false,
    requiredEquipment: ["examination table", "stethoscope", "thermometer"],
    roomType: "EXAMINATION",
    prerequisites: [],
    contraindications: [],
    isActive: true,
    bookingAdvanceDays: 30,
    maxDailyBookings: 20,
    requiredSpecialties: ["general practice"],
    difficultyLevel: "BASIC"
  },
  
  {
    id: "vaccination_rabies",
    name: "Rabies Vaccination",
    description: "Annual rabies vaccination as required by law",
    category: "VACCINATION",
    subcategory: "Core Vaccines",
    basePrice: 25000,
    costPrice: 8000,
    priceStructure: "FLAT",
    averageDuration: 15,
    preparationTime: 5,
    veterinarianRequired: true,
    technicianRequired: false,
    requiredEquipment: ["vaccines", "syringes", "alcohol swabs"],
    roomType: "EXAMINATION",
    prerequisites: ["age >= 12 weeks"],
    contraindications: ["sick animals", "pregnant animals"],
    isActive: true,
    bookingAdvanceDays: 14,
    maxDailyBookings: 30,
    requiredSpecialties: ["general practice"],
    difficultyLevel: "BASIC"
  },
  
  {
    id: "surgery_spay",
    name: "Spay Surgery (Female)",
    description: "Ovariohysterectomy surgery for female dogs and cats",
    category: "SURGERY",
    subcategory: "Elective Surgery",
    basePrice: 350000, // $350.00
    costPrice: 85000,
    priceStructure: "WEIGHT_BASED",
    averageDuration: 60,
    preparationTime: 30,
    recoveryTime: 240,
    veterinarianRequired: true,
    technicianRequired: true,
    assistantRequired: true,
    requiredEquipment: ["surgical suite", "anesthesia machine", "surgical instruments"],
    roomType: "SURGERY",
    prerequisites: ["age >= 6 months", "weight >= 2kg", "healthy"],
    contraindications: ["sick animals", "pregnant animals", "heat cycle"],
    isActive: true,
    bookingAdvanceDays: 7,
    maxDailyBookings: 2,
    requiredSpecialties: ["surgery"],
    difficultyLevel: "SPECIALIST"
  }
];
```

### Service Pricing

#### Dynamic Pricing Rules
```typescript
interface PricingRule {
  id: string;
  serviceId: string;
  ruleType: "WEIGHT" | "AGE" | "BREED" | "TIME" | "BUNDLE" | "LOYALTY";
  conditions: PricingCondition[];
  adjustmentType: "FIXED_AMOUNT" | "PERCENTAGE" | "MULTIPLIER";
  adjustmentValue: number;
  isActive: boolean;
  priority: number; // for rule precedence
}

interface PricingCondition {
  field: string; // "pet.weight", "pet.age", "booking.time", etc.
  operator: "equals" | "greater_than" | "less_than" | "between" | "in";
  value: any;
}

const calculateServicePrice = async (
  serviceId: string,
  petId: string,
  bookingDate: number,
  customerTier?: string
): Promise<{ basePrice: number; finalPrice: number; appliedRules: PricingRule[] }> => {
  const service = await ctx.db.get(serviceId);
  const pet = await ctx.db.get(petId);
  
  let finalPrice = service.basePrice;
  const appliedRules: PricingRule[] = [];
  
  // Get applicable pricing rules
  const pricingRules = await ctx.db
    .query("pricingRules")
    .withIndex("by_service_active", q => 
      q.eq("serviceId", serviceId)
       .eq("isActive", true)
    )
    .order("priority") // Process lower priority first
    .collect();
  
  // Apply pricing rules
  for (const rule of pricingRules) {
    if (evaluatePricingConditions(rule.conditions, pet, bookingDate)) {
      let adjustment = 0;
      
      switch (rule.adjustmentType) {
        case "FIXED_AMOUNT":
          adjustment = rule.adjustmentValue;
          break;
        case "PERCENTAGE":
          adjustment = finalPrice * (rule.adjustmentValue / 100);
          break;
        case "MULTIPLIER":
          adjustment = finalPrice * (rule.adjustmentValue - 1);
          break;
      }
      
      finalPrice += adjustment;
      appliedRules.push(rule);
    }
  }
  
  // Apply loyalty discount
  if (customerTier) {
    const loyaltyDiscount = getLoyaltyDiscount(customerTier);
    if (loyaltyDiscount > 0) {
      finalPrice *= (1 - loyaltyDiscount);
    }
  }
  
  return {
    basePrice: service.basePrice,
    finalPrice: Math.round(finalPrice),
    appliedRules
  };
};

const evaluatePricingConditions = (
  conditions: PricingCondition[],
  pet: CustomerPet,
  bookingDate: number
): boolean => {
  return conditions.every(condition => {
    const fieldValue = getFieldValue(pet, condition.field);
    
    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "greater_than":
        return fieldValue > condition.value;
      case "less_than":
        return fieldValue < condition.value;
      case "between":
        return fieldValue >= condition.value[0] && fieldValue <= condition.value[1];
      case "in":
        return condition.value.includes(fieldValue);
      default:
        return false;
    }
  });
};
```

## 👥 Staff Scheduling

### Veterinarian Management

#### Staff Structure
```typescript
interface ClinicStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  specialties: string[];
  licenseNumber: string;
  licenseExpiry: number;
  licenseStatus: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  
  // Schedule
  workSchedule: WeeklySchedule;
  hourlyRate?: number;
  commissionRate?: number;
  
  // Performance
  averageAppointmentTime: number;
  customerRating: number;
  totalAppointments: number;
  completionRate: number;
  
  // Availability
  vacationDays: VacationDay[];
  breakTimes: BreakTime[];
  
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

enum StaffRole {
  VETERINARIAN = "VETERINARIAN",
  VETERINARY_TECHNICIAN = "VETERINARY_TECHNICIAN",
  VETERINARY_ASSISTANT = "VETERINARY_ASSISTANT",
  RECEPTIONIST = "RECEPTIONIST",
  MANAGER = "MANAGER"
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface DaySchedule {
  isWorkingDay: boolean;
  startTime?: string; // "09:00"
  endTime?: string; // "17:00"
  breakStart?: string;
  breakEnd?: string;
  maxAppointments?: number;
  preferredServices?: string[];
}
```

#### Schedule Generation
```typescript
const generateWeeklySchedule = async (staffId: string, weekStartDate: number): Promise<{
  schedule: { [key: string]: TimeSlot[] };
  conflicts: ScheduleConflict[];
  utilization: UtilizationReport;
}> => {
  const staff = await ctx.db.get(staffId);
  const weekDates = getWeekDates(weekStartDate);
  
  const schedule: { [key: string]: TimeSlot[] } = {};
  const conflicts: ScheduleConflict[] = [];
  
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = i; // 0 = Sunday, 6 = Saturday
    const date = weekDates[i];
    const dayName = getDayName(dayOfWeek);
    
    const daySchedule = staff.workSchedule[dayName.toLowerCase() as keyof WeeklySchedule] as DaySchedule;
    
    if (!daySchedule?.isWorkingDay) {
      schedule[date] = [];
      continue;
    }
    
    // Generate available time slots for the day
    const dailySlots = await generateDailySlots(
      staffId,
      date,
      daySchedule.startTime!,
      daySchedule.endTime!,
      daySchedule.breakStart,
      daySchedule.breakEnd,
      daySchedule.maxAppointments || 10
    );
    
    // Check for scheduling conflicts
    const dayConflicts = await checkScheduleConflicts(staffId, date, dailySlots);
    conflicts.push(...dayConflicts);
    
    schedule[date] = dailySlots;
  }
  
  const utilization = calculateScheduleUtilization(schedule, conflicts);
  
  return { schedule, conflicts, utilization };
};

const generateDailySlots = async (
  staffId: string,
  date: number,
  startTime: string,
  endTime: string,
  breakStart?: string,
  breakEnd?: string,
  maxAppointments: number = 10
): Promise<TimeSlot[]> => {
  const slots: TimeSlot[] = [];
  const dateObj = new Date(date);
  
  // Parse times
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const [breakStartHour, breakStartMinute] = breakStart?.split(":").map(Number) || [0, 0];
  const [breakEndHour, breakEndMinute] = breakEnd?.split(":").map(Number) || [0, 0];
  
  let currentSlotStart = new Date(date);
  currentSlotStart.setHours(startHour, startMinute, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMinute, 0, 0);
  
  const breakStartTime = new Date(date);
  breakStartTime.setHours(breakStartHour, breakStartMinute, 0, 0);
  
  const breakEndTime = new Date(date);
  breakEndTime.setHours(breakEndHour, breakEndMinute, 0, 0);
  
  while (currentSlotStart.getTime() < dayEnd.getTime()) {
    const slotEnd = new Date(currentSlotStart.getTime() + (30 * 60 * 1000)); // 30-minute slots
    
    // Skip break time
    if (currentSlotStart >= breakStartTime && currentSlotStart < breakEndTime) {
      currentSlotStart = new Date(currentSlotStart.getTime() + (15 * 60 * 1000));
      continue;
    }
    
    // Check if we can add more appointments today
    const currentAppointments = slots.filter(slot => 
      new Date(slot.startTime).toDateString() === dateObj.toDateString()
    ).length;
    
    if (currentAppointments >= maxAppointments) {
      break;
    }
    
    // Check for existing appointments
    const hasAppointment = await hasAppointmentAtTime(staffId, currentSlotStart.getTime());
    
    slots.push({
      startTime: currentSlotStart.getTime(),
      endTime: slotEnd.getTime(),
      isAvailable: !hasAppointment,
      veterinarianId: hasAppointment ? staffId : undefined
    });
    
    currentSlotStart = new Date(currentSlotStart.getTime() + (15 * 60 * 1000)); // 15-minute intervals
  }
  
  return slots;
};
```

## 💊 Prescription Management

### Digital Prescriptions

#### Prescription Structure
```typescript
interface MedicationPrescription {
  id: string;
  appointmentId: string;
  petId: string;
  veterinarianId: string;
  
  // Medication Information
  medicationName: string;
  genericName?: string;
  brandName?: string;
  strength: string;
  dosageForm: "TABLET" | "CAPSULE" | "LIQUID" | "INJECTION" | "TOPICAL" | "DROP";
  
  // Prescription Details
  dosage: string; // e.g., "1 tablet", "5ml"
  frequency: string; // e.g., "twice daily", "every 8 hours"
  duration: string; // e.g., "7 days", "until finished"
  totalQuantity: number;
  refills: number;
  
  // Administration
  routeOfAdministration: string;
  administrationInstructions: string;
  foodInstructions: "WITH_FOOD" | "WITHOUT_FOOD" | "EITHER";
  
  // Safety Information
  contraindications: string[];
  sideEffects: string[];
  precautions: string[];
  
  // Pharmacy Information
  prescriptionNumber: string;
  dateWritten: number;
  expiryDate: number;
  pharmacyNotes?: string;
  
  // Fulfillment
  fulfillmentDate?: number;
  filledBy?: string;
  remainingRefills: number;
  status: "ACTIVE" | "FILLED" | "EXPIRED" | "CANCELLED";
}

const createPrescription = async (prescriptionData: {
  appointmentId: string;
  petId: string;
  veterinarianId: string;
  medication: {
    name: string;
    strength: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions: string;
  };
}) => {
  // Validate veterinarian authorization
  const veterinarian = await ctx.db.get(prescriptionData.veterinarianId);
  if (!veterinarian?.licenseStatus || veterinarian.licenseStatus !== "ACTIVE") {
    throw new Error("Invalid or inactive veterinarian");
  }
  
  // Check for drug interactions (basic implementation)
  const existingPrescriptions = await ctx.db
    .query("medicationPrescriptions")
    .withIndex("by_pet_active", q => 
      q.eq("petId", prescriptionData.petId)
       .eq("status", "ACTIVE")
    )
    .collect();
  
  const interactions = await checkDrugInteractions(
    prescriptionData.medication.name,
    existingPrescriptions.map(p => p.medicationName)
  );
  
  if (interactions.length > 0) {
    // Log potential interactions for veterinarian review
    console.warn("Potential drug interactions detected:", interactions);
  }
  
  // Create prescription
  const prescription = await ctx.db.insert("medicationPrescriptions", {
    appointmentId: prescriptionData.appointmentId,
    petId: prescriptionData.petId,
    veterinarianId: prescriptionData.veterinarianId,
    medicationName: prescriptionData.medication.name,
    strength: prescriptionData.medication.strength,
    dosage: prescriptionData.medication.dosage,
    frequency: prescriptionData.medication.frequency,
    duration: prescriptionData.medication.duration,
    totalQuantity: prescriptionData.medication.quantity,
    administrationInstructions: prescriptionData.medication.instructions,
    prescriptionNumber: await generatePrescriptionNumber(ctx),
    dateWritten: Date.now(),
    expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
    refills: 0,
    remainingRefills: 0,
    status: "ACTIVE",
    routeOfAdministration: "ORAL",
    foodInstructions: "EITHER"
  });
  
  // Update medical record
  await ctx.db.patch(prescriptionData.appointmentId, {
    medications: [
      ...(await ctx.db.get(prescriptionData.appointmentId)).medications || [],
      prescription
    ]
  });
  
  // Create reminder for owner
  await scheduleMedicationReminder(prescription);
  
  return prescription;
};
```

#### Medication Tracking
```typescript
const trackMedicationAdministration = async (
  prescriptionId: string,
  administeredBy: string,
  administeredAt: number,
  notes?: string
) => {
  const prescription = await ctx.db.get(prescriptionId);
  if (!prescription) throw new Error("Prescription not found");
  
  // Record administration
  const administration = await ctx.db.insert("medicationAdministrations", {
    prescriptionId,
    petId: prescription.petId,
    administeredBy,
    administeredAt,
    notes,
    sideEffectsObserved: false
  });
  
  // Update prescription
  const newRemainingQuantity = prescription.totalQuantity - 1;
  const isComplete = newRemainingQuantity <= 0;
  
  await ctx.db.patch(prescriptionId, {
    totalQuantity: newRemainingQuantity,
    status: isComplete ? "COMPLETED" : "ACTIVE"
  });
  
  // Check for side effects follow-up
  if (notes?.includes("side effect")) {
    await scheduleSideEffectFollowUp(prescription.petId, administration);
  }
  
  return administration;
};

const scheduleMedicationReminder = async (prescription: MedicationPrescription) => {
  // Calculate reminder schedule based on frequency
  const reminderFrequency = getReminderFrequency(prescription.frequency);
  const pet = await ctx.db.get(prescription.petId);
  const customer = await ctx.db.get(pet.customerId);
  
  // Schedule reminders for medication administration
  let currentTime = Date.now();
  const endTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days max
  
  while (currentTime < endTime) {
    await ctx.db.insert("scheduledReminders", {
      petId: prescription.petId,
      customerId: pet.customerId,
      reminderType: "MEDICATION",
      scheduledFor: currentTime,
      message: `Time for ${pet.name}'s medication: ${prescription.medicationName}`,
      method: customer.preferredContact,
      priority: "HIGH",
      referenceId: prescription._id,
      sent: false
    });
    
    currentTime += reminderFrequency;
  }
};
```

## 📊 Reports & Analytics

### Clinic Performance Metrics

#### Key Performance Indicators
```typescript
interface ClinicKPIs {
  // Financial Metrics
  totalRevenue: number;
  revenueByService: { [serviceType: string]: number };
  averageAppointmentValue: number;
  conversionRate: number; // consultations to treatments
  
  // Operational Metrics
  appointmentUtilization: number; // percentage of available slots filled
  averageWaitTime: number;
  appointmentCompletionRate: number;
  noShowRate: number;
  
  // Quality Metrics
  customerSatisfactionScore: number;
  treatmentSuccessRate: number;
  averageTreatmentDuration: number;
  
  // Staff Performance
  veterinarianProductivity: { [vetId: string]: ProductivityMetrics };
  technicianUtilization: number;
  
  // Health Outcomes
  vaccinationComplianceRate: number;
  followUpCompletionRate: number;
  emergencyVisitRate: number;
}

const generateClinicDashboard = async (
  startDate: number,
  endDate: number,
  veterinarianId?: string
): Promise<ClinicKPIs> => {
  // Get appointments for period
  let query = ctx.db
    .query("clinicAppointments")
    .withIndex("by_date", q => 
      q.gte("appointmentDate", startDate)
       .lte("appointmentDate", endDate)
    );
  
  if (veterinarianId) {
    query = query.filter(apt => apt.veterinarianId === veterinarianId);
  }
  
  const appointments = await query.collect();
  
  // Calculate financial metrics
  const totalRevenue = appointments
    .filter(apt => apt.status === "COMPLETED")
    .reduce((sum, apt) => sum + (apt.actualCost || apt.estimatedCost), 0);
  
  const revenueByService = calculateRevenueByService(appointments);
  const averageAppointmentValue = appointments.length > 0 ? 
    totalRevenue / appointments.filter(apt => apt.status === "COMPLETED").length : 0;
  
  // Calculate operational metrics
  const appointmentUtilization = await calculateAppointmentUtilization(
    startDate, endDate, veterinarianId
  );
  
  const averageWaitTime = await calculateAverageWaitTime(appointments);
  const completionRate = appointments.length > 0 ? 
    appointments.filter(apt => apt.status === "COMPLETED").length / appointments.length : 0;
  
  const noShowRate = appointments.length > 0 ?
    appointments.filter(apt => apt.status === "NO_SHOW").length / appointments.length : 0;
  
  // Calculate quality metrics
  const customerSatisfaction = await calculateCustomerSatisfaction(appointments);
  const treatmentSuccessRate = await calculateTreatmentSuccessRate(appointments);
  const averageTreatmentDuration = calculateAverageTreatmentDuration(appointments);
  
  // Staff performance
  const veterinarianProductivity = await calculateVeterinarianProductivity(
    appointments, startDate, endDate
  );
  
  // Health outcomes
  const vaccinationCompliance = await calculateVaccinationCompliance();
  const followUpCompletion = await calculateFollowUpCompletion(appointments);
  const emergencyRate = appointments.filter(apt => apt.appointmentType === "EMERGENCY").length /
    appointments.length;
  
  return {
    totalRevenue,
    revenueByService,
    averageAppointmentValue,
    conversionRate: calculateConversionRate(appointments),
    appointmentUtilization,
    averageWaitTime,
    appointmentCompletionRate: completionRate,
    noShowRate,
    customerSatisfactionScore: customerSatisfaction,
    treatmentSuccessRate,
    averageTreatmentDuration,
    veterinarianProductivity,
    technicianUtilization: await calculateTechnicianUtilization(appointments),
    vaccinationComplianceRate: vaccinationCompliance,
    followUpCompletionRate: followUpCompletion,
    emergencyVisitRate: emergencyRate
  };
};
```

### Detailed Reports

#### Appointment Analysis Report
```typescript
interface AppointmentAnalysisReport {
  period: { startDate: number; endDate: number };
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShows: number;
    rescheduledAppointments: number;
    completionRate: number;
    noShowRate: number;
  };
  byServiceType: { [serviceType: string]: ServiceTypeStats };
  byDayOfWeek: { [dayName: string]: DayStats };
  byTimeSlot: { [timeSlot: string]: TimeSlotStats };
  byVeterinarian: { [vetId: string]: VeterinarianStats };
  trends: {
    dailyAppointments: DailyTrend[];
    serviceTypeTrends: ServiceTypeTrend[];
    revenueTrends: RevenueTrend[];
  };
  recommendations: string[];
}

const generateAppointmentReport = async (
  startDate: number,
  endDate: number,
  branchId?: string
): Promise<AppointmentAnalysisReport> => {
  const appointments = await getAppointmentsForPeriod(startDate, endDate, branchId);
  
  const summary = {
    totalAppointments: appointments.length,
    completedAppointments: appointments.filter(apt => apt.status === "COMPLETED").length,
    cancelledAppointments: appointments.filter(apt => apt.status === "CANCELLED").length,
    noShows: appointments.filter(apt => apt.status === "NO_SHOW").length,
    rescheduledAppointments: appointments.filter(apt => apt.status === "RESCHEDULED").length,
    completionRate: 0,
    noShowRate: 0
  };
  
  summary.completionRate = summary.totalAppointments > 0 ?
    (summary.completedAppointments / summary.totalAppointments) * 100 : 0;
  
  summary.noShowRate = summary.totalAppointments > 0 ?
    (summary.noShows / summary.totalAppointments) * 100 : 0;
  
  // Analyze by service type
  const byServiceType = analyzeAppointmentsByServiceType(appointments);
  
  // Analyze by day of week
  const byDayOfWeek = analyzeAppointmentsByDay(appointments);
  
  // Analyze by time slot
  const byTimeSlot = analyzeAppointmentsByTime(appointments);
  
  // Analyze by veterinarian
  const byVeterinarian = await analyzeAppointmentsByVeterinarian(appointments);
  
  // Generate trends
  const trends = await generateAppointmentTrends(startDate, endDate);
  
  // Generate recommendations
  const recommendations = generateOptimizationRecommendations({
    summary,
    byServiceType,
    byDayOfWeek,
    byTimeSlot,
    trends
  });
  
  return {
    period: { startDate, endDate },
    summary,
    byServiceType,
    byDayOfWeek,
    byTimeSlot,
    byVeterinarian,
    trends,
    recommendations
  };
};
```

---

**Related Documentation**:
- [User Guide](./05-user-guide.md) - Complete business workflows
- [API Reference](./04-api-reference.md) - Technical API details
- [Installation Guide](./02-installation-guide.md) - System setup
- [System Architecture](./06-system-architecture.md) - Technical overview
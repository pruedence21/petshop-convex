# 👥 Customer Module Documentation - Pet Shop Management System

Comprehensive documentation for the Customer module, covering customer profiles, pet management, and loyalty programs.

## 📋 Table of Contents

- [Module Overview](#module-overview)
- [Customer Management](#customer-management)
- [Pet Profiles](#pet-profiles)
- [Loyalty Program](#loyalty-program)
- [API Reference](#api-reference)

## 🎯 Module Overview

The Customer module centralizes all client information, including contact details, pet profiles, and interaction history. It serves as the foundation for Sales, Clinic, and Hotel services.

### Key Features

- **Customer Profiles**: Detailed contact info and preferences.
- **Pet Profiles**: Comprehensive medical and behavioral data for pets.
- **Loyalty Tracking**: Points and rewards system.
- **History**: Integrated view of sales, clinic visits, and hotel stays.

## 👥 Customer Management

Managed in `convex/master_data/customers.ts`.

### Data Structure

- **Basic Info**: Name, Phone, Email, Address.
- **Preferences**: Communication preferences, marketing opt-in.
- **Metrics**: Total spent, Visit count, Last visit.

### Workflows

1.  **Registration**: Quick create during sales or full registration.
2.  **Updates**: Modify contact info or preferences.
3.  **Search**: Efficient lookup by name, phone, or email.

## 🐾 Pet Profiles

Managed in `convex/master_data/customerPets.ts`.

### Data Structure

- **Identity**: Name, Species, Breed, Gender, DOB.
- **Physical**: Weight, Color, Microchip ID.
- **Medical**: Allergies, Chronic conditions, Vaccination status.
- **Behavior**: Temperament notes, Handling instructions.

### Integration

- **Clinic**: Linked to medical records and appointments.
- **Hotel**: Used for booking and care instructions.
- **Sales**: Track product preferences per pet.

## 🎁 Loyalty Program

- **Points**: Earn points on purchases.
- **Tiers**: Bronze, Silver, Gold levels based on spend.
- **Redemption**: Use points for discounts or products.

## 🔧 API Reference

### Customers

- `master_data.customers.list`: List customers.
- `master_data.customers.search`: Search customers by term.
- `master_data.customers.create`: Register new customer.
- `master_data.customers.getProfile`: Get full profile including pets.

### Pets

- `master_data.customerPets.listByCustomer`: Get pets for a specific customer.
- `master_data.customerPets.create`: Add a new pet.
- `master_data.customerPets.update`: Update pet details.

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountingHelpers from "../accountingHelpers.js";
import type * as accountingPeriods from "../accountingPeriods.js";
import type * as accountingSeed from "../accountingSeed.js";
import type * as accounts from "../accounts.js";
import type * as accountsReceivable from "../accountsReceivable.js";
import type * as animalCategories from "../animalCategories.js";
import type * as animalSubcategories from "../animalSubcategories.js";
import type * as auth from "../auth.js";
import type * as backfillMedicalRecords from "../backfillMedicalRecords.js";
import type * as bankAccounts from "../bankAccounts.js";
import type * as bankSeed from "../bankSeed.js";
import type * as bankTransactions from "../bankTransactions.js";
import type * as branches from "../branches.js";
import type * as brands from "../brands.js";
import type * as clinicAppointmentServices from "../clinicAppointmentServices.js";
import type * as clinicAppointments from "../clinicAppointments.js";
import type * as clinicPayments from "../clinicPayments.js";
import type * as clinicSeed from "../clinicSeed.js";
import type * as clinicServiceCategories from "../clinicServiceCategories.js";
import type * as clinicServices from "../clinicServices.js";
import type * as clinicStaff from "../clinicStaff.js";
import type * as customerPets from "../customerPets.js";
import type * as customers from "../customers.js";
import type * as expenseCategories from "../expenseCategories.js";
import type * as expenseSeed from "../expenseSeed.js";
import type * as expenses from "../expenses.js";
import type * as financialReports from "../financialReports.js";
import type * as generalLedger from "../generalLedger.js";
import type * as hotelBookingServices from "../hotelBookingServices.js";
import type * as hotelBookings from "../hotelBookings.js";
import type * as hotelConsumables from "../hotelConsumables.js";
import type * as hotelPayments from "../hotelPayments.js";
import type * as hotelRooms from "../hotelRooms.js";
import type * as http from "../http.js";
import type * as journalEntries from "../journalEntries.js";
import type * as myFunctions from "../myFunctions.js";
import type * as petMedicalRecords from "../petMedicalRecords.js";
import type * as productCategories from "../productCategories.js";
import type * as productStock from "../productStock.js";
import type * as productSubcategories from "../productSubcategories.js";
import type * as productVariants from "../productVariants.js";
import type * as products from "../products.js";
import type * as purchaseOrderItems from "../purchaseOrderItems.js";
import type * as purchaseOrders from "../purchaseOrders.js";
import type * as roles from "../roles.js";
import type * as salePayments from "../salePayments.js";
import type * as sales from "../sales.js";
import type * as stockMovements from "../stockMovements.js";
import type * as suppliers from "../suppliers.js";
import type * as unitConversions from "../unitConversions.js";
import type * as units from "../units.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountingHelpers: typeof accountingHelpers;
  accountingPeriods: typeof accountingPeriods;
  accountingSeed: typeof accountingSeed;
  accounts: typeof accounts;
  accountsReceivable: typeof accountsReceivable;
  animalCategories: typeof animalCategories;
  animalSubcategories: typeof animalSubcategories;
  auth: typeof auth;
  backfillMedicalRecords: typeof backfillMedicalRecords;
  bankAccounts: typeof bankAccounts;
  bankSeed: typeof bankSeed;
  bankTransactions: typeof bankTransactions;
  branches: typeof branches;
  brands: typeof brands;
  clinicAppointmentServices: typeof clinicAppointmentServices;
  clinicAppointments: typeof clinicAppointments;
  clinicPayments: typeof clinicPayments;
  clinicSeed: typeof clinicSeed;
  clinicServiceCategories: typeof clinicServiceCategories;
  clinicServices: typeof clinicServices;
  clinicStaff: typeof clinicStaff;
  customerPets: typeof customerPets;
  customers: typeof customers;
  expenseCategories: typeof expenseCategories;
  expenseSeed: typeof expenseSeed;
  expenses: typeof expenses;
  financialReports: typeof financialReports;
  generalLedger: typeof generalLedger;
  hotelBookingServices: typeof hotelBookingServices;
  hotelBookings: typeof hotelBookings;
  hotelConsumables: typeof hotelConsumables;
  hotelPayments: typeof hotelPayments;
  hotelRooms: typeof hotelRooms;
  http: typeof http;
  journalEntries: typeof journalEntries;
  myFunctions: typeof myFunctions;
  petMedicalRecords: typeof petMedicalRecords;
  productCategories: typeof productCategories;
  productStock: typeof productStock;
  productSubcategories: typeof productSubcategories;
  productVariants: typeof productVariants;
  products: typeof products;
  purchaseOrderItems: typeof purchaseOrderItems;
  purchaseOrders: typeof purchaseOrders;
  roles: typeof roles;
  salePayments: typeof salePayments;
  sales: typeof sales;
  stockMovements: typeof stockMovements;
  suppliers: typeof suppliers;
  unitConversions: typeof unitConversions;
  units: typeof units;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

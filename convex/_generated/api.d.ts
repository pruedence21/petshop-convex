/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as animalCategories from "../animalCategories.js";
import type * as animalSubcategories from "../animalSubcategories.js";
import type * as auth from "../auth.js";
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
import type * as http from "../http.js";
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
  animalCategories: typeof animalCategories;
  animalSubcategories: typeof animalSubcategories;
  auth: typeof auth;
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
  http: typeof http;
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

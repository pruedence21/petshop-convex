/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as __tests___helpers_mockContext from "../__tests__/helpers/mockContext.js";
import type * as __tests___helpers_testData from "../__tests__/helpers/testData.js";
import type * as adminMutations from "../adminMutations.js";
import type * as adminSeed from "../adminSeed.js";
import type * as auth from "../auth.js";
import type * as clinic_animalCategories from "../clinic/animalCategories.js";
import type * as clinic_animalSubcategories from "../clinic/animalSubcategories.js";
import type * as clinic_backfillMedicalRecords from "../clinic/backfillMedicalRecords.js";
import type * as clinic_clinicAppointmentServices from "../clinic/clinicAppointmentServices.js";
import type * as clinic_clinicAppointments from "../clinic/clinicAppointments.js";
import type * as clinic_clinicPayments from "../clinic/clinicPayments.js";
import type * as clinic_clinicSeed from "../clinic/clinicSeed.js";
import type * as clinic_clinicServiceCategories from "../clinic/clinicServiceCategories.js";
import type * as clinic_clinicServices from "../clinic/clinicServices.js";
import type * as clinic_clinicStaff from "../clinic/clinicStaff.js";
import type * as clinic_petMedicalRecords from "../clinic/petMedicalRecords.js";
import type * as clinic_pharmacy from "../clinic/pharmacy.js";
import type * as finance_accountingHelpers from "../finance/accountingHelpers.js";
import type * as finance_accountingPeriods from "../finance/accountingPeriods.js";
import type * as finance_accountingSeed from "../finance/accountingSeed.js";
import type * as finance_accounts from "../finance/accounts.js";
import type * as finance_accountsReceivable from "../finance/accountsReceivable.js";
import type * as finance_bankAccounts from "../finance/bankAccounts.js";
import type * as finance_bankSeed from "../finance/bankSeed.js";
import type * as finance_bankTransactions from "../finance/bankTransactions.js";
import type * as finance_expenseCategories from "../finance/expenseCategories.js";
import type * as finance_expenseSeed from "../finance/expenseSeed.js";
import type * as finance_expenses from "../finance/expenses.js";
import type * as finance_financialReports from "../finance/financialReports.js";
import type * as finance_generalLedger from "../finance/generalLedger.js";
import type * as finance_journalEntries from "../finance/journalEntries.js";
import type * as hotel_hotelBookingServices from "../hotel/hotelBookingServices.js";
import type * as hotel_hotelBookings from "../hotel/hotelBookings.js";
import type * as hotel_hotelConsumables from "../hotel/hotelConsumables.js";
import type * as hotel_hotelPayments from "../hotel/hotelPayments.js";
import type * as hotel_hotelRooms from "../hotel/hotelRooms.js";
import type * as http from "../http.js";
import type * as inventory_brands from "../inventory/brands.js";
import type * as inventory_expiry from "../inventory/expiry.js";
import type * as inventory_productCategories from "../inventory/productCategories.js";
import type * as inventory_productStock from "../inventory/productStock.js";
import type * as inventory_productSubcategories from "../inventory/productSubcategories.js";
import type * as inventory_productVariants from "../inventory/productVariants.js";
import type * as inventory_products from "../inventory/products.js";
import type * as inventory_stockMovements from "../inventory/stockMovements.js";
import type * as inventory_suppliers from "../inventory/suppliers.js";
import type * as inventory_unitConversions from "../inventory/unitConversions.js";
import type * as inventory_units from "../inventory/units.js";
import type * as master_data_branches from "../master_data/branches.js";
import type * as master_data_customerPets from "../master_data/customerPets.js";
import type * as master_data_customers from "../master_data/customers.js";
import type * as master_data_masterDataSeed from "../master_data/masterDataSeed.js";
import type * as myFunctions from "../myFunctions.js";
import type * as procurement_purchaseOrderItems from "../procurement/purchaseOrderItems.js";
import type * as procurement_purchaseOrders from "../procurement/purchaseOrders.js";
import type * as reports_clinicReports from "../reports/clinicReports.js";
import type * as reports_dashboardReports from "../reports/dashboardReports.js";
import type * as reports_hotelReports from "../reports/hotelReports.js";
import type * as reports_inventoryReports from "../reports/inventoryReports.js";
import type * as reports_salesReports from "../reports/salesReports.js";
import type * as sales_salePayments from "../sales/salePayments.js";
import type * as sales_sales from "../sales/sales.js";
import type * as seed from "../seed.js";
import type * as users_auth from "../users/auth.js";
import type * as users_authHelpers from "../users/authHelpers.js";
import type * as users_createAdminAccount from "../users/createAdminAccount.js";
import type * as users_createAdminActions from "../users/createAdminActions.js";
import type * as users_roles from "../users/roles.js";
import type * as users_userManagement from "../users/userManagement.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "__tests__/helpers/mockContext": typeof __tests___helpers_mockContext;
  "__tests__/helpers/testData": typeof __tests___helpers_testData;
  adminMutations: typeof adminMutations;
  adminSeed: typeof adminSeed;
  auth: typeof auth;
  "clinic/animalCategories": typeof clinic_animalCategories;
  "clinic/animalSubcategories": typeof clinic_animalSubcategories;
  "clinic/backfillMedicalRecords": typeof clinic_backfillMedicalRecords;
  "clinic/clinicAppointmentServices": typeof clinic_clinicAppointmentServices;
  "clinic/clinicAppointments": typeof clinic_clinicAppointments;
  "clinic/clinicPayments": typeof clinic_clinicPayments;
  "clinic/clinicSeed": typeof clinic_clinicSeed;
  "clinic/clinicServiceCategories": typeof clinic_clinicServiceCategories;
  "clinic/clinicServices": typeof clinic_clinicServices;
  "clinic/clinicStaff": typeof clinic_clinicStaff;
  "clinic/petMedicalRecords": typeof clinic_petMedicalRecords;
  "clinic/pharmacy": typeof clinic_pharmacy;
  "finance/accountingHelpers": typeof finance_accountingHelpers;
  "finance/accountingPeriods": typeof finance_accountingPeriods;
  "finance/accountingSeed": typeof finance_accountingSeed;
  "finance/accounts": typeof finance_accounts;
  "finance/accountsReceivable": typeof finance_accountsReceivable;
  "finance/bankAccounts": typeof finance_bankAccounts;
  "finance/bankSeed": typeof finance_bankSeed;
  "finance/bankTransactions": typeof finance_bankTransactions;
  "finance/expenseCategories": typeof finance_expenseCategories;
  "finance/expenseSeed": typeof finance_expenseSeed;
  "finance/expenses": typeof finance_expenses;
  "finance/financialReports": typeof finance_financialReports;
  "finance/generalLedger": typeof finance_generalLedger;
  "finance/journalEntries": typeof finance_journalEntries;
  "hotel/hotelBookingServices": typeof hotel_hotelBookingServices;
  "hotel/hotelBookings": typeof hotel_hotelBookings;
  "hotel/hotelConsumables": typeof hotel_hotelConsumables;
  "hotel/hotelPayments": typeof hotel_hotelPayments;
  "hotel/hotelRooms": typeof hotel_hotelRooms;
  http: typeof http;
  "inventory/brands": typeof inventory_brands;
  "inventory/expiry": typeof inventory_expiry;
  "inventory/productCategories": typeof inventory_productCategories;
  "inventory/productStock": typeof inventory_productStock;
  "inventory/productSubcategories": typeof inventory_productSubcategories;
  "inventory/productVariants": typeof inventory_productVariants;
  "inventory/products": typeof inventory_products;
  "inventory/stockMovements": typeof inventory_stockMovements;
  "inventory/suppliers": typeof inventory_suppliers;
  "inventory/unitConversions": typeof inventory_unitConversions;
  "inventory/units": typeof inventory_units;
  "master_data/branches": typeof master_data_branches;
  "master_data/customerPets": typeof master_data_customerPets;
  "master_data/customers": typeof master_data_customers;
  "master_data/masterDataSeed": typeof master_data_masterDataSeed;
  myFunctions: typeof myFunctions;
  "procurement/purchaseOrderItems": typeof procurement_purchaseOrderItems;
  "procurement/purchaseOrders": typeof procurement_purchaseOrders;
  "reports/clinicReports": typeof reports_clinicReports;
  "reports/dashboardReports": typeof reports_dashboardReports;
  "reports/hotelReports": typeof reports_hotelReports;
  "reports/inventoryReports": typeof reports_inventoryReports;
  "reports/salesReports": typeof reports_salesReports;
  "sales/salePayments": typeof sales_salePayments;
  "sales/sales": typeof sales_sales;
  seed: typeof seed;
  "users/auth": typeof users_auth;
  "users/authHelpers": typeof users_authHelpers;
  "users/createAdminAccount": typeof users_createAdminAccount;
  "users/createAdminActions": typeof users_createAdminActions;
  "users/roles": typeof users_roles;
  "users/userManagement": typeof users_userManagement;
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

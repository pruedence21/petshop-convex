# 📦 Inventory Module Documentation - Pet Shop Management System

Comprehensive documentation for the Inventory module, covering product management, stock tracking, suppliers, and procurement.

## 📋 Table of Contents

- [Module Overview](#module-overview)
- [Product Management](#product-management)
- [Stock Management](#stock-management)
- [Supplier Management](#supplier-management)
- [Procurement](#procurement)
- [API Reference](#api-reference)

## 🎯 Module Overview

The Inventory module manages the complete lifecycle of products, from procurement to sales. It supports multi-branch inventory, product variants, and comprehensive stock tracking.

### Key Features

- **Product Catalog**: Manage products, categories, brands, and variants.
- **Stock Tracking**: Real-time stock levels per branch.
- **Stock Movements**: Audit trail of all inventory changes (IN/OUT/ADJUSTMENT).
- **Supplier Management**: Manage supplier details and relationships.
- **Procurement**: Purchase orders and receiving workflows.

## 📦 Product Management

### Core Entities

- **Products**: Main item record (`convex/inventory/products.ts`).
- **Categories**: Hierarchical categorization (`convex/inventory/productCategories.ts`).
- **Brands**: Product brands (`convex/inventory/brands.ts`).
- **Units**: Units of measure (`convex/inventory/units.ts`).
- **Variants**: Product variants like size/color (`convex/inventory/productVariants.ts`).

### Key Workflows

1.  **Create Product**: Define base product details.
2.  **Add Variants**: (Optional) Define variants for the product.
3.  **Set Pricing**: Define purchase and selling prices.

## 📊 Stock Management

### Stock Tracking

- **Product Stock**: Current quantity per branch (`convex/inventory/productStock.ts`).
- **Stock Movements**: Ledger of all changes (`convex/inventory/stockMovements.ts`).

### Movement Types

- `PURCHASE_IN`: Stock added from purchase order.
- `SALE_OUT`: Stock reduced from sales.
- `ADJUSTMENT`: Manual correction.
- `TRANSFER`: Transfer between branches.
- `RETURN`: Customer return.

## 🚚 Supplier Management

Managed in `convex/inventory/suppliers.ts`.
- Track supplier contact info.
- Link products to suppliers.

## 🛒 Procurement

Managed in `convex/procurement/` (if applicable) or via Inventory Purchase Orders.
- **Purchase Orders**: Create orders for suppliers.
- **Receiving**: Process incoming stock against POs.

## 🔧 API Reference

### Products

- `inventory.products.list`: List products with filters.
- `inventory.products.create`: Create new product.
- `inventory.products.update`: Update product details.

### Stock

- `inventory.productStock.getByBranch`: Get stock levels for a branch.
- `inventory.stockMovements.log`: Record a stock movement manually.

### Suppliers

- `inventory.suppliers.list`: List active suppliers.

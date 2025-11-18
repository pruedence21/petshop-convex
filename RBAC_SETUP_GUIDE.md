# RBAC dan User Management - Setup Guide

## Overview

Sistem PetShop Management sekarang menggunakan Role-Based Access Control (RBAC) penuh dengan user management yang hanya dapat dilakukan oleh administrator. Registrasi publik telah dinonaktifkan untuk keamanan.

## Fitur Utama

### ✅ Yang Sudah Diimplementasikan

1. **User Profile Management**
   - Tabel `userProfiles` untuk menyimpan data user tambahan
   - Link ke Convex Auth users via `userId`
   - Support multiple roles per user via `userRoles` junction table
   - Branch assignment untuk akses berbasis cabang

2. **Role & Permission System**
   - Tabel `roles` dengan array permissions
   - 4 default roles: Admin, Manager, Staff, Kasir
   - 40+ permissions granular untuk semua modul
   - Flexible permission assignment per role

3. **Authentication Helpers**
   - `requireAuth()` - Validasi user sudah login
   - `requirePermission()` - Validasi permission spesifik
   - `requireRole()` - Validasi role spesifik
   - `hasPermission()` - Check permission tanpa throw error
   - `getCurrentUserProfile()` - Get user profile dengan role & permissions
   - Dan banyak helper functions lainnya

4. **Admin User Management API**
   - `createUser` - Buat user baru (admin only)
   - `listUsers` - List semua users dengan filter
   - `getUserDetails` - Detail user lengkap
   - `updateUser` - Update profile user
   - `toggleUserStatus` - Aktif/nonaktifkan user
   - `deleteUser` - Soft delete user
   - `getCurrentUser` - Get current logged in user info

5. **User Management UI**
   - Dashboard page di `/dashboard/users`
   - Table view dengan filter (branch, role, status, search)
   - Create/Edit user dialog
   - Toggle active/inactive status
   - Delete users
   - Permission-based button visibility

6. **Security Features**
   - Public registration disabled di signin page
   - Sign-in only mode
   - Protected mutations dengan permission checks
   - Prevent self-deactivation/deletion
   - User activity tracking (lastLoginAt)

## Setup Awal - Membuat Super Admin Pertama

### Metode 1: Manual Setup (Direkomendasikan untuk Production)

Karena public registration sudah dinonaktifkan, Anda perlu membuat super admin pertama secara manual:

#### Step 1: Temporarily Enable Registration

```tsx
// app/signin/page.tsx
// Sementara kembalikan flow sign-up untuk membuat admin pertama
const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
```

#### Step 2: Buat Akun Admin

1. Akses `/signin`
2. Register dengan credentials:
   - Email: `admin@petshop.com` (atau email pilihan Anda)
   - Password: (gunakan password yang kuat, min 8 karakter)

#### Step 3: Get User ID

Setelah registrasi, user ID akan tersedia di Convex Auth tables. Anda bisa:

1. Buka Convex Dashboard
2. Go to Data → users table (dari authTables)
3. Find user yang baru dibuat
4. Copy `_id` field (ini adalah userId)

#### Step 4: Create Admin Profile

Di Convex Dashboard, run function:

```javascript
// Function: internal.adminSeed.createSuperAdminProfile
// Args:
{
  "userId": "<paste_user_id_here>",
  "email": "admin@petshop.com",
  "name": "Super Administrator",
  "phone": "+6281234567890" // optional
}
```

#### Step 5: Disable Registration Again

```tsx
// app/signin/page.tsx
// Kembalikan ke sign-in only mode
const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
// (kode sudah benar di file yang ada)
```

#### Step 6: Login

1. Logout dari akun yang baru dibuat
2. Login kembali dengan credentials admin
3. Anda sekarang memiliki akses penuh sebagai Super Admin!

### Metode 2: Using Setup Function (Development)

Untuk development/testing, gunakan setup function yang otomatis:

```javascript
// 1. Di Convex Dashboard, run:
// Function: internal.adminSeed.setupSuperAdmin
// Args: {}

// 2. Function akan membuat Admin role dan memberikan instructions

// 3. Follow instructions untuk create auth account

// 4. Run createSuperAdminProfile dengan userId yang didapat
```

### Metode 3: Bootstrap Demo Admin (Development Only)

⚠️ **WARNING: Hanya untuk development, JANGAN gunakan di production!**

```javascript
// 1. Create auth account secara manual (temporarily enable registration)
// 2. Get the userId
// 3. Run:
// Function: internal.adminSeed.bootstrapDemoAdmin
// Args: { "userId": "<your_user_id>" }
```

## Menggunakan User Management

### Membuat User Baru

1. Login sebagai Admin
2. Go to **Dashboard → Pengaturan → User Management**
3. Click **Tambah User**
4. Fill in form:
   - Nama Lengkap *
   - Email * (akan digunakan untuk login)
   - Password * (min 8 karakter)
   - No. Telepon (optional)
   - Cabang (optional)
   - Role * (required)
5. Click **Buat User**

### Mengedit User

1. Di User Management page, click icon **Pencil** pada user
2. Update informasi (password tidak bisa diubah di sini)
3. Click **Simpan Perubahan**

### Menonaktifkan/Mengaktifkan User

- Click icon **UserX** (X dengan user icon) untuk nonaktifkan
- Click icon **UserCheck** (check dengan user icon) untuk aktifkan
- User yang nonaktif tidak bisa login

### Menghapus User

1. Click icon **Trash** pada user
2. Confirm deletion
3. User akan di-soft delete (data tidak benar-benar dihapus)

⚠️ **Catatan:**
- Anda tidak bisa menonaktifkan/menghapus akun sendiri
- Admin role diperlukan untuk manage users

## Permission System

### Available Permissions

Sistem menggunakan 40+ permissions yang dibagi per modul:

```typescript
// Users Management
USERS_CREATE = "users.create"
USERS_READ = "users.read"
USERS_UPDATE = "users.update"
USERS_DELETE = "users.delete"

// Sales
SALES_CREATE = "sales.create"
SALES_READ = "sales.read"
SALES_UPDATE = "sales.update"
SALES_DELETE = "sales.delete"
SALES_APPROVE = "sales.approve"

// Products
PRODUCTS_CREATE = "products.create"
PRODUCTS_READ = "products.read"
PRODUCTS_UPDATE = "products.update"
PRODUCTS_DELETE = "products.delete"

// ... dan banyak lagi (lihat convex/roles.ts)
```

### Default Roles

#### 1. Admin
- **Permissions:** ALL (semua permissions)
- **Description:** Full system access
- **Use Case:** System administrators

#### 2. Manager
- **Permissions:** ~25 permissions (create, read, update, approve)
- **Restrictions:** Tidak bisa manage users atau roles
- **Use Case:** Branch managers, supervisors

#### 3. Staff
- **Permissions:** ~10 permissions (create, read basic operations)
- **Restrictions:** Tidak bisa approve atau delete
- **Use Case:** Front desk staff, sales staff

#### 4. Kasir
- **Permissions:** ~6 permissions (sales, payments, basic read)
- **Restrictions:** Hanya untuk transaksi penjualan
- **Use Case:** Cashiers, POS operators

### Mengecek Permission di Code

#### Di Convex Functions

```typescript
import { requirePermission, hasPermission } from "./authHelpers";
import { PERMISSIONS } from "./roles";

// Mutation yang memerlukan permission
export const updateProduct = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Throw error jika tidak punya permission
    const user = await requirePermission(ctx, PERMISSIONS.PRODUCTS_UPDATE);
    
    // Continue with logic
    // user.userId tersedia untuk audit trail
  },
});

// Query yang check permission tanpa throw
export const listProducts = query({
  args: { /* ... */ },
  handler: async (ctx) => {
    const canCreate = await hasPermission(ctx, PERMISSIONS.PRODUCTS_CREATE);
    
    return {
      products: await ctx.db.query("products").collect(),
      canCreate, // Frontend bisa hide/show button berdasarkan ini
    };
  },
});
```

#### Di Frontend (React)

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function MyComponent() {
  const currentUser = useQuery(api.userManagement.getCurrentUser);
  
  // Check permission
  const hasPermission = (permission: string) => {
    return currentUser?.permissions?.includes(permission) || false;
  };
  
  const canCreate = hasPermission("products.create");
  
  return (
    <div>
      {canCreate && (
        <Button onClick={handleCreate}>
          Tambah Produk
        </Button>
      )}
    </div>
  );
}
```

## Protected Functions

### Sales Module (convex/sales.ts)

Sudah diprotect dengan permission checks:
- `create` - Requires `PERMISSIONS.SALES_CREATE`
- `addItem` - Will be protected
- `complete` - Will be protected with `SALES_APPROVE`

### Modules yang Perlu Diprotect

**High Priority:**
1. ✅ `sales.ts` - Partially protected
2. ⏳ `expenses.ts` - Need to add auth
3. ⏳ `products.ts` - Need to add auth
4. ⏳ `customers.ts` - Need to add auth

**Medium Priority:**
5. ⏳ `purchaseOrders.ts`
6. ⏳ `clinicAppointments.ts`
7. ⏳ `hotelBookings.ts`

**Low Priority (Master Data):**
8. ⏳ `branches.ts`
9. ⏳ `productCategories.ts`
10. ⏳ `animalCategories.ts`

## Troubleshooting

### Issue: "User profile not found"

**Penyebab:** User auth account sudah dibuat tapi profile belum.

**Solusi:**
```javascript
// Run di Convex Dashboard:
// Function: internal.userManagement.linkUserProfile
{
  "userId": "<auth_user_id>",
  "email": "user@example.com",
  "name": "User Name",
  "roleId": "<role_id>"
}
```

### Issue: "Forbidden: You don't have permission"

**Penyebab:** User tidak punya permission untuk action tersebut.

**Solusi:**
1. Login sebagai Admin
2. Edit user di User Management
3. Assign role yang sesuai dengan permissions yang dibutuhkan

### Issue: Cannot create first admin

**Penyebab:** Chicken-egg problem - butuh admin untuk buat user, tapi belum ada admin.

**Solusi:** Follow "Setup Awal - Membuat Super Admin Pertama" di atas.

### Issue: "You cannot deactivate your own account"

**Penyebab:** Safety measure untuk prevent accidentally locking yourself out.

**Solusi:** Minta admin lain untuk deactivate, atau buat admin baru dulu.

## Security Best Practices

1. **Strong Passwords**
   - Minimum 8 characters
   - Use combination of letters, numbers, symbols
   - Consider implementing password complexity requirements

2. **Regular Audit**
   - Review user list regularly
   - Deactivate users yang sudah tidak bekerja
   - Check lastLoginAt untuk inactive users

3. **Principle of Least Privilege**
   - Assign minimum permissions needed
   - Use specific roles (Kasir, Staff) instead of Manager/Admin jika memungkinkan
   - Review permissions periodically

4. **Activity Logging**
   - Check createdBy/updatedBy fields di data
   - Monitor lastLoginAt di user profiles
   - Consider implementing audit log table (future enhancement)

5. **Production Deployment**
   - Change default admin credentials immediately
   - Use strong, unique passwords
   - Enable HTTPS only
   - Consider implementing 2FA (future enhancement)

## Migration dari Sistem Lama

Jika Anda punya existing users di sistem lama:

### Step 1: Export User Data

Export existing users dengan format:
```json
[
  {
    "email": "user@example.com",
    "name": "User Name",
    "phone": "+6281234567890",
    "branchId": "branch_id_here",
    "roleName": "Staff"
  }
]
```

### Step 2: Create Auth Accounts

Untuk setiap user:
1. Temporarily enable registration OR use Convex Auth API
2. Create auth account dengan email & temporary password
3. Save userId for next step

### Step 3: Link Profiles

For each user, run:
```javascript
// Function: internal.userManagement.linkUserProfile
{
  "userId": "<auth_user_id>",
  "email": "user@example.com",
  "name": "User Name",
  "phone": "+6281234567890",
  "branchId": "<branch_id>",
  "roleId": "<role_id>",
  "createdBy": "<admin_user_id>"
}
```

### Step 4: Notify Users

Send email/notification ke users dengan:
- Login URL
- Email mereka
- Temporary password
- Instructions untuk change password

## Roadmap & Future Enhancements

### Planned Features

1. **Password Management**
   - Change password functionality
   - Password reset via email
   - Password expiry policy

2. **Advanced RBAC**
   - Custom permissions per user (override role)
   - Dynamic permission assignment
   - Permission templates

3. **Audit Logging**
   - Complete audit trail table
   - Track all create/update/delete operations
   - Export audit logs

4. **Two-Factor Authentication (2FA)**
   - SMS-based OTP
   - Authenticator app support
   - Backup codes

5. **Session Management**
   - View active sessions
   - Force logout from specific devices
   - Session expiry configuration

6. **Branch-Based Access Control**
   - Restrict data access by branch
   - Branch switching for multi-branch users
   - Branch-specific permissions

## Support

Untuk pertanyaan atau issues:
1. Check documentation di `/doc` folder
2. Review this README
3. Contact system administrator

---

**Last Updated:** November 14, 2025  
**Version:** 1.0.0

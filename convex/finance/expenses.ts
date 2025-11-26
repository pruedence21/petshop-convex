import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { getOrGenerateTransactionNumber } from "../utils/autoNumbering";

// Create expense (draft)
export const create = mutation({
  args: {
    branchId: v.id("branches"),
    categoryId: v.id("expenseCategories"),
    expenseDate: v.number(),
    amount: v.number(),
    expenseNumber: v.optional(v.string()), // Optional: auto-generate if not provided
    vendor: v.optional(v.string()),
    description: v.string(),
    notes: v.optional(v.string()),
    receiptAttachmentId: v.optional(v.string()), // Convex storage ID
  },
  returns: v.object({
    expenseId: v.id("expenses"),
    expenseNumber: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate branch and category
    const branch = await ctx.db.get(args.branchId);
    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.deletedAt || !category.isActive) {
      throw new Error("Expense category not found or inactive");
    }

    if (args.amount <= 0) {
      throw new Error("Expense amount must be positive");
    }

    // Get or generate expense number (auto-generate if not provided, validate if custom)
    const expenseNumber = await getOrGenerateTransactionNumber(
      ctx,
      "expenses",
      args.expenseNumber,
      new Date(args.expenseDate)
    );

    // Determine initial status
    let status = "DRAFT";
    if (category.requiresApproval) {
      // Check threshold
      if (!category.approvalThreshold || args.amount >= category.approvalThreshold) {
        status = "DRAFT"; // Will need to be submitted for approval
      } else {
        status = "DRAFT"; // Below threshold but category requires approval
      }
    }

    const expenseId = await ctx.db.insert("expenses", {
      expenseNumber,
      branchId: args.branchId,
      categoryId: args.categoryId,
      expenseDate: args.expenseDate,
      amount: args.amount,
      vendor: args.vendor,
      description: args.description,
      notes: args.notes,
      receiptAttachmentId: args.receiptAttachmentId,
      status,
      createdBy: undefined,
    });

    return { expenseId, expenseNumber };
  },
});

// Update expense (only in draft status)
export const update = mutation({
  args: {
    id: v.id("expenses"),
    categoryId: v.optional(v.id("expenseCategories")),
    expenseDate: v.optional(v.number()),
    amount: v.optional(v.number()),
    vendor: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    receiptAttachmentId: v.optional(v.string()),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const expense = await ctx.db.get(id);
    if (!expense || expense.deletedAt) {
      throw new Error("Expense not found");
    }

    if (expense.status !== "DRAFT") {
      throw new Error("Can only update expenses in draft status");
    }

    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error("Expense amount must be positive");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedBy: undefined,
    });

    return id;
  },
});

// Submit expense for approval
export const submit = mutation({
  args: {
    id: v.id("expenses"),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.deletedAt) {
      throw new Error("Expense not found");
    }

    if (expense.status !== "DRAFT") {
      throw new Error("Can only submit expenses in draft status");
    }

    const category = await ctx.db.get(expense.categoryId);
    if (!category) {
      throw new Error("Expense category not found");
    }

    let newStatus = "PENDING_APPROVAL";

    // If category doesn't require approval or below threshold, auto-approve
    if (!category.requiresApproval) {
      newStatus = "APPROVED";
    } else if (
      category.approvalThreshold &&
      expense.amount < category.approvalThreshold
    ) {
      newStatus = "APPROVED";
    }

    await ctx.db.patch(args.id, {
      status: newStatus,
      submittedBy: undefined,
      submittedAt: Date.now(),
      ...(newStatus === "APPROVED" && {
        approvedBy: undefined, // Auto-approved
        approvedAt: Date.now(),
      }),
      updatedBy: undefined,
    });

    return args.id;
  },
});

// Approve expense
export const approve = mutation({
  args: {
    id: v.id("expenses"),
    notes: v.optional(v.string()),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.deletedAt) {
      throw new Error("Expense not found");
    }

    if (expense.status !== "PENDING_APPROVAL") {
      throw new Error("Can only approve expenses pending approval");
    }

    await ctx.db.patch(args.id, {
      status: "APPROVED",
      approvedBy: undefined, // TODO: auth integration
      approvedAt: Date.now(),
      ...(args.notes && { notes: args.notes }),
      updatedBy: undefined,
    });

    return args.id;
  },
});

// Reject expense
export const reject = mutation({
  args: {
    id: v.id("expenses"),
    rejectionReason: v.string(),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.deletedAt) {
      throw new Error("Expense not found");
    }

    if (expense.status !== "PENDING_APPROVAL") {
      throw new Error("Can only reject expenses pending approval");
    }

    await ctx.db.patch(args.id, {
      status: "REJECTED",
      rejectedBy: undefined,
      rejectedAt: Date.now(),
      rejectionReason: args.rejectionReason,
      updatedBy: undefined,
    });

    return args.id;
  },
});

// Pay expense (create journal entry)
export const pay = mutation({
  args: {
    id: v.id("expenses"),
    paymentMethod: v.string(), // CASH, BANK, CHECK
    paymentDate: v.optional(v.number()),
    bankAccountId: v.optional(v.id("bankAccounts")), // Required if BANK
    checkNumber: v.optional(v.string()), // Required if CHECK
    notes: v.optional(v.string()),
  },
  returns: v.object({
    expenseId: v.id("expenses"),
    journalEntryId: v.id("journalEntries"),
  }),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.deletedAt) {
      throw new Error("Expense not found");
    }

    if (expense.status !== "APPROVED") {
      throw new Error("Can only pay approved expenses");
    }

    if (expense.journalEntryId) {
      throw new Error("Expense already paid");
    }

    // Validate payment method requirements
    if (args.paymentMethod === "BANK" && !args.bankAccountId) {
      throw new Error("Bank account required for bank payment");
    }

    if (args.paymentMethod === "CHECK" && !args.checkNumber) {
      throw new Error("Check number required for check payment");
    }

    const category = await ctx.db.get(expense.categoryId);
    if (!category) {
      throw new Error("Expense category not found");
    }

    const paymentDate = args.paymentDate || Date.now();

    // Create journal entry
    const journalNumber = await generateJournalNumber(ctx);

    // Determine cash/bank account
    let cashAccountCode: string;
    if (args.paymentMethod === "CASH") {
      cashAccountCode = "1-101"; // Kas Besar
    } else if (args.paymentMethod === "BANK") {
      const bankAccount = await ctx.db.get(args.bankAccountId!);
      if (!bankAccount || bankAccount.deletedAt) {
        throw new Error("Bank account not found");
      }
      const linkedAccount = await ctx.db.get(bankAccount.linkedAccountId);
      if (!linkedAccount) {
        throw new Error("Linked bank account not found");
      }
      cashAccountCode = linkedAccount.accountCode;
    } else {
      // CHECK
      cashAccountCode = "1-101"; // Kas Besar (temporarily)
    }

    const cashAccount = await ctx.db
      .query("accounts")
      .withIndex("by_account_code", (q) => q.eq("accountCode", cashAccountCode))
      .first();

    if (!cashAccount) {
      throw new Error(`Cash/Bank account ${cashAccountCode} not found`);
    }

    // DR Expense Account, CR Cash/Bank
    const journalEntryId = await ctx.db.insert("journalEntries", {
      journalNumber,
      journalDate: paymentDate,
      description: `Pembayaran ${category.categoryName} - ${expense.description}`,
      sourceType: "EXPENSE",
      sourceId: expense._id,
      status: "Posted",
      totalDebit: expense.amount,
      totalCredit: expense.amount,
      postedBy: undefined,
      postedAt: Date.now(),
      createdBy: undefined,
    });

    // Journal entry lines
    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: category.linkedAccountId, // Expense account (DR)
      branchId: expense.branchId,
      description: `${category.categoryName} - ${expense.description}`,
      debitAmount: expense.amount,
      creditAmount: 0,
      sortOrder: 1,
    });

    await ctx.db.insert("journalEntryLines", {
      journalEntryId,
      accountId: cashAccount._id, // Cash/Bank account (CR)
      branchId: expense.branchId,
      description: `Pembayaran ${args.paymentMethod}${args.checkNumber ? ` (Cek ${args.checkNumber})` : ""}`,
      debitAmount: 0,
      creditAmount: expense.amount,
      sortOrder: 2,
    });

    // Update expense status
    await ctx.db.patch(args.id, {
      status: "PAID",
      paymentMethod: args.paymentMethod,
      paymentDate,
      checkNumber: args.checkNumber,
      journalEntryId,
      ...(args.notes && { notes: args.notes }),
      updatedBy: undefined,
    });

    // Update bank account balance if BANK payment
    if (args.paymentMethod === "BANK" && args.bankAccountId) {
      const bankAccount = await ctx.db.get(args.bankAccountId);
      if (bankAccount) {
        await ctx.db.patch(args.bankAccountId, {
          currentBalance: bankAccount.currentBalance - expense.amount,
          updatedBy: undefined,
        });
      }
    }

    return { expenseId: args.id, journalEntryId };
  },
});

// List expenses
export const list = query({
  args: {
    branchId: v.optional(v.id("branches")),
    categoryId: v.optional(v.id("expenseCategories")),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("expenses"),
      _creationTime: v.number(),
      expenseNumber: v.string(),
      branchId: v.id("branches"),
      categoryId: v.id("expenseCategories"),
      expenseDate: v.number(),
      amount: v.number(),
      vendor: v.optional(v.string()),
      description: v.string(),
      status: v.string(),
      paymentMethod: v.optional(v.string()),
      paymentDate: v.optional(v.number()),
      checkNumber: v.optional(v.string()),
      receiptAttachmentId: v.optional(v.string()),
      journalEntryId: v.optional(v.id("journalEntries")),
      submittedBy: v.optional(v.id("users")),
      submittedAt: v.optional(v.number()),
      approvedBy: v.optional(v.id("users")),
      approvedAt: v.optional(v.number()),
      rejectedBy: v.optional(v.id("users")),
      rejectedAt: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      branch: v.any(),
      category: v.any(),
    })
  ),
  handler: async (ctx, args) => {
    let expenses;

    if (args.branchId) {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_branch", (q) => q.eq("branchId", args.branchId!))
        .order("desc")
        .collect();
    } else if (args.categoryId) {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .order("desc")
        .collect();
    } else if (args.status) {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      expenses = await ctx.db
        .query("expenses")
        .withIndex("by_expense_date")
        .order("desc")
        .collect();
    }

    // Filter deleted
    expenses = expenses.filter((e) => !e.deletedAt);

    // Filter by date range
    if (args.startDate || args.endDate) {
      expenses = expenses.filter((e) => {
        if (args.startDate && e.expenseDate < args.startDate) return false;
        if (args.endDate && e.expenseDate > args.endDate) return false;
        return true;
      });
    }

    // Limit results
    const limited = args.limit ? expenses.slice(0, args.limit) : expenses;

    // Enrich with branch and category
    const enriched = await Promise.all(
      limited.map(async (expense) => {
        const branch = await ctx.db.get(expense.branchId);
        const category = await ctx.db.get(expense.categoryId);
        return {
          ...expense,
          branch,
          category,
        };
      })
    );

    return enriched;
  },
});

// Get expense by ID
export const get = query({
  args: { id: v.id("expenses") },
  returns: v.union(
    v.object({
      _id: v.id("expenses"),
      _creationTime: v.number(),
      expenseNumber: v.string(),
      branchId: v.id("branches"),
      categoryId: v.id("expenseCategories"),
      expenseDate: v.number(),
      amount: v.number(),
      vendor: v.optional(v.string()),
      description: v.string(),
      status: v.string(),
      paymentMethod: v.optional(v.string()),
      paymentDate: v.optional(v.number()),
      checkNumber: v.optional(v.string()),
      receiptAttachmentId: v.optional(v.string()),
      journalEntryId: v.optional(v.id("journalEntries")),
      submittedBy: v.optional(v.id("users")),
      submittedAt: v.optional(v.number()),
      approvedBy: v.optional(v.id("users")),
      approvedAt: v.optional(v.number()),
      rejectedBy: v.optional(v.id("users")),
      rejectedAt: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      branch: v.any(),
      category: v.any(),
      journalEntry: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.deletedAt) return null;

    const branch = await ctx.db.get(expense.branchId);
    const category = await ctx.db.get(expense.categoryId);

    let journalEntry = null;
    if (expense.journalEntryId) {
      journalEntry = await ctx.db.get(expense.journalEntryId);
    }

    return {
      ...expense,
      branch,
      category,
      journalEntry,
    };
  },
});

// Soft delete expense (only draft or rejected)
export const remove = mutation({
  args: { id: v.id("expenses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.deletedAt) {
      throw new Error("Expense not found");
    }

    if (expense.status !== "DRAFT" && expense.status !== "REJECTED") {
      throw new Error("Can only delete expenses in draft or rejected status");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return null;
  },
});

// Get expenses summary
export const getSummary = query({
  args: {
    branchId: v.optional(v.id("branches")),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalExpenses: v.number(),
    totalPaid: v.number(),
    totalPending: v.number(),
    byCategory: v.array(
      v.object({
        categoryId: v.id("expenseCategories"),
        categoryName: v.string(),
        totalAmount: v.number(),
        count: v.number(),
      })
    ),
    byStatus: v.object({
      draft: v.number(),
      pendingApproval: v.number(),
      approved: v.number(),
      rejected: v.number(),
      paid: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    let expenses = await ctx.db.query("expenses").collect();

    // Filter deleted and by date range
    expenses = expenses.filter(
      (e) =>
        !e.deletedAt &&
        e.expenseDate >= args.startDate &&
        e.expenseDate <= args.endDate
    );

    // Filter by branch if specified
    if (args.branchId) {
      expenses = expenses.filter((e) => e.branchId === args.branchId);
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = expenses
      .filter((e) => e.status === "PAID")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPending = expenses
      .filter((e) => e.status === "PENDING_APPROVAL" || e.status === "APPROVED")
      .reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const categoryMap = new Map<
      string,
      { categoryId: Id<"expenseCategories">; categoryName: string; totalAmount: number; count: number }
    >();

    for (const expense of expenses) {
      const category = await ctx.db.get(expense.categoryId);
      if (!category) continue;

      const key = expense.categoryId;
      const existing = categoryMap.get(key);

      if (existing) {
        existing.totalAmount += expense.amount;
        existing.count++;
      } else {
        categoryMap.set(key, {
          categoryId: expense.categoryId,
          categoryName: category.categoryName,
          totalAmount: expense.amount,
          count: 1,
        });
      }
    }

    const byCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    );

    // Group by status
    const byStatus = {
      draft: expenses.filter((e) => e.status === "DRAFT").length,
      pendingApproval: expenses.filter((e) => e.status === "PENDING_APPROVAL")
        .length,
      approved: expenses.filter((e) => e.status === "APPROVED").length,
      rejected: expenses.filter((e) => e.status === "REJECTED").length,
      paid: expenses.filter((e) => e.status === "PAID").length,
    };

    return {
      totalExpenses,
      totalPaid,
      totalPending,
      byCategory,
      byStatus,
    };
  },
});




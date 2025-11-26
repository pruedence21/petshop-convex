import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { getOrGenerateTransactionNumber } from "../utils/autoNumbering";

// Create journal entry (Draft status)
export const create = mutation({
  args: {
    journalDate: v.number(),
    description: v.string(),
    journalNumber: v.optional(v.string()), // Optional: auto-generate if not provided
    sourceType: v.optional(v.string()), // SALE, PURCHASE, EXPENSE, PAYMENT, CLINIC, HOTEL, MANUAL, ADJUSTMENT
    sourceId: v.optional(v.string()),
    lines: v.array(
      v.object({
        accountId: v.id("accounts"),
        branchId: v.optional(v.id("branches")),
        description: v.optional(v.string()),
        debitAmount: v.number(),
        creditAmount: v.number(),
      })
    ),
  },
  returns: v.object({
    journalEntryId: v.id("journalEntries"),
    journalNumber: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate balanced entry
    const totalDebit = args.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = args.lines.reduce((sum, line) => sum + line.creditAmount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Journal entry must be balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
      );
    }

    // Validate each line has either debit or credit, not both
    for (const line of args.lines) {
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        throw new Error("Each line must have either debit or credit, not both");
      }
      if (line.debitAmount === 0 && line.creditAmount === 0) {
        throw new Error("Each line must have non-zero debit or credit");
      }
    }

    // Validate accounts exist and are not headers
    for (const line of args.lines) {
      const account = await ctx.db.get(line.accountId);
      if (!account || account.deletedAt) {
        throw new Error(`Account ${line.accountId} not found`);
      }
      if (account.isHeader) {
        throw new Error(
          `Cannot post to header account: ${account.accountName}`
        );
      }
      if (!account.isActive) {
        throw new Error(`Account ${account.accountName} is inactive`);
      }
    }

    // Get or generate journal number (auto-generate if not provided, validate if custom)
    const journalNumber = await getOrGenerateTransactionNumber(
      ctx,
      "journalEntries",
      args.journalNumber,
      new Date(args.journalDate)
    );

    const journalEntryId = await ctx.db.insert("journalEntries", {
      journalNumber,
      journalDate: args.journalDate,
      description: args.description,
      sourceType: args.sourceType || "MANUAL",
      sourceId: args.sourceId,
      status: "Draft",
      totalDebit,
      totalCredit,
      createdBy: undefined, // TODO: auth integration
    });

    // Create journal entry lines
    let sortOrder = 1;
    for (const line of args.lines) {
      await ctx.db.insert("journalEntryLines", {
        journalEntryId,
        accountId: line.accountId,
        branchId: line.branchId,
        description: line.description,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        sortOrder: sortOrder++,
      });
    }

    return { journalEntryId, journalNumber };
  },
});

// Post journal entry (Draft → Posted)
export const post = mutation({
  args: {
    journalEntryId: v.id("journalEntries"),
  },
  returns: v.id("journalEntries"),
  handler: async (ctx, args) => {
    const je = await ctx.db.get(args.journalEntryId);
    if (!je || je.deletedAt) {
      throw new Error("Journal entry not found");
    }

    if (je.status !== "Draft") {
      throw new Error("Only draft journal entries can be posted");
    }

    // Validate journal date is not in closed period
    const period = await ctx.db
      .query("accountingPeriods")
      .filter((q) =>
        q.and(
          q.lte(q.field("startDate"), je.journalDate),
          q.gte(q.field("endDate"), je.journalDate)
        )
      )
      .first();

    if (period && (period.status === "CLOSED" || period.status === "LOCKED")) {
      throw new Error(
        `Cannot post journal entry in ${period.status.toLowerCase()} period`
      );
    }

    await ctx.db.patch(args.journalEntryId, {
      status: "Posted",
      postedBy: undefined, // TODO: auth integration
      postedAt: Date.now(),
      updatedBy: undefined,
    });

    return args.journalEntryId;
  },
});

// Void journal entry (Posted → Voided)
export const voidEntry = mutation({
  args: {
    journalEntryId: v.id("journalEntries"),
    voidReason: v.string(),
  },
  returns: v.id("journalEntries"),
  handler: async (ctx, args) => {
    const je = await ctx.db.get(args.journalEntryId);
    if (!je || je.deletedAt) {
      throw new Error("Journal entry not found");
    }

    if (je.status !== "Posted") {
      throw new Error("Only posted journal entries can be voided");
    }

    // Check if in closed period
    const period = await ctx.db
      .query("accountingPeriods")
      .filter((q) =>
        q.and(
          q.lte(q.field("startDate"), je.journalDate),
          q.gte(q.field("endDate"), je.journalDate)
        )
      )
      .first();

    if (period && period.status === "LOCKED") {
      throw new Error("Cannot void journal entry in locked period");
    }

    await ctx.db.patch(args.journalEntryId, {
      status: "Voided",
      voidedBy: undefined, // TODO: auth integration
      voidedAt: Date.now(),
      voidReason: args.voidReason,
      updatedBy: undefined,
    });

    return args.journalEntryId;
  },
});

// List journal entries
export const list = query({
  args: {
    status: v.optional(v.string()),
    sourceType: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("journalEntries"),
      _creationTime: v.number(),
      journalNumber: v.string(),
      journalDate: v.number(),
      description: v.string(),
      sourceType: v.string(),
      sourceId: v.optional(v.string()),
      status: v.string(),
      totalDebit: v.number(),
      totalCredit: v.number(),
      postedBy: v.optional(v.id("users")),
      postedAt: v.optional(v.number()),
      voidedBy: v.optional(v.id("users")),
      voidedAt: v.optional(v.number()),
      voidReason: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      lineCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let entries;

    if (args.status) {
      entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.sourceType) {
      entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_source", (q) => q.eq("sourceType", args.sourceType!))
        .order("desc")
        .collect();
    } else {
      entries = await ctx.db
        .query("journalEntries")
        .withIndex("by_journal_date")
        .order("desc")
        .collect();
    }

    // Filter by date range
    if (args.startDate || args.endDate) {
      entries = entries.filter((je) => {
        if (args.startDate && je.journalDate < args.startDate) return false;
        if (args.endDate && je.journalDate > args.endDate) return false;
        return true;
      });
    }

    // Filter deleted
    const filtered = entries.filter((je) => !je.deletedAt);

    // Limit results
    const limited = args.limit ? filtered.slice(0, args.limit) : filtered;

    // Get line counts
    const enriched = await Promise.all(
      limited.map(async (je) => {
        const lines = await ctx.db
          .query("journalEntryLines")
          .withIndex("by_journal_entry", (q) => q.eq("journalEntryId", je._id))
          .collect();

        return {
          ...je,
          lineCount: lines.length,
        };
      })
    );

    return enriched;
  },
});

// Get journal entry with lines
export const get = query({
  args: { id: v.id("journalEntries") },
  returns: v.union(
    v.object({
      _id: v.id("journalEntries"),
      _creationTime: v.number(),
      journalNumber: v.string(),
      journalDate: v.number(),
      description: v.string(),
      sourceType: v.string(),
      sourceId: v.optional(v.string()),
      status: v.string(),
      totalDebit: v.number(),
      totalCredit: v.number(),
      postedBy: v.optional(v.id("users")),
      postedAt: v.optional(v.number()),
      voidedBy: v.optional(v.id("users")),
      voidedAt: v.optional(v.number()),
      voidReason: v.optional(v.string()),
      createdBy: v.optional(v.id("users")),
      updatedBy: v.optional(v.id("users")),
      deletedAt: v.optional(v.number()),
      lines: v.array(v.any()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const je = await ctx.db.get(args.id);
    if (!je || je.deletedAt) return null;

    // Get lines with account details
    const lines = await ctx.db
      .query("journalEntryLines")
      .withIndex("by_journal_entry", (q) => q.eq("journalEntryId", args.id))
      .collect();

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        const account = await ctx.db.get(line.accountId);
        let branch = null;
        if (line.branchId) {
          branch = await ctx.db.get(line.branchId);
        }

        return {
          ...line,
          account,
          branch,
        };
      })
    );

    // Sort by sortOrder
    enrichedLines.sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      ...je,
      lines: enrichedLines,
    };
  },
});

// Delete journal entry (soft delete, only draft)
export const remove = mutation({
  args: { id: v.id("journalEntries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const je = await ctx.db.get(args.id);
    if (!je || je.deletedAt) {
      throw new Error("Journal entry not found");
    }

    if (je.status !== "Draft") {
      throw new Error("Only draft journal entries can be deleted");
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now(),
      updatedBy: undefined,
    });

    return null;
  },
});

// Get journal entries by source
export const getBySource = query({
  args: {
    sourceType: v.string(),
    sourceId: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_source", (q) =>
        q.eq("sourceType", args.sourceType).eq("sourceId", args.sourceId)
      )
      .collect();

    const filtered = entries.filter((je) => !je.deletedAt);

    return filtered;
  },
});




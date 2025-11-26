/**
 * Test utilities and mock context for Convex function testing
 * Provides mock database operations and context for unit testing
 */

import { vi } from 'vitest';
import type { Id } from '../../_generated/dataModel';

/**
 * Mock database store
 * Simulates Convex database with in-memory storage
 */
export class MockDatabase {
    private store: Map<string, Map<string, any>> = new Map();
    private idCounters: Map<string, number> = new Map();

    constructor() {
        // Initialize empty collections
        const tables = [
            'accounts', 'journalEntries', 'journalEntryLines', 'sales', 'saleItems',
            'products', 'productStock', 'branches', 'customers', 'productCategories',
            'purchaseOrders', 'expenses', 'clinicAppointments', 'hotelBookings'
        ];
        tables.forEach(table => this.store.set(table, new Map()));
    }

    /**
     * Generate a mock ID for a table
     */
    generateId(tableName: string): Id<any> {
        const counter = (this.idCounters.get(tableName) || 0) + 1;
        this.idCounters.set(tableName, counter);
        return `${tableName}_${counter}` as Id<any>;
    }

    /**
     * Insert a document into a table
     */
    async insert(tableName: string, document: any): Promise<Id<any>> {
        const table = this.store.get(tableName);
        if (!table) throw new Error(`Table ${tableName} not found`);

        const id = this.generateId(tableName);
        const doc = {
            ...document,
            _id: id,
            _creationTime: Date.now(),
        };
        table.set(id, doc);
        return id;
    }

    /**
     * Get a document by ID
     */
    async get(id: Id<any>): Promise<any | null> {
        for (const table of this.store.values()) {
            if (table.has(id)) {
                return table.get(id);
            }
        }
        return null;
    }

    /**
     * Query builder for table
     */
    query(tableName: string) {
        const table = this.store.get(tableName);
        if (!table) throw new Error(`Table ${tableName} not found`);

        let results = Array.from(table.values());

        return {
            withIndex: (indexName: string, filterFn?: (q: any) => any) => {
                let filteredResults = results;

                if (filterFn) {
                    const mockQ = {
                        eq: (field: string, value: any) => {
                            // Filter results based on field and value
                            filteredResults = results.filter(doc => doc[field] === value);
                            return { field, value };
                        },
                    };
                    filterFn(mockQ);
                }

                return {
                    collect: async () => filteredResults,
                    first: async () => filteredResults[0] || null,
                    unique: async () => {
                        if (filteredResults.length === 0) return null;
                        if (filteredResults.length > 1) {
                            throw new Error('unique() expects 0 or 1 result, got ' + filteredResults.length);
                        }
                        return filteredResults[0];
                    },
                    filter: (filterFn: (q: any) => any) => {
                        return {
                            collect: async () => {
                                return filteredResults.filter(doc => {
                                    const mockQ = {
                                        eq: (field: any, value: any) => {
                                            const fieldValue = typeof field === 'function' ? field(doc) : doc[field];
                                            return fieldValue === value;
                                        },
                                        field: (name: string) => doc[name],
                                    };
                                    return filterFn(mockQ);
                                });
                            },
                        };
                    },
                };
            },
            collect: async () => results,
            first: async () => results[0] || null,
            unique: async () => {
                if (results.length === 0) return null;
                if (results.length > 1) {
                    throw new Error('unique() expects 0 or 1 result, got ' + results.length);
                }
                return results[0];
            },
        };
    }

    /**
     * Patch a document
     */
    async patch(id: Id<any>, updates: any): Promise<void> {
        for (const table of this.store.values()) {
            if (table.has(id)) {
                const doc = table.get(id);
                table.set(id, { ...doc, ...updates });
                return;
            }
        }
        throw new Error(`Document ${id} not found`);
    }

    /**
     * Delete a document
     */
    async delete(id: Id<any>): Promise<void> {
        for (const table of this.store.values()) {
            if (table.has(id)) {
                table.delete(id);
                return;
            }
        }
        throw new Error(`Document ${id} not found`);
    }

    /**
     * Clear all data
     */
    clear() {
        this.store.forEach(table => table.clear());
        this.idCounters.clear();
    }

    /**
     * Seed data for testing
     */
    async seed(tableName: string, documents: any[]): Promise<Id<any>[]> {
        const ids: Id<any>[] = [];
        for (const doc of documents) {
            const id = await this.insert(tableName, doc);
            ids.push(id);
        }
        return ids;
    }
}

/**
 * Create a mock Convex context for testing
 */
export function createMockContext(db?: MockDatabase) {
    const mockDb = db || new MockDatabase();

    return {
        db: mockDb,
        auth: {
            getUserIdentity: vi.fn().mockResolvedValue({
                subject: 'test-user-id',
                email: 'test@example.com',
            }),
        },
        storage: {
            generateUploadUrl: vi.fn(),
            getUrl: vi.fn(),
        },
        scheduler: {
            runAfter: vi.fn(),
            runAt: vi.fn(),
        },
    };
}

/**
 * Mock query context (read-only)
 */
export function createMockQueryContext(db?: MockDatabase) {
    const ctx = createMockContext(db);
    return {
        db: ctx.db,
        auth: ctx.auth,
        storage: ctx.storage,
    };
}

/**
 * Mock mutation context (read-write)
 */
export function createMockMutationContext(db?: MockDatabase) {
    return createMockContext(db);
}

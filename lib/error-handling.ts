import React from "react";
import { toast } from "sonner";

/**
 * Retry configuration options
 */
interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Execute a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }
      
      // Call retry callback
      onRetry?.(attempt, lastError);
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Robust error message formatter
 * Handles JSON errors, Convex errors, and maps common English errors to Indonesian
 */
export function formatErrorMessage(error: unknown): string {
  if (!error) return "Terjadi kesalahan yang tidak diketahui";

  let message = "";

  // 1. Extract the raw message string
  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null && "message" in error) {
    message = String((error as any).message);
  } else {
    message = String(error);
  }

  // 2. Try to parse JSON inside the message (common pattern in this app: throw new Error(JSON.stringify(buildError(...))))
  try {
    const jsonStartIndex = message.indexOf('{"code"');
    if (jsonStartIndex !== -1) {
      // Find matching closing brace to handle cases where there's trailing text (like stack trace)
      let openBraces = 0;
      let jsonEndIndex = -1;

      for (let i = jsonStartIndex; i < message.length; i++) {
        if (message[i] === '{') openBraces++;
        if (message[i] === '}') openBraces--;

        if (openBraces === 0) {
          jsonEndIndex = i + 1;
          break;
        }
      }

      const jsonString = message.substring(jsonStartIndex, jsonEndIndex !== -1 ? jsonEndIndex : undefined);
      const errorData = JSON.parse(jsonString);

      // Return the user-friendly message from the structured error
      if (errorData.userMessage) {
        // If it's INSUFFICIENT_STOCK and has details, we could potentially format it better
        // But userMessage is usually enough ("Stok tidak mencukupi")
        return errorData.userMessage;
      }
    }
  } catch (e) {
    // JSON parsing failed, fall through to string matching
  }

  // 3. Clean up Convex wrapper text if present
  // e.g. "Uncaught Error: ..." or "Server Error: ..."
  let cleanMessage = message
    .replace(/^Uncaught Error:\s*/, "")
    .replace(/^Error:\s*/, "")
    .replace(/^Server Error:\s*/, "")
    .trim();

  // 4. Map known English error patterns to Indonesian
  const lowerMsg = cleanMessage.toLowerCase();

  // Stock / Inventory Errors
  if (lowerMsg.includes("stock not found")) return "Data stok tidak ditemukan";
  if (lowerMsg.includes("insufficient stock")) return "Stok tidak mencukupi";
  if (lowerMsg.includes("quantity must be positive")) return "Jumlah harus lebih dari 0";
  if (lowerMsg.includes("invalid quantity")) return "Jumlah tidak valid";

  // Product Errors
  if (lowerMsg.includes("product not found")) return "Produk tidak ditemukan";
  if (lowerMsg.includes("sku already exists")) return "SKU sudah digunakan";

  // Auth / Permission Errors
  if (lowerMsg.includes("permission") || lowerMsg.includes("unauthorized"))
    return "Anda tidak memiliki izin untuk melakukan tindakan ini";

  // Validation Errors
  if (lowerMsg.includes("validation failed")) return "Validasi gagal, mohon periksa input Anda";
  if (lowerMsg.includes("required")) return "Mohon lengkapi semua data yang wajib diisi";

  // Network / System Errors
  if (lowerMsg.includes("network") || lowerMsg.includes("fetch"))
    return "Masalah koneksi jaringan. Periksa internet Anda.";

  // Generic fallback for Convex "Not Found" if not caught above
  if (lowerMsg.includes("not found")) return "Data tidak ditemukan";
  if (lowerMsg.includes("already exists")) return "Data sudah ada";

  // 5. If no mapping found, return the cleaned message (or original if it was short)
  // Check if the message looks like a raw code error (very long or contains stack trace)
  if (cleanMessage.length > 200 || cleanMessage.includes("at ")) {
    return "Terjadi kesalahan internal sistem";
  }

  return cleanMessage || "Terjadi kesalahan yang tidak diketahui";
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Network errors are retryable
  if (message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("fetch")) {
    return true;
  }

  // Validation errors are not retryable
  if (message.includes("invalid") ||
      message.includes("required") ||
      message.includes("must be") ||
      message.includes("validation")) {
    return false;
  }

  // Server errors (5xx) are retryable, client errors (4xx) are not
  if (message.match(/\b5\d{2}\b/)) return true;
  if (message.match(/\b4\d{2}\b/)) return false;

  return false;
}

/**
 * Hook for handling mutations with automatic error toast and retry
 */
export function useMutationWithRetry<TArgs, TResult>(
  mutation: (args: TArgs) => Promise<TResult>,
  options: {
    onSuccess?: (result: TResult) => void;
    onError?: (error: Error) => void;
    retryOptions?: RetryOptions;
    successMessage?: string; // Auto-toast success
    errorMessage?: string; // Custom error message prefix or override
    throwError?: boolean; // Whether to re-throw error after handling
  } = {}
) {
  const [loading, setLoading] = React.useState(false);

  const execute = async (args: TArgs): Promise<TResult | undefined> => {
    setLoading(true);
    
    try {
      const result = await withRetry(
        () => mutation(args),
        {
          maxAttempts: 3,
          onRetry: (attempt) => {
            toast.info(`Mencoba lagi (percobaan ${attempt}/3)...`);
          },
          ...options.retryOptions,
        }
      );
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      options.onSuccess?.(result);
      return result;
    } catch (error) {
      const formattedMsg = formatErrorMessage(error);
      const displayMsg = options.errorMessage
        ? `${options.errorMessage}: ${formattedMsg}`
        : formattedMsg;

      toast.error(displayMsg);

      options.onError?.(error as Error);

      if (options.throwError) {
        throw error;
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading };
}

/**
 * Simplified hook for safe mutations (just wraps useMutationWithRetry with simpler defaults)
 * Use this when you just want to run a mutation and have errors handled automatically.
 */
export function useSafeMutation<TArgs, TResult>(
  mutation: (args: TArgs) => Promise<TResult>,
  options: {
    onSuccess?: (result: TResult) => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    throwError?: boolean;
  } = {}
) {
  return useMutationWithRetry(mutation, {
    retryOptions: { maxAttempts: 1 }, // Default to no retry for user actions unless network error
    ...options
  });
}

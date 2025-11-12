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
 *
 * @example
 * const result = await withRetry(
 *   async () => await mutation({ id }),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt) => toast.info(`Mencoba lagi (${attempt}/3)...`)
 *   }
 * );
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
 * Hook for handling mutations with retry and loading states
 *
 * @example
 * const { execute, loading } = useMutationWithRetry(
 *   api.sales.delete,
 *   {
 *     onSuccess: () => toast.success("Berhasil dihapus"),
 *     onError: (error) => toast.error(error.message),
 *   }
 * );
 *
 * <Button onClick={() => execute({ id })} disabled={loading}>
 *   {loading ? "Menghapus..." : "Hapus"}
 * </Button>
 */
export function useMutationWithRetry<TArgs, TResult>(
  mutation: (args: TArgs) => Promise<TResult>,
  options: {
    onSuccess?: (result: TResult) => void;
    onError?: (error: Error) => void;
    retryOptions?: RetryOptions;
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
      
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      options.onError?.(error as Error);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading };
}

/**
 * Format error messages for user display
 * Handles common error types and provides user-friendly messages
 */
export function formatErrorMessage(error: unknown): string {
  if (!error) return "Terjadi kesalahan yang tidak diketahui";
  
  if (typeof error === "string") return error;
  
  if (error instanceof Error) {
    // Handle Convex-specific errors
    if (error.message.includes("not found")) {
      return "Data tidak ditemukan";
    }
    if (error.message.includes("already exists")) {
      return "Data sudah ada";
    }
    if (error.message.includes("permission")) {
      return "Anda tidak memiliki izin untuk melakukan tindakan ini";
    }
    if (error.message.includes("network")) {
      return "Masalah koneksi jaringan. Periksa koneksi internet Anda.";
    }
    
    return error.message;
  }
  
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as any).message);
  }
  
  return "Terjadi kesalahan yang tidak diketahui";
}

/**
 * Check if error is retryable
 * Network errors and timeouts are retryable, validation errors are not
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
  
  // Default to not retryable
  return false;
}

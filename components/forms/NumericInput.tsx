import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  decimals?: number; // Default 2 for currency
  allowNegative?: boolean;
  placeholder?: string;
}

/**
 * NumericInput: Controlled input for numeric values with consistent parsing.
 * - Auto-formats on blur
 * - Validates min/max/decimals
 * - Safely converts to number (NaN → 0 or min)
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max,
      decimals = 2,
      allowNegative = false,
      placeholder = "0",
      className,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(String(value || ""));

    React.useEffect(() => {
      setInternalValue(String(value || ""));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow partial input like "-" or "12." while typing
      if (raw === "" || raw === "-" || /^-?\d*\.?\d*$/.test(raw)) {
        setInternalValue(raw);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      let parsed = parseFloat(internalValue);
      if (isNaN(parsed)) parsed = min;
      if (!allowNegative && parsed < 0) parsed = 0;
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;

      const formatted = parsed.toFixed(decimals);
      setInternalValue(formatted);
      onChange(parseFloat(formatted));

      if (onBlur) onBlur(e);
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn("text-right", className)}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

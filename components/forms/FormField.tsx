import React from "react";
import { cn } from "@/lib/utils";

export type FormFieldProps = React.PropsWithChildren<{
  label: string;
  htmlFor?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  description?: string;
  className?: string;
}>;

export function FormField({
  label,
  htmlFor,
  error,
  required,
  description,
  className,
  children,
}: FormFieldProps) {
  const id = htmlFor || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={cn("mb-3", className)} aria-live="polite">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-700 mb-1"
      >
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {description && (
        <p className="text-xs text-neutral-500 mb-1" id={id + "-desc"}>
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert" id={id + "-error"}>
          {error}
        </p>
      )}
    </div>
  );
}

import { useCallback, useMemo, useRef, useState } from "react";

// Lightweight schema-driven form hook. Intentionally minimal; can be swapped with Zod later.
// Schema describes fields, validation rules, and optional transform logic.

export type FieldSchema<T> = {
  label: string;
  required?: boolean;
  parse?: (raw: any) => T;
  validate?: (value: T) => string | null; // return error message or null
  defaultValue?: T;
};

export type SchemaDefinition<Shape> = {
  [K in keyof Shape]: FieldSchema<Shape[K]>;
};

export type FormState<Shape> = {
  values: Shape;
  errors: Partial<Record<keyof Shape, string>>;
  touched: Partial<Record<keyof Shape, boolean>>;
  isValid: boolean;
};

export type UseFormSchemaOptions<Shape> = {
  schema: SchemaDefinition<Shape>;
  onSubmit?: (values: Shape) => Promise<void> | void;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
};

function initializeValues<Shape>(schema: SchemaDefinition<Shape>): Shape {
  const obj: any = {};
  for (const key in schema) {
    obj[key] = schema[key].defaultValue ?? ("" as any);
  }
  return obj;
}

export function useFormSchema<Shape extends Record<string, any>>(
  options: UseFormSchemaOptions<Shape>,
) {
  const { schema, onSubmit, validateOnBlur = true, validateOnChange = false } = options;
  const [values, setValues] = useState<Shape>(() => initializeValues(schema));
  const [errors, setErrors] = useState<Partial<Record<keyof Shape, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Shape, boolean>>>({});
  const submittingRef = useRef(false);

  const validateField = useCallback(
    (field: keyof Shape, value: any): string | null => {
      const def = schema[field];
      if (!def) return null;
      let parsed = value;
      if (def.parse) {
        try {
          parsed = def.parse(value);
        } catch (e: any) {
          return e?.message || "Format tidak valid";
        }
      }
      if (def.required && (parsed === null || parsed === undefined || parsed === "")) {
        return "Wajib diisi";
      }
      if (def.validate) {
        return def.validate(parsed);
      }
      return null;
    },
    [schema],
  );

  const runValidation = useCallback(
    (nextValues: Shape) => {
      const newErrors: Partial<Record<keyof Shape, string>> = {};
      for (const key in schema) {
        const err = validateField(key as keyof Shape, (nextValues as any)[key]);
        if (err) newErrors[key as keyof Shape] = err;
      }
      setErrors(newErrors);
      return newErrors;
    },
    [schema, validateField],
  );

  const setField = useCallback(
    (field: keyof Shape, raw: any) => {
      setValues((prev) => {
        const next = { ...prev, [field]: raw };
        if (validateOnChange) {
          const err = validateField(field, raw);
          setErrors((prevErrors) => ({ ...prevErrors, [field]: err || undefined }));
        }
        return next;
      });
    },
    [validateOnChange, validateField],
  );

  const handleBlur = useCallback(
    (field: keyof Shape) => {
      setTouched((t) => ({ ...t, [field]: true }));
      if (validateOnBlur) {
        const err = validateField(field, (values as any)[field]);
        setErrors((prevErrors) => ({ ...prevErrors, [field]: err || undefined }));
      }
    },
    [values, validateOnBlur, validateField],
  );

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      const allErrors = runValidation(values);
      if (Object.keys(allErrors).length > 0) return;
      if (onSubmit) await onSubmit(values);
    } finally {
      submittingRef.current = false;
    }
  }, [values, runValidation, onSubmit]);

  const reset = useCallback((newValues?: Partial<Shape>) => {
    if (newValues) {
      setValues({ ...initializeValues(schema), ...newValues });
    } else {
      setValues(initializeValues(schema));
    }
    setErrors({});
    setTouched({});
  }, [schema]);

  return {
    values,
    errors,
    touched,
    isValid,
    setField,
    handleBlur,
    submit,
    reset,
    runValidation,
    schema, // for iterating fields
  } as FormState<Shape> & {
    setField: typeof setField;
    handleBlur: typeof handleBlur;
    submit: typeof submit;
    reset: (newValues?: Partial<Shape>) => void;
    runValidation: typeof runValidation;
    schema: typeof schema;
  };
}

import { createContext, useContext, useId, type ReactNode } from "react";
import { cx } from "./cx";

/**
 * Field wires a label, hint and error message to the control inside it.
 * Controls read the ids from context, so you never pass htmlFor or aria-describedby by hand.
 *
 *   <Field label="Email" hint="Kaam wala email" error={errors.email} required>
 *     <Input name="email" />
 *   </Field>
 */
export interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export const useField = (): FieldContextValue | null => useContext(FieldContext);

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Use your own id for the control; generated if omitted. */
  id?: string;
  className?: string;
}

export function Field({ label, children, hint, error, required = false, id, className }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? `sl-${autoId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id: controlId, describedBy, invalid: Boolean(error), required }}>
      <div className={cx("sl-field", Boolean(error) && "sl-field--invalid", className)}>
        <label className="sl-field__label" htmlFor={controlId}>
          {label}
          {required && (
            <span className="sl-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="sl-field__hint">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="sl-field__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Merge Field context into a control's native props. Explicit props win. */
export function useFieldProps<P extends { id?: string; required?: boolean; "aria-describedby"?: string; "aria-invalid"?: unknown }>(
  props: P & { invalid?: boolean },
) {
  const field = useField();
  const { invalid, ...rest } = props;
  const isInvalid = invalid ?? field?.invalid ?? false;
  return {
    ...rest,
    id: props.id ?? field?.id,
    required: props.required ?? field?.required,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": isInvalid || undefined,
  };
}

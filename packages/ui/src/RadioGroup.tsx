import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import type { SelectOption } from "./Select";

export interface RadioGroupProps {
  name: string;
  legend: ReactNode;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** "row" puts options side by side. */
  direction?: "row" | "column";
  className?: string;
}

/** A group of radio buttons inside a fieldset, with its own legend and error. */
export function RadioGroup({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  error,
  required,
  disabled,
  direction = "column",
  className,
}: RadioGroupProps) {
  const groupId = `sl-${useId()}`;
  const errorId = error ? `${groupId}-error` : undefined;
  return (
    <fieldset
      className={cx("sl-radio-group", `sl-radio-group--${direction}`, Boolean(error) && "sl-field--invalid", className)}
      aria-describedby={errorId}
      disabled={disabled}
    >
      <legend className="sl-field__label">
        {legend}
        {required && (
          <span className="sl-field__required" aria-hidden="true">
            *
          </span>
        )}
      </legend>
      <div className="sl-radio-group__options">
        {options.map((o, i) => {
          const id = `${groupId}-${i}`;
          return (
            <div className="sl-check" key={o.value}>
              <input
                id={id}
                type="radio"
                className="sl-check__input"
                name={name}
                value={o.value}
                disabled={o.disabled}
                required={required}
                {...(value !== undefined ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
                onChange={(e) => onChange?.(e.target.value)}
              />
              <label htmlFor={id} className="sl-check__label">
                {o.label}
              </label>
            </div>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="sl-field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

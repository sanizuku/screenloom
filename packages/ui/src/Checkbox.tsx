import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "./cx";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

/** A checkbox with its own label. Use it on its own, not inside Field. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, id, className, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? `sl-${autoId}`;
  return (
    <div className={cx("sl-check", className)}>
      <input ref={ref} id={inputId} type="checkbox" className="sl-check__input" {...rest} />
      <label htmlFor={inputId} className="sl-check__label">
        {label}
      </label>
    </div>
  );
});

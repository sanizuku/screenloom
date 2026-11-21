import { forwardRef, useId, useState, type ButtonHTMLAttributes, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { cx } from "./cx";
import { useFieldProps } from "./Field";

/** Slot names for `classNames`. Each one matches a `sl-switch__<slot>` CSS class. */
export type SwitchSlot = "root" | "control" | "thumb" | "label" | "description";

/** Optional text shown inside the track. */
export interface SwitchLabels {
  /** Text inside the track when on, e.g. "ON". Hidden from screen readers (aria-checked already says it). */
  on?: string;
  off?: string;
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "defaultValue" | "onChange" | "type" | "role" | "children" | "className" | "style" | "name"
>;

export interface SwitchProps extends NativeButtonProps {
  /** Controlled state. */
  checked?: boolean;
  /** Initial state for uncontrolled use. Default false. */
  defaultChecked?: boolean;
  /** Fires with the next state when the user toggles. */
  onChange?: (checked: boolean) => void;
  /** Visible label next to the switch. Inside a Field you can leave it out. */
  label?: ReactNode;
  /** Secondary text under the label, linked with aria-describedby. */
  description?: ReactNode;
  /** Put the label before (start) or after (end) the switch. Default "end". */
  labelPosition?: "start" | "end";
  size?: "sm" | "md" | "lg";
  /** Form field name. Like a native checkbox, the value is submitted only when checked. */
  name?: string;
  /** Submitted value when checked. Default "on". */
  value?: string;
  /** Focusable but cannot be toggled. */
  readOnly?: boolean;
  /** Marks the control invalid. Inside a Field with an error this is automatic. */
  invalid?: boolean;
  /** Sets aria-required. Inside a required Field this is automatic. */
  required?: boolean;
  /** Optional track text (i18n). */
  labels?: SwitchLabels;
  /** Class for the root element. */
  className?: string;
  /** Extra classes per part. */
  classNames?: Partial<Record<SwitchSlot, string>>;
  /** Style for the root element. Use it to set `--sl-switch-*` variables per instance. */
  style?: CSSProperties;
}

/**
 * On/off toggle that applies immediately. Renders a `<button role="switch">`; the ref points to it.
 *
 *   <Switch label="Email notifications" name="notify" defaultChecked />
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(props, ref) {
  const {
    checked: checkedProp,
    defaultChecked = false,
    onChange,
    label,
    description,
    labelPosition = "end",
    size = "md",
    name,
    value = "on",
    readOnly = false,
    invalid,
    labels,
    className,
    classNames = {},
    style,
    id,
    required,
    disabled = false,
    "aria-describedby": ariaDescribedBy,
    onClick,
    ...rest
  } = props;

  const isControlled = checkedProp !== undefined;
  const [internal, setInternal] = useState(defaultChecked);
  const checked = isControlled ? checkedProp : internal;

  const uid = useId();
  const field = useFieldProps({ id, required, "aria-describedby": ariaDescribedBy, invalid });
  const controlId = field.id ?? `sl-${uid}-switch`;
  const descriptionId = description ? `sl-${uid}-desc` : undefined;
  const describedBy = [field["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;
  const isInvalid = Boolean(field["aria-invalid"]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || readOnly || disabled) return;
    const next = !checked;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const trackText = checked ? labels?.on : labels?.off;

  return (
    <div
      className={cx("sl-switch", className, classNames.root)}
      style={style}
      data-state={checked ? "checked" : "unchecked"}
      data-size={size}
      data-label-position={labelPosition}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-invalid={isInvalid || undefined}
    >
      <button
        {...rest}
        ref={ref}
        type="button"
        role="switch"
        id={controlId}
        aria-checked={checked}
        aria-readonly={readOnly || undefined}
        aria-invalid={isInvalid || undefined}
        aria-required={field.required || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        className={cx("sl-switch__control", classNames.control)}
        data-state={checked ? "checked" : "unchecked"}
        onClick={handleClick}
      >
        {trackText && (
          <span className="sl-switch__text" aria-hidden="true">
            {trackText}
          </span>
        )}
        <span className={cx("sl-switch__thumb", classNames.thumb)} aria-hidden="true" />
      </button>
      {(label || description) && (
        <span className="sl-switch__content">
          {label && (
            <label htmlFor={controlId} className={cx("sl-switch__label", classNames.label)}>
              {label}
            </label>
          )}
          {description && (
            <span id={descriptionId} className={cx("sl-switch__description", classNames.description)}>
              {description}
            </span>
          )}
        </span>
      )}
      {name && checked && <input type="hidden" name={name} value={value} disabled={disabled} />}
    </div>
  );
});

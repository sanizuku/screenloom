import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";
import { useFieldProps } from "./Field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the control invalid. Inside a Field with an error this is automatic. */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  const merged = useFieldProps(props);
  return <input ref={ref} className={cx("sl-control", "sl-input", className)} {...merged} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, rows = 3, ...props }, ref) {
  const merged = useFieldProps(props);
  return <textarea ref={ref} rows={rows} className={cx("sl-control", "sl-textarea", className)} {...merged} />;
});

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Field, NumberInput, type NumberInputProps } from "./index";
import { createNumberFormatter, parseLocaleNumber, toRawString } from "./number-utils";

describe("number-utils", () => {
  it("parses Indian, US and European grouping", () => {
    expect(parseLocaleNumber("1,23,456.50", "en-IN")).toBe(123456.5);
    expect(parseLocaleNumber("1,234,567.25", "en-US")).toBe(1234567.25);
    expect(parseLocaleNumber("1.234,5", "de-DE")).toBe(1234.5);
    expect(parseLocaleNumber("1,234", "en-US")).toBe(1234);
    expect(parseLocaleNumber("1.234", "de-DE")).toBe(1234);
    expect(parseLocaleNumber("12.5", "en-IN")).toBe(12.5);
  });

  it("strips currency, percent, spaces and handles negatives", () => {
    expect(parseLocaleNumber("₹ 1,23,456.50", "en-IN")).toBe(123456.5);
    expect(parseLocaleNumber("15%", "en-IN")).toBe(15);
    expect(parseLocaleNumber("-42", "en-IN")).toBe(-42);
    expect(parseLocaleNumber("−42", "en-IN")).toBe(-42);
    expect(parseLocaleNumber("(1,000)", "en-US")).toBe(-1000);
  });

  it("returns null for empty and NaN for junk", () => {
    expect(parseLocaleNumber("  ", "en-IN")).toBeNull();
    expect(parseLocaleNumber("abc", "en-IN")).toBeNaN();
    expect(parseLocaleNumber("1.2.3,4,5", "en-IN")).toBeNaN();
  });

  it("formats number, currency and percent", () => {
    expect(createNumberFormatter({ locale: "en-IN" })(1234567.5)).toBe("12,34,567.5");
    expect(createNumberFormatter({ locale: "en-IN", format: "currency", currency: "INR" })(123456.5)).toBe("₹1,23,456.50");
    expect(createNumberFormatter({ locale: "en-US", format: "currency", currency: "USD", precision: 0 })(99.6)).toBe("$100");
    expect(createNumberFormatter({ locale: "en-IN", format: "percent" })(12.5)).toBe("12.5%");
  });

  it("raw string uses the locale decimal mark", () => {
    expect(toRawString(1234.5, "en-IN")).toBe("1234.5");
    expect(toRawString(1234.5, "de-DE")).toBe("1234,5");
  });
});

const setup = (props: Partial<NumberInputProps> = {}) => {
  const user = userEvent.setup();
  const utils = render(<NumberInput aria-label="Amount" locale="en-IN" {...props} />);
  const input = screen.getByRole("spinbutton", { name: "Amount" });
  return { user, input, ...utils };
};

describe("NumberInput", () => {
  it("shows formatted when blurred and raw while focused", async () => {
    const { user, input } = setup({ defaultValue: 123456.5, format: "currency" });
    expect(input).toHaveValue("₹1,23,456.50");
    await user.click(input);
    expect(input).toHaveValue("123456.5");
    await user.tab();
    expect(input).toHaveValue("₹1,23,456.50");
  });

  it("commits typed text on blur, not per keystroke (uncontrolled)", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.click(input);
    await user.type(input, "2500.75");
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2500.75);
    expect(input).toHaveValue("2,500.75");
  });

  it("commits on Enter and keeps raw text while focused", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.click(input);
    await user.type(input, "1,000{Enter}");
    expect(onChange).toHaveBeenCalledWith(1000);
    expect(input).toHaveValue("1000");
  });

  it("clamps to min/max on blur and rounds to precision", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange, min: 0, max: 100, precision: 1 });
    await user.click(input);
    await user.type(input, "150");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(100);
    await user.click(input);
    await user.clear(input);
    await user.type(input, "3.14159");
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(3.1);
  });

  it("reverts junk text and clears to null on empty", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange, defaultValue: 5 });
    await user.click(input);
    await user.clear(input);
    await user.type(input, "abc");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("5");
    await user.click(input);
    await user.clear(input);
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input).toHaveValue("");
  });

  it("steps with arrows (Shift = 10x), PageUp/Down and Home/End within bounds", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange, defaultValue: 5, min: 0, max: 50 });
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("6");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(input).toHaveValue("16");
    await user.keyboard("{PageDown}");
    expect(input).toHaveValue("6");
    await user.keyboard("{End}");
    expect(input).toHaveValue("50");
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("50");
    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(input).toHaveAttribute("aria-valuenow", "0");
  });

  it("avoids float noise when stepping decimals", async () => {
    const { user, input } = setup({ defaultValue: 0.1, step: 0.2 });
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("0.3");
  });

  it("stepper buttons step once per click and disable at the limit", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, defaultValue: 9, max: 10 });
    const inc = screen.getByRole("button", { name: "Increase" });
    expect(inc).toHaveAttribute("tabindex", "-1");
    await user.click(inc);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(10);
    expect(inc).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Decrease" }));
    expect(onChange).toHaveBeenLastCalledWith(9);
  });

  it("parses pasted Indian-format numbers", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.click(input);
    fireEvent.paste(input, { clipboardData: { getData: () => "1,23,456.50" } });
    expect(input).toHaveValue("123456.5");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(123456.5);
  });

  it("follows the value prop (controlled) and shows percent", () => {
    const { input, rerender } = setup({ value: 12, format: "percent" });
    expect(input).toHaveValue("12%");
    expect(input).toHaveAttribute("aria-valuetext", "12%");
    rerender(<NumberInput aria-label="Amount" locale="en-IN" value={null} format="percent" />);
    expect(input).toHaveValue("");
  });

  it("does not change when readOnly or disabled", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange, defaultValue: 1, readOnly: true });
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
  });

  it("wires Field, submits the raw number and forwards the ref", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <form>
        <Field label="Rate" hint="Per unit" error="Required" required>
          <NumberInput ref={ref} name="rate" defaultValue={1234.5} locale="en-IN" />
        </Field>
      </form>,
    );
    const input = screen.getByRole("spinbutton", { name: /Rate/ });
    expect(ref.current).toBe(input);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Per unit Required");
    expect(new FormData(container.querySelector("form")!).get("rate")).toBe("1234.5");
  });
});

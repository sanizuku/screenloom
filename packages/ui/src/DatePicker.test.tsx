import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { DatePicker, Field, type DatePickerProps } from "./index";

// "Today" is fixed to Tuesday 10 March 2026. Only Date is faked so userEvent timers keep working.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 2, 10, 12));
});
afterEach(() => {
  vi.useRealTimers();
});

const setup = (props: Partial<DatePickerProps> = {}) => {
  const user = userEvent.setup();
  const utils = render(<DatePicker aria-label="Due date" locale="en-GB" format="DD/MM/YYYY" {...props} />);
  const input = screen.getByRole("textbox", { name: "Due date" });
  return { user, input, ...utils };
};

const openCalendar = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Open calendar" }));
  return screen.getByRole("dialog");
};

const day = (label: RegExp | string) => screen.getByRole("button", { name: label });

describe("DatePicker: value", () => {
  it("shows defaultValue and updates when a day is picked (uncontrolled)", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ defaultValue: "2026-03-15", onChange });
    expect(input).toHaveValue("15/03/2026");
    await openCalendar(user);
    await user.click(day("Friday, 20 March 2026"));
    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(input).toHaveValue("20/03/2026");
  });

  it("follows the value prop and only calls onChange on commit (controlled)", async () => {
    const onChange = vi.fn();
    const { user, input, rerender } = setup({ value: "2026-03-15", onChange });
    rerender(<DatePicker aria-label="Due date" locale="en-GB" format="DD/MM/YYYY" value="2026-04-01" onChange={onChange} />);
    expect(input).toHaveValue("01/04/2026");

    await user.clear(input);
    await user.type(input, "5/4/26");
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("2026-04-05");
  });

  it("commits on Enter and normalises the text", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.type(input, "5/3/26{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-03-05");
    expect(input).toHaveValue("05/03/2026");
  });

  it("keeps invalid text, flags it and reports the reason", async () => {
    const onChange = vi.fn();
    const onInputError = vi.fn();
    const { user, input, container } = setup({ onChange, onInputError });
    await user.type(input, "31/02/2026");
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(onInputError).toHaveBeenCalledWith("31/02/2026", "parse");
    expect(input).toHaveValue("31/02/2026");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(container.querySelector(".sl-datepicker")).toHaveAttribute("data-input-error", "parse");
  });

  it("commits null when the text is emptied", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ defaultValue: "2026-03-15", onChange });
    await user.clear(input);
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("understands smart typing like +7 and t", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ onChange });
    await user.type(input, "+7{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("2026-03-17");
    await user.tripleClick(input);
    await user.keyboard("t");
    expect(onChange).toHaveBeenLastCalledWith("2026-03-10");
    expect(input).toHaveValue("10/03/2026");
  });

  it("shows a parsed-date echo while typing", async () => {
    const { user, input } = setup();
    await user.type(input, "1503");
    expect(await screen.findByText("Sun, 15 Mar 2026")).toBeInTheDocument();
  });

  it("Escape in the input reverts uncommitted text", async () => {
    const { user, input } = setup({ defaultValue: "2026-03-15" });
    await user.clear(input);
    await user.type(input, "99");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("15/03/2026");
  });

  it("puts the ISO value in a hidden input for native forms", () => {
    const { container } = setup({ defaultValue: "2026-03-15", name: "dueDate" });
    const hidden = container.querySelector('input[type="hidden"]');
    expect(hidden).toHaveAttribute("name", "dueDate");
    expect(hidden).toHaveValue("2026-03-15");
  });

  it("forwards the ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DatePicker ref={ref} aria-label="Date" />);
    expect(ref.current).toBe(screen.getByRole("textbox", { name: "Date" }));
  });
});

describe("DatePicker: constraints", () => {
  it("rejects typed dates outside min/max", async () => {
    const onInputError = vi.fn();
    const onChange = vi.fn();
    const { user, input } = setup({ min: "2026-03-05", max: "2026-03-25", onInputError, onChange });
    await user.type(input, "01/03/2026{Enter}");
    expect(onInputError).toHaveBeenLastCalledWith("01/03/2026", "min");
    await user.clear(input);
    await user.type(input, "30/03/2026{Enter}");
    expect(onInputError).toHaveBeenLastCalledWith("30/03/2026", "max");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables days and nav buttons outside min/max", async () => {
    const onChange = vi.fn();
    const { user } = setup({ min: "2026-03-05", max: "2026-03-25", onChange });
    await openCalendar(user);
    expect(day("Monday, 2 March 2026")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    await user.click(day("Monday, 2 March 2026"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not select days rejected by isDateDisabled", async () => {
    const onChange = vi.fn();
    const onInputError = vi.fn();
    const { user, input } = setup({ isDateDisabled: (iso) => iso === "2026-03-20", onChange, onInputError });
    await openCalendar(user);
    await user.click(day("Friday, 20 March 2026"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.type(input, "20/03/2026{Enter}");
    expect(onInputError).toHaveBeenCalledWith("20/03/2026", "disabled");
  });

  it("clears with the clear button and returns focus to the input", async () => {
    const onChange = vi.fn();
    const { user, input } = setup({ defaultValue: "2026-03-15", onChange });
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
  });

  it("hides the clear button when clearable is false", () => {
    setup({ defaultValue: "2026-03-15", clearable: false });
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
  });

  it("readOnly: no trigger, no popover, text still selectable", async () => {
    const { user, input } = setup({ defaultValue: "2026-03-15", readOnly: true });
    expect(screen.queryByRole("button", { name: "Open calendar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear date" })).not.toBeInTheDocument();
    await user.click(input);
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("readonly");
  });

  it("disabled: input and trigger are disabled", () => {
    setup({ defaultValue: "2026-03-15", disabled: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open calendar" })).toBeDisabled();
  });
});

describe("DatePicker: popover", () => {
  it("opens as a named modal dialog and toggles aria-expanded", async () => {
    const { user } = setup({ defaultValue: "2026-03-15" });
    const trigger = screen.getByRole("button", { name: "Open calendar" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAccessibleDescription("Selected date: Sunday, 15 March 2026");
    const dialog = await openCalendar(user);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Choose date March 2026");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
  });

  it("marks grid cells and keeps one tab stop", async () => {
    const { user } = setup({ defaultValue: "2026-03-15" });
    await openCalendar(user);
    const grid = screen.getByRole("grid", { name: "March 2026" });
    expect(within(grid).getAllByRole("row")).toHaveLength(7); // header + 6 weeks
    const selected = day("Sunday, 15 March 2026");
    expect(selected.closest("td")).toHaveAttribute("aria-selected", "true");
    expect(day("Tuesday, 10 March 2026")).toHaveAttribute("aria-current", "date");
    expect(within(grid).getAllByRole("button").filter((b) => b.tabIndex === 0)).toEqual([selected]);
    expect(selected).toHaveFocus();
    expect(within(grid).getByRole("columnheader", { name: "Mon" })).toHaveAttribute("abbr", "Monday");
  });

  it("starts the week on weekStartsOn", async () => {
    const { user } = setup({ weekStartsOn: 0 });
    await openCalendar(user);
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]).toHaveAttribute("abbr", "Sunday");
  });

  it("closes on Escape and returns focus to the input", async () => {
    const { user, input } = setup();
    await openCalendar(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("closes on outside click", async () => {
    const { user } = setup();
    await openCalendar(user);
    await user.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("supports controlled open with onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<DatePicker aria-label="Date" open={false} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Open calendar" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<DatePicker aria-label="Date" open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("uses labels and locale", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Tareekh"
        locale="hi-IN"
        defaultValue="2026-03-15"
        labels={{ openCalendar: "Calendar kholo", today: "Aaj", prevMonth: "Pichhla mahina" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Calendar kholo" }));
    expect(screen.getByRole("button", { name: "Aaj" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pichhla mahina" })).toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("मार्च 2026");
  });

  it("works with a working popover API too", async () => {
    const show = vi.fn();
    const proto = HTMLElement.prototype as unknown as { showPopover?: () => void };
    proto.showPopover = show;
    try {
      const { user } = setup();
      const dialog = await openCalendar(user);
      expect(dialog).toHaveAttribute("popover", "manual");
      expect(show).toHaveBeenCalled();
    } finally {
      delete proto.showPopover;
    }
  });
});

describe("DatePicker: keyboard", () => {
  const openWithKeyboard = async (props: Partial<DatePickerProps> = {}) => {
    const utils = setup({ defaultValue: "2026-03-15", ...props });
    await utils.user.click(utils.input);
    await utils.user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    return utils;
  };

  it("Alt+ArrowDown opens and focuses the selected day; plain ArrowDown does not", async () => {
    const { user, input } = setup({ defaultValue: "2026-03-15" });
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(day("Sunday, 15 March 2026")).toHaveFocus();
  });

  it("focuses today when there is no value", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard("{Alt>}{ArrowDown}{/Alt}");
    expect(day("Tuesday, 10 March 2026")).toHaveFocus();
  });

  it("moves by day and week with arrows", async () => {
    const { user } = await openWithKeyboard();
    await user.keyboard("{ArrowRight}");
    expect(day("Monday, 16 March 2026")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(day("Monday, 23 March 2026")).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowUp}");
    expect(day("Sunday, 15 March 2026")).toHaveFocus();
  });

  it("Home and End go to the start and end of the week", async () => {
    const { user } = await openWithKeyboard({ defaultValue: "2026-03-18" });
    await user.keyboard("{Home}");
    expect(day("Monday, 16 March 2026")).toHaveFocus();
    await user.keyboard("{End}");
    expect(day("Sunday, 22 March 2026")).toHaveFocus();
  });

  it("PageUp/PageDown change month with clamping, Shift changes year", async () => {
    const { user } = await openWithKeyboard({ defaultValue: "2026-03-31" });
    await user.keyboard("{PageDown}");
    expect(day("Thursday, 30 April 2026")).toHaveFocus();
    expect(screen.getByRole("heading")).toHaveTextContent("April 2026");
    await user.keyboard("{Shift>}{PageUp}{/Shift}");
    expect(day("Wednesday, 30 April 2025")).toHaveFocus();
  });

  it("crossing a month boundary updates the title", async () => {
    const { user } = await openWithKeyboard({ defaultValue: "2026-03-31" });
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading")).toHaveTextContent("April 2026");
    expect(day("Wednesday, 1 April 2026")).toHaveFocus();
  });

  it("stops at min/max", async () => {
    const { user } = await openWithKeyboard({ min: "2026-03-14" });
    await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    expect(day("Saturday, 14 March 2026")).toHaveFocus();
  });

  it("Enter selects, closes and returns focus", async () => {
    const onChange = vi.fn();
    const { user, input } = await openWithKeyboard({ onChange });
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenCalledWith("2026-03-16");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("Space selects too", async () => {
    const onChange = vi.fn();
    await openWithKeyboard({ onChange });
    await userEvent.keyboard("{ArrowLeft}[Space]");
    expect(onChange).toHaveBeenCalledWith("2026-03-14");
  });

  it("traps Tab inside the dialog", async () => {
    const { user } = await openWithKeyboard();
    const prev = screen.getByRole("button", { name: "Previous month" });
    const next = screen.getByRole("button", { name: "Next month" });
    const today = screen.getByRole("button", { name: "Today" });
    await user.tab();
    expect(today).toHaveFocus();
    await user.tab();
    expect(prev).toHaveFocus();
    await user.tab();
    expect(next).toHaveFocus();
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(today).toHaveFocus();
  });
});

describe("DatePicker: Field integration", () => {
  it("gets label, hint, error and format hint", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Joining date" hint="Offer letter wali date" error="Date zaroori hai" required>
        <DatePicker format="DD/MM/YYYY" />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: /Joining date/ });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Offer letter wali date Date zaroori hai Format: DD/MM/YYYY");
    await user.click(screen.getByText("Joining date"));
    expect(input).toHaveFocus();
  });

  it("can be fully controlled from a parent", async () => {
    function Parent() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <>
          <DatePicker aria-label="Date" format="DD/MM/YYYY" locale="en-GB" value={value} onChange={setValue} />
          <output>{JSON.stringify(value)}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Parent />);
    await user.type(screen.getByRole("textbox"), "15032026{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent('"2026-03-15"');
  });
});

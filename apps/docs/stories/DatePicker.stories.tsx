import type { Meta, StoryObj } from "@storybook/react";
import { useState, type CSSProperties } from "react";
import { Button, DatePicker, Field } from "@screenloom/ui";

const meta = {
  title: "Controls/DatePicker",
  component: DatePicker,
  args: { "aria-label": "Date" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320, minHeight: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const isWeekend = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1).getDay();
  return day === 0 || day === 6;
};

const year = new Date().getFullYear();
const holidays = [`${year}-01-26`, `${year}-08-15`, `${year}-10-02`, `${year}-12-25`];

/** Uncontrolled and empty. Type a date or press Alt+ArrowDown. */
export const Default: Story = {};

/** Value lives in parent state. onChange fires only on commit (blur, Enter, pick, clear). */
export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string | null>("2026-03-15");
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <DatePicker {...args} value={value} onChange={setValue} />
        <pre style={{ margin: 0, color: "var(--sl-color-text)" }}>{JSON.stringify({ value })}</pre>
        <Button variant="secondary" size="sm" onClick={() => setValue(null)}>
          Reset from parent
        </Button>
      </div>
    );
  },
};

/** sm matches Button sm, so a filter bar lines up. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DatePicker aria-label="Small" size="sm" />
        <Button size="sm">Search</Button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DatePicker aria-label="Medium" size="md" />
        <Button>Search</Button>
      </div>
      <DatePicker aria-label="Large" size="lg" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <Field label="Empty">
        <DatePicker />
      </Field>
      <Field label="With value">
        <DatePicker defaultValue="2026-03-15" />
      </Field>
      <Field label="Disabled">
        <DatePicker defaultValue="2026-03-15" disabled />
      </Field>
      <Field label="Read only">
        <DatePicker defaultValue="2026-03-15" readOnly />
      </Field>
      <Field label="Invalid" error="Date zaroori hai">
        <DatePicker />
      </Field>
      <Field label="Loading">
        <DatePicker defaultValue="2026-03-15" loading />
      </Field>
    </div>
  ),
};

export const InField: Story = {
  render: () => (
    <Field label="Joining date" hint="Offer letter wali date" required>
      <DatePicker name="joiningDate" />
    </Field>
  ),
};

/** min/max, weekends disabled and a holiday list via isDateDisabled. */
export const MinMaxAndDisabled: Story = {
  render: () => (
    <Field label="Delivery date" hint={`Sirf working days, ${year} ke andar`}>
      <DatePicker
        min={`${year}-01-01`}
        max={`${year}-12-31`}
        isDateDisabled={(iso) => isWeekend(iso) || holidays.includes(iso)}
      />
    </Field>
  ),
};

export const LocaleAndFormat: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <Field label="en-US, MM/DD/YYYY, Sunday start">
        <DatePicker locale="en-US" format="MM/DD/YYYY" weekStartsOn={0} defaultValue="2026-03-15" />
      </Field>
      <Field label="hi-IN, DD-MM-YYYY, Monday start">
        <DatePicker
          locale="hi-IN"
          format="DD-MM-YYYY"
          weekStartsOn={1}
          defaultValue="2026-03-15"
          labels={{ openCalendar: "Calendar kholo", clear: "Date hatao", today: "Aaj", dialogLabel: "Date chuno" }}
        />
      </Field>
    </div>
  ),
};

/** Try: t, +7, -1, 15, 1503, 150326, 5/3. The echo under the box shows what will be saved. */
export const SmartTyping: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null);
    return (
      <div style={{ display: "grid", gap: 24 }}>
        <Field label="Due date" hint="Shortcut type karo, phir Enter">
          <DatePicker value={value} onChange={setValue} format="DD/MM/YYYY" />
        </Field>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--sl-color-text-muted)", fontSize: 13, lineHeight: 1.7 }}>
          <li><code>t</code> today</li>
          <li><code>+7</code> / <code>-1</code> days from today</li>
          <li><code>15</code> the 15th of this month</li>
          <li><code>1503</code> 15 March this year</li>
          <li><code>150326</code> / <code>15032026</code> 15 March 2026</li>
          <li><code>5/3</code> 5 March this year</li>
        </ul>
        <pre style={{ margin: 0, color: "var(--sl-color-text)" }}>{JSON.stringify({ value })}</pre>
      </div>
    );
  },
};

/** Restyle with component CSS variables, classNames and data-* attributes. */
export const Customised: Story = {
  render: () => (
    <>
      <style>{`
        .story-dp-day[data-weekend]:not([data-selected]) { color: var(--sl-color-danger); }
        .story-dp-title { font-size: 1rem; }
      `}</style>
      <DatePicker
        aria-label="Custom"
        defaultValue="2026-03-15"
        classNames={{ day: "story-dp-day", title: "story-dp-title" }}
        style={
          {
            "--sl-datepicker-cell-radius": "999px",
            "--sl-datepicker-radius": "999px",
            "--sl-datepicker-day-selected-bg": "var(--sl-color-success)",
            "--sl-datepicker-today-ring": "var(--sl-color-success)",
          } as CSSProperties
        }
      />
    </>
  ),
};

/** The popover renders in the top layer, so overflow: hidden does not cut it. */
export const InsideOverflowContainer: Story = {
  render: () => (
    <div
      style={{
        height: 120,
        overflow: "hidden",
        padding: 16,
        border: "1px dashed var(--sl-color-border-strong)",
        borderRadius: 8,
        background: "var(--sl-color-surface)",
      }}
    >
      <Field label="Inside overflow: hidden">
        <DatePicker defaultValue="2026-03-15" />
      </Field>
    </div>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Field label="Dark theme" hint="Toolbar se bhi theme badal sakte ho">
      <DatePicker defaultValue="2026-03-15" defaultOpen />
    </Field>
  ),
};

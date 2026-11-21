import type { Meta, StoryObj } from "@storybook/react";
import { useState, type CSSProperties } from "react";
import { Field, Slider, type SliderValue } from "@screenloom/ui";

const meta = {
  title: "Controls/Slider",
  component: Slider,
  args: { "aria-label": "Value", defaultValue: 40 },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, paddingTop: 32 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Drag, click the track, or use arrows / PageUp / Home / End. */
export const Default: Story = {};

/** onChange fires while dragging, onChangeEnd once on release. */
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState<SliderValue>(25);
    const [committed, setCommitted] = useState<SliderValue>(25);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Slider aria-label="Discount" value={value} onChange={setValue} onChangeEnd={setCommitted} max={50} formatValue={(v) => `${v}%`} />
        <pre style={{ margin: 0, color: "var(--sl-color-text)" }}>{JSON.stringify({ value, committed })}</pre>
      </div>
    );
  },
};

export const Range: Story = {
  render: () => (
    <Field label="Price range">
      <Slider aria-label="Price range" defaultValue={[20000, 60000]} min={0} max={100000} step={1000} formatValue={(v) => inr.format(v)} name="price" />
    </Field>
  ),
};

export const Marks: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 32 }}>
      <Slider aria-label="Rating" defaultValue={3} min={1} max={5} marks={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))} />
      <Slider aria-label="Step ticks" defaultValue={40} step={10} marks />
    </div>
  ),
};

export const StepAndFormat: Story = {
  render: () => <Slider aria-label="Budget" defaultValue={250000} min={0} max={1000000} step={50000} formatValue={(v) => inr.format(v)} showTooltip="always" />,
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      <Slider aria-label="Small" size="sm" defaultValue={30} />
      <Slider aria-label="Medium" size="md" defaultValue={50} />
      <Slider aria-label="Large" size="lg" defaultValue={70} />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      <Slider aria-label="Disabled" defaultValue={40} disabled />
      <Slider aria-label="Read only" defaultValue={60} readOnly />
      <Slider aria-label="Invalid" defaultValue={80} invalid />
    </div>
  ),
};

export const InField: Story = {
  render: () => (
    <Field label="Discount" hint="Max 50%" error="Approval chahiye 30% se upar">
      <Slider aria-label="Discount" defaultValue={35} max={50} formatValue={(v) => `${v}%`} name="discount" />
    </Field>
  ),
};

export const RTL: Story = {
  render: () => (
    <div dir="rtl">
      <Slider aria-label="RTL" defaultValue={[20, 70]} marks={[{ value: 0, label: "0" }, { value: 50, label: "50" }, { value: 100, label: "100" }]} />
    </div>
  ),
};

export const Customised: Story = {
  render: () => (
    <Slider
      aria-label="Custom"
      defaultValue={60}
      style={
        {
          "--sl-slider-track-height": "8px",
          "--sl-slider-thumb-size": "1.5rem",
          "--sl-slider-range-bg": "var(--sl-color-success)",
          "--sl-slider-thumb-border": "var(--sl-color-success)",
        } as CSSProperties
      }
    />
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => <Slider aria-label="Dark" defaultValue={[30, 70]} showTooltip="always" />,
};

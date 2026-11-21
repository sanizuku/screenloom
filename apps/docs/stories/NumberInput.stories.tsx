import type { Meta, StoryObj } from "@storybook/react";
import { useState, type CSSProperties } from "react";
import { Button, Field, NumberInput } from "@screenloom/ui";

const meta = {
  title: "Controls/NumberInput",
  component: NumberInput,
  args: { "aria-label": "Quantity", locale: "en-IN" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 280 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ArrowUp/Down (Shift = 10x), stepper buttons (hold to repeat). */
export const Default: Story = {};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | null>(1250);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <NumberInput {...args} value={value} onChange={setValue} />
        <pre style={{ margin: 0, color: "var(--sl-color-text)" }}>{JSON.stringify({ value })}</pre>
        <Button size="sm" variant="secondary" onClick={() => setValue(null)}>
          Clear from parent
        </Button>
      </div>
    );
  },
};

/** Blur par formatted, focus par raw. "1,23,456.50" paste karke dekho. */
export const Currency: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <Field label="Amount (en-IN, INR)">
        <NumberInput format="currency" locale="en-IN" currency="INR" defaultValue={123456.5} min={0} />
      </Field>
      <Field label="Amount (en-US, USD)">
        <NumberInput format="currency" locale="en-US" currency="USD" defaultValue={123456.5} min={0} />
      </Field>
      <Field label="Amount (de-DE, EUR)">
        <NumberInput format="currency" locale="de-DE" currency="EUR" defaultValue={123456.5} min={0} />
      </Field>
    </div>
  ),
};

/** Value 18 = "18%" (not 0.18). */
export const Percent: Story = {
  render: () => (
    <Field label="GST rate">
      <NumberInput format="percent" locale="en-IN" defaultValue={18} min={0} max={100} step={0.5} />
    </Field>
  ),
};

export const MinMaxStep: Story = {
  render: () => (
    <Field label="Quantity" hint="1 se 99, step 1; blur par clamp">
      <NumberInput locale="en-IN" defaultValue={1} min={1} max={99} precision={0} />
    </Field>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <NumberInput aria-label="Small" size="sm" defaultValue={10} />
      <NumberInput aria-label="Medium" size="md" defaultValue={10} />
      <NumberInput aria-label="Large" size="lg" defaultValue={10} />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <Field label="Empty">
        <NumberInput placeholder="0.00" />
      </Field>
      <Field label="Disabled">
        <NumberInput defaultValue={42} disabled />
      </Field>
      <Field label="Read only">
        <NumberInput defaultValue={42} readOnly />
      </Field>
      <Field label="Invalid" error="Amount zaroori hai">
        <NumberInput />
      </Field>
      <Field label="No stepper">
        <NumberInput defaultValue={42} hideStepper />
      </Field>
    </div>
  ),
};

export const InField: Story = {
  render: () => (
    <Field label="Rate per unit" hint="Taxes alag se" required>
      <NumberInput name="rate" format="currency" locale="en-IN" min={0} />
    </Field>
  ),
};

export const Customised: Story = {
  render: () => (
    <NumberInput
      aria-label="Custom"
      defaultValue={7}
      style={{ "--sl-numberinput-text-align": "center", "--sl-numberinput-radius": "999px", "--sl-numberinput-stepper-width": "2rem" } as CSSProperties}
    />
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Field label="Dark">
      <NumberInput format="currency" defaultValue={99999} />
    </Field>
  ),
};

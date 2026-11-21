import type { Meta, StoryObj } from "@storybook/react";
import { useState, type CSSProperties } from "react";
import { Button, ColorPicker, Field, contrastRatio, parseColor, readableTextColor, toHex, wcagLevel } from "@screenloom/ui";

const meta = {
  title: "Controls/ColorPicker",
  component: ColorPicker,
  args: { "aria-label": "Color", defaultValue: "#2456c7" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 300, minHeight: 520 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the trigger (or ArrowDown). Area: arrows; hue: arrows / Home / End. */
export const Default: Story = {};

export const Controlled: Story = {
  render: () => {
    const [value, setValue] = useState("#1f7a4a");
    const [committed, setCommitted] = useState("#1f7a4a");
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <ColorPicker aria-label="Status" value={value} onChange={setValue} onChangeEnd={setCommitted} />
        <pre style={{ margin: 0, color: "var(--sl-color-text)" }}>{JSON.stringify({ value, committed })}</pre>
        <Button size="sm" variant="secondary" onClick={() => setValue("#c0362c")}>
          Set red from parent
        </Button>
      </div>
    );
  },
};

/** Opacity slider; value is always "#rrggbbaa". */
export const Alpha: Story = {
  args: { alpha: true, defaultValue: "#2456c7b3" },
};

/** No popover: the panel sits in the page (theme builder, settings page). */
export const Inline: Story = {
  args: { inline: true },
};

export const Formats: Story = {
  render: () => <ColorPicker inline aria-label="RGB first" defaultFormat="rgb" defaultValue="#e8590c" />,
};

export const CustomPresets: Story = {
  render: () => (
    <ColorPicker
      aria-label="Label color"
      defaultValue="#0ca678"
      presets={["#0ca678", "#1098ad", "#4c6ef5", "#7048e8", "#ae3ec9", "#d6336c", "#e8590c", "#f2b705"]}
      showRecent={false}
    />
  ),
};

export const InField: Story = {
  render: () => (
    <Field label="Brand color" hint="Buttons aur links mein lagega" required>
      <ColorPicker name="brandColor" defaultValue="#2456c7" />
    </Field>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <Field label="Sizes sm / md / lg">
        <div style={{ display: "grid", gap: 8 }}>
          <ColorPicker aria-label="Small" size="sm" defaultValue="#7048e8" />
          <ColorPicker aria-label="Medium" defaultValue="#7048e8" />
          <ColorPicker aria-label="Large" size="lg" defaultValue="#7048e8" />
        </div>
      </Field>
      <Field label="Disabled">
        <ColorPicker defaultValue="#5b6774" disabled />
      </Field>
      <Field label="Read only">
        <ColorPicker defaultValue="#5b6774" readOnly />
      </Field>
      <Field label="Invalid" error="Contrast kam hai">
        <ColorPicker defaultValue="#f2b705" />
      </Field>
    </div>
  ),
};

/** Enterprise theming: pick a brand color, see live which text color passes WCAG. */
export const BrandTheming: Story = {
  render: () => {
    const [brand, setBrand] = useState("#2456c7");
    const rgb = parseColor(brand)!;
    const text = readableTextColor(rgb);
    const ratio = contrastRatio(text, rgb);
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <ColorPicker inline aria-label="Brand" value={brand} onChange={setBrand} />
        <button type="button" style={{ padding: "8px 16px", border: 0, borderRadius: 6, background: brand, color: toHex(text), font: "inherit" }}>
          Save ({ratio.toFixed(2)}:1 {wcagLevel(ratio)})
        </button>
      </div>
    );
  },
};

export const Customised: Story = {
  render: () => (
    <ColorPicker
      inline
      aria-label="Custom"
      defaultValue="#d6336c"
      classNames={{ panel: "story-cp-panel" }}
      style={{ "--sl-colorpicker-area-height": "12rem", "--sl-colorpicker-radius": "12px", "--sl-colorpicker-panel-width": "20rem" } as CSSProperties}
    />
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  args: { defaultOpen: true, alpha: true },
};

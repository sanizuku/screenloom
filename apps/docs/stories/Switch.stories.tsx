import type { Meta, StoryObj } from "@storybook/react";
import { useState, type CSSProperties } from "react";
import { Button, Field, Switch } from "@screenloom/ui";

const meta = {
  title: "Controls/Switch",
  component: Switch,
  args: { label: "Email notifications" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uncontrolled. Click, or Tab + Space. */
export const Default: Story = {};

export const Controlled: Story = {
  render: (args) => {
    const [on, setOn] = useState(true);
    return (
      <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
        <Switch {...args} checked={on} onChange={setOn} />
        <pre style={{ margin: 0, color: "var(--sl-color-text)" }}>{JSON.stringify({ checked: on })}</pre>
        <Button size="sm" variant="secondary" onClick={() => setOn((v) => !v)}>
          Toggle from parent
        </Button>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Switch size="sm" label="Small (dense grids)" defaultChecked />
      <Switch size="md" label="Medium" defaultChecked />
      <Switch size="lg" label="Large" defaultChecked />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Switch label="Off" />
      <Switch label="On" defaultChecked />
      <Switch label="Disabled off" disabled />
      <Switch label="Disabled on" disabled defaultChecked />
      <Switch label="Read only" readOnly defaultChecked />
      <Switch label="Invalid" invalid />
      <Switch label="Track text" labels={{ on: "ON", off: "OFF" }} size="lg" />
    </div>
  ),
};

export const InField: Story = {
  render: () => (
    <Field label="Active" hint="Inactive users login nahi kar sakte">
      <Switch name="active" defaultChecked />
    </Field>
  ),
};

/** labelPosition="start" + description: a typical settings list. */
export const SettingsList: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      {[
        ["Two-factor login", "Har login par OTP maango"],
        ["Daily summary", "Subah 9 baje email"],
        ["Beta features", "Naye screens pehle dekho"],
      ].map(([label, description], i) => (
        <Switch key={label} label={label} description={description} labelPosition="start" defaultChecked={i === 0} style={{ display: "flex" }} />
      ))}
    </div>
  ),
};

export const Customised: Story = {
  render: () => (
    <Switch
      label="Success colored, wider"
      defaultChecked
      style={
        {
          "--sl-switch-width": "3rem",
          "--sl-switch-height": "1.5rem",
          "--sl-switch-track-on": "var(--sl-color-success)",
        } as CSSProperties
      }
    />
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      <Switch label="Dark on" defaultChecked />
      <Switch label="Dark off" />
    </div>
  ),
};

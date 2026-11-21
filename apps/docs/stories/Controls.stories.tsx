import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox, DatePicker, Field, Input, RadioGroup, Select, Textarea } from "@screenloom/ui";

const meta = {
  title: "Controls/Field controls",
  component: Field,
  args: { label: "Name", children: null },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Field label="Full name" hint="Jaise document mein hai" required>
        <Input placeholder="Asha Verma" />
      </Field>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Field label="Email" error="Sahi email daalo" required>
        <Input type="email" defaultValue="asha@" />
      </Field>
    </div>
  ),
};

export const DisabledAndReadOnly: Story = {
  render: () => (
    <div style={{ maxWidth: 360, display: "grid", gap: 16 }}>
      <Field label="Employee ID">
        <Input defaultValue="EMP-1042" readOnly />
      </Field>
      <Field label="Department">
        <Input defaultValue="Operations" disabled />
      </Field>
    </div>
  ),
};

export const TextareaField: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Field label="Remarks">
        <Textarea rows={4} placeholder="Koi note" />
      </Field>
    </div>
  ),
};

export const SelectField: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Field label="Shift" required>
        <Select
          placeholder="Choose a shift"
          options={[
            { value: "m", label: "Morning (06:00 to 14:00)" },
            { value: "e", label: "Evening (14:00 to 22:00)" },
            { value: "n", label: "Night (22:00 to 06:00)" },
          ]}
        />
      </Field>
    </div>
  ),
};

export const CheckboxAndRadio: Story = {
  render: () => (
    <div style={{ maxWidth: 360, display: "grid", gap: 20 }}>
      <Checkbox label="Inactive" />
      <RadioGroup
        name="leave-type"
        legend="Leave type"
        direction="row"
        defaultValue="cl"
        options={[
          { value: "cl", label: "Casual" },
          { value: "sl", label: "Sick" },
          { value: "el", label: "Earned" },
        ]}
      />
    </div>
  ),
};

/** Ek chhota real form, saare controls ek saath. */
export const SampleForm: Story = {
  render: () => (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{
        maxWidth: 640,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
        background: "var(--sl-color-surface)",
        border: "1px solid var(--sl-color-border)",
        borderRadius: 8,
        padding: 20,
      }}
    >
      <Field label="First name" required>
        <Input />
      </Field>
      <Field label="Last name">
        <Input />
      </Field>
      <Field label="Team">
        <Select placeholder="Choose" options={[{ value: "a", label: "Team A" }, { value: "b", label: "Team B" }]} />
      </Field>
      <Field label="Joining date">
        <DatePicker name="joiningDate" />
      </Field>
      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Address">
          <Textarea />
        </Field>
      </div>
      <Checkbox label="Send welcome email" defaultChecked />
    </form>
  ),
};

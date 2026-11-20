import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@screenloom/ui";

const meta = {
  title: "Controls/Button",
  component: Button,
  args: { children: "Save" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary", children: "Cancel" } };
export const Ghost: Story = { args: { variant: "ghost", children: "Reset" } };
export const Danger: Story = { args: { variant: "danger", children: "Delete" } };
export const Loading: Story = { args: { loading: true, children: "Saving" } };
export const Small: Story = { args: { size: "sm" } };

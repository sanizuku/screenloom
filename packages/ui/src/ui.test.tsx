import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Button, Checkbox, Field, Input, RadioGroup, Select, Textarea } from "./index";

describe("Field", () => {
  it("connects label, hint and error to the control", () => {
    render(
      <Field label="Email" hint="Kaam wala email" error="Email zaroori hai" required>
        <Input name="email" />
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Kaam wala email Email zaroori hai");
    expect(screen.getByRole("alert")).toHaveTextContent("Email zaroori hai");
  });

  it("works for Textarea and Select too", () => {
    render(
      <>
        <Field label="Notes">
          <Textarea />
        </Field>
        <Field label="City">
          <Select placeholder="Choose" options={[{ value: "dl", label: "Delhi" }]} />
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("City")).toHaveDisplayValue("Choose");
  });
});

describe("Input", () => {
  it("forwards ref and accepts typing", async () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Name" />);
    await userEvent.type(screen.getByLabelText("Name"), "Asha");
    expect(ref.current?.value).toBe("Asha");
    expect(ref.current).not.toHaveAttribute("aria-invalid");
  });
});

describe("Button", () => {
  it("is disabled and busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});

describe("Checkbox", () => {
  it("toggles when the label is clicked", async () => {
    render(<Checkbox label="Inactive" />);
    await userEvent.click(screen.getByText("Inactive"));
    expect(screen.getByRole("checkbox", { name: "Inactive" })).toBeChecked();
  });
});

describe("RadioGroup", () => {
  it("reports the chosen value", async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        name="shift"
        legend="Shift"
        options={[
          { value: "m", label: "Morning" },
          { value: "n", label: "Night" },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("group", { name: "Shift" })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Night"));
    expect(onChange).toHaveBeenCalledWith("n");
  });
});

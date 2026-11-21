import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { Field, Switch } from "./index";

describe("Switch", () => {
  it("renders role=switch named by its label and toggles on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Email alerts" onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Email alerts" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(onChange).toHaveBeenCalledWith(true);
    // Clicking the label toggles too.
    await user.click(screen.getByText("Email alerts"));
    expect(sw).toHaveAttribute("aria-checked", "false");
  });

  it("toggles with Space and Enter", async () => {
    const user = userEvent.setup();
    render(<Switch label="Dark mode" />);
    const sw = screen.getByRole("switch");
    sw.focus();
    await user.keyboard(" ");
    expect(sw).toBeChecked();
    await user.keyboard("{Enter}");
    expect(sw).not.toBeChecked();
  });

  it("follows the checked prop (controlled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Switch label="A" checked={false} onChange={onChange} />);
    const sw = screen.getByRole("switch");
    await user.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute("aria-checked", "false");
    rerender(<Switch label="A" checked onChange={onChange} />);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("works with parent state", async () => {
    const user = userEvent.setup();
    function Demo() {
      const [on, setOn] = useState(true);
      return (
        <>
          <Switch label="Active" checked={on} onChange={setOn} />
          <span>{on ? "yes" : "no"}</span>
        </>
      );
    }
    render(<Demo />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByText("no")).toBeInTheDocument();
  });

  it("does not toggle when disabled or readOnly", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <Switch label="D" disabled onChange={onChange} />
        <Switch label="R" readOnly defaultChecked onChange={onChange} />
      </>,
    );
    await user.click(screen.getByRole("switch", { name: "D" }));
    const ro = screen.getByRole("switch", { name: "R" });
    await user.click(ro);
    expect(onChange).not.toHaveBeenCalled();
    expect(ro).toHaveAttribute("aria-readonly", "true");
    expect(ro).toBeChecked();
  });

  it("submits name=value only when checked, like a native checkbox", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Switch label="Notify" name="notify" value="yes" />
      </form>,
    );
    const form = container.querySelector("form")!;
    expect(new FormData(form).get("notify")).toBeNull();
    await user.click(screen.getByRole("switch"));
    expect(new FormData(form).get("notify")).toBe("yes");
  });

  it("links description, Field context and forwards the ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Field label="Two-factor" hint="Recommended" error="Required by policy" required>
        <Switch ref={ref} description="Ask for a code on login" />
      </Field>,
    );
    const sw = screen.getByRole("switch", { name: "Two-factor" });
    expect(ref.current).toBe(sw);
    expect(sw).toHaveAttribute("aria-invalid", "true");
    expect(sw).toHaveAttribute("aria-required", "true");
    expect(sw).toHaveAccessibleDescription(/Recommended.*Required by policy.*Ask for a code on login/);
  });

  it("exposes state on data attributes and merges classNames", () => {
    const { container } = render(<Switch label="X" defaultChecked size="sm" className="mine" classNames={{ thumb: "t" }} />);
    const root = container.firstElementChild!;
    expect(root).toHaveClass("sl-switch", "mine");
    expect(root).toHaveAttribute("data-state", "checked");
    expect(root).toHaveAttribute("data-size", "sm");
    expect(container.querySelector(".sl-switch__thumb")).toHaveClass("t");
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { ColorPicker, Field, type ColorPickerProps } from "./index";
import "./test-pointer";

beforeEach(() => {
  window.localStorage.clear();
});

const setup = (props: Partial<ColorPickerProps> = {}) => {
  const user = userEvent.setup();
  const utils = render(<ColorPicker aria-label="Brand" {...props} />);
  return { user, ...utils };
};

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Brand" }));
  return screen.getByRole("dialog", { name: "Choose color" });
};

const mockRect = (el: Element, width = 200, height = 100) => {
  (el as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) });
};

describe("ColorPicker: trigger and popover", () => {
  it("shows the value on the trigger and opens a dialog focused on the area", async () => {
    const { user } = setup({ defaultValue: "#2456c7" });
    const trigger = screen.getByRole("button", { name: "Brand" });
    expect(trigger).toHaveTextContent("#2456C7");
    expect(trigger).toHaveAccessibleDescription("Selected color #2456C7");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    const dialog = await open(user);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("slider", { name: "Saturation and brightness" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { user } = setup();
    await open(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brand" })).toHaveFocus();
  });

  it("opens with ArrowDown and closes on outside pointer down", async () => {
    const { user } = setup();
    screen.getByRole("button", { name: "Brand" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open when disabled or readOnly", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ColorPicker aria-label="D" disabled />
        <ColorPicker aria-label="R" readOnly />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "R" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D" })).toBeDisabled();
  });
});

describe("ColorPicker: editing", () => {
  it("moves saturation/brightness with arrows and announces both", async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const { user } = setup({ defaultValue: "#ff0000", onChange, onChangeEnd });
    await open(user);
    const area = screen.getByRole("slider", { name: "Saturation and brightness" });
    expect(area).toHaveAttribute("aria-valuetext", "Saturation 100%, Brightness 100%");
    await user.keyboard("{ArrowDown}");
    expect(area).toHaveAttribute("aria-valuetext", "Saturation 100%, Brightness 99%");
    await user.keyboard("{Shift>}{ArrowLeft}{/Shift}");
    expect(area).toHaveAttribute("aria-valuetext", "Saturation 90%, Brightness 99%");
    expect(onChange).toHaveBeenCalled();
    expect(onChangeEnd).toHaveBeenLastCalledWith(onChange.mock.calls[onChange.mock.calls.length - 1]![0]);
  });

  it("drags the area with the pointer", async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const { user, container } = setup({ defaultValue: "#ff0000", onChange, onChangeEnd });
    await open(user);
    const area = container.querySelector(".sl-colorpicker__area")!;
    mockRect(area);
    fireEvent.pointerDown(area, { clientX: 0, clientY: 0, button: 0, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith("#ffffff"); // top-left = white
    fireEvent.pointerMove(area, { clientX: 200, clientY: 100, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith("#000000"); // bottom = black
    fireEvent.pointerUp(area, { pointerId: 1 });
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
  });

  it("keeps the hue while passing through black", async () => {
    const onChange = vi.fn();
    const { user, container } = setup({ defaultValue: "#00ff00", onChange });
    await open(user);
    const area = container.querySelector(".sl-colorpicker__area")!;
    mockRect(area);
    fireEvent.pointerDown(area, { clientX: 200, clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(area, { clientX: 200, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(area, { pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith("#00ff00");
  });

  it("hue slider follows APG keys", async () => {
    const onChange = vi.fn();
    const { user } = setup({ defaultValue: "#ff0000", onChange });
    await open(user);
    const hue = screen.getByRole("slider", { name: "Hue" });
    hue.focus();
    await user.keyboard("{End}");
    expect(hue).toHaveAttribute("aria-valuenow", "360");
    await user.keyboard("{Home}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}");
    expect(hue).toHaveAttribute("aria-valuenow", "120");
    expect(onChange).toHaveBeenLastCalledWith("#00ff00");
  });

  it("accepts any CSS color in the hex input and switches formats", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await open(user);
    const hex = screen.getByRole("textbox", { name: "Hex" });
    await user.clear(hex);
    await user.type(hex, "rgb(36 86 199){Enter}");
    expect(onChange).toHaveBeenLastCalledWith("#2456c7");
    expect(hex).toHaveValue("#2456C7");

    await user.click(screen.getByRole("button", { name: "RGB" }));
    expect(screen.getByRole("button", { name: "RGB" })).toHaveAttribute("aria-pressed", "true");
    const red = screen.getByRole("textbox", { name: "Red" });
    expect(red).toHaveValue("36");
    await user.clear(red);
    await user.type(red, "255{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("#ff56c7");

    await user.click(screen.getByRole("button", { name: "HSL" }));
    expect(screen.getByRole("textbox", { name: "Lightness" })).toBeInTheDocument();
  });

  it("reverts invalid hex text", async () => {
    const onChange = vi.fn();
    const { user } = setup({ defaultValue: "#123456", onChange });
    await open(user);
    const hex = screen.getByRole("textbox", { name: "Hex" });
    await user.clear(hex);
    await user.type(hex, "nope{Enter}");
    expect(onChange).not.toHaveBeenCalled();
    expect(hex).toHaveValue("#123456");
  });

  it("supports alpha with an 8-digit value", async () => {
    const onChange = vi.fn();
    const { user } = setup({ alpha: true, defaultValue: "#2456c7", onChange });
    expect(screen.getByRole("button", { name: "Brand" })).toHaveTextContent("#2456C7FF");
    await open(user);
    const alpha = screen.getByRole("slider", { name: "Opacity" });
    alpha.focus();
    await user.keyboard("{PageDown}{PageDown}{PageDown}{PageDown}{PageDown}");
    expect(alpha).toHaveAttribute("aria-valuetext", "50%");
    expect(onChange).toHaveBeenLastCalledWith("#2456c780");
  });

  it("picks a preset swatch with aria-pressed and roving focus", async () => {
    const onChange = vi.fn();
    const { user } = setup({ presets: ["#ff0000", "#00ff00", "#0000ff"], defaultValue: "#00ff00", onChange });
    await open(user);
    const group = screen.getByRole("group", { name: "Preset colors" });
    const swatches = within(group).getAllByRole("button");
    expect(swatches[1]).toHaveAttribute("aria-pressed", "true");
    expect(swatches.map((s) => s.tabIndex)).toEqual([-1, 0, -1]);
    swatches[1]!.focus();
    await user.keyboard("{ArrowRight}");
    expect(swatches[2]).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("#0000ff");
  });

  it("follows the value prop (controlled)", () => {
    const { rerender } = render(<ColorPicker aria-label="Brand" value="#111111" />);
    expect(screen.getByRole("button", { name: "Brand" })).toHaveTextContent("#111111");
    rerender(<ColorPicker aria-label="Brand" value="hsl(0 100% 50%)" />);
    expect(screen.getByRole("button", { name: "Brand" })).toHaveTextContent("#FF0000");
  });
});

describe("ColorPicker: extras", () => {
  it("shows contrast ratios against white and black text with WCAG levels", async () => {
    const { user } = setup({ defaultValue: "#000000" });
    const dialog = await open(user);
    const contrast = within(dialog).getByRole("group", { name: "Text contrast" });
    expect(contrast).toHaveTextContent("White text21.00:1 AAA");
    expect(contrast).toHaveTextContent("Black text1.00:1 Fail");
  });

  it("saves recent colors on close and survives broken storage", async () => {
    const { user } = setup({ defaultValue: "#000000", presets: ["#ff0000"] });
    await open(user);
    await user.click(within(screen.getByRole("group", { name: "Preset colors" })).getByRole("button"));
    await user.keyboard("{Escape}");
    expect(JSON.parse(window.localStorage.getItem("sl-colorpicker-recent")!)).toEqual(["#ff0000"]);
    await open(user);
    expect(screen.getByRole("group", { name: "Recent colors" })).toBeInTheDocument();

    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    await user.click(screen.getByRole("textbox", { name: "Hex" }));
    await user.keyboard("{Control>}a{/Control}#00ff00{Enter}{Escape}{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("hides the eyedropper when unsupported and uses it when available", async () => {
    const { user, unmount } = setup();
    await open(user);
    expect(screen.queryByRole("button", { name: "Pick color from screen" })).not.toBeInTheDocument();
    unmount();

    const onChange = vi.fn();
    (window as unknown as { EyeDropper: unknown }).EyeDropper = class {
      open() {
        return Promise.resolve({ sRGBHex: "#abcdef" });
      }
    };
    try {
      const u = setup({ onChange });
      await open(u.user);
      await u.user.click(screen.getByRole("button", { name: "Pick color from screen" }));
      expect(onChange).toHaveBeenLastCalledWith("#abcdef");
    } finally {
      delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    }
  });

  it("inline mode renders the panel without a trigger and forwards the ref to the area thumb", () => {
    const ref = createRef<HTMLElement>();
    render(<ColorPicker ref={ref} inline aria-label="Accent" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Accent" })).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByRole("slider", { name: "Saturation and brightness" }));
  });

  it("works inside Field and submits the hex", () => {
    const { container } = render(
      <form>
        <Field label="Status color" hint="Badge background" error="Low contrast">
          <ColorPicker name="statusColor" defaultValue="#1f7a4a" />
        </Field>
      </form>,
    );
    const trigger = screen.getByRole("button", { name: "Status color" });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("Selected color #1F7A4A Badge background Low contrast");
    expect(new FormData(container.querySelector("form")!).get("statusColor")).toBe("#1f7a4a");
  });
});

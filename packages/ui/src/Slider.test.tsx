import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Field, Slider } from "./index";
import "./test-pointer";

/** jsdom has no layout: give the track a 0..200px box so pointer math works. */
const mockTrack = (container: HTMLElement) => {
  const track = container.querySelector(".sl-slider__track") as HTMLElement;
  track.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 10, right: 200, bottom: 10, x: 0, y: 0, toJSON: () => ({}) });
  return track;
};

describe("Slider: single", () => {
  it("renders an accessible slider with defaults", () => {
    render(<Slider aria-label="Volume" defaultValue={30} />);
    const thumb = screen.getByRole("slider", { name: "Volume" });
    expect(thumb).toHaveAttribute("aria-valuenow", "30");
    expect(thumb).toHaveAttribute("aria-valuemin", "0");
    expect(thumb).toHaveAttribute("aria-valuemax", "100");
    expect(thumb).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("supports arrows, PageUp/PageDown (10 steps) and Home/End", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(<Slider aria-label="V" defaultValue={50} step={2} onChange={onChange} onChangeEnd={onChangeEnd} />);
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(thumb).toHaveAttribute("aria-valuenow", "52");
    await user.keyboard("{ArrowDown}");
    expect(thumb).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{PageUp}");
    expect(thumb).toHaveAttribute("aria-valuenow", "70");
    await user.keyboard("{PageDown}");
    expect(thumb).toHaveAttribute("aria-valuenow", "50");
    await user.keyboard("{End}");
    expect(thumb).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(thumb).toHaveAttribute("aria-valuenow", "0");
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(onChangeEnd).toHaveBeenLastCalledWith(0);
  });

  it("uses formatValue for aria-valuetext and the tooltip", () => {
    const { container } = render(<Slider aria-label="Price" defaultValue={500} max={1000} formatValue={(v) => `₹${v}`} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "₹500");
    expect(container.querySelector(".sl-slider__tooltip")).toHaveTextContent("₹500");
  });

  it("follows the value prop (controlled)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Slider aria-label="V" value={10} onChange={onChange} />);
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith(11);
    expect(thumb).toHaveAttribute("aria-valuenow", "10");
    rerender(<Slider aria-label="V" value={40} onChange={onChange} />);
    expect(thumb).toHaveAttribute("aria-valuenow", "40");
  });

  it("drags with the pointer, snaps to step and fires onChangeEnd once", () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const { container } = render(<Slider aria-label="V" step={10} onChange={onChange} onChangeEnd={onChangeEnd} />);
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 50, button: 0, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(30); // 25% snapped to 30
    expect(container.querySelector(".sl-slider")).toHaveAttribute("data-dragging");
    fireEvent.pointerMove(track, { clientX: 150, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(80); // 75% snapped to 80
    fireEvent.pointerUp(track, { pointerId: 1 });
    fireEvent.lostPointerCapture(track, { pointerId: 1 });
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(80);
    expect(screen.getByRole("slider")).toHaveFocus();
  });

  it("mirrors keyboard and pointer in RTL", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Slider aria-label="V" defaultValue={50} onChange={onChange} />
      </div>,
    );
    const thumb = screen.getByRole("slider");
    thumb.focus();
    await user.keyboard("{ArrowLeft}");
    expect(thumb).toHaveAttribute("aria-valuenow", "51");
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 20, button: 0, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(90);
  });

  it("ignores input when disabled or readOnly", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <Slider aria-label="D" defaultValue={5} disabled onChange={onChange} />
        <Slider aria-label="R" defaultValue={5} readOnly onChange={onChange} />
      </>,
    );
    const d = screen.getByRole("slider", { name: "D" });
    const r = screen.getByRole("slider", { name: "R" });
    expect(d).toHaveAttribute("aria-disabled", "true");
    expect(d).toHaveAttribute("tabindex", "-1");
    expect(r).toHaveAttribute("aria-readonly", "true");
    r.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Slider: range", () => {
  it("renders two thumbs that cannot cross", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Slider aria-label="Price" defaultValue={[20, 30]} step={5} onChange={onChange} />);
    const [lo, hi] = screen.getAllByRole("slider");
    expect(lo).toHaveAccessibleName("Price, Minimum");
    expect(hi).toHaveAccessibleName("Price, Maximum");
    expect(lo).toHaveAttribute("aria-valuemax", "30");
    expect(hi).toHaveAttribute("aria-valuemin", "20");
    lo!.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(lo).toHaveAttribute("aria-valuenow", "30");
    expect(onChange).toHaveBeenLastCalledWith([30, 30]);
  });

  it("moves the nearest thumb on track press", () => {
    const onChange = vi.fn();
    const { container } = render(<Slider aria-label="P" defaultValue={[20, 80]} onChange={onChange} />);
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 140, button: 0, pointerId: 1 }); // 70 -> nearer to 80
    expect(onChange).toHaveBeenLastCalledWith([20, 70]);
  });

  it("submits two hidden inputs with the same name", () => {
    const { container } = render(
      <form>
        <Slider aria-label="P" name="price" defaultValue={[100, 900]} max={1000} />
      </form>,
    );
    expect(new FormData(container.querySelector("form")!).getAll("price")).toEqual(["100", "900"]);
  });
});

describe("Slider: marks, Field and ref", () => {
  it("renders ticks and labels, flagging the active ones", () => {
    const { container } = render(
      <Slider
        aria-label="M"
        defaultValue={50}
        marks={[
          { value: 0, label: "0%" },
          { value: 50, label: "50%" },
          { value: 100, label: "100%" },
        ]}
      />,
    );
    const marks = container.querySelectorAll(".sl-slider__mark");
    expect(marks).toHaveLength(3);
    expect(marks[1]).toHaveAttribute("data-active");
    expect(marks[2]).not.toHaveAttribute("data-active");
    expect(container.querySelectorAll(".sl-slider__mark-label")).toHaveLength(3);
  });

  it("marks={true} draws one tick per step", () => {
    const { container } = render(<Slider aria-label="M" max={10} step={2} marks />);
    expect(container.querySelectorAll(".sl-slider__mark")).toHaveLength(6);
  });

  it("reads hint/error from Field and forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Field label="Discount" hint="Max 50" error="Too high">
        <Slider ref={ref} aria-label="Discount" defaultValue={60} />
      </Field>,
    );
    const thumb = screen.getByRole("slider");
    expect(thumb).toHaveAttribute("aria-invalid", "true");
    expect(thumb).toHaveAccessibleDescription("Max 50 Too high");
    expect(ref.current).toHaveClass("sl-slider");
  });
});

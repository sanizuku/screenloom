import type { Decorator, Preview } from "@storybook/react";
import { useEffect } from "react";
import "@screenloom/tokens/tokens.css";
import "@screenloom/ui/styles.css";

/** Toolbar switch for light / dark, applied as data-theme on <html>. */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as string;
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return (
    <div style={{ background: "var(--sl-color-bg)", padding: 24, minHeight: "100%" }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [withTheme],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
  },
  tags: ["autodocs"],
};

export default preview;

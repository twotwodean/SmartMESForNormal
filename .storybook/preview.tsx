import type { Preview, Decorator } from "@storybook/react";
import React, { useEffect } from "react";
import "../app/globals.css";

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "dark";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return React.createElement(
    "div",
    { style: { background: "var(--bg)", color: "var(--text)", padding: 24, minHeight: "100vh", fontFamily: "system-ui" } },
    React.createElement(Story),
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "테마",
      defaultValue: "dark",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "dark", title: "다크" },
          { value: "light", title: "라이트" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {},
};

export default preview;

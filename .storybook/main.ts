import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: { name: "@storybook/react-vite", options: {} },
  async viteFinal(config) {
    return mergeConfig(config, { resolve: { alias: { "@": path.resolve(__dirname, "..") } } });
  },
};

export default config;

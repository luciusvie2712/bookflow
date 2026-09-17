import globals from "globals";
import { reactConfig } from "./react.mjs";

export const reactNativeConfig = [
  ...reactConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.es2021,
        __DEV__: "readonly",
      },
    },
  },
];

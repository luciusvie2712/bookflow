import globals from "globals";
import { baseConfig } from "./base.mjs";

export const nodeConfig = [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];

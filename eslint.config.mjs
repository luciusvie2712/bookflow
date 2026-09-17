import { baseConfig } from "@bookflow/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/.expo/**",
    ],
  },
];

import { nodeConfig } from "@bookflow/eslint-config/node";

export default [
  ...nodeConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "apps/*",
            "next/*",
            "expo/*",
            "react-native",
            "@bookflow/ui",
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.module.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
];

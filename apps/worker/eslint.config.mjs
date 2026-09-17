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
            "@bookflow/api",
            "@bookflow/ui",
            "next/*",
            "expo/*",
            "react-native",
          ],
        },
      ],
    },
  },
];

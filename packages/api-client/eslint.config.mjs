import { baseConfig } from "@bookflow/eslint-config/base";

export default [
  ...baseConfig,
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
            "@nestjs/*",
            "@prisma/*",
            "react",
            "react-native",
          ],
        },
      ],
    },
  },
];

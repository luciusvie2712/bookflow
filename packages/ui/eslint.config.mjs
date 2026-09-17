import { reactConfig } from "@bookflow/eslint-config/react";

export default [
  ...reactConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "apps/*",
            "@bookflow/api",
            "@bookflow/api-client",
            "@bookflow/domain-contracts",
            "@nestjs/*",
            "@prisma/*",
            "react-native",
          ],
        },
      ],
    },
  },
];

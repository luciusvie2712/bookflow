import { reactNativeConfig } from "@bookflow/eslint-config/react-native";

export default [
  ...reactNativeConfig,
  {
    files: ["{app,src}/**/*.{ts,tsx}"],
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
            "next/*",
            "react-dom",
          ],
        },
      ],
    },
  },
];

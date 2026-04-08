import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ["dist/**", ".local/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  run: {
    tasks: {
      "vault-boy": {
        command: "node --experimental-strip-types ./src/cli.ts",
        cache: false,
      },
    },
  },
});

/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  clearMocks: true,
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/src/shared/test-helpers/mock-prisma.ts"],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)",
    "!**/dist/**",
    "!dist/**",
    "!**/__tests__/**/data/*.*",
    "!**/*.perf.ts",
  ],
  moduleNameMapper: {
    "@shared/(.*)": "<rootDir>/src/shared/$1",
  },
};

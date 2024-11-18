module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts',
    '!**/vendor/**'],
  coverageDirectory: 'coverage',

  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/coverage",
    "package.json",
    "package-lock.json",
    "reportWebVitals.ts",
    "setupTests.ts",
    "index.tsx"
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  preset: "ts-jest",
  setupFilesAfterEnv: ['./setupTests.ts'],
  testEnvironment: "jest-environment-jsdom",
  transform: {
    '^.+\\.tsx?$': 'ts-jest',  // Transform TypeScript files
    '^.+\\.jsx?$': 'babel-jest', // Transform JSX files
    "^.+\\.css$": "jest-transform-stub",
  },
  transformIgnorePatterns: ["node_module/(?!primereact)"],
}
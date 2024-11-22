module.exports = {
  collectCoverage: false,
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
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

  preset: "ts-jest",
  setupFilesAfterEnv: ['./src/setupTests.ts'],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[tj]sx?$": "babel-jest", // Transpile TS/TSX/JS/JSX using Babel
  },
  transformIgnorePatterns: ["node_module/(?!primereact)"],
}
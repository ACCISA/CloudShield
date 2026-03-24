module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/)+client(\\.js)?$': '<rootDir>/src/__mocks__/apiClientCompatMock.js',
    '^(\\.{1,2}/)+api/client(\\.js)?$': '<rootDir>/src/__mocks__/apiClientCompatMock.js',
    '^(\\.{1,2}/)+hooks/useThemeColors(\\.js)?$': '<rootDir>/src/__mocks__/useThemeColorsMock.js',
    '^(\\.{1,2}/)+context/ThemeContext(\\.jsx?)?$': '<rootDir>/src/__mocks__/themeContextMock.js',
    '^@/hooks/useThemeColors(\\.js)?$': '<rootDir>/src/__mocks__/useThemeColorsMock.js',
    '^@/context/ThemeContext(\\.jsx?)?$': '<rootDir>/src/__mocks__/themeContextMock.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': '<rootDir>/jest.importMetaTransformer.cjs',
  },
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
    '!src/**/__tests__/**/*.test.{js,jsx}',
    '!src/**/__tests__/**/*.spec.{js,jsx}',
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/jest.importMetaTransformer.cjs",
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
};

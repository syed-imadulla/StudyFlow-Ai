const config = {
  testEnvironment: 'node',
  transform: {},
  globalSetup: '<rootDir>/tests/globalSetup.cjs',
  globalTeardown: '<rootDir>/tests/globalTeardown.cjs',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/controllers/**/*.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ]
};

module.exports = config;

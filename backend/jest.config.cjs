const config = {
  testEnvironment: 'node',
  transform: {},
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

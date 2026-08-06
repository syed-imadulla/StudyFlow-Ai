module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
  testMatch: ['<rootDir>/tests/discovery/**/*.test.js'],
  collectCoverageFrom: [
    '<rootDir>/src/js/discovery/**/*.js'
  ]
};

module.exports = {
    testMatch: ['**/__tests__/**/*.test.js'],
    testRunner: 'jest-circus/runner',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/config/index.js',
        '!src/express-app.js',
        '!src/database/connection.js',
    ],
    detectOpenHandles: true,
    forceExit: true,
};
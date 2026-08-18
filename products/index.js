const express = require('express');
const { PORT, requireVars } = require('./src/config');
const { databaseConnection } = require('./src/database');
const expressApp = require('./src/express-app');

// Require necessary environment variables
requireVars('PORT', 'DB_URL', 'APP_SECRET');

const StartServer = async () => {
    requireVars('DB_URL');
    const app = express();
    await databaseConnection();
    await expressApp(app);

    app.listen(PORT, () => {
        console.log(`listenig to port ${PORT}`);
    }).on('error', (err) => {
        console.log(err);
        process.exit();
    });
}

StartServer();

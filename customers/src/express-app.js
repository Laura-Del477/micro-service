const express = require('express');
const customer = require('./api/customer');
const HandleErrors = require('./utils/error-handler');

module.exports = async (app) => {
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    app.use('/customer', customer);

    app.use(HandleErrors);
};
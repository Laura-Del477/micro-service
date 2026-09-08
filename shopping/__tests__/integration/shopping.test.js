process.env.APP_SECRET = 'shopping-test-secret';
process.env.MONGOMS_SKIP_MD5_CHECK = 'true';

const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const expressApp = require('../../src/express-app');
const OrderModel = require('../../src/database/models/Order');

jest.setTimeout(120000);

describe('Shopping HTTP API', () => {
    let app;
    let mongoServer;
    let token;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        app = express();
        await expressApp(app);
        token = jwt.sign({ _id: 'user-1' }, process.env.APP_SECRET);
    });

    beforeEach(async () => {
        await OrderModel.deleteMany({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    test('crea una orden mediante POST /shopping/order', async () => {
        const response = await request(app)
            .post('/shopping/order')
            .set('Authorization', `Bearer ${token}`)
            .send({
                txnId: 'txn-1',
                amount: 35.5,
                items: [{ productId: 'product-1', name: 'Keyboard', price: 35.5, quantity: 1 }],
            });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            userId: 'user-1',
            txnId: 'txn-1',
            amount: 35.5,
            status: 'received',
        });
        expect(response.body._id).toEqual(expect.any(String));
    });

    test('lista las órdenes del usuario mediante GET /shopping/orders', async () => {
        await OrderModel.create({
            userId: 'user-1',
            txnId: 'txn-2',
            amount: 20,
            items: [{ productId: 'product-2', quantity: 1 }],
        });

        const response = await request(app)
            .get('/shopping/orders')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ userId: 'user-1', txnId: 'txn-2' });
    });

    test('rechaza solicitudes sin autenticación', async () => {
        const response = await request(app).get('/shopping/orders');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Missing authorization token' });
    });

    test('valida el cuerpo de una orden', async () => {
        const response = await request(app)
            .post('/shopping/order')
            .set('Authorization', `Bearer ${token}`)
            .send({ txnId: 'txn-invalid', items: [], amount: 10 });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: 'Order items are required' });
    });
});
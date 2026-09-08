process.env.MONGOMS_SKIP_MD5_CHECK = 'true';

const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const expressApp = require('../../src/express-app');
const ProductModel = require('../../src/database/models/Product');

jest.setTimeout(120000);

describe('Products HTTP API', () => {
    let app;
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        app = express();
        await expressApp(app);
    });

    beforeEach(async () => {
        await ProductModel.deleteMany({});
    });

    afterEach(() => jest.clearAllMocks());

    afterAll(async () => {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
    });

    test('lista productos y categorías mediante GET /products', async () => {
        await ProductModel.create([
            { name: 'Keyboard', type: 'electronics', price: 35.5 },
            { name: 'Desk', type: 'furniture', price: 100 },
        ]);

        const response = await request(app).get('/products');

        expect(response.status).toBe(200);
        expect(response.body.products).toHaveLength(2);
        expect(response.body.categories).toEqual(expect.arrayContaining(['electronics', 'furniture']));
    });

    test('obtiene un producto mediante GET /products/:id', async () => {
        const product = await ProductModel.create({ name: 'Keyboard', type: 'electronics', price: 35.5 });

        const response = await request(app).get(`/products/${product._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ _id: product._id.toString(), name: 'Keyboard', price: 35.5 });
    });

    test('responde 404 para un producto inexistente', async () => {
        const response = await request(app).get(`/products/${new mongoose.Types.ObjectId()}`);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ message: 'Product not found' });
    });

    test('responde 500 para un id con formato inválido', async () => {
        const response = await request(app).get('/products/not-an-object-id');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: expect.any(String) });
    });
});
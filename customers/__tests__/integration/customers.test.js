process.env.APP_SECRET = 'customers-test-secret';
process.env.MONGOMS_SKIP_MD5_CHECK = 'true';

const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const expressApp = require('../../src/express-app');
const CustomerModel = require('../../src/database/models/Customer');
const AddressModel = require('../../src/database/models/Address');

jest.setTimeout(120000);

describe('Customers HTTP API', () => {
    let app;
    let mongoServer;
    let token;
    let customerId;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        app = express();
        await expressApp(app);
    });

    beforeEach(async () => {
        await AddressModel.deleteMany({});
        await CustomerModel.deleteMany({});
        const signup = await request(app).post('/customer/signup').send({
            email: 'ana@example.com', password: 'secret', phone: '555-0100',
        });
        token = signup.body.token;
        customerId = signup.body.id;
    });

    afterEach(() => jest.clearAllMocks());

    afterAll(async () => {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
    });

    test('registra e autentica un cliente', async () => {
        expect(token).toEqual(expect.any(String));
        expect(customerId).toEqual(expect.any(String));

        const response = await request(app).post('/customer/login').send({
            email: 'ana@example.com', password: 'secret',
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ id: customerId, token: expect.any(String) });
    });

    test('rechaza un correo duplicado', async () => {
        const response = await request(app).post('/customer/signup').send({
            email: 'ana@example.com', password: 'secret', phone: '555-0101',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: 'Email already registered' });
    });

    test('rechaza login con contraseña incorrecta', async () => {
        const response = await request(app).post('/customer/login').send({
            email: 'ana@example.com', password: 'wrong',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: 'Invalid credentials' });
    });

    test('protege las rutas privadas', async () => {
        const response = await request(app).get('/customer/profile');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Missing authorization token' });
    });

    test('obtiene el perfil del cliente autenticado', async () => {
        const response = await request(app)
            .get('/customer/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ _id: customerId, email: 'ana@example.com', phone: '555-0100' });
        expect(response.body.password).toBeUndefined();
        expect(response.body.salt).toBeUndefined();
    });

    test('agrega y consulta una dirección', async () => {
        const addResponse = await request(app)
            .post('/customer/address')
            .set('Authorization', `Bearer ${token}`)
            .send({ street: 'Main 1', postalCode: '1000', city: 'Quito', country: 'EC' });

        expect(addResponse.status).toBe(200);
        expect(addResponse.body).toMatchObject({ street: 'Main 1', city: 'Quito' });

        const profileResponse = await request(app)
            .get('/customer/profile')
            .set('Authorization', `Bearer ${token}`);

        expect(profileResponse.body.address).toHaveLength(1);
        expect(profileResponse.body.address[0]).toMatchObject({ street: 'Main 1', country: 'EC' });
    });

    test('devuelve el resumen del cliente', async () => {
        const response = await request(app)
            .get('/customer/summary')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ cart: [], wishlist: [], orders: [] });
    });

    test('obtiene una wishlist vacía', async () => {
        const response = await request(app)
            .get('/customer/wishlist')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
});
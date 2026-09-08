const ShoppingService = require('../../src/services/shopping-service');
const { APIError } = require('../../src/utils/app-errors');

describe('ShoppingService', () => {
    let service;
    let repository;

    beforeEach(() => {
        service = new ShoppingService();
        repository = {
            CreateOrder: jest.fn(),
            FindByUserId: jest.fn(),
        };
        service.repository = repository;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('crea una orden válida y la envuelve en data', async () => {
        const savedOrder = { userId: 'user-1', amount: 25, items: [] };
        repository.CreateOrder.mockResolvedValue(savedOrder);

        const result = await service.CreateOrder({
            userId: 'user-1',
            txnId: 'txn-1',
            items: [{ productId: 'product-1', quantity: 2 }],
            amount: 25,
        });

        expect(result).toEqual({ data: savedOrder });
        expect(repository.CreateOrder).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            txnId: 'txn-1',
            amount: 25,
            status: 'received',
            items: [{ productId: 'product-1', quantity: 2 }],
            _id: expect.any(String),
            date: expect.any(Date),
        }));
    });

    test.each([
        [{ items: [{ productId: 'p', quantity: 1 }], amount: 10 }, 'User id is required'],
        [{ userId: 'u', items: [], amount: 10 }, 'Order items are required'],
        [{ userId: 'u', items: [{ productId: 'p', quantity: 1 }], amount: 0 }, 'Order amount must be greater than zero'],
    ])('rechaza datos inválidos', async (input, message) => {
        await expect(service.CreateOrder(input)).rejects.toMatchObject({ statusCode: 400, message });
        expect(repository.CreateOrder).not.toHaveBeenCalled();
    });

    test('convierte los errores del repositorio en APIError', async () => {
        repository.CreateOrder.mockRejectedValue(new Error('database unavailable'));

        await expect(service.CreateOrder({
            userId: 'user-1',
            items: [{ productId: 'product-1', quantity: 1 }],
            amount: 10,
        })).rejects.toMatchObject({
            name: 'CreateOrderError',
            statusCode: 500,
            message: 'database unavailable',
        });
    });

    test('obtiene las órdenes de un usuario', async () => {
        const orders = [{ userId: 'user-1', amount: 10 }];
        repository.FindByUserId.mockResolvedValue(orders);

        await expect(service.GetOrdersByUser('user-1')).resolves.toEqual({ data: orders });
        expect(repository.FindByUserId).toHaveBeenCalledWith('user-1');
    });

    test('convierte los errores al consultar órdenes en APIError', async () => {
        repository.FindByUserId.mockRejectedValue(new Error('query failed'));

        await expect(service.GetOrdersByUser('user-1')).rejects.toMatchObject({
            name: 'GetOrdersByUserError',
            statusCode: 500,
            message: 'query failed',
        });
        expect(repository.FindByUserId).toHaveBeenCalledWith('user-1');
    });
});
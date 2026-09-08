const ProductsService = require('../../src/services/products-service');
const { NotFoundError } = require('../../src/utils/app-errors');

describe('ProductsService', () => {
    let service;
    let repository;

    beforeEach(() => {
        service = new ProductsService();
        repository = { FindAll: jest.fn(), FindById: jest.fn() };
        service.repository = repository;
    });

    afterEach(() => jest.clearAllMocks());

    test('obtiene productos y categorías únicas', async () => {
        const products = [
            { _id: '1', name: 'Keyboard', type: 'electronics' },
            { _id: '2', name: 'Mouse', type: 'electronics' },
            { _id: '3', name: 'Desk', type: 'furniture' },
        ];
        repository.FindAll.mockResolvedValue(products);

        await expect(service.GetProducts()).resolves.toEqual({
            data: { products, categories: ['electronics', 'furniture'] },
        });
    });

    test('envuelve los errores al obtener productos', async () => {
        repository.FindAll.mockRejectedValue(new Error('database unavailable'));

        await expect(service.GetProducts()).rejects.toMatchObject({
            name: 'GetProductsError', statusCode: 500, message: 'database unavailable',
        });
    });

    test('obtiene un producto por id', async () => {
        const product = { _id: 'product-1', name: 'Keyboard', price: 35.5 };
        repository.FindById.mockResolvedValue(product);

        await expect(service.GetProductById('product-1')).resolves.toEqual({ data: product });
        expect(repository.FindById).toHaveBeenCalledWith('product-1');
    });

    test('conserva errores de producto no encontrado', async () => {
        repository.FindById.mockRejectedValue(new NotFoundError('Product not found'));

        await expect(service.GetProductById('missing')).rejects.toMatchObject({
            name: 'NotFoundError', statusCode: 404, message: 'Product not found',
        });
    });

    test('envuelve errores inesperados al buscar por id', async () => {
        repository.FindById.mockRejectedValue(new Error('query failed'));

        await expect(service.GetProductById('product-1')).rejects.toMatchObject({
            name: 'GetProductByIdError', statusCode: 500, message: 'query failed',
        });
    });
});
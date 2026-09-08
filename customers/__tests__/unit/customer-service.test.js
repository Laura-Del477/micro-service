jest.mock('../../src/utils', () => ({
    FormateData: (data) => ({ data }),
    GeneratePassword: jest.fn(),
    GenerateSalt: jest.fn(),
    GenerateSignature: jest.fn(),
    ValidatePassword: jest.fn(),
}));

const CustomerService = require('../../src/services/customer-service');
const {
    BadRequestError,
    NotFoundError,
} = require('../../src/utils/app-errors');
const {
    GeneratePassword,
    GenerateSalt,
    GenerateSignature,
    ValidatePassword,
} = require('../../src/utils');

describe('CustomerService', () => {
    let service;
    let repository;

    beforeEach(() => {
        service = new CustomerService();
        repository = {
            FindCustomer: jest.fn(),
            CreateCustomer: jest.fn(),
            AddNewAddress: jest.fn(),
            GetProfile: jest.fn(),
            GetWishList: jest.fn(),
            AddToWishlist: jest.fn(),
            RemoveFromWishlist: jest.fn(),
            AddToCart: jest.fn(),
            RemoveFromCart: jest.fn(),
            GetCart: jest.fn(),
            PlaceOrder: jest.fn(),
        };
        service.repository = repository;
        GenerateSalt.mockResolvedValue('salt');
        GeneratePassword.mockResolvedValue('hashed-password');
        GenerateSignature.mockResolvedValue('signed-token');
        ValidatePassword.mockResolvedValue(true);
    });

    afterEach(() => jest.clearAllMocks());

    test('registra un cliente y devuelve su token', async () => {
        repository.CreateCustomer.mockResolvedValue({ email: 'ana@example.com', _id: 'customer-1' });

        await expect(service.SignUp({ email: 'ana@example.com', password: 'secret', phone: '555' }))
            .resolves.toEqual({ data: { id: 'customer-1', token: 'signed-token' } });
        expect(repository.CreateCustomer).toHaveBeenCalledWith({
            email: 'ana@example.com', password: 'hashed-password', phone: '555', salt: 'salt',
        });
    });

    test('rechaza credenciales inválidas', async () => {
        repository.FindCustomer.mockResolvedValue({ email: 'ana@example.com', password: 'hash', salt: 'salt' });
        ValidatePassword.mockResolvedValue(false);

        await expect(service.SignIn({ email: 'ana@example.com', password: 'wrong' }))
            .rejects.toMatchObject({ name: 'BadRequestError', statusCode: 400, message: 'Invalid credentials' });
        expect(GenerateSignature).not.toHaveBeenCalled();
    });

    test('inicia sesión con credenciales válidas', async () => {
        repository.FindCustomer.mockResolvedValue({ email: 'ana@example.com', password: 'hash', salt: 'salt', _id: 'customer-1' });

        await expect(service.SignIn({ email: 'ana@example.com', password: 'secret' }))
            .resolves.toEqual({ data: { id: 'customer-1', token: 'signed-token' } });
        expect(GenerateSignature).toHaveBeenCalledWith({ email: 'ana@example.com', _id: 'customer-1' });
    });

    test.each([
        ['AddNewAddress', ['customer-1', { street: 'Main', postalCode: '1000', city: 'Quito', country: 'EC' }], { street: 'Main' }],
        ['GetProfile', [{ _id: 'customer-1' }], { email: 'ana@example.com' }],
        ['GetCustomerSummary', ['customer-1'], { cart: [], wishlist: [], orders: [] }],
        ['GetWishList', ['customer-1'], []],
        ['AddToWishlist', ['customer-1', { _id: 'product-1' }], []],
        ['RemoveFromWishlist', ['customer-1', 'product-1'], []],
        ['AddToCart', ['customer-1', { _id: 'product-1' }, 2], []],
        ['RemoveFromCart', ['customer-1', 'product-1'], []],
        ['GetCart', ['customer-1'], []],
        ['PlaceOrder', ['customer-1', { _id: 'order-1' }], { _id: 'order-1' }],
    ])('%s devuelve data del repositorio', async (method, args, result) => {
        const repositoryMethod = {
            AddNewAddress: 'AddNewAddress', GetProfile: 'GetProfile', GetCustomerSummary: 'GetProfile',
            GetWishList: 'GetWishList', AddToWishlist: 'AddToWishlist', RemoveFromWishlist: 'RemoveFromWishlist',
            AddToCart: 'AddToCart', RemoveFromCart: 'RemoveFromCart', GetCart: 'GetCart', PlaceOrder: 'PlaceOrder',
        }[method];
        repository[repositoryMethod].mockResolvedValue(
            method === 'GetCustomerSummary' ? { cart: [], wishlist: [], orders: [] } : result,
        );

        await expect(service[method](...args)).resolves.toEqual({ data: result });
    });

    test('convierte errores de datos en 404', async () => {
        repository.GetCart.mockRejectedValue(new Error('customer missing'));

        await expect(service.GetCart('customer-1')).rejects.toMatchObject({
            name: 'Data Not Found', statusCode: 404, message: 'customer missing',
        });
    });

    test('conserva errores de aplicación del repositorio', async () => {
        repository.GetProfile.mockRejectedValue(new NotFoundError('Customer not found'));

        await expect(service.GetProfile({ _id: 'customer-1' })).rejects.toMatchObject({
            name: 'NotFoundError', statusCode: 404, message: 'Customer not found',
        });
    });

    test('conserva errores de registro como 400', async () => {
        repository.CreateCustomer.mockRejectedValue(new BadRequestError('Email already registered'));

        await expect(service.SignUp({ email: 'ana@example.com', password: 'secret' }))
            .rejects.toMatchObject({ statusCode: 400, message: 'Email already registered' });
    });
});
# Proyecto de microservicios de comercio electrónico

## 1. Descripción general

Este repositorio implementa el backend de una plataforma de comercio electrónico distribuida. Está compuesto por tres microservicios de dominio (`customers`, `products` y `shopping`) y un API Gateway (`gateway`). Cada servicio es una aplicación Node.js independiente, con sus propias rutas, lógica de negocio, persistencia y configuración.

El sistema permite registrar e iniciar sesión como cliente, consultar el catálogo de productos, crear y consultar órdenes y obtener un perfil compuesto mediante el gateway. .

## 2. Objetivo del sistema

El objetivo es separar las responsabilidades principales de una tienda en línea en servicios independientes:

- gestionar clientes, autenticación, direcciones y preferencias;
- consultar el catálogo de productos;
- gestionar la creación y consulta de órdenes;
- ofrecer un punto de entrada único mediante el gateway;
- demostrar persistencia independiente, comunicación entre servicios, autenticación con JWT y pruebas unitarias y de integración.

## 3. Arquitectura de microservicios

La solución contiene cuatro aplicaciones:

- **Gateway**: entrada HTTP pública, proxy hacia los servicios y composición de un perfil completo.
- **Customers**: clientes, registro, login, perfil, direcciones, resumen y wishlist de lectura.
- **Products**: catálogo y consulta individual de productos.
- **Shopping**: creación y consulta de órdenes autenticadas.

Los tres servicios de dominio están desacoplados en código y tienen bases MongoDB separadas. Cada directorio cuenta con su propio `Dockerfile`, `docker-compose.yml`, `package.json` y `.env.example`. No existe un `docker-compose.yml` en la raíz que coordine toda la plataforma.

## 4. Justificación de los dominios

### Gateway

Centraliza el acceso de los consumidores y evita que tengan que conocer la ubicación de cada microservicio. Enruta los prefijos `/customer`, `/products` y `/shopping`, conserva el encabezado `Authorization` y expone operaciones de salud. Además, `/profile` compone información de clientes, órdenes y productos actuales.

### Customers

Aísla la información de identidad y del cliente: credenciales, teléfono, direcciones, perfil, carrito almacenado en el modelo, wishlist y resumen. Es el dueño de la autenticación y firma los JWT utilizados por las rutas protegidas.

### Products

Es el dueño del catálogo. Expone el listado de productos con sus categorías y la consulta por identificador. También incluye un seed para cargar productos iniciales.

### Shopping

Es el dueño de las órdenes de compra. Crea órdenes asociadas al usuario autenticado y permite consultar las órdenes de ese usuario. El servicio valida los datos básicos de una orden antes de persistirla.

## 5. Diagrama ASCII de arquitectura

```text
                         Cliente HTTP
                              |
                              v
                       Gateway :8080
                /customer | /products | /shopping
                   /      |       |        \
                  v       v       v         \
        Customers :8000  Products :8002  Shopping :8001
             |                |                |
             v                v                v
       MongoDB customers  MongoDB products  MongoDB shopping
          puerto 27018       puerto 27017      puerto 27019

  GET /profile en el gateway:
  Customers /profile + Shopping /orders + Products /products/:id
```

## 6. Estructura de carpetas del backend

```text
.
├── customers/
│   ├── index.js
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── package.json
│   ├── jest.config.js
│   ├── __tests__/
│   │   ├── unit/
│   │   └── integration/
│   └── src/
│       ├── express-app.js
│       ├── api/
│       │   ├── customer.js
│       │   └── middlewares/auth.js
│       ├── config/index.js
│       ├── database/
│       │   ├── connection.js
│       │   ├── index.js
│       │   ├── models/
│       │   └── repository/
│       ├── services/customer-service.js
│       └── utils/
├── products/
│   └── src/database/
│       ├── models/
│       ├── repository/
│       └── seed/
├── shopping/
│   └── src/database/
│       ├── models/
│       └── repository/
└── gateway/
    ├── index.js
    ├── Dockerfile
    ├── docker-compose.yml
    ├── .env.example
    └── src/
        ├── express-app.js
        ├── compose-profile.js
        ├── config/index.js
        ├── routes/
        └── utils/
```

La estructura completa de `products` y `shopping` sigue el mismo patrón de aplicación, pruebas y configuración de `customers`. El gateway no tiene repositorio ni modelos porque no posee una base propia.

## 7. Estructura de carpetas del frontend

No existe frontend en el workspace actual. No se encontraron carpetas `frontend` o `public`, archivos HTML de la aplicación ni proyectos React, Vue o Angular. Por tanto, no existen páginas, componentes, store ni cliente HTTP que consuma el gateway.

Esta ausencia es una carencia de la entrega si la rúbrica exige una interfaz frontend. En consecuencia, tampoco es posible verificar que un frontend consuma únicamente el gateway: actualmente no hay frontend que consumir.

## 8. Capas de la aplicación

Los microservicios de dominio siguen, con pequeñas variaciones, la separación:

```text
api -> service -> repository -> model
```

- **API** (`src/api`): define las rutas Express, extrae parámetros y cuerpo de la petición, invoca el servicio y delega los errores al middleware. También contiene el middleware JWT en `customers` y `shopping`.
- **Service** (`src/services`): concentra los casos de uso y reglas de negocio, por ejemplo registrar clientes, comprobar credenciales, obtener productos o crear órdenes.
- **Repository** (`src/database/repository`): encapsula las operaciones de persistencia y evita que la capa de rutas acceda directamente a Mongoose.
- **Model** (`src/database/models`): define los esquemas Mongoose. `Customer` y `Address` pertenecen a `customers`, `Product` a `products` y `Order` a `shopping`.

El gateway es una excepción intencional: contiene rutas de proxy y composición, pero no posee capa de persistencia.

## 9. Tecnologías utilizadas

| Tecnología | Propósito comprobado en el código |
| --- | --- |
| Node.js 22 Alpine | Runtime y base de las imágenes Docker. |
| Express 5.2.1 | Servidores HTTP y definición de rutas. |
| Mongoose 9.9.3 | Modelado y acceso a MongoDB. |
| MongoDB 7 | Persistencia de clientes, productos y órdenes. |
| `jsonwebtoken` | Firma y validación de tokens JWT. |
| `bcryptjs` | Hash de contraseñas en `customers` y dependencia de `shopping`. |
| `dotenv` | Carga de variables de entorno. |
| `cors` | Configuración CORS de las aplicaciones. |
| `express-http-proxy` | Proxy del gateway hacia los microservicios. |
| Jest 29.7.0 | Pruebas unitarias y de integración. |
| Supertest 7.1.1 | Pruebas HTTP de las aplicaciones Express. |
| `mongodb-memory-server` | MongoDB efímero para pruebas. |
| Docker y Docker Compose | Empaquetado y ejecución de cada servicio con su MongoDB. |

## 10. Variables de entorno

Los siguientes valores son los definidos en cada `.env.example`. Para desarrollo local, se debe copiar el archivo correspondiente a `.env` dentro de cada servicio.

### Variables de Customers

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `PORT` | `8000` | Puerto HTTP de Customers. |
| `DB_URL` | `mongodb://localhost:27017/customers` | Conexión a MongoDB. |
| `APP_SECRET` | `dev-secret-change-me` | Secreto usado para firmar y validar JWT. |

### Variables de Products

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `PORT` | `8002` | Puerto HTTP de Products. |
| `DB_URL` | `mongodb://localhost:27017/enfasis-i` | Conexión a MongoDB definida en `.env.example`. |
| `APP_SECRET` | `dev-secret-change-me` | Variable configurada por el servicio, aunque sus rutas no exigen JWT. |

En `products/docker-compose.yml`, la base configurada para el contenedor es `mongodb://products-db:27017/products`, por lo que existe una diferencia respecto a `.env.example`.

### Variables de Shopping

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `PORT` | `8001` | Puerto HTTP de Shopping. |
| `DB_URL` | `mongodb://localhost:27017/shopping` | Conexión a MongoDB. |
| `APP_SECRET` | `dev-secret-change-me` | Validación del JWT recibido. |

### Variables de Gateway

| Variable | Ejemplo | Uso |
| --- | --- | --- |
| `PORT` | `8080` | Puerto HTTP del gateway. |
| `CUSTOMERS_URL` | `http://host.docker.internal:8000` | URL de Customers. |
| `PRODUCTS_URL` | `http://host.docker.internal:8002` | URL de Products. |
| `SHOPPING_URL` | `http://host.docker.internal:8001` | URL de Shopping. |

Los `docker-compose.yml` repiten estos valores como configuración de contenedor. Los secretos de ejemplo son únicamente para desarrollo y deben reemplazarse en un entorno real.

## 11. Ejecución desde cero

### Requisitos

- Node.js compatible con la imagen declarada, `node:22-alpine`, si se ejecuta de forma local.
- npm.
- Docker Desktop con Docker Compose.

### Opción recomendada: Docker Compose por servicio

Cada compose se ejecuta desde el directorio de su servicio porque cada uno incluye su propia base MongoDB.

```bash
cd customers
docker compose up --build -d

cd ../products
docker compose up --build -d

cd ../shopping
docker compose up --build -d

cd ../gateway
docker compose up --build -d
```

Los puertos publicados son Customers `8000`, Shopping `8001`, Products `8002` y Gateway `8080`. El gateway usa `host.docker.internal` para llegar a los contenedores de los servicios publicados en el host.

Para cargar el catálogo inicial, con Products en ejecución:

```bash
docker compose exec products npm run seed
```

El comando de seed usa el entorno del contenedor de Products. El archivo `products/src/database/seed/products.js` referencia rutas de imágenes `/images/*.jpg`; esas imágenes no están presentes en este workspace.

### Ejecución local sin Docker

1. Levantar MongoDB para cada servicio.
2. Copiar cada `.env.example` a `.env` y ajustar `DB_URL` y `APP_SECRET`.
3. Instalar dependencias dentro de cada directorio:

```bash
cd customers && npm ci
cd ../products && npm ci
cd ../shopping && npm ci
cd ../gateway && npm ci
```

1. Iniciar cada aplicación con `npm start` o `npm run dev` en terminales separadas.
1. Ejecutar `npm run seed` dentro de `products` cuando la base esté disponible.

## 12. Docker y Docker Compose

Cada `Dockerfile` usa `node:22-alpine`, copia los manifiestos npm, instala dependencias de producción con `npm ci --omit=dev`, copia el código y expone el puerto del servicio. Las dependencias de pruebas no forman parte de la imagen final.

Cada compose de dominio crea dos contenedores: la aplicación y su MongoDB. Además, define un volumen independiente:

- `customers-data`, publicado en el host por el puerto `27018`;
- `products-data`, publicado por el puerto `27017`;
- `shopping-data`, publicado por el puerto `27019`.

El compose del gateway crea solo el contenedor del gateway y añade `host.docker.internal:host-gateway`. Como no hay compose raíz ni dependencias entre los cuatro compose, el arranque completo debe hacerse por separado y en el orden indicado.

## 13. Flujo funcional

El flujo solicitado se puede describir con lo que actualmente implementa el backend:

1. **Registro**: el consumidor envía `POST /customer/signup` con `email`, `password` y `phone`. Customers genera un salt, almacena el hash y devuelve `id` y `token`.
2. **Login**: `POST /customer/login` valida el correo y la contraseña y devuelve un JWT.
3. **Catálogo**: `GET /products` devuelve productos y categorías; `GET /products/:id` devuelve un producto.
4. **Carrito**: el modelo de Customer tiene un campo `cart` y el servicio contiene operaciones relacionadas, pero no existe una ruta HTTP para agregar, modificar o consultar el carrito. Esta etapa no está completa como API.
5. **Orden**: `POST /shopping/order` recibe `txnId`, `items` y `amount`, exige JWT y crea una orden en Shopping. `GET /shopping/orders` devuelve las órdenes del usuario autenticado.
6. **Perfil**: `GET /profile` en el gateway requiere JWT, consulta en paralelo el perfil de Customers y las órdenes de Shopping, y después enriquece cada producto de las órdenes con Products. También devuelve totales, fuentes consultadas y advertencias cuando corresponde.

Las rutas anteriores se consumen a través del gateway anteponiendo los prefijos `/customer`, `/products` y `/shopping`. El flujo de carrito completo y la sincronización de órdenes con el documento Customer no están implementados.

## 14. Tabla de endpoints

### Endpoints del Gateway

| Método | Ruta | Autenticación | Descripción |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Estado del gateway. |
| `GET` | `/health/services` | No | Consulta la salud de Customers, Products y Shopping; devuelve `503` si alguno falla. |
| `GET` | `/profile` | Bearer JWT | Composición de perfil, órdenes y productos actuales. |
| Cualquiera | `/customer/*` | Según destino | Proxy hacia Customers. |
| Cualquiera | `/products/*` | Según destino | Proxy hacia Products. |
| Cualquiera | `/shopping/*` | Según destino | Proxy hacia Shopping. |

### Endpoints de Customers

| Método | Ruta a través del gateway | Autenticación | Cuerpo principal |
| --- | --- | --- | --- |
| `POST` | `/customer/signup` | No | `email`, `password`, `phone`. |
| `POST` | `/customer/login` | No | `email`, `password`. |
| `POST` | `/customer/address` | Bearer JWT | `street`, `postalCode`, `city`, `country`. |
| `GET` | `/customer/profile` | Bearer JWT | Sin cuerpo. |
| `GET` | `/customer/summary` | Bearer JWT | Sin cuerpo. |
| `GET` | `/customer/wishlist` | Bearer JWT | Sin cuerpo. |

### Endpoints de Products

| Método | Ruta a través del gateway | Autenticación | Descripción |
| --- | --- | --- | --- |
| `GET` | `/products` | No | Lista productos y categorías. |
| `GET` | `/products/:id` | No | Busca un producto por ID de MongoDB. |

### Endpoints de Shopping

| Método | Ruta a través del gateway | Autenticación | Cuerpo principal |
| --- | --- | --- | --- |
| `POST` | `/shopping/order` | Bearer JWT | `txnId`, `items`, `amount`. |
| `GET` | `/shopping/orders` | Bearer JWT | Lista las órdenes del usuario. |

Cada elemento de `items` de una orden usa `productId`, `name`, `price` y `quantity`; `productId` y `quantity` son los campos requeridos por el modelo de Order.

## 15. Comunicación entre microservicios

El gateway se comunica con los servicios mediante `express-http-proxy` para las rutas con prefijo. Conserva el encabezado `Authorization`, de modo que Customers y Shopping puedan validar el JWT original.

La composición de `/profile` usa `fetch` y realiza estas llamadas:

```text
GET CUSTOMERS_URL/customer/profile
GET SHOPPING_URL/shopping/orders
GET PRODUCTS_URL/products/:id   (por cada producto de las órdenes)
```

Las dos primeras llamadas se ejecutan en paralelo. La consulta de Products se hace después de conocer los identificadores de las órdenes. El gateway usa un timeout de ocho segundos en esta composición y cinco segundos en los health checks. Si Shopping o Products no responden, puede devolver advertencias y datos parciales; si Customers no responde o el token es inválido, devuelve un error.

No se encontró comunicación directa entre Customers, Products y Shopping fuera del gateway.

## 16. Funcionamiento del gateway

El gateway escucha en el puerto `8080`, registra las rutas de salud y monta tres proxies. Cada proxy conserva el prefijo original al formar la ruta de destino. Los errores de conexión se transforman en un error de gateway. Además, `/health/services` comprueba `/health` en los tres servicios y reporta el estado individual.

`/profile` funciona como una operación de agregación: combina el perfil del cliente, las órdenes y datos actuales del catálogo, e indica si cambió el precio actual de un producto respecto al precio guardado en la orden.

## 17. Seguridad

- **bcrypt**: Customers utiliza `bcryptjs` para generar salt y hash de contraseñas. No devuelve `password` ni `salt` en la representación del cliente.
- **JWT**: Customers firma tokens con `APP_SECRET` y una expiración de un día. Customers y Shopping protegen las rutas privadas con `Authorization: Bearer <token>`.
- **Variables de entorno**: las URL de bases de datos, puertos y secretos se obtienen desde variables de entorno. Los valores de ejemplo y los compose usan `dev-secret-change-me`, que debe cambiarse.
- **Gateway**: propaga el encabezado de autorización al servicio de destino y exige autorización para `/profile`.

Limitaciones de seguridad observadas: CORS está habilitado de forma abierta, no hay rate limiting, bloqueo de intentos, HTTPS, gestión externa de secretos, roles ni autorización por permisos. Además, los puertos de MongoDB están publicados al host en Docker Compose.

## 18. Bases de datos utilizadas

Los tres servicios de dominio utilizan MongoDB 7 mediante Mongoose:

| Servicio | Base configurada en Compose | Contenedor Mongo | Volumen |
| --- | --- | --- | --- |
| Customers | `customers` | `customers-db` | `customers-data` |
| Products | `products` | `products-db` | `products-data` |
| Shopping | `shopping` | `shopping-db` | `shopping-data` |

Esta separación se verifica en los tres `docker-compose.yml`: cada servicio posee su contenedor, URL lógica y volumen propios. El gateway no utiliza base de datos.

## 19. Frontend

El frontend no está presente en el repositorio actual. Por ello:

- **Páginas**: no existen.
- **Componentes**: no existen.
- **Store**: no existe.
- **Integración con gateway**: no existe código cliente; no se puede afirmar que un frontend consuma únicamente `http://localhost:8080`.

La parte disponible para consumo es la API del gateway documentada en este archivo. La implementación de un frontend y la comprobación de que no llame directamente a `8000`, `8001` o `8002` quedan pendientes.

## 20. Pruebas

Customers, Products y Shopping tienen pruebas unitarias y de integración. Usan Jest y Supertest; las pruebas de integración emplean `mongodb-memory-server` cuando corresponde. El gateway no tiene pruebas automatizadas en el repositorio.

Comandos definidos en `package.json`:

### Comandos de Customers

```bash
npm start
npm run dev
npm test
npm run test:unit
npm run test:integration
```

### Comandos de Products

```bash
npm start
npm run dev
npm run seed
npm test
npm run test:unit
npm run test:integration
```

### Comandos de Shopping

```bash
npm start
npm run dev
npm test
npm run test:unit
npm run test:integration
```

### Comandos de Gateway

```bash
npm start
npm run dev
```

No se encontraron scripts de pruebas en `gateway/package.json`. La cobertura existente incluye registro, login, rutas protegidas, perfil y dirección, productos, creación y consulta de órdenes y errores de servicio o repositorio. No cubre el proxy, los health checks, `/profile`, la propagación de autorización ni las respuestas parciales del gateway.

## 21. Posibles mejoras

1. Crear un frontend real con páginas de registro, login, catálogo, carrito, checkout, órdenes y perfil.
2. Hacer que el frontend consuma exclusivamente el gateway y agregar pruebas que verifiquen ese contrato.
3. Exponer endpoints de carrito y conectar la etapa carrito del flujo con Shopping.
4. Añadir un compose raíz con redes, dependencias y health checks para levantar toda la plataforma con un comando.
5. Agregar pruebas unitarias y de integración para el gateway.
6. Unificar el nombre de la base de Products entre `.env.example` y Docker Compose.
7. Incorporar validación de esquemas de entrada, rate limiting, HTTPS, roles y gestión segura de secretos.
8. Evitar publicar MongoDB al host en despliegues de producción.
9. Añadir documentación OpenAPI y ejemplos de solicitudes y respuestas.
10. Definir una estrategia de sincronización entre órdenes de Shopping y cualquier resumen persistido en Customers.
11. Incluir las imágenes referenciadas por el seed o cambiar esas referencias por recursos disponibles.

## 22. Bitácora de depuración e integración

La siguiente bitácora resume los hallazgos verificables durante la inspección del repositorio:

| Hallazgo | Evidencia | Impacto |
| --- | --- | --- |
| El documento original se llama `REAME.md` y solo contiene una descripción mínima con errores ortográficos. | Archivo raíz `REAME.md`. | La documentación de entrega estaba incompleta; este archivo la reemplaza como `README.md`. |
| El gateway enruta los tres servicios y reenvía `Authorization`. | `gateway/src/routes/index.js`. | Permite un punto de entrada común para las API protegidas. |
| `/profile` compone tres fuentes y maneja advertencias. | `gateway/src/compose-profile.js`. | Existe integración entre servicios a través del gateway. |
| El carrito aparece en el modelo y en el servicio de Customers, pero no en `src/api/customer.js`. | Rutas de Customers. | El flujo de carrito no está disponible como endpoint. |
| Cada dominio tiene MongoDB y volumen propios. | Tres `docker-compose.yml`. | Se cumple la separación de persistencia por servicio. |
| No hay aplicación frontend ni compose raíz. | Inventario completo del workspace. | La rúbrica de frontend y la orquestación total quedan incompletas. |
| Products tiene una discrepancia de `DB_URL` entre `.env.example` y Compose. | `products/.env.example` y `products/docker-compose.yml`. | Puede provocar que desarrollo local y Docker usen nombres de base distintos. |

## 23. Estado de cumplimiento de la rúbrica

| Requisito | Estado actual |
| --- | --- |
| Microservicios de Gateway, Customers, Products y Shopping | Cumplido en backend. |
| Separación de bases de datos por servicio | Cumplido. |
| Dockerfile, Compose y `.env.example` por servicio | Cumplido para los cuatro directorios. |
| API Gateway y comunicación entre servicios | Cumplido parcialmente: existe proxy y composición, sin compose raíz. |
| Registro, login, catálogo y órdenes | Cumplido en backend. |
| Carrito funcional mediante API | No cumplido: no hay rutas HTTP de carrito. |
| Frontend, páginas, componentes y store | No cumplido: no existe frontend. |
| Frontend consumiendo únicamente el gateway | No verificable y no cumplido actualmente por ausencia de frontend. |
| JWT y hash de contraseñas | Cumplido en las rutas correspondientes. |
| Pruebas del gateway | No cumplido: no hay pruebas del gateway. |
| Documentación README | Cumplido mediante este archivo; el documento anterior era `REAME.md`. |

## 24. Autores

Los `package.json` del proyecto no declaran autores (`author` está vacío). Por tanto, no es posible identificar autores reales a partir del código disponible. Este apartado debe completarse con los nombres institucionales de los integrantes antes de la entrega académica.

## 25. Licencia

Los cuatro `package.json` declaran la licencia `ISC`. No se encontró un archivo de licencia independiente en la raíz. La licencia efectiva declarada por los servicios es, por tanto, ISC; cualquier requisito institucional adicional debe añadirse de forma explícita.

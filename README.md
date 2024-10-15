# Ordering App - Microservices Architecture

This project is a microservices-based ordering system built with NestJS, RabbitMQ, and MongoDB. The system consists of four main services:

- **Orders Service**: Manages orders and order statuses.
- **Billing Service**: Handles payments.
- **Inventory Service**: Manages product inventory and reservations.
- **Shipping Service**: Manages order shipping and delivery.
Each microservice communicates asynchronously through RabbitMQ for event-driven architecture and uses MongoDB to store its own data. The system is orchestrated using Docker Compose.

## Services Overview

1. **Orders Service**: Central service managing the order creation, updates, and cancellation. It handles interactions with other services by emitting and consuming RabbitMQ events.

2. **Inventory Service**: Manages stock levels and reserves items for orders. It listens for order creation events and emits inventory availability statuses.

3. **Billing Service**: Processes payments and handles refunds upon order cancellation. It reacts to order confirmation events and emits payment success or failure events.

4. **Shipping Service**: Manages shipping status updates. It listens for payment confirmations and coordinates the shipment process.

## Getting Started

### Prerequisites
Ensure you have the following installed:

- Docker
- Docker Compose

### Setup and Running the Application
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ordering-app.git
   cd ordering-app
   ```

2. Create .env files for each service based on the provided examples.

Example .env for Orders Service:
```bash
MONGODB_URI=mongodb://root:password123@mongo:27017
PORT=3000
RABBIT_MQ_URI=amqp://rabbitmq:5672
RABBIT_MQ_ORDERS_QUEUE=orders
RABBIT_MQ_INVENTORY_QUEUE=inventory
RABBIT_MQ_BILLING_QUEUE=billing
RABBIT_MQ_SHIPPING_QUEUE=shipping
```

Example .env for Billing Service:
```bash
PORT=3002
MONGODB_URI=mongodb://root:password123@mongo:27017
RABBIT_MQ_URI=amqp://rabbitmq:5672
RABBIT_MQ_ORDERS_QUEUE=orders
RABBIT_MQ_BILLING_QUEUE=billing
```

3. Start services with Docker Compose:
```bash
docker-compose up --build
```

This will start the following services:

- **MongoDB**: A NoSQL database used by all services.
- **RabbitMQ**: Message broker for event-driven communication.
- **Orders, Billing, Inventory, and Shipping services** running in their respective containers.

Each service will automatically connect to RabbitMQ and MongoDB using the configurations provided in .env files.

4. Running individual services locally

You can also run each service individually if needed. Make sure MongoDB and RabbitMQ are running (either in containers or locally), and then use the following commands:
```bash
# Orders Service
npm run start orders

# Billing Service
npm run start billing

# Inventory Service
npm run start inventory

# Shipping Service
npm run start shipping
```

5. Accessing RabbitMQ Management

RabbitMQ has a management interface available at http://localhost:15672.
Use the following default credentials to log in:

- Username: guest
- Password: guest

6. Accessing MongoDB
You can connect to MongoDB using a MongoDB client such as MongoDB Compass or from the terminal:
```bash
mongo mongodb://root:password123@localhost:27017
```

### Accessing Swagger API Docs
Each service exposes its own Swagger UI for API documentation at the following URLs:

- Orders Service: http://localhost:3000/api
- Inventory Service: http://localhost:3001/api
- Billing Service: http://localhost:3002/api
- Shipping Service: http://localhost:3003/api

### Stopping the Application

To stop all containers, run:
```bash
docker-compose down
```

# Real-World Interview Scenarios - Part 3

Final set of advanced real-world scenarios for technical interviews.

---

## 11. API Security Best Practices

### Problem
How to secure your API from common attacks?

### Key Security Measures

**1. SQL Injection Prevention**
```javascript
// ❌ Vulnerable to SQL injection
app.get('/api/users', async (req, res) => {
  const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  const users = await db.query(query);  // Dangerous!
  // Input: ?name=admin' OR '1'='1
  // Query: SELECT * FROM users WHERE name = 'admin' OR '1'='1'
  // Returns all users!
});

// ✅ Use parameterized queries
app.get('/api/users', async (req, res) => {
  const query = 'SELECT * FROM users WHERE name = $1';
  const users = await db.query(query, [req.query.name]);  // Safe!
  res.json(users);
});

// ✅ With ORM (Mongoose/Sequelize) - automatically protected
app.get('/api/users', async (req, res) => {
  const users = await User.find({ name: req.query.name });  // Safe
  res.json(users);
});
```

**2. XSS (Cross-Site Scripting) Prevention**
```javascript
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

// Security headers
app.use(helmet());

// Data sanitization against XSS
app.use(xss());

// Prevent NoSQL injection
app.use(mongoSanitize());

// Escape user input before rendering
const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

**3. CSRF (Cross-Site Request Forgery) Protection**
```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Send CSRF token to client
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Verify token on POST
app.post('/api/transfer', (req, res) => {
  // CSRF middleware automatically verifies token
  // Rejects if token missing or invalid
  processTransfer(req.body);
  res.json({ success: true });
});

// Client must include token:
// <input type="hidden" name="_csrf" value="{{csrfToken}}">
```

**4. Rate Limiting (Prevent Brute Force)**
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // Only 5 login attempts
  skipSuccessfulRequests: true
});

app.post('/api/login', authLimiter, async (req, res) => {
  // Login logic
});
```

**5. Input Validation**
```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().min(18).max(120)
});

app.post('/api/users', async (req, res) => {
  // Validate input
  const { error, value } = userSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ 
      error: error.details[0].message 
    });
  }
  
  // Use validated data
  const user = await User.create(value);
  res.json(user);
});
```

**6. Authentication Security**
```javascript
const bcrypt = require('bcrypt');

// Hash passwords
app.post('/api/register', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
  const user = await User.create({
    email: req.body.email,
    password: hashedPassword  // Never store plain text!
  });
  
  res.json({ id: user.id });
});

// Verify passwords
app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const valid = await bcrypt.compare(req.body.password, user.password);
  
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, SECRET);
  res.json({ token });
});
```

**7. Secure Headers & HTTPS**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

**Interview Answer:**
> "For API security, I implement multiple layers: **parameterized queries** prevent SQL injection, **helmet** adds security headers, **XSS sanitization** cleans user input, **CSRF tokens** prevent unauthorized requests, **rate limiting** prevents brute force, **Joi validation** ensures data integrity, and **bcrypt** for password hashing. I also enforce **HTTPS**, use **JWT** with short expiration, and never expose sensitive data in error messages."

---

## 12. Performance Monitoring & Optimization

### Problem
How to identify and fix performance bottlenecks in production?

### Monitoring Strategy

**1. Response Time Tracking**
```javascript
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  const stat = `${req.method}.${req.url.split('/')[1]}.${res.statusCode}`;
  
  // Log slow requests
  if (time > 1000) {  // > 1 second
    logger.warn('Slow request', {
      method: req.method,
      url: req.url,
      duration: `${time}ms`,
      status: res.statusCode
    });
  }
  
  // Send to metrics service (Prometheus, DataDog, etc.)
  metrics.timing(stat, time);
}));
```

**2. Database Query Monitoring**
```javascript
// Mongoose slow query logging
mongoose.set('debug', (collectionName, method, query, doc) => {
  const startTime = Date.now();
  
  return () => {
    const duration = Date.now() - startTime;
    
    if (duration > 100) {  // Slow query > 100ms
      logger.warn('Slow query', {
        collection: collectionName,
        method,
        query: JSON.stringify(query),
        duration: `${duration}ms`
      });
    }
  };
});

// PostgreSQL query logging
const { Client } = require('pg');

Client.prototype._query = Client.prototype.query;
Client.prototype.query = function(...args) {
  const start = Date.now();
  
  const result = this._query.apply(this, args);
  
  result.then(() => {
    const duration = Date.now() - start;
    if (duration > 100) {
      logger.warn('Slow SQL query', {
        query: args[0],
        duration: `${duration}ms`
      });
    }
  });
  
  return result;
};
```

**3. Memory Monitoring**
```javascript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  
  logger.info('Memory usage', {
    rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
    external: `${Math.round(usage.external / 1024 / 1024)} MB`
  });
  
  // Alert if memory too high
  if (usage.heapUsed > 500 * 1024 * 1024) {  // > 500MB
    logger.error('High memory usage detected');
  }
}, 60000);  // Every minute
```

**4. APM Integration (Application Performance Monitoring)**
```javascript
// New Relic
require('newrelic');

// Or DataDog
const tracer = require('dd-trace').init();

// Or Elastic APM
const apm = require('elastic-apm-node').start({
  serviceName: 'my-api',
  serverUrl: 'http://apm-server:8200'
});

// Automatically tracks:
// - Response times
// - Database queries
// - External HTTP calls
// - Error rates
// - Memory usage
```

**5. Custom Metrics**
```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code']
});

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_ms',
  help: 'Duration of DB queries in ms',
  labelNames: ['collection', 'operation']
});

const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users'
});

// Middleware to track
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Expose metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

**6. Performance Optimization Checklist**
```javascript
// ✅ Database indexes
await User.collection.createIndex({ email: 1 });
await Order.collection.createIndex({ userId: 1, createdAt: -1 });

// ✅ Pagination (avoid skip)
const users = await User.find({ _id: { $gt: lastId } }).limit(20);

// ✅ Projection (only needed fields)
const users = await User.find({}, { name: 1, email: 1 });

// ✅ Caching
const cached = await redis.get(key);
if (cached) return cached;

// ✅ Compression
const compression = require('compression');
app.use(compression());

// ✅ Connection pooling
mongoose.connect(url, { poolSize: 10 });

// ✅ Async operations
await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchProducts()
]);

// ✅ Avoid N+1 queries
const users = await User.find().populate('orders');  // Good
// vs
for (const user of users) {
  user.orders = await Order.find({ userId: user.id });  // Bad (N+1)
}
```

**Interview Answer:**
> "I monitor performance using **APM tools** (New Relic, DataDog) for automatic tracking. I log **slow queries** (>100ms) and **slow requests** (>1s) with full context. For custom metrics, I use **Prometheus** to track business metrics. To optimize, I ensure **database indexes** exist, use **caching** for hot data, **avoid N+1 queries**, implement **pagination**, use **compression**, and run **connection pooling**. I set up alerts for memory usage, error rates, and response times."

---

## 13. Microservices Communication Patterns

### Problem
How do services communicate in a microservices architecture?

### Patterns

**1. REST API (Synchronous)**
```javascript
// User Service
app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// Order Service needs user data
const axios = require('axios');

app.post('/api/orders', async (req, res) => {
  // Call User Service
  const userResponse = await axios.get(
    `http://user-service/api/users/${req.body.userId}`
  );
  
  const user = userResponse.data;
  
  const order = await Order.create({
    userId: user.id,
    userName: user.name,  // Denormalize for performance
    items: req.body.items
  });
  
  res.json(order);
});
```

**2. Event-Driven (Asynchronous)**
```javascript
// User Service - Publishes event
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();

app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  
  // Publish event
  await producer.send({
    topic: 'user-created',
    messages: [{
      value: JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: new Date()
      })
    }]
  });
  
  res.json(user);
});

// Email Service - Consumes event
const consumer = kafka.consumer({ groupId: 'email-service' });

await consumer.subscribe({ topic: 'user-created' });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());
    
    await sendWelcomeEmail(event.email);
    
    console.log('Welcome email sent to', event.email);
  }
});
```

**3. Service Mesh Pattern**
```javascript
// API Gateway routes to services
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Route to User Service
app.use('/api/users', createProxyMiddleware({
  target: 'http://user-service:3000',
  changeOrigin: true
}));

// Route to Order Service
app.use('/api/orders', createProxyMiddleware({
  target: 'http://order-service:3001',
  changeOrigin: true
}));

// Route to Product Service
app.use('/api/products', createProxyMiddleware({
  target: 'http://product-service:3002',
  changeOrigin: true
}));

app.listen(8080);  // Single entry point
```

**4. Circuit Breaker (Prevent Cascade Failures)**
```javascript
const CircuitBreaker = require('opossum');

// Wrap external service call
async function callUserService(userId) {
  const response = await axios.get(`http://user-service/api/users/${userId}`);
  return response.data;
}

const breaker = new CircuitBreaker(callUserService, {
  timeout: 3000,  // 3 second timeout
  errorThresholdPercentage: 50,  // Open circuit if 50% fail
  resetTimeout: 30000  // Try again after 30 seconds
});

// Use circuit breaker
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  
  try {
    // Try to get user data
    const user = await breaker.fire(order.userId);
    res.json({ ...order, user });
  } catch (error) {
    // Circuit open or service down
    // Return order without user data
    res.json({ ...order, user: null });
  }
});

// Events
breaker.on('open', () => {
  logger.error('Circuit breaker opened - User service down');
});

breaker.on('halfOpen', () => {
  logger.info('Circuit breaker half-open - Testing user service');
});
```

**5. Saga Pattern (Distributed Transactions)**
```javascript
// Choreography-based Saga for Order Creation

// Order Service
app.post('/api/orders', async (req, res) => {
  const order = await Order.create({
    ...req.body,
    status: 'pending'
  });
  
  // Publish OrderCreated event
  await publisher.send({
    topic: 'order-created',
    messages: [{ value: JSON.stringify(order) }]
  });
  
  res.json(order);
});

// Payment Service - Listens to OrderCreated
consumer.run({
  eachMessage: async ({ message }) => {
    const order = JSON.parse(message.value);
    
    try {
      const payment = await processPayment(order);
      
      // Success - Publish PaymentCompleted
      await publisher.send({
        topic: 'payment-completed',
        messages: [{ value: JSON.stringify({ orderId: order.id, payment }) }]
      });
    } catch (error) {
      // Failure - Publish PaymentFailed
      await publisher.send({
        topic: 'payment-failed',
        messages: [{ value: JSON.stringify({ orderId: order.id, error }) }]
      });
    }
  }
});

// Inventory Service - Listens to PaymentCompleted
consumer.run({
  eachMessage: async ({ message }) => {
    const { orderId } = JSON.parse(message.value);
    
    try {
      await reserveInventory(orderId);
      
      await publisher.send({
        topic: 'inventory-reserved',
        messages: [{ value: JSON.stringify({ orderId }) }]
      });
    } catch (error) {
      // Compensating transaction - Refund payment
      await publisher.send({
        topic: 'inventory-failed',
        messages: [{ value: JSON.stringify({ orderId, error }) }]
      });
    }
  }
});

// Order Service - Listens to all outcomes
consumer.run({
  eachMessage: async ({ topic, message }) => {
    const data = JSON.parse(message.value);
    
    if (topic === 'inventory-reserved') {
      await Order.update(data.orderId, { status: 'confirmed' });
    } else if (topic === 'payment-failed' || topic === 'inventory-failed') {
      await Order.update(data.orderId, { status: 'failed' });
    }
  }
});
```

**Interview Answer:**
> "In microservices, I use **REST for synchronous** point-to-point communication with **circuit breakers** to prevent cascade failures. For async operations, I use **event-driven architecture** with Kafka - services publish events, others consume them. This **decouples** services. For distributed transactions, I implement **Saga pattern** - each service completes its operation and publishes event. If any step fails, **compensating transactions** undo previous steps. I use **API Gateway** as single entry point for clients."

---

## 14. Database Schema Design Trade-offs

### Problem
How to design database schema for real-world applications?

### Strategy: Denormalization vs Normalization

**Scenario: E-commerce Order System**

**Option 1: Fully Normalized (Many Joins)**
```javascript
// Users table
{
  _id: ObjectId("user1"),
  name: "John Doe",
  email: "john@example.com"
}

// Products table
{
  _id: ObjectId("prod1"),
  name: "iPhone 14",
  price: 999
}

// Orders table
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),  // Reference
  createdAt: Date
}

// OrderItems table
{
  _id: ObjectId("item1"),
  orderId: ObjectId("order1"),  // Reference
  productId: ObjectId("prod1"),  // Reference
  quantity: 2
}

// To get order details - 3 JOINS needed!
const order = await Order.findById(orderId)
  .populate('userId')
  .populate({
    path: 'items',
    populate: { path: 'productId' }
  });

// Slow for large datasets
```

**Option 2: Denormalized (Snapshot Data)**
```javascript
// Orders collection (MongoDB)
{
  _id: ObjectId("order1"),
  // User data snapshot
  user: {
    id: ObjectId("user1"),
    name: "John Doe",
    email: "john@example.com"
  },
  // Products snapshot (price at time of order)
  items: [
    {
      productId: ObjectId("prod1"),
      name: "iPhone 14",
      price: 999,  // Price when ordered (may change later)
      quantity: 2
    }
  ],
  total: 1998,
  status: "confirmed",
  createdAt: Date
}

// Single query - FAST!
const order = await Order.findById(orderId);  // No joins needed
```

**Hybrid Approach (Best for Most Cases)**
```javascript
// Orders collection
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),  // Reference for querying
  
  // Denormalized for display
  userSnapshot: {
    name: "John Doe",
    email: "john@example.com"
  },
  
  items: [
    {
      productId: ObjectId("prod1"),  // Reference
      nameSnapshot: "iPhone 14",
      priceSnapshot: 999,  // Price at order time
      quantity: 2
    }
  ],
  
  total: 1998,
  status: "confirmed",
  createdAt: Date
}

// Fast reads (no joins for display)
// Can still query by userId
// Can join products if needed (for updates)
```

**When to Denormalize:**
- Read-heavy workload
- Data doesn't change often
- Joins are expensive
- Need consistent snapshot (historical data)

**When to Normalize:**
- Write-heavy workload
- Data changes frequently
- Need single source of truth
- Disk space is limited

**Interview Answer:**
> "Schema design depends on use case. For **read-heavy** apps like e-commerce orders, I **denormalize** - store user name, product name, and price in order document. This creates a **snapshot** that won't change even if product price updates later. For **write-heavy** data like user profiles, I **normalize** to avoid update anomalies. Often I use a **hybrid approach** - store references for querying but denormalize key fields for display. MongoDB is flexible for denormalization; SQL requires careful normalization."

---

## Summary: Interview Answer Template

For any real-world scenario question:

1. **Understand the Problem**
   - "Let me clarify the requirements..."
   - Ask about scale, constraints, priorities

2. **State the Challenge**
   - "The main challenge is..."
   - Identify bottlenecks

3. **Propose Solution**
   - "I would use [technology/pattern] because..."
   - Explain reasoning

4. **Discuss Trade-offs**
   - "This approach gives us... but means we have to..."
   - Show you understand pros/cons

5. **Scale Considerations**
   - "For 1000 users this works, but for 1M users we'd need..."
   - Think about growth

6. **Alternative Approaches**
   - "Another option would be... which is better if..."
   - Show breadth of knowledge

**Example:**
> "For handling large datasets, the main challenge is memory management. I would use **streaming** because it processes data incrementally without loading everything into memory. This gives us **constant memory usage** regardless of data size, but means we need to handle **backpressure** and can't do random access. For 1000 records, loading all is fine, but for 10M records, streams are essential. An alternative would be **batch processing**, which is simpler but slower."

---

**End of Real-World Scenarios Guide**

These scenarios cover the most commonly asked production-level questions. Practice explaining each solution out loud before your interview!

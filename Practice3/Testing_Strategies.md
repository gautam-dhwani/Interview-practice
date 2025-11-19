# Testing Strategies

## 1. Unit Testing with Jest

### Explanation
Unit tests verify individual functions/modules in isolation. Dependencies are mocked to test only the unit's logic.

### Key Concepts
- **Isolation**: Test one function at a time
- **Mocking**: Replace dependencies with fake implementations
- **AAA Pattern**: Arrange, Act, Assert
- **Fast**: Should run in milliseconds

### Real-Time Example
**Testing a Calculator**: Test addition function separately from multiplication. Mock external APIs so tests don't depend on network.

### Code Block
```javascript
// 1. Basic Unit Test
// math.js
function add(a, b) {
  return a + b;
}

function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

module.exports = { add, divide };

// math.test.js
const { add, divide } = require('./math');

describe('Math utilities', () => {
  // Test case
  test('adds 1 + 2 to equal 3', () => {
    expect(add(1, 2)).toBe(3);
  });
  
  test('adds negative numbers', () => {
    expect(add(-1, -2)).toBe(-3);
  });
  
  test('divides two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  test('throws error on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });
});

// Run: npm test

// 2. Testing Async Functions
// userService.js
async function getUserById(id) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}

module.exports = { getUserById };

// userService.test.js
const { getUserById } = require('./userService');

// Mock fetch
global.fetch = jest.fn();

describe('getUserById', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('fetches user successfully', async () => {
    const mockUser = { id: 1, name: 'John' };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser
    });
    
    const user = await getUserById(1);
    
    expect(fetch).toHaveBeenCalledWith('/api/users/1');
    expect(user).toEqual(mockUser);
  });
  
  test('throws error when user not found', async () => {
    fetch.mockResolvedValueOnce({
      ok: false
    });
    
    await expect(getUserById(999)).rejects.toThrow('User not found');
  });
});

// 3. Mocking Modules
// emailService.js
const nodemailer = require('nodemailer');

async function sendEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({ /* config */ });
  return transporter.sendMail({ to, subject, text: body });
}

module.exports = { sendEmail };

// emailService.test.js
jest.mock('nodemailer');
const nodemailer = require('nodemailer');
const { sendEmail } = require('./emailService');

describe('sendEmail', () => {
  test('sends email with correct parameters', async () => {
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
    
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail
    });
    
    await sendEmail('test@example.com', 'Hello', 'Test message');
    
    expect(mockSendMail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Hello',
      text: 'Test message'
    });
  });
});

// 4. Real Interview Example: Testing Express Route Handler
// userController.js
const User = require('./models/User');

async function createUser(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const user = await User.create({ email, password });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { createUser };

// userController.test.js
jest.mock('./models/User');
const User = require('./models/User');
const { createUser } = require('./userController');

describe('createUser', () => {
  let req, res;
  
  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  test('returns 400 if email missing', async () => {
    req.body = { password: '123456' };
    
    await createUser(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ 
      error: 'Email and password required' 
    });
  });
  
  test('returns 409 if user exists', async () => {
    req.body = { email: 'test@example.com', password: '123456' };
    User.findOne.mockResolvedValue({ email: 'test@example.com' });
    
    await createUser(req, res);
    
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ 
      error: 'User already exists' 
    });
  });
  
  test('creates user successfully', async () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    req.body = { email: 'test@example.com', password: '123456' };
    
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(mockUser);
    
    await createUser(req, res);
    
    expect(User.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: '123456'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockUser);
  });
});

// 5. Jest Matchers
test('common matchers', () => {
  expect(2 + 2).toBe(4);              // Exact equality
  expect({ name: 'John' }).toEqual({ name: 'John' });  // Deep equality
  expect('Hello').not.toBe('World');
  expect(null).toBeNull();
  expect(undefined).toBeUndefined();
  expect(true).toBeTruthy();
  expect(0).toBeFalsy();
  expect(5).toBeGreaterThan(3);
  expect('team').toMatch(/tea/);
  expect(['apple', 'banana']).toContain('apple');
});

// 6. Setup and Teardown
describe('Database operations', () => {
  beforeAll(async () => {
    // Connect to test database (runs once before all tests)
    await connectDB();
  });
  
  afterAll(async () => {
    // Disconnect (runs once after all tests)
    await disconnectDB();
  });
  
  beforeEach(async () => {
    // Clear data before each test
    await User.deleteMany({});
  });
  
  test('creates user', async () => {
    // Test logic
  });
});
```

---

## 2. Integration Testing

### Explanation
Integration tests verify that multiple components/modules work together correctly. Tests real interactions between components.

### Key Concepts
- **Multiple Units**: Tests interaction between modules
- **Real Dependencies**: Use actual database, minimal mocking
- **Slower**: Takes longer than unit tests
- **E2E-lite**: Tests API endpoints with database

### Real-Time Example
**Testing Checkout Flow**: Unit test = verify cart calculation. Integration test = create order + update inventory + send email, all working together.

### Code Block
```javascript
// 1. API Integration Test with Supertest
const request = require('supertest');
const app = require('./app');
const mongoose = require('mongoose');
const User = require('./models/User');

describe('User API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_DB_URL);
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
  });
  
  test('POST /api/users - creates new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
    
    // Verify in database
    const user = await User.findOne({ email: 'test@example.com' });
    expect(user).toBeTruthy();
  });
  
  test('POST /api/users - returns 409 for duplicate email', async () => {
    // Create user first
    await User.create({ email: 'test@example.com', password: 'pass123' });
    
    // Try to create again
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(409);
    
    expect(response.body.error).toBe('User already exists');
  });
  
  test('GET /api/users/:id - returns user', async () => {
    const user = await User.create({ 
      email: 'test@example.com', 
      password: 'pass123' 
    });
    
    const response = await request(app)
      .get(`/api/users/${user._id}`)
      .expect(200);
    
    expect(response.body.email).toBe('test@example.com');
  });
  
  test('DELETE /api/users/:id - deletes user', async () => {
    const user = await User.create({ 
      email: 'test@example.com', 
      password: 'pass123' 
    });
    
    await request(app)
      .delete(`/api/users/${user._id}`)
      .expect(204);
    
    // Verify deleted
    const deleted = await User.findById(user._id);
    expect(deleted).toBeNull();
  });
});

// 2. Testing Authentication Flow
describe('Authentication Flow', () => {
  let accessToken;
  
  test('User can register', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(201);
    
    expect(response.body).toHaveProperty('accessToken');
  });
  
  test('User can login', async () => {
    // Create user
    await User.create({ 
      email: 'test@example.com', 
      password: await bcrypt.hash('password123', 10)
    });
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200);
    
    expect(response.body).toHaveProperty('accessToken');
    accessToken = response.body.accessToken;
  });
  
  test('User can access protected route with token', async () => {
    await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
  
  test('Protected route fails without token', async () => {
    await request(app)
      .get('/api/profile')
      .expect(401);
  });
});

// 3. Real Interview Example: E-commerce Order Flow
describe('Order Creation Flow', () => {
  let user, product;
  
  beforeEach(async () => {
    user = await User.create({ 
      email: 'customer@example.com', 
      password: 'pass123',
      wallet: 1000
    });
    
    product = await Product.create({
      name: 'iPhone',
      price: 999,
      stock: 10
    });
  });
  
  test('Complete order flow', async () => {
    // 1. Create order
    const orderResponse = await request(app)
      .post('/api/orders')
      .send({
        userId: user._id,
        items: [
          { productId: product._id, quantity: 2 }
        ]
      })
      .expect(201);
    
    expect(orderResponse.body.total).toBe(1998);
    expect(orderResponse.body.status).toBe('pending');
    
    // 2. Verify inventory decreased
    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.stock).toBe(8);  // 10 - 2
    
    // 3. Verify wallet decreased
    const updatedUser = await User.findById(user._id);
    expect(updatedUser.wallet).toBe(0);  // 1000 - 1998 (insufficient, should fail)
  });
  
  test('Order fails with insufficient stock', async () => {
    await request(app)
      .post('/api/orders')
      .send({
        userId: user._id,
        items: [
          { productId: product._id, quantity: 20 }  // Only 10 in stock
        ]
      })
      .expect(400);
    
    // Verify stock unchanged
    const product2 = await Product.findById(product._id);
    expect(product2.stock).toBe(10);
  });
});
```

---

## 3. Test-Driven Development (TDD)

### Explanation
TDD is a development approach where you write tests before writing code. Follow Red-Green-Refactor cycle.

### Key Concepts
- **Red**: Write failing test first
- **Green**: Write minimal code to pass test
- **Refactor**: Improve code while keeping tests passing
- **Benefits**: Better design, fewer bugs, living documentation

### Real-Time Example
**Building a House**: TDD is like creating blueprint (test) before construction (code). Ensures house meets requirements.

### Code Block
```javascript
// TDD Cycle Example: Building a Shopping Cart

// STEP 1: RED - Write failing test
// cart.test.js
const Cart = require('./cart');

describe('Shopping Cart', () => {
  test('starts with empty items', () => {
    const cart = new Cart();
    expect(cart.items).toEqual([]);
    expect(cart.getTotal()).toBe(0);
  });
});

// Run test: FAILS (Cart doesn't exist yet)

// STEP 2: GREEN - Write minimal code to pass
// cart.js
class Cart {
  constructor() {
    this.items = [];
  }
  
  getTotal() {
    return 0;
  }
}

module.exports = Cart;

// Run test: PASSES ✅

// STEP 3: RED - Add new failing test
test('can add items to cart', () => {
  const cart = new Cart();
  cart.addItem({ name: 'Apple', price: 1.99, quantity: 2 });
  
  expect(cart.items.length).toBe(1);
  expect(cart.getTotal()).toBe(3.98);
});

// Run test: FAILS

// STEP 4: GREEN - Implement addItem
class Cart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  getTotal() {
    return this.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }
}

// Run test: PASSES ✅

// STEP 5: RED - Test edge cases
test('handles zero quantity', () => {
  const cart = new Cart();
  cart.addItem({ name: 'Apple', price: 1.99, quantity: 0 });
  expect(cart.getTotal()).toBe(0);
});

test('can remove items', () => {
  const cart = new Cart();
  cart.addItem({ id: 1, name: 'Apple', price: 1.99, quantity: 2 });
  cart.removeItem(1);
  
  expect(cart.items.length).toBe(0);
  expect(cart.getTotal()).toBe(0);
});

// Run test: FAILS

// STEP 6: GREEN - Implement removeItem
class Cart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
  }
  
  getTotal() {
    return this.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  }
}

// Run test: PASSES ✅

// STEP 7: REFACTOR - Improve code quality
class Cart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    if (!item || item.quantity <= 0) {
      throw new Error('Invalid item');
    }
    this.items.push(item);
  }
  
  removeItem(id) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error('Item not found');
    }
    this.items.splice(index, 1);
  }
  
  getTotal() {
    return this.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );
  }
  
  clear() {
    this.items = [];
  }
  
  getItemCount() {
    return this.items.reduce((count, item) => 
      count + item.quantity, 0
    );
  }
}

// All tests still pass ✅

// Real Interview Example: TDD for User Service
describe('UserService', () => {
  // 1. Test creation
  test('creates user with valid data', async () => {
    const userService = new UserService();
    const user = await userService.create({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(user).toHaveProperty('id');
    expect(user.email).toBe('test@example.com');
    expect(user.password).not.toBe('password123');  // Should be hashed
  });
  
  // 2. Test validation
  test('throws error for invalid email', async () => {
    const userService = new UserService();
    await expect(
      userService.create({ email: 'invalid', password: 'pass123' })
    ).rejects.toThrow('Invalid email');
  });
  
  // 3. Test duplicate
  test('throws error for duplicate email', async () => {
    const userService = new UserService();
    await userService.create({ email: 'test@example.com', password: 'pass' });
    
    await expect(
      userService.create({ email: 'test@example.com', password: 'pass' })
    ).rejects.toThrow('Email already exists');
  });
});
```

---

## 4. Mocking Best Practices

### Explanation
Mocks replace real dependencies with controlled test doubles. Allows testing in isolation without external dependencies.

### Key Concepts
- **jest.fn()**: Mock function
- **jest.mock()**: Mock entire module
- **Spy**: Watch real function calls
- **Stub**: Predefined responses

### Real-Time Example
**Movie Rehearsal**: Actors practice with stand-ins (mocks) before filming with real actors. Stand-ins are predictable and always available.

### Code Block
```javascript
// 1. Mock Functions
const mockCallback = jest.fn(x => x + 1);

[1, 2, 3].forEach(mockCallback);

// Verify function was called
expect(mockCallback).toHaveBeenCalledTimes(3);
expect(mockCallback).toHaveBeenCalledWith(1);
expect(mockCallback).toHaveBeenCalledWith(2);

// Check results
expect(mockCallback.mock.results[0].value).toBe(2);

// 2. Mock Return Values
const mock = jest.fn();

mock.mockReturnValue(42);
console.log(mock());  // 42

mock.mockReturnValueOnce(10)
    .mockReturnValueOnce(20)
    .mockReturnValue(30);

console.log(mock(), mock(), mock(), mock());
// 10, 20, 30, 30

// 3. Mock Async Functions
const asyncMock = jest.fn();

asyncMock.mockResolvedValue('Success');
await asyncMock();  // 'Success'

asyncMock.mockRejectedValue(new Error('Failed'));
await asyncMock();  // Throws error

// 4. Mock Modules
// database.js
const db = {
  query: (sql) => { /* real database call */ }
};

// userService.js
const db = require('./database');

function getUsers() {
  return db.query('SELECT * FROM users');
}

// userService.test.js
jest.mock('./database');
const db = require('./database');
const { getUsers } = require('./userService');

test('getUsers calls database', async () => {
  const mockUsers = [{ id: 1, name: 'John' }];
  db.query.mockResolvedValue(mockUsers);
  
  const users = await getUsers();
  
  expect(db.query).toHaveBeenCalledWith('SELECT * FROM users');
  expect(users).toEqual(mockUsers);
});

// 5. Partial Mocks (mock only some methods)
jest.mock('./math', () => ({
  ...jest.requireActual('./math'),  // Keep real implementations
  divide: jest.fn()  // Mock only divide
}));

// 6. Spy on Methods
const user = {
  getName: () => 'John',
  getAge: () => 30
};

const spy = jest.spyOn(user, 'getName');

user.getName();

expect(spy).toHaveBeenCalled();
spy.mockRestore();  // Restore original implementation

// 7. Real Interview Example: Testing with Multiple Mocks
// orderService.js
const paymentService = require('./paymentService');
const emailService = require('./emailService');
const inventoryService = require('./inventoryService');

async function createOrder(orderData) {
  // Check inventory
  const available = await inventoryService.checkStock(orderData.items);
  if (!available) throw new Error('Out of stock');
  
  // Process payment
  const payment = await paymentService.charge(orderData.amount);
  
  // Update inventory
  await inventoryService.decreaseStock(orderData.items);
  
  // Send confirmation email
  await emailService.send(orderData.email, 'Order confirmed');
  
  return { orderId: payment.id, status: 'completed' };
}

// orderService.test.js
jest.mock('./paymentService');
jest.mock('./emailService');
jest.mock('./inventoryService');

const paymentService = require('./paymentService');
const emailService = require('./emailService');
const inventoryService = require('./inventoryService');
const { createOrder } = require('./orderService');

describe('createOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('creates order successfully', async () => {
    const orderData = {
      items: [{ id: 1, quantity: 2 }],
      amount: 100,
      email: 'customer@example.com'
    };
    
    inventoryService.checkStock.mockResolvedValue(true);
    paymentService.charge.mockResolvedValue({ id: 'pay_123' });
    inventoryService.decreaseStock.mockResolvedValue(true);
    emailService.send.mockResolvedValue(true);
    
    const result = await createOrder(orderData);
    
    expect(inventoryService.checkStock).toHaveBeenCalledWith(orderData.items);
    expect(paymentService.charge).toHaveBeenCalledWith(100);
    expect(inventoryService.decreaseStock).toHaveBeenCalledWith(orderData.items);
    expect(emailService.send).toHaveBeenCalledWith(
      'customer@example.com',
      'Order confirmed'
    );
    expect(result).toEqual({ orderId: 'pay_123', status: 'completed' });
  });
  
  test('throws error when out of stock', async () => {
    inventoryService.checkStock.mockResolvedValue(false);
    
    await expect(createOrder({ items: [] }))
      .rejects.toThrow('Out of stock');
    
    expect(paymentService.charge).not.toHaveBeenCalled();
  });
});
```

---

## Interview Tips

1. **Explain AAA pattern** - Arrange, Act, Assert
2. **Unit vs Integration** - isolation vs interaction
3. **Show TDD cycle** - Red, Green, Refactor
4. **Mock external dependencies** - databases, APIs, email
5. **Test edge cases** - null, empty, invalid input
6. **Coverage is not goal** - meaningful tests matter more
7. **Use descriptive test names** - explain what's being tested

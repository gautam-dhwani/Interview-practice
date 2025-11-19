# REST API Best Practices

## 1. HTTP Status Codes

### Explanation
Status codes indicate the result of an HTTP request. Using correct codes helps clients understand what happened without parsing response body.

### Key Concepts
- **2xx**: Success (200 OK, 201 Created, 204 No Content)
- **3xx**: Redirection (301 Moved Permanently, 302 Found)
- **4xx**: Client Error (400 Bad Request, 401 Unauthorized, 404 Not Found)
- **5xx**: Server Error (500 Internal Server Error, 503 Service Unavailable)

### Real-Time Example
**Restaurant Order**: 200 = "Here's your food", 404 = "Dish not on menu", 500 = "Kitchen fire", 429 = "Too busy, come back later"

### Code Block
```javascript
const express = require('express');
const app = express();

// 200 OK - Successful GET
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json(user);  // or just res.json(user)
});

// 201 Created - Successful POST
app.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// 204 No Content - Successful DELETE
app.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).send();  // No body
});

// 400 Bad Request - Invalid input
app.post('/users', async (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email is required' });
  }
});

// 401 Unauthorized - Not authenticated
app.get('/profile', (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authentication required' });
  }
});

// 403 Forbidden - Authenticated but not authorized
app.delete('/users/:id', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
});

// 404 Not Found - Resource doesn't exist
app.get('/api/nonexistent', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 409 Conflict - Resource already exists
app.post('/users', async (req, res) => {
  const exists = await User.findOne({ email: req.body.email });
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }
});

// 422 Unprocessable Entity - Validation failed
app.post('/users', (req, res) => {
  const errors = validateUser(req.body);
  if (errors.length > 0) {
    return res.status(422).json({ errors });
  }
});

// 429 Too Many Requests - Rate limit exceeded
app.use('/api', rateLimiter, (req, res) => {
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: 60
    });
  }
});

// 500 Internal Server Error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// 503 Service Unavailable - Maintenance mode
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE) {
    return res.status(503).json({ 
      error: 'Service temporarily unavailable'
    });
  }
  next();
});
```

---

## 2. JWT & Authentication

### Explanation
JWT (JSON Web Token) is a compact, self-contained way to securely transmit information between parties. Used for stateless authentication.

### Key Concepts
- **Structure**: Header.Payload.Signature (Base64 encoded)
- **Access Token**: Short-lived (15 mins)
- **Refresh Token**: Long-lived (7 days), stored securely
- **Stateless**: Server doesn't store sessions

### Real-Time Example
**Movie Ticket**: JWT is like a ticket with your info stamped and signed by theater. Staff verifies signature without checking database.

### Code Block
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// 1. User Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Verify password
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate tokens
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user._id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
  
  // Store refresh token in database
  await RefreshToken.create({ token: refreshToken, userId: user._id });
  
  // Send tokens
  res.json({
    accessToken,
    refreshToken,
    user: { id: user._id, email: user.email, role: user.role }
  });
});

// 2. Verify Access Token Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// 3. Protected Route
app.get('/api/profile', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json(user);
});

// 4. Refresh Access Token
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  // Check if refresh token exists in database
  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    return res.status(403).json({ error: 'Invalid refresh token' });
  }
  
  // Verify refresh token
  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({ accessToken });
  });
});

// 5. Logout (invalidate refresh token)
app.post('/auth/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;
  await RefreshToken.deleteOne({ token: refreshToken });
  res.status(204).send();
});

// 6. JWT Payload Example
const payload = {
  userId: '507f1f77bcf86cd799439011',
  role: 'admin',
  email: 'admin@example.com',
  iat: 1516239022,  // Issued at
  exp: 1516239922   // Expiration
};

// JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJyb2xlIjoiYWRtaW4ifQ.signature

// 7. Security Best Practices
/*
- Store tokens in httpOnly cookies (not localStorage)
- Use HTTPS only
- Short access token expiry (15 mins)
- Rotate refresh tokens
- Blacklist compromised tokens
- Include token versioning
*/

// Store in httpOnly cookie
app.post('/auth/login', async (req, res) => {
  // ... authentication logic
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,  // Not accessible via JavaScript
    secure: true,    // HTTPS only
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });
  
  res.json({ accessToken });
});
```

---

## 3. CORS (Cross-Origin Resource Sharing)

### Explanation
CORS is a security feature that restricts web pages from making requests to a different domain than the one serving the page. Must be explicitly enabled on server.

### Key Concepts
- **Origin**: Protocol + Domain + Port (http://localhost:3000)
- **Preflight Request**: OPTIONS request before actual request
- **Headers**: Access-Control-Allow-Origin, Access-Control-Allow-Methods

### Real-Time Example
**Hotel Room Service**: CORS is like room service policy - only guests from specific rooms can order. Frontend (room) can only call backend (kitchen) if allowed.

### Code Block
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// 1. Enable CORS for all origins (⚠️ Not recommended for production)
app.use(cors());

// 2. Enable CORS for specific origin
app.use(cors({
  origin: 'https://myapp.com'
}));

// 3. Multiple allowed origins
const allowedOrigins = [
  'https://myapp.com',
  'https://admin.myapp.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 4. Manual CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://myapp.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// 5. Different CORS for different routes
app.use('/api/public', cors());  // Public API
app.use('/api/private', cors({
  origin: 'https://myapp.com'
}));

// 6. CORS Error Example
/*
Frontend (http://localhost:3000):
fetch('http://localhost:5000/api/users')
  .then(res => res.json())

Error in browser console:
"Access to fetch at 'http://localhost:5000/api/users' from origin 
'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present."

Solution: Add CORS middleware on backend
*/
```

---

## 4. Idempotency

### Explanation
An idempotent operation produces the same result no matter how many times it's executed. Critical for retry logic and network reliability.

### Key Concepts
- **GET, PUT, DELETE**: Idempotent by design
- **POST**: NOT idempotent (creates new resource each time)
- **Idempotency Key**: Client-generated unique key for POST requests

### Real-Time Example
**Light Switch**: Pressing "OFF" multiple times keeps light off (idempotent). Pressing "TOGGLE" changes state each time (non-idempotent).

### Code Block
```javascript
// 1. Idempotent Methods

// GET - Always returns same result
app.get('/users/123', (req, res) => {
  const user = getUser(123);
  res.json(user);  // Same result every call
});

// PUT - Updates to same value
app.put('/users/123', (req, res) => {
  updateUser(123, { name: 'John' });
  // Calling multiple times with same data = same result
});

// DELETE - Deleting already deleted resource = same state
app.delete('/users/123', (req, res) => {
  deleteUser(123);
  // First call: deletes user
  // Second call: user already deleted, no change
  res.status(204).send();
});

// 2. Non-Idempotent: POST without safeguards
app.post('/orders', async (req, res) => {
  const order = await Order.create(req.body);
  res.status(201).json(order);
  // Problem: Network timeout -> client retries -> duplicate order!
});

// 3. Making POST Idempotent with Idempotency Key
const processedRequests = new Map();  // In production: use Redis

app.post('/orders', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header required' });
  }
  
  // Check if request already processed
  const cached = processedRequests.get(idempotencyKey);
  if (cached) {
    return res.status(cached.status).json(cached.body);
  }
  
  // Process request
  try {
    const order = await Order.create(req.body);
    
    // Cache response for 24 hours
    processedRequests.set(idempotencyKey, {
      status: 201,
      body: order,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
    
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Client usage:
/*
fetch('/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': 'unique-uuid-12345'
  },
  body: JSON.stringify({ items: [...] })
});

// If request fails/times out, retry with SAME idempotency key
// Server returns cached response, no duplicate order
*/

// 4. Real Interview Example: Payment Processing
const redis = require('redis');
const client = redis.createClient();

app.post('/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key required' });
  }
  
  // Check Redis cache
  const cached = await client.get(`idempotency:${idempotencyKey}`);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }
  
  try {
    // Process payment
    const payment = await processPayment(req.body);
    
    // Store in Redis with 24h expiry
    await client.setex(
      `idempotency:${idempotencyKey}`,
      24 * 60 * 60,
      JSON.stringify(payment)
    );
    
    res.status(201).json(payment);
  } catch (error) {
    // Also cache errors
    const errorResponse = { error: error.message };
    await client.setex(
      `idempotency:${idempotencyKey}`,
      24 * 60 * 60,
      JSON.stringify(errorResponse)
    );
    res.status(500).json(errorResponse);
  }
});
```

---

## 5. API Versioning

### Explanation
Versioning allows you to make breaking changes without affecting existing clients. Different clients can use different versions simultaneously.

### Key Concepts
- **URI Versioning**: /api/v1/users (most common)
- **Header Versioning**: Accept: application/vnd.api.v1+json
- **Query Versioning**: /api/users?version=1
- **Breaking vs Non-breaking**: Add fields = OK, Remove/rename = Breaking

### Real-Time Example
**App Updates**: iOS users on v1.0 still work while v2.0 users get new features. Server supports both versions.

### Code Block
```javascript
// 1. URI Versioning (most common)
const express = require('express');
const app = express();

// Version 1
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email
  });
});

// Version 2 (added phone field, renamed name to fullName)
app.get('/api/v2/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({
    id: user.id,
    fullName: user.name,  // Renamed
    email: user.email,
    phone: user.phone     // New field
  });
});

// 2. Header Versioning
app.get('/api/users/:id', async (req, res) => {
  const version = req.headers['api-version'] || 'v1';
  const user = await User.findById(req.params.id);
  
  if (version === 'v1') {
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email
    });
  }
  
  if (version === 'v2') {
    return res.json({
      id: user.id,
      fullName: user.name,
      email: user.email,
      phone: user.phone
    });
  }
  
  res.status(400).json({ error: 'Invalid API version' });
});

// Client usage:
// fetch('/api/users/123', { headers: { 'api-version': 'v2' } })

// 3. Organized with Routers
// routes/v1/users.js
const router = express.Router();

router.get('/:id', async (req, res) => {
  // v1 logic
});

module.exports = router;

// routes/v2/users.js
router.get('/:id', async (req, res) => {
  // v2 logic
});

// app.js
app.use('/api/v1/users', require('./routes/v1/users'));
app.use('/api/v2/users', require('./routes/v2/users'));

// 4. Deprecation Notice
app.get('/api/v1/users/:id', async (req, res) => {
  res.setHeader('X-API-Warn', 'API v1 deprecated. Migrate to v2 by 2024-12-31');
  res.setHeader('X-API-Deprecated', 'true');
  
  // ... v1 logic
});

// 5. Non-Breaking Changes (no new version needed)
/*
✅ Non-breaking (backwards compatible):
- Add new endpoint
- Add new optional field to request
- Add new field to response
- Add new optional query parameter

❌ Breaking (needs new version):
- Remove endpoint
- Remove field from response
- Rename field
- Change field type
- Make optional field required
- Change URL structure
*/

// Example: Non-breaking change
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt  // ✅ New field added, doesn't break old clients
  });
});
```

---

## 6. Pagination

### Explanation
See MongoDB_Guide.md for detailed pagination strategies.

### Code Block
```javascript
// Cursor-based pagination (best for REST APIs)
app.get('/api/products', async (req, res) => {
  const { cursor, limit = 20 } = req.query;
  
  const query = cursor ? { _id: { $gt: cursor } } : {};
  const products = await Product
    .find(query)
    .sort({ _id: 1 })
    .limit(parseInt(limit) + 1)
    .lean();
  
  const hasMore = products.length > limit;
  const results = hasMore ? products.slice(0, -1) : products;
  const nextCursor = hasMore ? results[results.length - 1]._id : null;
  
  res.json({
    data: results,
    pagination: {
      nextCursor,
      hasMore,
      limit: parseInt(limit)
    }
  });
});

// Response:
/*
{
  "data": [...],
  "pagination": {
    "nextCursor": "507f1f77bcf86cd799439011",
    "hasMore": true,
    "limit": 20
  }
}
*/
```

---

## Interview Tips

1. **Know common status codes** and when to use them
2. **Explain JWT structure** (Header.Payload.Signature)
3. **Differentiate 401 vs 403** (Unauthorized vs Forbidden)
4. **Discuss CORS preflight** requests (OPTIONS)
5. **Explain idempotency** with payment example
6. **Compare versioning strategies** (URI vs Header)
7. **Mention security** - httpOnly cookies, HTTPS only

# Real-World Interview Scenarios - Part 2

Continuation of advanced real-world scenarios commonly asked in technical interviews.

---

## 6. Database Connection Pooling & Optimization

### Problem
How to efficiently manage database connections for high-traffic applications?

### Key Concepts

**Without Connection Pool (Bad):**
```javascript
// ❌ Creates new connection for each request
app.get('/api/users', async (req, res) => {
  const client = await MongoClient.connect(url);  // 50ms overhead!
  const users = await client.db().collection('users').find().toArray();
  await client.close();
  res.json(users);
});

// Problems:
// - Connection overhead (50ms per request)
// - Too many connections (exhausts database)
// - Slow performance
```

**With Connection Pool (Good):**
```javascript
// ✅ Reuse connections from pool
const mongoose = require('mongoose');

mongoose.connect(url, {
  poolSize: 10,  // Maximum 10 connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

app.get('/api/users', async (req, res) => {
  const users = await User.find();  // Reuses connection from pool
  res.json(users);
});
```

**Advanced Pool Configuration:**
```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(url, {
  // Connection Pool Settings
  minPoolSize: 5,      // Minimum connections always open
  maxPoolSize: 50,     // Maximum connections
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  
  // Timeout Settings
  serverSelectionTimeoutMS: 5000,  // 5s to select server
  socketTimeoutMS: 45000,          // 45s socket timeout
  
  // Retry Settings
  retryWrites: true,
  retryReads: true,
  
  // Monitoring
  monitorCommands: true
});

// Monitor pool events
client.on('connectionPoolCreated', () => {
  console.log('Connection pool created');
});

client.on('connectionCheckedOut', () => {
  console.log('Connection checked out from pool');
});

client.on('connectionCheckedIn', () => {
  console.log('Connection returned to pool');
});

await client.connect();
```

**PostgreSQL with pg Pool:**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  user: 'user',
  password: 'pass',
  port: 5432,
  
  // Pool configuration
  max: 20,              // Max clients
  min: 5,               // Min clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query with automatic connection management
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction example
app.post('/api/transfer', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [100, req.body.fromAccount]
    );
    
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [100, req.body.toAccount]
    );
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();  // Return to pool
  }
});
```

**Interview Answer:**
> "I use **connection pooling** to avoid creating new connections for each request. A pool maintains a set of reusable connections (e.g., 10-50). When a request needs a connection, it borrows from pool and returns after use. This reduces connection overhead from 50ms to ~1ms. I configure min/max pool size based on server capacity and expected load. For transactions, I explicitly acquire a connection, use it, then release back to pool."

---

## 7. Caching Strategies in Production

### Problem
Database queries are slow. How to speed up frequently accessed data?

### Multi-Layer Caching Strategy

```
Request → App Cache (Memory) → Redis Cache → Database
```

**Layer 1: In-Memory Cache (Fastest)**
```javascript
const NodeCache = require('node-cache');
const memoryCache = new NodeCache({ 
  stdTTL: 60,  // 60 seconds
  checkperiod: 120,
  maxKeys: 1000  // Limit memory usage
});

async function getUser(id) {
  // Check memory cache
  const cacheKey = `user:${id}`;
  const cached = memoryCache.get(cacheKey);
  
  if (cached) {
    console.log('Memory cache hit');
    return cached;
  }
  
  // Fetch from Redis
  const user = await getUserFromRedis(id);
  
  // Store in memory
  memoryCache.set(cacheKey, user);
  
  return user;
}
```

**Layer 2: Redis Cache (Shared across servers)**
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUserFromRedis(id) {
  const cacheKey = `user:${id}`;
  
  // Check Redis
  const cached = await client.get(cacheKey);
  if (cached) {
    console.log('Redis cache hit');
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const user = await User.findById(id);
  
  // Store in Redis with TTL
  await client.setex(cacheKey, 600, JSON.stringify(user));
  
  return user;
}
```

**Cache Invalidation Strategies:**

```javascript
// 1. TTL (Time To Live) - Automatic expiration
await client.setex('key', 3600, value);  // Expires in 1 hour

// 2. Invalidate on Update
app.put('/api/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body);
  
  // Invalidate all related caches
  await client.del(`user:${req.params.id}`);
  await client.del(`user:${req.params.id}:profile`);
  await client.del(`user:${req.params.id}:orders`);
  
  res.json(user);
});

// 3. Cache Tags (Group invalidation)
async function cacheWithTags(key, value, tags, ttl) {
  await client.setex(key, ttl, JSON.stringify(value));
  
  // Add to tag sets
  for (const tag of tags) {
    await client.sadd(`tag:${tag}`, key);
  }
}

// Invalidate by tag
async function invalidateTag(tag) {
  const keys = await client.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await client.del(...keys);
    await client.del(`tag:${tag}`);
  }
}

// Usage
await cacheWithTags(
  'product:123', 
  product, 
  ['products', 'category:electronics'],
  3600
);

// Invalidate all electronics products
await invalidateTag('category:electronics');
```

**Cache Stampede Prevention:**
```javascript
// Problem: Cache expires, 1000 requests hit DB simultaneously

// Solution: Lock pattern
async function getWithLock(key, fetchFn, ttl = 300) {
  // Try cache
  const cached = await client.get(key);
  if (cached) return JSON.parse(cached);
  
  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const acquired = await client.set(lockKey, '1', 'EX', 10, 'NX');
  
  if (acquired) {
    try {
      // Fetch data
      const data = await fetchFn();
      await client.setex(key, ttl, JSON.stringify(data));
      return data;
    } finally {
      await client.del(lockKey);
    }
  } else {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getWithLock(key, fetchFn, ttl);
  }
}
```

**Interview Answer:**
> "I implement **multi-layer caching**: in-memory (fastest, per-server), Redis (shared), and database. For cache invalidation, I use **TTL** for auto-expiration and **manual invalidation** on updates. To prevent cache stampede (1000 requests hitting DB when cache expires), I use a **lock pattern** - first request fetches and updates cache, others wait. I also use **cache tags** for group invalidation (e.g., invalidate all products in a category)."

---

## 8. Session Management at Scale

### Problem
How to handle user sessions with multiple servers (horizontal scaling)?

### Strategies

**❌ Bad: In-Memory Sessions (Doesn't scale)**
```javascript
const session = require('express-session');

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  // Sessions stored in memory - lost on restart, not shared across servers!
}));
```

**✅ Good: Redis-Based Sessions**
```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const redisClient = redis.createClient({
  host: 'redis-server',
  port: 6379
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // Not accessible via JS
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    sameSite: 'strict'
  }
}));
```

**✅ Better: JWT (Stateless)**
```javascript
// No server-side session storage needed
const jwt = require('jsonwebtoken');

// Login
app.post('/login', async (req, res) => {
  const user = await authenticateUser(req.body);
  
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  // Store refresh token in Redis (for revocation)
  await redisClient.setex(
    `refresh:${user.id}`,
    7 * 24 * 60 * 60,
    refreshToken
  );
  
  res.json({ accessToken: token, refreshToken });
});

// Middleware
function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
}
```

**Hybrid Approach: JWT + Redis Whitelist**
```javascript
// Store active sessions in Redis for instant revocation
app.post('/login', async (req, res) => {
  const user = await authenticateUser(req.body);
  
  const sessionId = generateId();
  const token = jwt.sign(
    { userId: user.id, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  // Whitelist session
  await redisClient.setex(
    `session:${sessionId}`,
    15 * 60,
    JSON.stringify({ userId: user.id, createdAt: new Date() })
  );
  
  res.json({ token });
});

// Verify middleware
async function authenticateJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    
    // Check whitelist
    const session = await redisClient.get(`session:${decoded.sessionId}`);
    if (!session) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }
    
    req.user = decoded;
    next();
  });
}

// Logout (instant revocation)
app.post('/logout', authenticateJWT, async (req, res) => {
  await redisClient.del(`session:${req.user.sessionId}`);
  res.json({ message: 'Logged out' });
});
```

**Interview Answer:**
> "For horizontal scaling, I avoid in-memory sessions. I use **JWT for stateless authentication** - no server-side storage needed. For sensitive operations, I combine JWT with **Redis whitelist** for instant revocation. Each JWT contains a sessionId, and I verify it exists in Redis. On logout, I delete from Redis, immediately invalidating the token. For traditional sessions, I use **Redis as session store** shared across all servers."

---

## 9. Handling File Uploads Efficiently

### Problem
Users upload large files (videos, images). How to handle without blocking server?

### Strategy 1: Stream Upload to S3
```javascript
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

// Direct upload to S3 (doesn't store on server)
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'my-bucket',
    acl: 'public-read',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024  // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  res.json({
    url: req.file.location,
    key: req.file.key,
    size: req.file.size
  });
});
```

**Strategy 2: Presigned URL (Direct Client → S3)**
```javascript
// Client requests upload URL
app.post('/api/upload-url', async (req, res) => {
  const { filename, filetype } = req.body;
  
  const key = `uploads/${Date.now()}-${filename}`;
  
  // Generate presigned URL (valid for 5 minutes)
  const params = {
    Bucket: 'my-bucket',
    Key: key,
    Expires: 300,
    ContentType: filetype,
    ACL: 'public-read'
  };
  
  const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
  const publicUrl = `https://my-bucket.s3.amazonaws.com/${key}`;
  
  res.json({ uploadUrl, publicUrl, key });
});

// Client uploads directly to S3 using presigned URL
/*
Frontend:
const { uploadUrl, publicUrl } = await fetch('/api/upload-url', {
  method: 'POST',
  body: JSON.stringify({ filename: 'video.mp4', filetype: 'video/mp4' })
}).then(r => r.json());

await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': 'video/mp4' }
});

// File is now at publicUrl
*/
```

**Strategy 3: Chunked Upload (Large Files)**
```javascript
const fs = require('fs');
const path = require('path');

// Initialize upload
app.post('/api/upload/init', async (req, res) => {
  const uploadId = generateId();
  const { filename, totalChunks } = req.body;
  
  await Upload.create({
    id: uploadId,
    filename,
    totalChunks,
    uploadedChunks: 0,
    status: 'pending'
  });
  
  res.json({ uploadId });
});

// Upload chunk
app.post('/api/upload/:uploadId/chunk/:chunkIndex', 
  multer({ dest: 'temp/' }).single('chunk'),
  async (req, res) => {
    const { uploadId, chunkIndex } = req.params;
    
    const upload = await Upload.findById(uploadId);
    const chunkPath = path.join('chunks', uploadId, `chunk-${chunkIndex}`);
    
    // Save chunk
    await fs.promises.mkdir(path.dirname(chunkPath), { recursive: true });
    await fs.promises.rename(req.file.path, chunkPath);
    
    upload.uploadedChunks++;
    await upload.save();
    
    res.json({ 
      chunkIndex, 
      uploaded: upload.uploadedChunks, 
      total: upload.totalChunks 
    });
  }
);

// Finalize upload (merge chunks)
app.post('/api/upload/:uploadId/finalize', async (req, res) => {
  const { uploadId } = req.params;
  const upload = await Upload.findById(uploadId);
  
  const finalPath = path.join('uploads', upload.filename);
  const writeStream = fs.createWriteStream(finalPath);
  
  for (let i = 0; i < upload.totalChunks; i++) {
    const chunkPath = path.join('chunks', uploadId, `chunk-${i}`);
    const chunkData = await fs.promises.readFile(chunkPath);
    writeStream.write(chunkData);
    await fs.promises.unlink(chunkPath);  // Delete chunk
  }
  
  writeStream.end();
  
  // Upload to S3
  const fileStream = fs.createReadStream(finalPath);
  await s3.upload({
    Bucket: 'my-bucket',
    Key: upload.filename,
    Body: fileStream
  }).promise();
  
  await Upload.update(uploadId, { status: 'completed' });
  
  res.json({ success: true, url: `https://.../${upload.filename}` });
});
```

**Interview Answer:**
> "For file uploads, I avoid storing on server disk. I use **multer-s3** to stream directly to S3. For very large files, I generate **presigned URLs** - client uploads directly to S3, bypassing server entirely. For huge files (GB+), I implement **chunked upload** - client splits file, uploads chunks separately, server merges them. This handles uploads without blocking server or using disk space."

---

## 10. Error Handling & Logging in Production

### Problem
How to handle errors gracefully and debug production issues?

### Comprehensive Error Handling

```javascript
// Custom error factory functions
function createAppError(message, statusCode, isOperational = true) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  Error.captureStackTrace(error, createAppError);
  return error;
}

function createValidationError(message) {
  return createAppError(message, 400);
}

function createNotFoundError(resource) {
  return createAppError(`${resource} not found`, 404);
}

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Routes
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw createNotFoundError('User');
  }
  
  res.json(user);
}));

// Global error handler
app.use((err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Operational errors (expected)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }
  
  // Programming errors (unexpected)
  console.error('FATAL ERROR:', err);
  
  // Send generic message to client
  res.status(500).json({
    error: 'Internal server error'
  });
  
  // In production, might want to restart process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);  // Let PM2 restart
  }
});
```

**Structured Logging with Winston:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-server' },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    
    // All logs
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    
    // Console in development
    ...(process.env.NODE_ENV === 'development' 
      ? [new winston.transports.Console({
          format: winston.format.simple()
        })] 
      : []
    )
  ]
});

// Usage
logger.info('User logged in', { userId: 123 });
logger.error('Database connection failed', { error: err.message });
```

**Request Logging Middleware:**
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
});
```

**Interview Answer:**
> "I use **custom error classes** (ValidationError, NotFoundError) with status codes. All async route handlers are wrapped to catch errors automatically. A **global error handler** logs all errors with context (URL, user, stack trace) using **Winston**. Operational errors (expected, like validation) send clean error messages. Programming errors (bugs) log full details and send generic message to client. In production, I integrate with error tracking services like Sentry for real-time alerts."

---

Continue to Part 3...

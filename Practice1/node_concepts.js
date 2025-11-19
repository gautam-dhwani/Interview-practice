'use strict';

/**
 * Node.js Interview Prep: Concepts, Demos, and Mini Servers
 * ---------------------------------------------------------
 * This file contains:
 * - Event Loop deep-dive with runnable demo
 * - Threads in Node.js (libuv threadpool vs JS main thread) overview
 * - Closures explained with simple examples
 * - Node internals (libuv, async I/O) overview and demo
 * - Async vs Sync examples
 * - Redis caching server with robust error handling and 3 practice problems
 * - Basic HTTP server using core 'http' connected to MongoDB with a POST handler
 *
 * Run modes (see package.json scripts):
 *  - node node_concepts.js            -> show concept demos (event loop, closures, sync vs async)
 *  - node node_concepts.js server     -> start core HTTP server (MongoDB)
 *  - node node_concepts.js redis      -> start Express server with Redis caching + problems
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const mongoose = require('mongoose');
const express = require('express');
const { createClient } = require('redis');

// -------------------------------------------------------------
// 1) Event Loop Deep Dive
// -------------------------------------------------------------
/**
Event Loop Phases (libuv):

  [Timers] -> [Pending Callbacks] -> [Idle/Prepare] -> [Poll] -> [Check] -> [Close]

Microtasks queue (per tick):
  - process.nextTick() runs BEFORE Promise microtasks
  - Promise.then/catch/finally runs after nextTick, before moving to next phase

Quick mental model:
  - Synchronous code runs to completion.
  - Then microtasks (nextTick, then Promises) are drained.
  - Then event loop proceeds through phases.

ASCII flow for a tick:

  JS stack empty?
     | yes
     v
  Run nextTick queue
     |
     v
  Run Promise microtasks
     |
     v
  Enter libuv phases: Timers -> Pending -> Idle/Prepare -> Poll -> Check -> Close

Useful cues:
  setTimeout(..., 0) -> Timers phase
  setImmediate(...)  -> Check phase
  fs.readFile(...)   -> completes in Poll phase
*/
function eventLoopDemo() {
  console.log('\n--- Event Loop Demo ---');
  console.log('sync: A');

  setTimeout(() => console.log('timer 0: setTimeout'), 0); // Timers phase
  setImmediate(() => console.log('check: setImmediate'));   // Check phase

  process.nextTick(() => console.log('microtask: process.nextTick'));
  Promise.resolve().then(() => console.log('microtask: Promise.then'));

  fs.readFile(__filename, () => {
    console.log('poll: fs.readFile callback');
  });

  console.log('sync: B');
}


// -------------------------------------------------------------
// 2) Threads in Node.js (Single vs Multi)
// -------------------------------------------------------------
/**
What is a Thread in Node.js?
- Your JS runs on a single main thread (the event loop).
- libuv provides a C++ threadpool (default size 4) for certain async operations
  (fs, DNS, crypto, zlib). This is distinct from the JS main thread.
- Node can also use OS-level threads for I/O and Worker Threads for CPU tasks.

Single-threaded vs Multi-threaded work:
- JS is single-threaded (no data races in your JS by default).
- I/O operations are offloaded to the kernel or libuv threadpool -> non-blocking.
- CPU-bound tasks can block the event loop; use Worker Threads or off-process work.

To see multi-threaded behavior (not run by default):
- Increase UV_THREADPOOL_SIZE to parallelize threadpool tasks like crypto.
- Or use worker_threads for CPU-bound computations.
*/

// -------------------------------------------------------------
// 3) Closures Explained (with simple examples)
// -------------------------------------------------------------
function makeCounter() {
  let count = 0; // captured by the inner function
  return function next() {
    count += 1;
    return count;
  };
}

function closureDemo() {
  console.log('\n--- Closure Demo ---');
  const c1 = makeCounter();
  console.log('c1():', c1()); // 1
  console.log('c1():', c1()); // 2
  const c2 = makeCounter();
  console.log('c2():', c2()); // 1 (independent state)

  // Classic var vs let in loops
  console.log('Loop with var (captures same i):');
  for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(' var i =', i), 0); // prints 3,3,3
  }
  console.log('Loop with let (block-scoped):');
  for (let j = 0; j < 3; j++) {
    setTimeout(() => console.log(' let j =', j), 0); // prints 0,1,2
  }
}

// -------------------------------------------------------------
// 4) Node internals: libuv, event-driven, async I/O
// -------------------------------------------------------------
/**
- V8 executes your JS.
- libuv handles the event loop, threadpool, and cross-platform async I/O.
- Many I/O ops are handled by the OS/kernel; if needed, libuv threadpool is used.
- Callbacks/promises schedule continuations that run later on the JS main thread.

Async I/O demo below shows non-blocking behavior.
*/
function syncVsAsyncDemo() {
  console.log('\n--- Sync vs Async Demo ---');
  const filePath = path.join(__dirname, 'package.json');

  console.time('syncRead');
  const data1 = fs.readFileSync(filePath, 'utf8'); // blocks event loop
  console.timeEnd('syncRead');
  console.log('syncRead bytes:', data1.length);

  console.time('asyncRead');
  fs.readFile(filePath, 'utf8', (err, data2) => {
    console.timeEnd('asyncRead');
    if (err) return console.error('async read error:', err.message);
    console.log('asyncRead bytes:', data2.length);
  });
  console.log('This prints before async read completes (non-blocking).');
}

// -------------------------------------------------------------
// 5) Basic HTTP server (core http) + MongoDB (Mongoose)
// -------------------------------------------------------------

// User schema for demo
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

async function initMongo() {
  // URL encode the password: admin@123 becomes admin%40123
  const uri = process.env.MONGODB_URI || 'mongodb://admin:admin%40123@127.0.0.1:27018/interviewdb?authSource=admin';
  
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log(`✅ Connected to MongoDB via Mongoose`);
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }
  return mongoose.connection.db;
}

/**
POST /users (JSON) - Create a new user
GET /users - Get all users  
Step-by-step procedure for POST:
1) Receive request and parse chunks from the socket.
2) On 'end', parse JSON body and validate fields.
3) Create and save document using Mongoose model.
4) Return 201 with the created user or error on failure.
*/
function startHttpServer() {
  const PORT = process.env.PORT || 5001;
  const server = http.createServer(async (req, res) => {
    // CORS for convenience in demos
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, pid: process.pid }));
    }

    if (req.url === '/users' && req.method === 'GET') {
      try {
        await initMongo();
        const users = await User.find().sort({ createdAt: -1 }).limit(20);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ users }));
      } catch (err) {
        console.error('GET /users error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }

    if (req.url === '/users' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1e6) { // 1MB guard
          req.destroy();
        }
      });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (!payload.name || typeof payload.name !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'name (string) is required' }));
          }
          
          await initMongo(); // ensure connection
          const user = new User({ 
            name: payload.name, 
            age: payload.age ?? null 
          });
          const savedUser = await user.save();
          
          res.writeHead(201, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            insertedId: savedUser._id,
            user: savedUser 
          }));
        } catch (err) {
          console.error('POST /users error:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });
      return; // prevent fallthrough
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  initMongo().then(() => {
    server.listen(PORT, () => console.log(`HTTP server (core) listening on http://localhost:${PORT}`));
  }).catch(err => {
    console.error('Mongo connection failed, server not started:', err.message);
  });
}

// -------------------------------------------------------------
// 6) Redis caching + small problems API (Express)
// -------------------------------------------------------------
function startRedisServer() {
  const app = express();
  const PORT = process.env.REDIS_APP_PORT || 5002;
  app.use(express.json());

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const client = createClient({ url });
  let redisConnected = false;

  client.on('connect', () => console.log('Redis connecting...'));
  client.on('ready', () => { redisConnected = true; console.log('Redis ready'); });
  client.on('error', (err) => { redisConnected = false; console.error('Redis error:', err.message); });
  client.on('end', () => { redisConnected = false; console.warn('Redis connection closed'); });

  (async () => {
    try { await client.connect(); } catch (e) { console.error('Redis connect failed:', e.message); }
  })();

  async function cache(req, res, next) {
    if (!redisConnected) return next();
    const key = `user:${req.params.id}`;
    try {
      const cached = await client.get(key);
      if (cached) return res.json({ source: 'cache', data: JSON.parse(cached) });
      return next();
    } catch (e) {
      console.error('cache middleware error:', e.message);
      return next();
    }
  }

  app.get('/user/:id', cache, async (req, res) => {
    const { id } = req.params;
    // Simulated DB read
    const userData = { id, name: `User${id}`, age: 20 + Number(id) };
    if (redisConnected) {
      try { await client.setEx(`user:${id}`, 60, JSON.stringify(userData)); } catch (e) { console.error('setEx error:', e.message); }
    }
    res.json({ source: 'db', data: userData });
  });

  // ---- Small Problems using Redis as cache ----
  async function fibWithCache(n) {
    let num = Number(n);
    if (Number.isNaN(n) || n < 0 || n > 1e6) throw new Error('n must be 0..1e6');
    const key = `fib:${n}`;
    if (redisConnected) {
      const cached = await client.get(key);
      if (cached !== null) return Number(cached);
    }
    // iterative O(n) time, O(1) space
    let a = 0, b = 1;
    if (n === 0) return 0;
    for (let i = 2; i <= n; i++) {
      const c = a + b; a = b; b = c;
    }
    const ans = b; // for n>=1
    if (redisConnected) await client.setEx(key, 3600, String(ans));
    return ans;
  }

  function isPrimeRaw(n) {
    n = Number(n);
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }
  async function isPrimeWithCache(n) {
    const key = `prime:${n}`;
    if (redisConnected) {
      const cached = await client.get(key);
      if (cached !== null) return cached === '1';
    }
    const ans = isPrimeRaw(n);
    if (redisConnected) await client.setEx(key, 3600, ans ? '1' : '0');
    return ans;
  }

  // Pair sum (return first pair indices) with caching by hash of input
  function arrayHash(arr) {
    // Simple rolling hash (not cryptographic)
    let h = 0;
    for (let i = 0; i < arr.length; i++) {
      h = ((h << 5) - h) + (arr[i] | 0);
      h |= 0;
    }
    return h.toString(16);
  }
  function pairSumRaw(arr, target) {
    const map = Object.create(null); // value -> index
    for (let i = 0; i < arr.length; i++) {
      const x = arr[i];
      const need = target - x;
      if (map[need] !== undefined) return [map[need], i];
      map[x] = i;
    }
    return null;
  }
  async function pairSumWithCache(arr, target) {
    const key = `pair:${arrayHash(arr)}:${target}`;
    if (redisConnected) {
      const cached = await client.get(key);
      if (cached) return JSON.parse(cached);
    }
    const ans = pairSumRaw(arr, target);
    if (redisConnected) await client.setEx(key, 600, JSON.stringify(ans));
    return ans;
  }

  app.get('/fib/:n', async (req, res) => {
    try { const ans = await fibWithCache(req.params.n); res.json({ n: Number(req.params.n), fib: ans }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.get('/prime/:n', async (req, res) => {
    try { const ans = await isPrimeWithCache(req.params.n); res.json({ n: Number(req.params.n), prime: ans }); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  app.post('/pair-sum', async (req, res) => {
    try {
      const { arr, target } = req.body || {};
      if (!Array.isArray(arr) || typeof target !== 'number') {
        return res.status(400).json({ error: 'Body must be { arr: number[], target: number }' });
      }
      const ans = await pairSumWithCache(arr.map(Number), Number(target));
      res.json({ indices: ans });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/', (req, res) => {
    res.json({
      message: 'Redis caching + problems server',
      routes: ['/user/:id', '/fib/:n', '/prime/:n', 'POST /pair-sum']
    });
  });

  app.listen(PORT, () => console.log(`Redis demo server listening on http://localhost:${PORT}`));
}

// -------------------------------------------------------------
// 7) Middleware Concepts and Examples
// -------------------------------------------------------------
/**
Middleware in Node.js/Express:
- Functions that execute during request-response cycle
- Have access to req, res, and next() function
- Can modify req/res objects, end request, or call next middleware
- Order matters! Middleware executes in the order it's defined

Types:
1. Application-level middleware (app.use)
2. Router-level middleware (router.use)
3. Error-handling middleware (4 parameters: err, req, res, next)
4. Built-in middleware (express.json, express.static)
5. Third-party middleware (cors, helmet, morgan)
*/

// Custom logging middleware
function loggingMiddleware(req, res, next) {
  const start = Date.now();
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    console.log(`Response time: ${duration}ms`);
    originalEnd.apply(this, args);
  };
  
  next();
}

// Authentication middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Simple token validation (in real app, use JWT)
  if (token === 'valid-token') {
    req.user = { id: 1, name: 'John Doe' };
    next();
  } else {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Rate limiting middleware (simple implementation)
function createRateLimiter(maxRequests = 100, windowMs = 60000) {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const userRequests = requests.get(ip);
    
    // Remove old requests outside window
    while (userRequests.length && now - userRequests[0] > windowMs) {
      userRequests.shift();
    }
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    userRequests.push(now);
    next();
  };
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
}

// -------------------------------------------------------------
// 8) Security Concepts and Best Practices
// -------------------------------------------------------------
/**
Node.js Security Best Practices:

1. Input Validation & Sanitization
2. SQL Injection Prevention (use parameterized queries)
3. XSS Prevention (escape output, use CSP headers)
4. CSRF Protection (use tokens)
5. Secure Headers (helmet.js)
6. Rate Limiting
7. Authentication & Authorization
8. Dependency Security (npm audit)
9. Environment Variables for secrets
10. HTTPS in production
*/

// Input validation example
function validateUser(userData) {
  const errors = [];
  
  if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Valid email is required');
  }
  
  if (!userData.password || userData.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  return errors;
}

// SQL injection prevention (using parameterized queries)
function secureDbQuery() {
  // BAD: vulnerable to SQL injection
  // const query = `SELECT * FROM users WHERE email = '${email}'`;
  
  // GOOD: parameterized query
  const query = 'SELECT * FROM users WHERE email = ?';
  // db.query(query, [email], callback);
  
  return { query, message: 'Use parameterized queries!' };
}

// XSS prevention
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// -------------------------------------------------------------
// 9) Error Handling Patterns
// -------------------------------------------------------------
/**
Error Handling in Node.js:

1. Synchronous errors: try-catch
2. Asynchronous errors: callbacks with error-first pattern
3. Promise rejections: .catch() or try-catch with async/await
4. Unhandled exceptions: process.on('uncaughtException')
5. Unhandled promise rejections: process.on('unhandledRejection')
*/

// Async error handling wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handlers
function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

// -------------------------------------------------------------
// 10) Performance Monitoring and Profiling
// -------------------------------------------------------------
/**
Performance Monitoring in Node.js:

1. Memory Usage: process.memoryUsage()
2. CPU Usage: process.cpuUsage()
3. Event Loop Lag: setTimeout vs setImmediate timing
4. Heap Snapshots: v8.writeHeapSnapshot()
5. Profiling: --prof flag, clinic.js, 0x
6. APM Tools: New Relic, DataDog, AppDynamics
*/

function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: `${Math.round(process.uptime())} seconds`,
    pid: process.pid
  };
}

// Event loop lag measurement
function measureEventLoopLag() {
  const start = process.hrtime.bigint();
  
  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
    console.log(`Event loop lag: ${lag.toFixed(2)}ms`);
  });
}

// -------------------------------------------------------------
// 11) Streams and Buffers
// -------------------------------------------------------------
/**
Streams in Node.js:
- Readable: fs.createReadStream, http.IncomingMessage
- Writable: fs.createWriteStream, http.ServerResponse
- Transform: zlib.createGzip, crypto.createCipher
- Duplex: net.Socket, tls.TLSSocket

Buffers:
- Handle binary data
- Fixed-size memory allocation
- More efficient than strings for binary operations
*/

const { Transform } = require('stream');

// Custom transform stream (uppercase)
class UppercaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

// Buffer examples
function bufferExamples() {
  // Creating buffers
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.alloc(10); // 10 bytes of zeros
  const buf3 = Buffer.allocUnsafe(10); // faster but uninitialized
  
  console.log('Buffer from string:', buf1);
  console.log('Buffer to string:', buf1.toString());
  console.log('Buffer length:', buf1.length);
  
  // Buffer operations
  const combined = Buffer.concat([buf1, Buffer.from(' world')]);
  console.log('Combined buffer:', combined.toString());
}

// -------------------------------------------------------------
// 12) Worker Threads for CPU-intensive tasks
// -------------------------------------------------------------
/**
Worker Threads:
- For CPU-intensive operations that would block event loop
- Share memory via SharedArrayBuffer
- Communicate via message passing
- Available since Node.js 10.5.0
*/

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function fibonacciWorker(n) {
  if (n < 2) return n;
  return fibonacciWorker(n - 1) + fibonacciWorker(n - 2);
}

// CPU-intensive task with worker
function calculateFibWithWorker(n) {
  return new Promise((resolve, reject) => {
    // In a real app, this would be in a separate file
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      
      function fib(n) {
        if (n < 2) return n;
        return fib(n - 1) + fib(n - 2);
      }
      
      const result = fib(workerData.n);
      parentPort.postMessage(result);
    `;
    
    // Note: In practice, use a separate file for worker code
    console.log(`Would calculate fibonacci(${n}) in worker thread`);
    
    // Simulate worker result
    setTimeout(() => resolve(fibonacciWorker(n)), 100);
  });
}

// -------------------------------------------------------------
// 13) Database Connection Pooling
// -------------------------------------------------------------
/**
Connection Pooling Benefits:
- Reuse existing connections
- Limit concurrent connections
- Better performance and resource management
- Handle connection failures gracefully
*/

class SimpleConnectionPool {
  constructor(createConnection, maxConnections = 10) {
    this.createConnection = createConnection;
    this.maxConnections = maxConnections;
    this.pool = [];
    this.activeConnections = 0;
    this.waitingQueue = [];
  }
  
  async getConnection() {
    return new Promise((resolve, reject) => {
      if (this.pool.length > 0) {
        resolve(this.pool.pop());
        return;
      }
      
      if (this.activeConnections < this.maxConnections) {
        this.activeConnections++;
        this.createConnection()
          .then(resolve)
          .catch(reject);
        return;
      }
      
      // Wait for available connection
      this.waitingQueue.push({ resolve, reject });
    });
  }
  
  releaseConnection(connection) {
    if (this.waitingQueue.length > 0) {
      const { resolve } = this.waitingQueue.shift();
      resolve(connection);
    } else {
      this.pool.push(connection);
    }
  }
  
  async closeAll() {
    // Close all pooled connections
    for (const conn of this.pool) {
      if (conn.close) await conn.close();
    }
    this.pool = [];
    this.activeConnections = 0;
  }
}

// -------------------------------------------------------------
// 14) Caching Strategies
// -------------------------------------------------------------
/**
Caching Strategies:
1. In-Memory Cache (Map, LRU)
2. Redis Cache
3. CDN Caching
4. HTTP Caching (ETags, Cache-Control)
5. Database Query Caching
*/

// Simple LRU Cache implementation
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// HTTP caching middleware
function cacheMiddleware(ttl = 300) { // 5 minutes default
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    
    const etag = `"${Date.now()}"`;
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    
    // Set cache headers
    res.set({
      'Cache-Control': `public, max-age=${ttl}`,
      'ETag': etag
    });
    
    next();
  };
}

// -------------------------------------------------------------
// Advanced concepts demo
// -------------------------------------------------------------
function advancedConceptsDemo() {
  console.log('\n--- Advanced Node.js Concepts Demo ---');
  
  // Security
  console.log('\n1. Input Validation:');
  const userData = { email: 'invalid-email', password: '123', name: 'A' };
  console.log('Validation errors:', validateUser(userData));
  
  // Performance monitoring
  console.log('\n2. System Metrics:');
  console.log(JSON.stringify(getSystemMetrics(), null, 2));
  
  // Event loop lag
  console.log('\n3. Event Loop Lag:');
  measureEventLoopLag();
  
  // Buffer operations
  console.log('\n4. Buffer Operations:');
  bufferExamples();
  
  // LRU Cache
  console.log('\n5. LRU Cache:');
  const cache = new LRUCache(3);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  console.log('Cache get a:', cache.get('a'));
  cache.set('d', 4); // Should evict 'b'
  console.log('Cache get b (should be null):', cache.get('b'));
  
  // Error handling
  console.log('\n6. Custom Error:');
  try {
    throw new AppError('Something went wrong', 400);
  } catch (err) {
    console.log('Caught error:', err.message, 'Status:', err.statusCode);
  }
}

// -------------------------------------------------------------
// Entrypoint selector
// -------------------------------------------------------------
function main() {
  const mode = process.argv[2] || 'demo';
  if (mode === 'server') {
    startHttpServer();
    return;
  }
  if (mode === 'redis') {
    startRedisServer();
    return;
  }
  if (mode === 'advanced') {
    advancedConceptsDemo();
    return;
  }
  
  // default: demo concepts
  eventLoopDemo();
  closureDemo();
  syncVsAsyncDemo();
  
  console.log('\n--- Node.js Interview Tips ---');
  console.log('• Event Loop: Single-threaded JS + libuv threadpool for I/O');
  console.log('• Clustering: Use all CPU cores with cluster module');
  console.log('• Streams: Handle large data efficiently with backpressure');
  console.log('• Middleware: Functions that execute during request-response cycle');
  console.log('• Security: Validate input, use HTTPS, secure headers, rate limiting');
  console.log('• Performance: Monitor memory/CPU, use caching, connection pooling');
  console.log('• Error Handling: Async wrappers, global handlers, custom error classes');
  console.log('\nRun with "advanced" argument to see advanced concepts demo');
}

// Export functions for testing
module.exports = {
  // Core concepts
  eventLoopDemo,
  closureDemo,
  syncVsAsyncDemo,
  makeCounter,
  
  // Middleware
  loggingMiddleware,
  authMiddleware,
  createRateLimiter,
  errorHandler,
  
  // Security
  validateUser,
  escapeHtml,
  secureDbQuery,
  
  // Error handling
  asyncHandler,
  AppError,
  setupGlobalErrorHandlers,
  
  // Performance
  getSystemMetrics,
  measureEventLoopLag,
  
  // Streams & Buffers
  UppercaseTransform,
  bufferExamples,
  
  // Advanced
  calculateFibWithWorker,
  SimpleConnectionPool,
  LRUCache,
  cacheMiddleware,
  
  // Servers
  startHttpServer,
  startRedisServer,
  
  // Demo
  advancedConceptsDemo
};

if (require.main === module) {
  main();
}

# Node.js Concepts

## 1. Express Middleware

### Explanation
Middleware functions are functions that have access to the request object (req), response object (res), and the next middleware function in the application's request-response cycle. They execute in the order they are defined.

### Key Concepts
- **Execution Order**: Top to bottom, order matters!
- **next()**: Pass control to the next middleware
- **Types**: Application-level, Router-level, Error-handling, Built-in, Third-party
- **Request Pipeline**: req → middleware1 → middleware2 → ... → route handler → res

### Real-Time Example
**Security Check at Airport**: Every passenger goes through multiple checkpoints (passport verification → security scan → boarding pass check) in order. If any check fails, the passenger doesn't proceed.

### Code Block
```javascript
const express = require('express');
const app = express();

// 1. Application-level middleware (runs for all routes)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); // MUST call next() to continue
});

// 2. Built-in middleware
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body

// 3. Custom Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 4. Router-level middleware
const router = express.Router();

router.use((req, res, next) => {
  console.log('Router middleware');
  next();
});

// 5. Route with middleware
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});

// 6. Multiple middleware in sequence
const validateUser = (req, res, next) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email required' });
  }
  next();
};

const checkDuplicate = async (req, res, next) => {
  const exists = await User.findOne({ email: req.body.email });
  if (exists) {
    return res.status(409).json({ error: 'User already exists' });
  }
  next();
};

app.post('/users', [validateUser, checkDuplicate], async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// 7. Error-handling middleware (MUST have 4 parameters)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Real Interview Example: Rate Limiting Middleware
const rateLimit = {};

const rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (!rateLimit[ip]) {
      rateLimit[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }
    
    if (now > rateLimit[ip].resetTime) {
      rateLimit[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }
    
    if (rateLimit[ip].count >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    rateLimit[ip].count++;
    next();
  };
};

app.use('/api', rateLimiter(100, 60000));
```

---

## 2. Error Handling

### Explanation
Proper error handling ensures your application doesn't crash and provides meaningful feedback. In Express, errors can be handled using try-catch blocks, error-handling middleware, and Promise rejection handlers.

### Key Concepts
- **Synchronous Errors**: Use try-catch
- **Async Errors**: Use try-catch with async/await or .catch() with promises
- **Error Middleware**: 4-parameter function (err, req, res, next)
- **Centralized Error Handler**: Single place to handle all errors
- **Operational vs Programmer Errors**: Expected errors vs bugs

### Real-Time Example
**ATM Machine**: If withdrawal fails (insufficient balance), show user-friendly message. If machine malfunctions, log error, alert support, and gracefully shutdown.

### Code Block
```javascript
const express = require('express');
const app = express();

// Custom Error Class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async Error Wrapper (avoid repetitive try-catch)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Routes with error handling
app.get('/users/:id', asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json(user);
}));

app.post('/users', asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Validation
  if (!email || !password) {
    throw new AppError('Email and password required', 400);
  }
  
  // Check duplicate
  const exists = await User.findOne({ email });
  if (exists) {
    throw new AppError('Email already registered', 409);
  }
  
  const user = await User.create({ email, password });
  res.status(201).json(user);
}));

// Centralized Error Handler
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    // Detailed error in development
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // User-friendly error in production
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming error - don't leak details
      console.error('ERROR 💥:', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
      });
    }
  }
};

app.use(errorHandler);

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated!');
  });
});

// Real Interview Example: Database Error Handling
const handleDBErrors = (err) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return new AppError(`Invalid input: ${errors.join('. ')}`, 400);
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`${field} already exists`, 409);
  }
  
  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }
  
  return err;
};
```

---

## 3. Scaling Node.js Applications

### Explanation
Node.js runs on a single thread, so to utilize multiple CPU cores and handle more requests, we need to scale. Scaling can be vertical (bigger machine) or horizontal (more machines).

### Key Concepts
- **Cluster Module**: Fork multiple processes on same machine
- **PM2**: Process manager for production (auto-restart, load balancing)
- **Horizontal Scaling**: Multiple servers behind load balancer
- **Stateless**: Don't store session data in memory
- **Load Balancing**: Distribute traffic across servers

### Real-Time Example
**Restaurant Scaling**: Single chef (1 thread) → Multiple chefs sharing kitchen (cluster) → Multiple restaurant branches (horizontal scaling) with central booking system (load balancer).

### Code Block
```javascript
// 1. Cluster Module (Vertical Scaling)
const cluster = require('cluster');
const os = require('os');
const express = require('express');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);
  
  // Fork workers (one per CPU core)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Forking new worker...`);
    cluster.fork(); // Restart dead worker
  });
  
} else {
  // Worker processes
  const app = express();
  
  app.get('/', (req, res) => {
    res.json({ message: 'Hello', worker: process.pid });
  });
  
  app.listen(3000, () => {
    console.log(`Worker ${process.pid} started`);
  });
}

// 2. PM2 Configuration (ecosystem.config.js)
module.exports = {
  apps: [{
    name: 'api-server',
    script: './server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};

// Run with: pm2 start ecosystem.config.js

// 3. Stateless Application (for horizontal scaling)
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// 4. Worker Threads (for CPU-intensive tasks)
const { Worker } = require('worker_threads');

app.post('/process-data', (req, res) => {
  const worker = new Worker('./heavy-computation.js', {
    workerData: req.body.data
  });
  
  worker.on('message', (result) => {
    res.json({ result });
  });
  
  worker.on('error', (error) => {
    res.status(500).json({ error: error.message });
  });
});

// heavy-computation.js
const { parentPort, workerData } = require('worker_threads');

function heavyComputation(data) {
  // CPU-intensive work
  let result = 0;
  for (let i = 0; i < 1000000000; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

const result = heavyComputation(workerData);
parentPort.postMessage(result);

// 5. Caching Strategy
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 min TTL

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `user:${id}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }
  
  // Fetch from DB
  const user = await User.findById(id);
  
  // Store in cache
  cache.set(cacheKey, user);
  
  res.json({ source: 'database', data: user });
});

// 6. Nginx Load Balancer Configuration
/*
upstream nodejs_backend {
    least_conn;  # Load balancing method
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
*/
```

---

## 4. Async I/O & Event Loop

### Explanation
Node.js uses non-blocking I/O operations, allowing it to handle thousands of concurrent connections with a single thread. Operations like file reading, database queries, and HTTP requests are delegated to the system, and callbacks are executed when they complete.

### Key Concepts
- **libuv**: C library that implements event loop
- **Non-blocking**: Don't wait for I/O, continue executing
- **Event Loop Phases**: Timers → Pending → Idle → Poll → Check → Close
- **Thread Pool**: For file I/O, DNS, crypto (default 4 threads)

### Real-Time Example
**Restaurant Waiter**: Waiter doesn't wait at table for chef to cook (blocking). Instead, takes order, gives to chef, serves other tables, and returns when food is ready (non-blocking).

### Code Block
```javascript
const fs = require('fs');

// 1. Blocking (Synchronous) - BAD in Node.js
console.log('Start');
const data = fs.readFileSync('file.txt', 'utf8'); // Blocks thread
console.log(data);
console.log('End');

// 2. Non-blocking (Asynchronous) - GOOD
console.log('Start');
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});
console.log('End');
// Output: Start, End, [file contents]

// 3. Event Loop Phases
setTimeout(() => console.log('Timeout 1'), 0);      // Timers phase
setImmediate(() => console.log('Immediate 1'));     // Check phase

fs.readFile('file.txt', () => {
  console.log('File read');
  
  setTimeout(() => console.log('Timeout 2'), 0);
  setImmediate(() => console.log('Immediate 2'));
  
  // Within I/O callback, setImmediate executes before setTimeout
});

// 4. process.nextTick() vs setImmediate()
process.nextTick(() => console.log('nextTick'));    // Before event loop
setImmediate(() => console.log('setImmediate'));    // Check phase

// nextTick executes before setImmediate

// 5. Thread Pool Size
process.env.UV_THREADPOOL_SIZE = 8; // Increase from default 4

// 6. Real Interview Example: Parallel File Processing
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

async function processFiles(filePaths) {
  // Sequential (slow)
  const sequential = async () => {
    const results = [];
    for (const path of filePaths) {
      const content = await readFileAsync(path, 'utf8');
      results.push(content);
    }
    return results;
  };
  
  // Parallel (fast)
  const parallel = async () => {
    const promises = filePaths.map(path => readFileAsync(path, 'utf8'));
    return await Promise.all(promises);
  };
  
  return parallel(); // Much faster!
}

// 7. Streams for Large Files (memory efficient)
const readStream = fs.createReadStream('large-file.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.on('data', (chunk) => {
  console.log(`Received ${chunk.length} bytes`);
  writeStream.write(chunk.toUpperCase());
});

readStream.on('end', () => {
  console.log('File processing complete');
  writeStream.end();
});

// Or use pipe
readStream.pipe(writeStream);

// 8. Backpressure Handling
const transform = new stream.Transform({
  transform(chunk, encoding, callback) {
    // Process chunk
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

fs.createReadStream('input.txt')
  .pipe(transform)
  .pipe(fs.createWriteStream('output.txt'));
```

---

## 5. Worker Threads

### Explanation
Worker threads allow running JavaScript in parallel threads for CPU-intensive operations without blocking the main event loop. Unlike child processes, worker threads share memory via SharedArrayBuffer.

### Key Concepts
- **Use Case**: CPU-intensive tasks (image processing, compression, encryption)
- **Don't Use For**: I/O operations (already async)
- **Communication**: postMessage(), on('message')
- **Shared Memory**: SharedArrayBuffer, Atomics

### Real-Time Example
**Video Processing Service**: Main thread handles API requests. Worker threads process video encoding in parallel without blocking new requests.

### Code Block
```javascript
// 1. Basic Worker Thread
// main.js
const { Worker } = require('worker_threads');

function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Run worker
runWorker({ num: 42 })
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Error:', err));

// worker.js
const { parentPort, workerData } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(workerData.num);
parentPort.postMessage(result);

// 2. Worker Pool (reuse workers)
class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    
    for (let i = 0; i < poolSize; i++) {
      this.workers.push({ worker: null, busy: false });
    }
  }
  
  async runTask(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      this.queue.push(task);
      this.processQueue();
    });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const freeWorkerSlot = this.workers.find(w => !w.busy);
    if (!freeWorkerSlot) return;
    
    const task = this.queue.shift();
    freeWorkerSlot.busy = true;
    
    const worker = new Worker(this.workerScript, { workerData: task.data });
    freeWorkerSlot.worker = worker;
    
    worker.on('message', (result) => {
      task.resolve(result);
      freeWorkerSlot.busy = false;
      worker.terminate();
      this.processQueue();
    });
    
    worker.on('error', (error) => {
      task.reject(error);
      freeWorkerSlot.busy = false;
      worker.terminate();
      this.processQueue();
    });
  }
}

// Usage
const pool = new WorkerPool('./worker.js', 4);

async function processManyTasks() {
  const tasks = Array.from({ length: 100 }, (_, i) => i);
  const results = await Promise.all(
    tasks.map(num => pool.runTask({ num }))
  );
  console.log('All tasks completed:', results.length);
}

// 3. Real Interview Example: Image Processing API
const express = require('express');
const multer = require('multer');
const { Worker } = require('worker_threads');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/process-image', upload.single('image'), (req, res) => {
  const worker = new Worker('./image-processor.js', {
    workerData: {
      imagePath: req.file.path,
      operations: req.body.operations
    }
  });
  
  worker.on('message', (result) => {
    res.json({ success: true, outputPath: result.path });
  });
  
  worker.on('error', (error) => {
    res.status(500).json({ error: error.message });
  });
});

// image-processor.js
const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');

async function processImage() {
  const { imagePath, operations } = workerData;
  
  let image = sharp(imagePath);
  
  if (operations.resize) {
    image = image.resize(operations.resize.width, operations.resize.height);
  }
  
  if (operations.grayscale) {
    image = image.grayscale();
  }
  
  const outputPath = `processed-${Date.now()}.jpg`;
  await image.toFile(outputPath);
  
  return { path: outputPath };
}

processImage()
  .then(result => parentPort.postMessage(result))
  .catch(err => { throw err; });
```

---

## Interview Tips

1. **Explain event loop** with diagrams (call stack, callback queue)
2. **Middleware order matters** - demonstrate with examples
3. **Discuss scaling** - when to use cluster vs worker threads
4. **Error handling** - operational vs programmer errors
5. **Mention PM2** for production deployments
6. **Compare sync vs async** I/O with performance implications

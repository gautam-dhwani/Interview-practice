# Real-World Interview Scenarios

This guide covers practical, real-world scenarios frequently asked in technical interviews. Each scenario includes the problem, strategy, and implementation.

---

## 1. How to Handle Large Datasets in Node.js

### Problem
Process/query millions of records without running out of memory or crashing the server.

### Why This is Asked
Tests your understanding of:
- Memory management
- Streaming concepts
- Performance optimization
- Production-ready code

### Key Strategy

**❌ Bad Approach (Loads all data in memory):**
```javascript
// This will crash with millions of records!
app.get('/api/export-users', async (req, res) => {
  const users = await User.find();  // Loads ALL users in memory
  res.json(users);  // Server crashes if 10M users
});
```

**✅ Good Approach (Use Streams):**

### Solution 1: Database Cursors + Streams

```javascript
const { Transform } = require('stream');

app.get('/api/export-users', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write('[');
  
  let first = true;
  
  // Mongoose cursor (streams data)
  const cursor = User.find().cursor();
  
  cursor.on('data', (user) => {
    if (!first) res.write(',');
    res.write(JSON.stringify(user));
    first = false;
  });
  
  cursor.on('end', () => {
    res.write(']');
    res.end();
  });
  
  cursor.on('error', (error) => {
    res.status(500).end();
  });
});
```

**Memory Usage:**
- Bad approach: 10M records × 1KB = 10GB RAM ❌
- Stream approach: ~100KB RAM (processes one at a time) ✅

### Solution 2: Batch Processing with Pagination

```javascript
async function processLargeDataset() {
  const batchSize = 1000;
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    // Fetch batch
    const users = await User.find()
      .skip(skip)
      .limit(batchSize)
      .lean();  // Plain JS objects, faster
    
    if (users.length === 0) {
      hasMore = false;
      break;
    }
    
    // Process batch
    await processBatch(users);
    
    skip += batchSize;
    
    // Free memory
    users.length = 0;
    
    // Allow event loop to process other requests
    await new Promise(resolve => setImmediate(resolve));
  }
}

async function processBatch(users) {
  // Process 1000 users at a time
  for (const user of users) {
    await sendEmail(user.email);
  }
}
```

### Solution 3: Node.js Streams for CSV Export

```javascript
const { Readable, Transform } = require('stream');
const csv = require('csv-stringify');

app.get('/api/export-csv', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
  
  // Create readable stream from MongoDB cursor
  const cursor = User.find().lean().cursor();
  
  const readableStream = Readable.from(cursor);
  
  // Transform to CSV
  const csvStream = csv({
    header: true,
    columns: ['id', 'name', 'email', 'createdAt']
  });
  
  // Pipe: Database → CSV → Response
  readableStream
    .pipe(csvStream)
    .pipe(res);
});
```

**Interview Answer Template:**
> "For large datasets, I avoid loading everything in memory. I use **streams** or **batch processing**. With streams, data flows through pipes - read from DB, transform, write to response - using constant memory. For batch processing, I fetch 1000 records at a time, process them, then fetch next batch. This handles millions of records efficiently."

---

## 2. Bulk Upload - Millions of Records

### Problem
User uploads CSV with 5 million rows. How to process efficiently without blocking server?

### Key Strategy

**Architecture:**
```
Upload → Validate → Queue → Workers → Database → Progress Updates
```

### Complete Implementation

**Step 1: Upload Endpoint (Non-blocking)**

```javascript
const multer = require('multer');
const Bull = require('bull');

const upload = multer({ dest: 'uploads/' });
const uploadQueue = new Bull('bulk-upload');

app.post('/api/bulk-upload', upload.single('file'), async (req, res) => {
  // Immediate response
  const jobId = generateId();
  
  // Create job record
  await UploadJob.create({
    id: jobId,
    filename: req.file.filename,
    status: 'queued',
    totalRows: 0,
    processedRows: 0,
    failedRows: 0
  });
  
  // Add to queue (async processing)
  await uploadQueue.add({
    jobId,
    filepath: req.file.path,
    userId: req.user.id
  });
  
  // Return immediately
  res.json({
    jobId,
    message: 'Upload queued for processing',
    statusUrl: `/api/upload-status/${jobId}`
  });
});
```

**Step 2: Worker Process (Handles Heavy Lifting)**

```javascript
uploadQueue.process(5, async (job) => {  // 5 concurrent jobs
  const { jobId, filepath } = job.data;
  
  const fs = require('fs');
  const csv = require('csv-parser');
  
  await UploadJob.update(jobId, { status: 'processing' });
  
  let totalRows = 0;
  let processedRows = 0;
  let failedRows = 0;
  let batch = [];
  const batchSize = 1000;
  
  const errors = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
      .pipe(csv())
      .on('data', async (row) => {
        totalRows++;
        batch.push(row);
        
        // Process in batches of 1000
        if (batch.length >= batchSize) {
          const currentBatch = [...batch];
          batch = [];
          
          try {
            await processBatch(currentBatch, jobId);
            processedRows += currentBatch.length;
            
            // Update progress
            job.progress(Math.floor((processedRows / totalRows) * 100));
            
            await UploadJob.update(jobId, {
              processedRows,
              totalRows
            });
          } catch (error) {
            failedRows += currentBatch.length;
            errors.push({
              batch: processedRows,
              error: error.message
            });
          }
        }
      })
      .on('end', async () => {
        // Process remaining batch
        if (batch.length > 0) {
          await processBatch(batch, jobId);
          processedRows += batch.length;
        }
        
        // Update final status
        await UploadJob.update(jobId, {
          status: 'completed',
          totalRows,
          processedRows,
          failedRows,
          completedAt: new Date()
        });
        
        // Generate error report if failures
        if (errors.length > 0) {
          await generateErrorReport(jobId, errors);
        }
        
        resolve();
      })
      .on('error', reject);
  });
});

async function processBatch(rows, jobId) {
  // Validate batch
  const validRows = [];
  const invalidRows = [];
  
  for (const row of rows) {
    const validation = validateRow(row);
    if (validation.valid) {
      validRows.push(validation.data);
    } else {
      invalidRows.push({
        row,
        errors: validation.errors
      });
    }
  }
  
  // Bulk insert (much faster than one-by-one)
  if (validRows.length > 0) {
    await User.insertMany(validRows, {
      ordered: false  // Continue on error
    });
  }
  
  // Save invalid rows
  if (invalidRows.length > 0) {
    await FailedRow.insertMany(invalidRows.map(r => ({
      jobId,
      data: r.row,
      errors: r.errors
    })));
  }
}
```

**Step 3: Progress Tracking**

```javascript
app.get('/api/upload-status/:jobId', async (req, res) => {
  const job = await UploadJob.findById(req.params.jobId);
  
  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.totalRows > 0 
      ? Math.floor((job.processedRows / job.totalRows) * 100) 
      : 0,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    failedRows: job.failedRows,
    startedAt: job.createdAt,
    completedAt: job.completedAt
  });
});

// WebSocket for real-time updates
uploadQueue.on('progress', (job, progress) => {
  io.to(job.data.userId).emit('upload-progress', {
    jobId: job.data.jobId,
    progress
  });
});
```

**Step 4: Optimization - Bulk Insert**

```javascript
// ❌ Slow (5M × 50ms = 69 hours!)
for (const row of rows) {
  await User.create(row);  // 5 million individual inserts
}

// ✅ Fast (5000 × 1s = 1.4 hours)
const batchSize = 1000;
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  await User.insertMany(batch);  // Bulk insert
}
```

**Key Strategies:**
1. **Async Processing** - Queue the job, respond immediately
2. **Streaming** - Don't load entire file in memory
3. **Batching** - Process 1000 rows at a time
4. **Bulk Operations** - Use `insertMany` instead of individual inserts
5. **Progress Tracking** - Update status, emit events
6. **Error Handling** - Save failed rows, generate report
7. **Concurrency** - Process multiple uploads simultaneously (workers)

**Interview Answer:**
> "For bulk uploads, I use a **queue-based architecture**. The upload endpoint saves the file and queues a job, responding immediately. A background worker processes the CSV using **streams** to avoid memory issues. I batch process **1000 rows at a time** using `insertMany` for performance. Progress updates are sent via WebSocket. Failed rows are saved for retry. This can handle millions of records without blocking the server."

---

## 3. Bulk Download - Export Millions of Records

### Problem
User clicks "Export all data" - 10 million records. How to handle without timeout/crash?

### Key Strategy

**Option 1: Async Export with Email Delivery**

```javascript
app.post('/api/export-data', async (req, res) => {
  const exportId = generateId();
  
  // Create export job
  await ExportJob.create({
    id: exportId,
    userId: req.user.id,
    status: 'queued',
    fileUrl: null
  });
  
  // Queue export
  await exportQueue.add({
    exportId,
    userId: req.user.id,
    filters: req.body.filters
  });
  
  res.json({
    message: 'Export started. You will receive an email when ready.',
    exportId
  });
});

// Worker
exportQueue.process(async (job) => {
  const { exportId, userId, filters } = job.data;
  
  const fs = require('fs');
  const { stringify } = require('csv-stringify');
  const { pipeline } = require('stream');
  const { promisify } = require('util');
  const pipelineAsync = promisify(pipeline);
  
  const filename = `export-${exportId}.csv`;
  const filepath = `exports/${filename}`;
  
  await ExportJob.update(exportId, { status: 'processing' });
  
  // Create write stream
  const writeStream = fs.createWriteStream(filepath);
  
  // CSV stringifier
  const csvStream = stringify({
    header: true,
    columns: ['id', 'name', 'email', 'createdAt']
  });
  
  // Database cursor (streams data)
  const cursor = User.find(filters).lean().cursor();
  
  // Stream: Database → CSV → File
  await pipelineAsync(
    Readable.from(cursor),
    csvStream,
    writeStream
  );
  
  // Upload to S3
  const fileUrl = await uploadToS3(filepath, filename);
  
  // Update job
  await ExportJob.update(exportId, {
    status: 'completed',
    fileUrl,
    completedAt: new Date()
  });
  
  // Send email
  await sendEmail({
    to: (await User.findById(userId)).email,
    subject: 'Your export is ready',
    body: `Download: ${fileUrl} (expires in 24 hours)`
  });
  
  // Clean up local file
  fs.unlinkSync(filepath);
});
```

**Option 2: Chunked Download (Paginated)**

```javascript
// Generate export with multiple files
app.post('/api/export-chunked', async (req, res) => {
  const totalCount = await User.countDocuments(req.body.filters);
  const chunkSize = 100000;  // 100K per file
  const numChunks = Math.ceil(totalCount / chunkSize);
  
  const exportId = generateId();
  
  // Create chunks
  const chunks = [];
  for (let i = 0; i < numChunks; i++) {
    chunks.push({
      chunkId: i,
      skip: i * chunkSize,
      limit: chunkSize,
      status: 'pending'
    });
  }
  
  await ExportJob.create({
    id: exportId,
    userId: req.user.id,
    totalRecords: totalCount,
    chunks
  });
  
  // Queue each chunk
  for (const chunk of chunks) {
    await exportQueue.add({
      exportId,
      chunkId: chunk.chunkId,
      skip: chunk.skip,
      limit: chunk.limit
    });
  }
  
  res.json({
    exportId,
    totalRecords: totalCount,
    numFiles: numChunks
  });
});

// Download specific chunk
app.get('/api/export/:exportId/chunk/:chunkId', async (req, res) => {
  const { exportId, chunkId } = req.params;
  
  const exportJob = await ExportJob.findById(exportId);
  const chunk = exportJob.chunks.find(c => c.chunkId === parseInt(chunkId));
  
  if (!chunk || !chunk.fileUrl) {
    return res.status(404).json({ error: 'Chunk not ready' });
  }
  
  // Redirect to S3
  res.redirect(chunk.fileUrl);
});
```

**Option 3: Streaming Download (Real-time)**

```javascript
app.get('/api/export-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
  res.setHeader('Transfer-Encoding', 'chunked');  // Streaming
  
  const { stringify } = require('csv-stringify');
  const { pipeline } = require('stream');
  
  const cursor = User.find().lean().cursor();
  
  const csvStream = stringify({
    header: true,
    columns: ['id', 'name', 'email']
  });
  
  // Stream directly to response
  pipeline(
    Readable.from(cursor),
    csvStream,
    res,
    (err) => {
      if (err) {
        console.error('Stream error:', err);
      }
    }
  );
});
```

**Compression for Large Files:**

```javascript
const zlib = require('zlib');

app.get('/api/export-compressed', async (req, res) => {
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename=export.csv.gz');
  
  const cursor = User.find().lean().cursor();
  const csvStream = stringify({ header: true });
  const gzip = zlib.createGzip();
  
  // Database → CSV → Gzip → Response
  pipeline(
    Readable.from(cursor),
    csvStream,
    gzip,
    res,
    (err) => {
      if (err) console.error(err);
    }
  );
});
```

**Interview Answer:**
> "For bulk exports, I use **async processing**. The endpoint queues an export job and responds immediately. A worker streams data from the database, transforms to CSV, and uploads to S3. User gets an email with download link. For very large exports, I split into chunks (100K records per file). For real-time downloads, I use streaming with compression to handle millions of records efficiently."

---

## 4. How to Handle Memory Leaks in Production

### Problem
Node.js server crashes after running for days. Memory keeps growing.

### Common Causes & Solutions

**1. Event Listener Leaks**

```javascript
// ❌ Leak - Event listeners never removed
function createUserService() {
  const emitter = new EventEmitter();
  
  function watchUser(userId) {
    emitter.on('user-update', (data) => {  // Leaks!
      console.log(data);
    });
  }
  
  return { watchUser };
}

// Each call adds new listener, never removed
const service = createUserService();
for (let i = 0; i < 10000; i++) {
  service.watchUser(i);  // 10000 listeners!
}

// ✅ Fix - Remove listeners
function createUserServiceFixed() {
  const emitter = new EventEmitter();
  
  function watchUser(userId) {
    const handler = (data) => console.log(data);
    emitter.on('user-update', handler);
    
    // Return cleanup function
    return () => {
      emitter.off('user-update', handler);  // Cleanup
    };
  }
  
  return { watchUser };
}

const serviceFixed = createUserServiceFixed();
const cleanup = serviceFixed.watchUser(123);
cleanup();  // Remove listener when done
```

**2. Global Variables / Closures**

```javascript
// ❌ Leak - Cache grows forever
const cache = {};

app.get('/api/users/:id', (req, res) => {
  cache[req.params.id] = userData;  // Never cleared!
});

// ✅ Fix - Use LRU cache with size limit
const LRU = require('lru-cache');
const cache = new LRU({
  max: 500,
  maxAge: 1000 * 60 * 60  // 1 hour
});
```

**3. Database Connection Leaks**

```javascript
// ❌ Leak - Connections not closed
app.get('/api/data', async (req, res) => {
  const db = await mongodb.connect(url);  // New connection each request!
  const data = await db.collection('users').find().toArray();
  res.json(data);
  // Connection never closed!
});

// ✅ Fix - Connection pool
const client = await MongoClient.connect(url, {
  poolSize: 10
});

app.get('/api/data', async (req, res) => {
  const data = await client.db().collection('users').find().toArray();
  res.json(data);
});
```

**4. Detecting Memory Leaks**

```javascript
// Monitor memory usage
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory Usage:');
  console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
  console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
  console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`);
}, 60000);  // Every minute

// Heap snapshot for analysis
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshot = v8.writeHeapSnapshot();
  console.log('Heap snapshot written to:', snapshot);
}

// Compare snapshots over time to find leaks
```

**Interview Answer:**
> "Memory leaks commonly occur from **unclosed connections**, **event listeners not removed**, and **unbounded caches**. I prevent them by using **connection pools**, removing event listeners in cleanup functions, and using **LRU caches** with size limits. I monitor memory with `process.memoryUsage()` and use heap snapshots to identify leaks in production."

---

## 5. Rate Limiting Strategies

### Problem
Prevent abuse - limit API calls per user/IP.

### Implementation Strategies

**1. Fixed Window Counter (Simple)**

```javascript
const rateLimit = new Map();

function rateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    
    if (!rateLimit.has(key)) {
      rateLimit.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    const userLimit = rateLimit.get(key);
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }
    
    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      });
    }
    
    userLimit.count++;
    next();
  };
}

app.use('/api', rateLimiter(100, 60000));  // 100 req/min
```

**2. Sliding Window (More Accurate)**

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function slidingWindowRateLimit(req, res, next) {
  const key = `rate:${req.ip}`;
  const now = Date.now();
  const windowMs = 60000;  // 1 minute
  const maxRequests = 100;
  
  // Remove old requests
  await redis.zremrangebyscore(key, 0, now - windowMs);
  
  // Count requests in window
  const count = await redis.zcard(key);
  
  if (count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, Math.ceil(windowMs / 1000));
  
  next();
}
```

**3. Token Bucket (Burst Handling)**

```javascript
function createTokenBucket(capacity, refillRate) {
  let tokens = capacity;
  let lastRefill = Date.now();
  
  function refill() {
    const now = Date.now();
    const elapsed = (now - lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    
    tokens = Math.min(capacity, tokens + tokensToAdd);
    lastRefill = now;
  }
  
  function consume(tokensToConsume = 1) {
    refill();
    
    if (tokens >= tokensToConsume) {
      tokens -= tokensToConsume;
      return true;
    }
    
    return false;
  }
  
  return { consume };
}

const buckets = new Map();

function tokenBucketLimiter(req, res, next) {
  const key = req.ip;
  
  if (!buckets.has(key)) {
    buckets.set(key, createTokenBucket(100, 10));  // 100 capacity, 10/sec refill
  }
  
  const bucket = buckets.get(key);
  
  if (bucket.consume()) {
    next();
  } else {
    res.status(429).json({ error: 'Too many requests' });
  }
}
```

**Interview Answer:**
> "For rate limiting, I use **sliding window** with Redis. It tracks request timestamps in a sorted set. For each request, I remove old entries, count current requests, and reject if over limit. This is more accurate than fixed windows. For burst handling, I use **token bucket** algorithm. It allows temporary bursts while maintaining average rate."

---

Continue in next message...

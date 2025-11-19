# Whiteboard-Ready System Design Diagrams

Practice drawing these diagrams on paper/whiteboard before your interview. Each diagram should take 3-5 minutes to draw and explain.

---

## 1. URL Shortener (High Level)

### Problem
Design a service like bit.ly that converts long URLs to short URLs.

### Requirements
- Convert long URL to short URL
- Redirect short URL to original URL
- Handle 100M URLs
- High availability

### Architecture Diagram

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /shorten { url: "https://example.com/very-long-url" }
     │
     ▼
┌─────────────────────────────────────────────────┐
│          Load Balancer (Nginx)                  │
└────┬────────────────────────────────────────┬───┘
     │                                        │
     ▼                                        ▼
┌──────────────┐                        ┌──────────────┐
│ API Server 1 │                        │ API Server 2 │
└──────┬───────┘                        └──────┬───────┘
       │                                        │
       │ 2. Check if URL exists                │
       │    Generate short code (Base62)       │
       │                                        │
       ▼                                        ▼
┌─────────────────────────────────────────────────────┐
│              Redis Cache (Hot URLs)                 │
│  Key: "abc123" → Value: "https://example.com/..."  │
└──────────────────────┬──────────────────────────────┘
                       │ Cache miss
                       ▼
┌─────────────────────────────────────────────────────┐
│          Database (PostgreSQL/MongoDB)              │
│  ┌─────────┬────────────────────────────────────┐  │
│  │ short_id│ original_url                       │  │
│  ├─────────┼────────────────────────────────────┤  │
│  │ abc123  │ https://example.com/very-long-url  │  │
│  │ xyz789  │ https://another.com/url            │  │
│  └─────────┴────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

Response: { shortUrl: "http://short.ly/abc123" }


┌─────────┐
│ Client  │
└────┬────┘
     │
     │ GET /abc123
     │
     ▼
┌───────────────┐
│ Load Balancer │
└──────┬────────┘
       │
       ▼
┌──────────────┐
│  API Server  │──┐
└──────┬───────┘  │ 1. Check Redis
       │          │
       ▼          │
┌─────────────┐   │
│ Redis Cache │◄──┘
└─────────────┘
       │ Hit: Return URL
       │ Miss: Query DB → Cache it
       ▼
┌──────────────┐
│   Database   │
└──────────────┘

Response: 302 Redirect to original URL
```

### Key Components

**1. Short Code Generation (Base62):**
```javascript
function generateShortCode(id) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  while (id > 0) {
    result = chars[id % 62] + result;
    id = Math.floor(id / 62);
  }
  return result;
}
// ID 12345 → "dnh" (6 chars = 56 billion combinations)
```

**2. Caching Strategy:**
- Hot URLs (frequently accessed) in Redis
- TTL: 24 hours
- Cache hit rate: ~80%

**3. Analytics (Optional):**
```
┌──────────────┐
│  API Server  │
└──────┬───────┘
       │
       │ Async publish click event
       ▼
┌────────────────┐
│  Message Queue │
│   (RabbitMQ)   │
└──────┬─────────┘
       │
       ▼
┌─────────────────┐
│ Analytics Worker│
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Analytics DB    │
│ (Store clicks)  │
└─────────────────┘
```

**4. Database Schema:**
```sql
CREATE TABLE urls (
  id BIGSERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  click_count INTEGER DEFAULT 0
);

CREATE INDEX idx_short_code ON urls(short_code);
```

### Capacity Estimation
- 100M URLs stored
- Average URL length: 100 chars
- Storage: 100M × 100 bytes = 10GB
- Reads: 10K QPS → Redis can handle easily
- Writes: 100 QPS → Single DB sufficient

---

## 2. Bulk Upload Pipeline

### Problem
Upload CSV file with 100K rows, validate and process each row, handle errors.

### Requirements
- Upload large CSV (100K+ rows)
- Validate data
- Process asynchronously
- Retry failed rows
- Generate report

### Architecture Diagram

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /upload (CSV file)
     │
     ▼
┌─────────────────────────────────────────┐
│         API Server (Express)            │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 1. Receive file                 │   │
│  │ 2. Validate headers             │   │
│  │ 3. Create upload job            │   │
│  │ 4. Return job ID immediately    │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               │ Store file
               ▼
┌────────────────────────────────────────┐
│      File Storage (S3/Disk)            │
│  uploads/job-123.csv                   │
└────────────────────────────────────────┘
               │
               │ Publish job
               ▼
┌────────────────────────────────────────┐
│     Message Queue (SQS/RabbitMQ)       │
│  ┌──────────────────────────────────┐  │
│  │ Job: { jobId: 123, file: "..." }│  │
│  └──────────────────────────────────┘  │
└──────────────┬─────────────────────────┘
               │
               │ Worker polls queue
               ▼
┌────────────────────────────────────────┐
│    Worker Process (Node.js)            │
│                                        │
│  FOR EACH ROW:                         │
│  ┌──────────────────────────────────┐ │
│  │ 1. Read row from CSV             │ │
│  │ 2. Validate data                 │ │
│  │ 3. Transform data                │ │
│  │ 4. Process row (DB insert/API)   │ │
│  │ 5. Handle errors                 │ │
│  └──────────────────────────────────┘ │
└──────┬───────────────────┬─────────────┘
       │                   │
       │ Success           │ Error
       ▼                   ▼
┌──────────────┐    ┌──────────────────┐
│   Database   │    │  Dead Letter     │
│ (Insert data)│    │  Queue (Retry)   │
└──────────────┘    └────┬─────────────┘
                         │
                         │ Max 3 retries
                         ▼
                  ┌──────────────────┐
                  │  Error Report    │
                  │  { row: 105,     │
                  │    error: "..." }│
                  └──────────────────┘

Final Report Generation:
┌────────────────────────────────────────┐
│  Job Status Service                    │
│  ┌──────────────────────────────────┐  │
│  │ Total rows: 100,000              │  │
│  │ Processed: 99,500                │  │
│  │ Failed: 500                      │  │
│  │ Error report: errors.csv         │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Implementation Details

**1. Upload Endpoint:**
```javascript
app.post('/api/upload', upload.single('file'), async (req, res) => {
  // Create job
  const job = await Job.create({
    filename: req.file.filename,
    status: 'queued',
    totalRows: 0,
    processedRows: 0
  });
  
  // Publish to queue
  await queue.add('process-csv', {
    jobId: job.id,
    filepath: req.file.path
  });
  
  res.json({ jobId: job.id, status: 'queued' });
});
```

**2. Worker Process:**
```javascript
queue.process('process-csv', async (queueJob) => {
  const { jobId, filepath } = queueJob.data;
  const errors = [];
  
  await Job.update(jobId, { status: 'processing' });
  
  const stream = fs.createReadStream(filepath)
    .pipe(csv());
  
  let rowNum = 0;
  for await (const row of stream) {
    rowNum++;
    
    try {
      // Validate
      const validated = validateRow(row);
      
      // Process
      await processRow(validated);
      
      // Update progress
      await Job.increment(jobId, 'processedRows');
      queueJob.progress((rowNum / totalRows) * 100);
      
    } catch (error) {
      errors.push({
        row: rowNum,
        data: row,
        error: error.message,
        attempts: 0
      });
      
      // Add to retry queue if retryable
      if (isRetryable(error)) {
        await retryQueue.add('retry-row', {
          jobId,
          rowNum,
          row
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        });
      }
    }
  }
  
  // Generate error report
  if (errors.length > 0) {
    await generateErrorReport(jobId, errors);
  }
  
  await Job.update(jobId, { 
    status: 'completed',
    errorCount: errors.length
  });
});
```

**3. Progress Tracking:**
```javascript
app.get('/api/upload/:jobId/status', async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  res.json({
    jobId: job.id,
    status: job.status,
    progress: (job.processedRows / job.totalRows) * 100,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    errorCount: job.errorCount
  });
});
```

**4. Retry Logic:**
```javascript
retryQueue.process('retry-row', async (job) => {
  const { row } = job.data;
  
  try {
    await processRow(row);
  } catch (error) {
    if (job.attemptsMade >= 3) {
      // Max retries, save to error report
      await saveToErrorReport(job.data.jobId, {
        row: job.data.rowNum,
        error: error.message,
        finalAttempt: true
      });
    } else {
      throw error;  // Retry
    }
  }
});
```

### Scaling Considerations

**Multiple Workers:**
```
Queue → Worker 1 (processes rows 1-25,000)
     → Worker 2 (processes rows 25,001-50,000)
     → Worker 3 (processes rows 50,001-75,000)
     → Worker 4 (processes rows 75,001-100,000)
```

**Chunking Strategy:**
```javascript
// Split CSV into chunks
const chunkSize = 1000;
for (let i = 0; i < totalRows; i += chunkSize) {
  await queue.add('process-chunk', {
    jobId,
    filepath,
    startRow: i,
    endRow: i + chunkSize
  });
}
```

---

## 3. Real-time Notification System

### Problem
Send real-time notifications to users when events occur (new message, order update, etc.)

### Requirements
- Real-time delivery
- Support 1M concurrent users
- Retry failed deliveries
- Store missed notifications

### Architecture Diagram

```
┌───────────────────────────────────────┐
│      Application Services             │
│  (Orders, Messages, Comments, etc.)   │
└────────────┬──────────────────────────┘
             │
             │ Event occurs (new order, new message)
             │
             ▼
┌────────────────────────────────────────┐
│     Event Publisher (Redis Pub/Sub)    │
│  ┌──────────────────────────────────┐  │
│  │ Channel: "user:123:notifications"│  │
│  │ Message: {                       │  │
│  │   type: "new_order",             │  │
│  │   data: { orderId: 456 }         │  │
│  │ }                                │  │
│  └──────────────────────────────────┘  │
└──────────────┬─────────────────────────┘
               │
               │ Publish to subscribers
               │
         ┌─────┴─────┬─────────┬─────────┐
         ▼           ▼         ▼         ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ WebSocket   │ │ WebSocket   │ │ WebSocket   │
│ Server 1    │ │ Server 2    │ │ Server 3    │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       │ Connected users on each server
       │
    ┌──┴───┬───────┬───────┐
    ▼      ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│User │ │User │ │User │ │User │
│ 1   │ │ 2   │ │ 3   │ │ 4   │
└─────┘ └─────┘ └─────┘ └─────┘
(WS)   (WS)    (WS)    (WS)


User Connection Flow:
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. HTTP GET /auth → JWT token
     │
     │ 2. WebSocket connect with token
     │    ws://notifications.example.com?token=...
     │
     ▼
┌────────────────────────────────────────┐
│    Load Balancer (Sticky Session)      │
│    (Routes user to same WS server)     │
└──────────────┬─────────────────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│      WebSocket Server (Socket.io)      │
│                                        │
│  1. Verify JWT                         │
│  2. Subscribe to user's Redis channel  │
│  3. Send connection established        │
│  4. Listen for messages                │
└──────┬─────────────────────────────────┘
       │
       │ Subscribe to Redis channel
       ▼
┌────────────────────────────────────────┐
│         Redis Pub/Sub                  │
└────────────────────────────────────────┘


Notification Delivery Flow:

Event → Redis Pub/Sub → WebSocket Server → Check if user connected
                                                    │
                                    ┌───────────────┴─────────────┐
                                    │                             │
                              User Online                   User Offline
                                    │                             │
                                    ▼                             ▼
                          Send via WebSocket          ┌────────────────────┐
                                    │                 │ Store in Database  │
                                    │                 │ (Pending queue)    │
                                    │                 └────────┬───────────┘
                                    │                          │
                                    │                          │
                                    ▼                          ▼
                          ┌──────────────────┐      ┌──────────────────┐
                          │ Mark as delivered│      │ Retry on connect │
                          └──────────────────┘      └──────────────────┘
```

### Implementation

**1. WebSocket Server:**
```javascript
const io = require('socket.io');
const redis = require('redis');

const server = io(3000);
const subscriber = redis.createClient();
const publisher = redis.createClient();

// User connections map
const userConnections = new Map();

// Authenticate connection
server.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Handle connection
server.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`User ${userId} connected`);
  
  // Store connection
  userConnections.set(userId, socket);
  
  // Subscribe to user's notification channel
  const channel = `user:${userId}:notifications`;
  subscriber.subscribe(channel);
  
  // Send pending notifications
  sendPendingNotifications(userId, socket);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    userConnections.delete(userId);
    subscriber.unsubscribe(channel);
    console.log(`User ${userId} disconnected`);
  });
});

// Listen for Redis messages
subscriber.on('message', (channel, message) => {
  const userId = channel.split(':')[1];
  const socket = userConnections.get(userId);
  
  if (socket) {
    socket.emit('notification', JSON.parse(message));
    markAsDelivered(message.id);
  } else {
    // User disconnected, store for later
    storeNotification(userId, message);
  }
});
```

**2. Event Publisher:**
```javascript
// Order service publishes event
async function createOrder(orderData) {
  const order = await Order.create(orderData);
  
  // Publish notification
  const notification = {
    id: generateId(),
    userId: order.userId,
    type: 'new_order',
    title: 'Order Confirmed',
    message: `Your order #${order.id} has been confirmed`,
    data: { orderId: order.id },
    createdAt: new Date()
  };
  
  // Publish to Redis
  await publisher.publish(
    `user:${order.userId}:notifications`,
    JSON.stringify(notification)
  );
  
  // Also store in DB (for offline users)
  await Notification.create(notification);
  
  return order;
}
```

**3. Missed Notifications:**
```javascript
async function sendPendingNotifications(userId, socket) {
  // Fetch undelivered notifications
  const notifications = await Notification.find({
    userId,
    delivered: false
  }).sort({ createdAt: 1 });
  
  for (const notif of notifications) {
    socket.emit('notification', notif);
    await Notification.update(notif.id, { delivered: true });
  }
}
```

**4. Scaling to Multiple Servers:**
```javascript
// Each WebSocket server subscribes to same Redis channel
// When user connects to Server 1, Server 1 subscribes to user's channel
// When event published, ALL servers receive it
// Only server with active connection sends to user

// Redis Pub/Sub broadcasts to ALL subscribers
// Use Redis to track which server has which user

const activeConnections = redis.createClient();

// On connect
activeConnections.set(`user:${userId}:server`, SERVER_ID);

// On event
const serverId = await activeConnections.get(`user:${userId}:server`);
if (serverId === SERVER_ID) {
  // This server has the connection, send notification
  socket.emit('notification', notification);
}
```

---

## How to Present These Diagrams in Interview

**1. Start with Requirements:**
"Let me clarify the requirements first..."

**2. Draw High-Level Architecture:**
Draw boxes for major components (Client, LB, Servers, DB)

**3. Explain Data Flow:**
"When a user makes a request, it goes through..."

**4. Discuss Trade-offs:**
"We use Redis for caching because... but this means..."

**5. Scale Numbers:**
"This handles 10K requests/second. To scale to 100K, we'd need..."

**6. Handle Failures:**
"If the cache fails, we fallback to database..."

**7. Ask Questions:**
"What's more important - consistency or availability?"

---

## Practice Tips

1. **Draw on Paper:** Practice drawing these without looking
2. **Time Yourself:** 5 minutes per diagram
3. **Explain Out Loud:** Talk through the flow
4. **Label Everything:** Clear component names
5. **Use Arrows:** Show data flow direction
6. **Numbers:** Add capacity estimates (10K QPS, 100M users)
7. **Alternatives:** Mention trade-offs and other approaches

**Before Interview:**
- Practice all 3 diagrams
- Draw them from memory
- Explain to friend/mirror
- Be ready to extend them (What if we need analytics? Real-time updates? etc.)

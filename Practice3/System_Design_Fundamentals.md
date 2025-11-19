# System Design Fundamentals

## 1. Caching Strategies

### Explanation
Caching stores frequently accessed data in fast storage (memory) to reduce database load and improve response times. Critical for scaling applications.

### Key Concepts
- **Cache Hit**: Data found in cache (fast)
- **Cache Miss**: Data not in cache, fetch from DB (slow)
- **Eviction Policies**: LRU, LFU, FIFO, TTL
- **Cache Layers**: Browser → CDN → App Cache → DB Cache

### Real-Time Example
**Library**: Popular books kept at front desk (cache) for quick access. Rare books in storage (database). Librarian tracks which books are popular (LRU).

### Code Block
```javascript
// 1. Simple In-Memory Cache (LRU)
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  put(key, value) {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end
    this.cache.set(key, value);
    
    // Evict least recently used if over capacity
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

// Usage
const cache = new LRUCache(3);
cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);
console.log(cache.get('a'));  // 1 (a is now most recent)
cache.put('d', 4);  // Evicts 'b' (least recently used)

// 2. Redis Cache with Express
const redis = require('redis');
const client = redis.createClient();

// Middleware
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    // Check cache
    const cached = await client.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    // Modify res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      client.setex(key, duration, JSON.stringify(data));
      return originalJson(data);
    };
    
    next();
  };
};

// Use cache
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
  const products = await Product.find();  // Slow DB query
  res.json(products);
});

// First request: Cache miss → DB query → Cache set → Response (500ms)
// Subsequent requests: Cache hit → Response (5ms)

// 3. Cache Invalidation
// Problem: Data changed in DB but cache has old data

// Solution 1: TTL (Time To Live)
client.setex('user:123', 600, JSON.stringify(user));  // Expires in 10 min

// Solution 2: Invalidate on update
app.put('/api/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body);
  
  // Invalidate cache
  await client.del(`user:${req.params.id}`);
  
  res.json(user);
});

// Solution 3: Write-through cache
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  
  // Write to cache immediately
  await client.setex(`user:${user.id}`, 600, JSON.stringify(user));
  
  res.json(user);
});

// 4. Cache-Aside Pattern (Lazy Loading)
async function getUser(id) {
  const cacheKey = `user:${id}`;
  
  // 1. Check cache
  let user = await client.get(cacheKey);
  if (user) return JSON.parse(user);
  
  // 2. Cache miss - fetch from DB
  user = await User.findById(id);
  
  // 3. Store in cache
  await client.setex(cacheKey, 600, JSON.stringify(user));
  
  return user;
}

// 5. Real Interview Example: Product Catalog Caching
class ProductCache {
  constructor() {
    this.redis = redis.createClient();
    this.ttl = 3600;  // 1 hour
  }
  
  async getProduct(id) {
    const key = `product:${id}`;
    
    // Try cache
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    
    // Fetch from DB
    const product = await Product.findById(id);
    if (!product) return null;
    
    // Cache it
    await this.redis.setex(key, this.ttl, JSON.stringify(product));
    
    return product;
  }
  
  async searchProducts(query) {
    const key = `search:${JSON.stringify(query)}`;
    
    // Try cache
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    
    // Fetch from DB
    const products = await Product.find(query);
    
    // Cache for 5 minutes (searches change frequently)
    await this.redis.setex(key, 300, JSON.stringify(products));
    
    return products;
  }
  
  async updateProduct(id, updates) {
    const product = await Product.findByIdAndUpdate(id, updates);
    
    // Invalidate caches
    await this.redis.del(`product:${id}`);
    await this.redis.del('search:*');  // Clear all search caches
    
    return product;
  }
}

// 6. Caching Strategies Comparison
/*
1. Cache-Aside (Lazy Loading)
   - App checks cache first
   - On miss, loads from DB and updates cache
   - ✅ Only caches requested data
   - ❌ Initial request is slow (cache miss)

2. Write-Through
   - App writes to cache and DB simultaneously
   - ✅ Cache always up-to-date
   - ❌ Every write is slow (two operations)

3. Write-Behind (Write-Back)
   - App writes to cache, async writes to DB later
   - ✅ Fast writes
   - ❌ Risk of data loss if cache fails

4. Read-Through
   - Cache handles DB fetching automatically
   - ✅ Transparent to app
   - ❌ Complex cache implementation
*/
```

---

## 2. Message Queues

### Explanation
Queues decouple producers from consumers, allowing async processing. Messages wait in queue until worker processes them.

### Key Concepts
- **Producer**: Sends messages to queue
- **Consumer/Worker**: Processes messages from queue
- **Async Processing**: Non-blocking operations
- **Retry Logic**: Handle failed messages

### Real-Time Example
**Restaurant Orders**: Waiter (producer) puts orders in kitchen window (queue). Chefs (workers) pick orders when ready. If chef busy, orders wait.

### Code Block
```javascript
// 1. Simple Queue with Bull (Redis-based)
const Queue = require('bull');
const emailQueue = new Queue('email', {
  redis: { host: 'localhost', port: 6379 }
});

// Producer: Add job to queue
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  
  // Send welcome email asynchronously
  await emailQueue.add('welcome-email', {
    to: user.email,
    name: user.name
  });
  
  res.status(201).json(user);
  // Response sent immediately, email sent in background
});

// Consumer: Process jobs
emailQueue.process('welcome-email', async (job) => {
  const { to, name } = job.data;
  
  await sendEmail({
    to,
    subject: 'Welcome!',
    body: `Hello ${name}, welcome to our platform!`
  });
  
  console.log(`Welcome email sent to ${to}`);
});

// 2. Job with Retry Logic
emailQueue.process('send-email', async (job) => {
  try {
    await sendEmail(job.data);
  } catch (error) {
    if (job.attemptsMade < 3) {
      throw error;  // Retry
    } else {
      // Max retries reached, log and move to failed queue
      console.error('Email failed after 3 attempts:', error);
    }
  }
});

// Configure retry
emailQueue.add('send-email', emailData, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // 2s, 4s, 8s
  }
});

// 3. Real Interview Example: Image Processing Pipeline
const imageQueue = new Queue('image-processing');

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  const image = {
    path: req.file.path,
    userId: req.user.id,
    id: generateId()
  };
  
  // Add to queue
  await imageQueue.add('process-image', image, {
    attempts: 3,
    timeout: 30000  // 30 seconds
  });
  
  res.json({ 
    message: 'Image uploaded, processing started',
    imageId: image.id
  });
});

// Worker: Process images
imageQueue.process('process-image', 5, async (job) => {  // 5 concurrent workers
  const { path, userId, id } = job.data;
  
  // Progress tracking
  job.progress(0);
  
  // Resize
  const resized = await sharp(path).resize(800, 600).toBuffer();
  job.progress(33);
  
  // Generate thumbnail
  const thumbnail = await sharp(path).resize(200, 200).toBuffer();
  job.progress(66);
  
  // Upload to S3
  await uploadToS3(resized, `images/${id}.jpg`);
  await uploadToS3(thumbnail, `thumbnails/${id}.jpg`);
  job.progress(100);
  
  // Update database
  await Image.create({
    userId,
    imageUrl: `https://cdn.example.com/images/${id}.jpg`,
    thumbnailUrl: `https://cdn.example.com/thumbnails/${id}.jpg`
  });
  
  return { imageId: id, status: 'completed' };
});

// 4. Priority Queues
await emailQueue.add('urgent-email', data, { priority: 1 });  // High priority
await emailQueue.add('newsletter', data, { priority: 10 });   // Low priority

// 5. Scheduled Jobs (Delayed)
await emailQueue.add('reminder-email', data, {
  delay: 24 * 60 * 60 * 1000  // Send after 24 hours
});

// 6. Event Listeners
imageQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
  // Notify user via WebSocket
  io.to(job.data.userId).emit('image-processed', result);
});

imageQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
  // Notify admin
});

imageQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

// 7. Bulk Upload Example
app.post('/api/bulk-upload', async (req, res) => {
  const { users } = req.body;  // Array of 10,000 users
  
  // Add all to queue
  const jobs = users.map(user => ({
    name: 'create-user',
    data: user
  }));
  
  await userQueue.addBulk(jobs);
  
  res.json({ 
    message: `${users.length} users queued for creation` 
  });
});

// Process with rate limiting
userQueue.process('create-user', async (job) => {
  await User.create(job.data);
  await sendWelcomeEmail(job.data.email);
  
  // Rate limit: 100 users per minute
  await delay(600);  // 600ms between jobs
});
```

---

## 3. Horizontal vs Vertical Scaling

### Explanation
Scaling handles increased load. Vertical scaling = bigger machine. Horizontal scaling = more machines.

### Key Concepts
- **Vertical (Scale Up)**: Add CPU/RAM to one server
- **Horizontal (Scale Out)**: Add more servers
- **Load Balancer**: Distributes traffic across servers
- **Stateless**: Required for horizontal scaling

### Real-Time Example
**Checkout Lines**: Vertical = faster cashier. Horizontal = more checkout lines. Horizontal is better for crowds.

### Code Block
```javascript
// 1. Vertical Scaling Limitations
/*
Single Server:
- 4 CPU cores → 8 cores → 16 cores
- 16GB RAM → 32GB → 64GB
- Limit: ~96 cores, ~1TB RAM (expensive!)
- Single point of failure
- Downtime during upgrades
*/

// 2. Horizontal Scaling (Multiple Servers)
/*
Architecture:
Client → Load Balancer → [Server1, Server2, Server3, ...]

Benefits:
- Unlimited scaling (add more servers)
- High availability (one fails, others continue)
- No downtime (rolling updates)
- Cost-effective (commodity hardware)
*/

// 3. Making App Stateless (Required for Horizontal Scaling)

// ❌ BAD: Storing session in memory
const sessions = {};  // Lost when server restarts!

app.post('/login', (req, res) => {
  const token = generateToken();
  sessions[token] = { userId: user.id };  // Stored in THIS server only
  res.json({ token });
});

app.get('/profile', (req, res) => {
  const session = sessions[req.headers.token];  // Only works if routed to same server!
  // ...
});

// ✅ GOOD: Stateless with JWT
app.post('/login', (req, res) => {
  const token = jwt.sign({ userId: user.id }, SECRET);  // Self-contained
  res.json({ token });
});

app.get('/profile', (req, res) => {
  const decoded = jwt.verify(req.headers.token, SECRET);  // Works on any server!
  // ...
});

// ✅ GOOD: Shared session store (Redis)
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),  // All servers share Redis
  secret: 'secret'
}));

// 4. Load Balancer Algorithms

/*
1. Round Robin
   Request 1 → Server 1
   Request 2 → Server 2
   Request 3 → Server 3
   Request 4 → Server 1 (repeat)

2. Least Connections
   Route to server with fewest active connections
   Good for variable request durations

3. IP Hash
   hash(client_ip) % num_servers
   Same client always goes to same server
   Good for sticky sessions (but prefer stateless!)

4. Weighted
   Server1 (2x capacity) gets 2x traffic
*/

// 5. Nginx Load Balancer Config
/*
upstream backend {
    least_conn;  # Algorithm
    
    server 10.0.0.1:3000 weight=2;  # 2x capacity
    server 10.0.0.2:3000;
    server 10.0.0.3:3000;
    server 10.0.0.4:3000 backup;    # Only if others fail
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
*/

// 6. Health Checks
/*
Load balancer pings servers every 5 seconds:
GET /health → 200 OK (server healthy)
GET /health → 500 Error or timeout (remove from pool)
*/

app.get('/health', (req, res) => {
  // Check DB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ status: 'unhealthy' });
  }
  
  // Check Redis
  if (!redisClient.connected) {
    return res.status(500).json({ status: 'unhealthy' });
  }
  
  res.json({ status: 'healthy' });
});

// 7. Auto-Scaling
/*
Cloud Auto-Scaling (AWS, GCP):
- Min servers: 2
- Max servers: 10
- Scale up when: CPU > 70% for 5 minutes
- Scale down when: CPU < 30% for 10 minutes

Traffic Pattern:
8am: 1000 req/s → 2 servers (normal)
12pm: 5000 req/s → 6 servers (lunch rush, auto-scale up)
3pm: 2000 req/s → 3 servers (auto-scale down)
*/

// 8. Real Interview Example: Scaling Strategy

/*
Current: Single server (4 cores, 8GB RAM)
- 1000 users/day
- Response time: 100ms

Growth: 10,000 users/day expected

Vertical Scaling:
- Upgrade to 16 cores, 32GB RAM
- Cost: $500/month
- Handles ~5,000 users
- Still single point of failure ❌

Horizontal Scaling:
- 3 servers (4 cores, 8GB each) + Load Balancer
- Cost: $400/month
- Handles 10,000+ users
- High availability ✅
- Can add more servers easily ✅

Recommendation: Horizontal Scaling
*/
```

---

## 4. Database Sharding

### Explanation
Sharding splits database into smaller pieces (shards) across multiple servers. Each shard holds subset of data.

### Key Concepts
- **Shard Key**: Field used to determine which shard (userId, region)
- **Horizontal Partitioning**: Split rows across shards
- **Trade-offs**: Complex queries, joins difficult

### Real-Time Example
**Post Office**: Letters sorted by zip code into different trucks (shards). Each truck (shard) handles specific zip codes.

### Code Block
```javascript
// 1. Sharding Strategy

// User Database (1M users)
// Without sharding: Single DB, slow queries

// With sharding (by userId):
// Shard 1: userId 0-333,333
// Shard 2: userId 333,334-666,666
// Shard 3: userId 666,667-999,999

// 2. Shard Selection Function
function getShardForUser(userId) {
  const shardCount = 3;
  const shardId = userId % shardCount;
  
  const shards = {
    0: 'mongodb://shard1.example.com',
    1: 'mongodb://shard2.example.com',
    2: 'mongodb://shard3.example.com'
  };
  
  return shards[shardId];
}

// 3. Sharded User Service
class ShardedUserService {
  constructor() {
    this.shards = [
      mongoose.createConnection('mongodb://shard1'),
      mongoose.createConnection('mongodb://shard2'),
      mongoose.createConnection('mongodb://shard3')
    ];
  }
  
  getShard(userId) {
    const shardId = userId % this.shards.length;
    return this.shards[shardId];
  }
  
  async getUser(userId) {
    const shard = this.getShard(userId);
    return shard.model('User').findOne({ userId });
  }
  
  async createUser(userData) {
    const userId = generateUserId();
    const shard = this.getShard(userId);
    
    return shard.model('User').create({
      userId,
      ...userData
    });
  }
  
  async updateUser(userId, updates) {
    const shard = this.getShard(userId);
    return shard.model('User').findOneAndUpdate({ userId }, updates);
  }
}

// 4. Sharding by Geographic Region
class GeoShardedService {
  constructor() {
    this.shards = {
      'US': mongoose.createConnection('mongodb://us-shard'),
      'EU': mongoose.createConnection('mongodb://eu-shard'),
      'ASIA': mongoose.createConnection('mongodb://asia-shard')
    };
  }
  
  getShard(region) {
    return this.shards[region];
  }
  
  async getUsers(region) {
    const shard = this.getShard(region);
    return shard.model('User').find();
  }
}

// 5. Problems with Sharding

// ❌ Cross-shard queries are slow
// Get all users with age > 25
// Must query all 3 shards and merge results
async function getUsersByAge(age) {
  const results = await Promise.all([
    shard1.model('User').find({ age: { $gt: age } }),
    shard2.model('User').find({ age: { $gt: age } }),
    shard3.model('User').find({ age: { $gt: age } })
  ]);
  
  return results.flat();  // Merge
}

// ❌ Joins across shards impossible
// User on Shard1, Orders on Shard2
// Can't do JOIN, must fetch separately

// ❌ Shard key is immutable
// If userId determines shard, can't change userId
// Moving data between shards is expensive

// 6. Consistent Hashing (Better Sharding)
class ConsistentHash {
  constructor(shards) {
    this.ring = [];
    this.virtualNodes = 150;  // Virtual nodes per shard
    
    shards.forEach(shard => {
      for (let i = 0; i < this.virtualNodes; i++) {
        const hash = this.hash(`${shard}:${i}`);
        this.ring.push({ hash, shard });
      }
    });
    
    this.ring.sort((a, b) => a.hash - b.hash);
  }
  
  hash(key) {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  getShard(key) {
    const hash = this.hash(key);
    
    // Find first shard with hash >= key hash
    for (let node of this.ring) {
      if (node.hash >= hash) {
        return node.shard;
      }
    }
    
    // Wrap around to first shard
    return this.ring[0].shard;
  }
}

// Benefits: Adding/removing shards only affects neighbors, not all data

// 7. Real Interview Example: E-commerce Sharding

/*
Problem: 100M users, 1B orders
Single DB too slow

Solution: Shard by userId

Users Collection:
- Shard by userId % 10
- 10 shards, 10M users each

Orders Collection:
- Shard by userId (same as user)
- User and their orders on same shard (enables joins!)

Products Collection:
- Don't shard (only 100K products)
- Replicate to all shards

Query Examples:
1. Get user by ID → O(1) single shard
2. Get user's orders → O(1) single shard, can JOIN
3. Get product by ID → Any shard (replicated)
4. Get all orders → Slow (query all shards)
*/
```

---

## 5. Load Balancing

### Explanation
Covered in Horizontal Scaling section above. See Nginx configuration and algorithms.

---

## Interview Tips

1. **Draw architecture diagrams** - show components visually
2. **Explain trade-offs** - caching consistency, scaling costs
3. **Real numbers** - cache hit rate, latency improvements
4. **Start simple** - single server → vertical → horizontal
5. **Discuss bottlenecks** - DB, CPU, memory, network
6. **CAP theorem** - Consistency, Availability, Partition tolerance (can only have 2)
7. **Use real examples** - Netflix (caching), Uber (geo-sharding)

---

## Common System Design Questions

1. **Design URL Shortener**: Redis cache + DB + Base62 encoding
2. **Design Twitter**: Timeline service, fanout on write, Redis cache
3. **Design Instagram**: S3 storage, CDN, metadata DB, feed generation
4. **Design Uber**: Geo-sharding, WebSocket, Redis pub/sub, matching algorithm
5. **Design WhatsApp**: WebSocket, message queue, offline storage

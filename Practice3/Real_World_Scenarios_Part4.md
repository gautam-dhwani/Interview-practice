# Real-World Scenarios - Part 4: High Traffic & Crisis Management

## Crisis Scenarios Every Backend Developer Should Know

---

## 1. Handling 1 Million Concurrent Users

### Problem
Your application suddenly gets 1 million users hitting the server at the same time (viral event, marketing campaign, breaking news). How do you handle this?

### Why This Happens
- Product launch / Black Friday sale
- Viral social media post
- Breaking news event
- Celebrity endorsement
- Successful marketing campaign

### Immediate Response Strategy

**Phase 1: Prevent Complete Failure (First 5 minutes)**

1. **Enable Rate Limiting**
   - Protect critical endpoints immediately
   - Allow 100 req/min per user instead of unlimited
   - Return 429 status with "Retry-After" header

2. **Turn On Auto-Scaling**
   - Horizontal scaling: Add more servers (AWS Auto Scaling, Kubernetes HPA)
   - Scale from 10 servers → 100+ servers automatically
   - Takes 2-5 minutes to spin up new instances

3. **Activate CDN Caching**
   - Serve static assets from CDN (CloudFront, Cloudflare)
   - Cache API responses that don't change often
   - Reduces 70-80% load on origin servers

4. **Enable Aggressive Caching**
   - Cache everything possible in Redis
   - Increase TTL (Time To Live) temporarily
   - Accept slightly stale data for read operations

**Phase 2: Database Protection (Minutes 5-15)**

1. **Enable Read Replicas**
   - Direct read queries to replica databases
   - Master handles writes, replicas handle reads
   - Can have 5-10 read replicas

2. **Implement Query Caching**
   - Cache frequent database queries in Redis
   - Check cache before hitting database
   - Can reduce DB load by 90%

3. **Graceful Degradation**
   - Turn off non-critical features temporarily
   - Disable recommendation engine
   - Disable analytics tracking
   - Disable email notifications (queue them)

**Phase 3: Optimize Critical Path (Minutes 15-30)**

1. **Queue Non-Critical Operations**
   - User registration email → Queue
   - Order confirmation → Queue
   - Analytics events → Queue
   - Process later when traffic normalizes

2. **Use Circuit Breakers**
   - If payment service is slow, show "Try again later"
   - Don't wait for timeouts
   - Fail fast and return friendly error

3. **Prioritize Requests**
   - Paying customers get priority
   - Free tier gets rate limited first
   - Critical operations (checkout) over non-critical (profile view)

### Long-Term Architecture Changes

**1. Load Balancer Configuration**
```
                  ┌─────────────────┐
                  │  Load Balancer  │ (Distribute traffic)
                  └────────┬────────┘
            ┌─────────────┼─────────────┐
            ↓             ↓             ↓
      ┌─────────┐   ┌─────────┐   ┌─────────┐
      │ Server 1│   │ Server 2│   │Server N │ (Auto-scale)
      └────┬────┘   └────┬────┘   └────┬────┘
           └─────────────┼─────────────┘
                         ↓
              ┌──────────────────┐
              │   Redis Cluster  │ (Shared cache)
              └──────────────────┘
                         ↓
              ┌──────────────────┐
              │  Database Pool   │ (Connection pooling)
              │  Master + Replicas│
              └──────────────────┘
```

**2. Caching Strategy**
- **L1 Cache**: In-memory (Node.js Map) - 1ms latency
- **L2 Cache**: Redis - 5-10ms latency
- **L3 Cache**: CDN - 20-50ms latency
- **Origin**: Database - 100-500ms latency

**3. Database Optimization**
- **Sharding**: Split data across multiple databases
  - Users A-M → DB1
  - Users N-Z → DB2
- **Indexes**: Ensure all queries use indexes
- **Connection Pooling**: Reuse database connections
- **Read/Write Splitting**: Master for writes, replicas for reads

**4. Message Queue Architecture**
```
User Request → API Server → Queue (RabbitMQ/Kafka)
                                    ↓
                            Background Workers
                            (Process 1000/sec)
                                    ↓
                            Complete Processing
```

### Key Metrics to Monitor

1. **Response Time**: Should stay under 200ms
2. **Error Rate**: Should stay under 0.1%
3. **CPU Usage**: Should stay under 70%
4. **Memory Usage**: Should stay under 80%
5. **Database Connections**: Should not hit limit
6. **Queue Length**: Should not keep growing

### Real Example: Twitter During Elections

**Problem**: 500K tweets per second during major event

**Solution**:
- Write tweets to queue immediately (fast response to user)
- Process tweets in background
- Show "Processing" on timeline briefly
- Aggressive caching of timelines
- CDN for media files
- Read replicas for timeline generation

---

## 2. Database Crashes During Peak Traffic

### Problem
Your primary database server crashes while handling millions of requests. What do you do?

### Immediate Actions (First 2 Minutes)

1. **Automatic Failover to Replica**
   - Pre-configured read replica becomes new master
   - DNS/Load balancer automatically redirects
   - Downtime: 30-60 seconds

2. **Enable Read-Only Mode**
   - If failover not ready, enable read-only mode
   - Users can browse but not make changes
   - Better than complete downtime

3. **Serve from Cache**
   - Serve everything from Redis/CDN
   - Accept that data may be 5 minutes old
   - Keep application running

### Root Cause Analysis

**Common Reasons Database Crashes:**

1. **Too Many Connections**
   - Default limit: 100-150 connections
   - Peak traffic: 10,000 requests/second
   - Solution: Connection pooling (max 20-30 connections)

2. **Long Running Queries**
   - One slow query blocks others
   - Locks entire table
   - Solution: Query timeout (5 seconds max)

3. **Out of Memory**
   - Large result sets loaded in memory
   - Solution: Pagination, streaming results

4. **Disk Space Full**
   - Logs fill up disk
   - Database can't write
   - Solution: Log rotation, monitoring

### Prevention Strategy

**1. Database Replication Setup**
```
Master DB (Write)
    ↓ (Replication)
Replica 1 (Read) ← Load Balancer → Replica 2 (Read)
    ↓                                   ↓
Users (Read)                        Users (Read)
```

**2. Connection Pooling**
- Application doesn't create new connections each time
- Maintains pool of 20-30 open connections
- Reuses them for requests
- Prevents "too many connections" error

**3. Query Monitoring**
- Log all queries taking >1 second
- Kill queries taking >5 seconds
- Alert developers about slow queries

**4. Automatic Backups**
- Every 6 hours: Full backup
- Every hour: Incremental backup
- Can restore in 10-15 minutes

---

## 3. API Service Goes Down - Cascading Failure

### Problem
Payment service goes down. Your application keeps trying to connect, eventually your entire application becomes unresponsive. How to prevent cascading failure?

### The Cascading Failure Problem

```
User → Your Server → Payment API (DOWN)
                     ↓ (Timeout: 30 seconds)
                     ↓ (Retry: 30 seconds)
                     ↓ (Retry: 30 seconds)
                     Total: 90 seconds per request

Result: Your server threads blocked waiting
        New requests can't be processed
        Your application appears DOWN!
```

### Solution: Circuit Breaker Pattern

**Circuit Breaker States:**

1. **CLOSED** (Normal operation)
   - Requests pass through to service
   - Monitor failure rate

2. **OPEN** (Service detected as down)
   - Immediately return error
   - Don't attempt connection
   - Save resources

3. **HALF-OPEN** (Testing recovery)
   - After 30 seconds, try one request
   - If success → CLOSED
   - If fail → OPEN

**Implementation Strategy:**
```javascript
// Circuit breaker logic
function callPaymentAPI(amount) {
  if (circuitState === 'OPEN') {
    // Don't even try, fail fast
    return { error: 'Payment service temporarily unavailable' };
  }
  
  try {
    const result = await paymentAPI.charge(amount);
    resetFailureCount();
    return result;
  } catch (error) {
    incrementFailureCount();
    
    if (failureCount > 5) {
      circuitState = 'OPEN';
      setTimeout(() => circuitState = 'HALF-OPEN', 30000);
    }
    
    throw error;
  }
}
```

### Fallback Strategies

**1. Queue the Operation**
- Can't process payment now?
- Save to queue, process when service recovers
- Notify user: "Processing, will confirm via email"

**2. Use Alternative Service**
- Primary payment gateway down?
- Switch to backup gateway automatically
- Stripe → Razorpay → PayPal

**3. Degrade Gracefully**
- Non-critical feature down?
- Hide the feature temporarily
- Show message: "Temporarily unavailable"

### Timeout Configuration

**Proper Timeout Chain:**
```
User Browser (30 sec timeout)
    ↓
Your Server (5 sec timeout for external calls)
    ↓
External API (3 sec timeout)
```

**Why shorter internal timeouts?**
- Fail fast
- Don't block user for 30 seconds
- Try alternative or return friendly error

---

## 4. Sudden Viral Traffic Spike (0 to 1 Million in 10 Minutes)

### Problem
Normal traffic: 1,000 users/minute
Sudden spike: 100,000 users/minute (100x increase)
Your system designed for 10,000 max. What happens?

### What Breaks First (In Order)

**Minute 1-2: Load Balancer Overloaded**
- Can't distribute requests fast enough
- Users see connection timeout
- **Fix**: Load balancer auto-scales (AWS ELB, etc.)

**Minute 3-5: Application Servers Maxed Out**
- CPU at 100%, memory at 100%
- Requests queuing up
- **Fix**: Auto-scaling kicks in, adds more servers

**Minute 6-8: Database Connection Pool Exhausted**
- All connections in use
- New requests wait indefinitely
- **Fix**: Connection pooling with queue timeout

**Minute 9-10: Database Can't Keep Up**
- Queries taking 10-20 seconds instead of <100ms
- **Fix**: Read replicas, caching

### Traffic Spike Response Plan

**Auto-Scaling Configuration:**
```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
minReplicas: 5
maxReplicas: 100
targetCPUUtilization: 70%

# Scaling behavior
scaleUp:
  - Add 50% more pods when CPU > 70%
  - Check every 30 seconds
scaleDown:
  - Remove pods slowly (5 min intervals)
  - Prevent thrashing
```

**Caching Aggressive Mode:**
```
Normal: Cache TTL = 60 seconds
Crisis: Cache TTL = 600 seconds (10 minutes)

Accept slightly stale data to survive
```

**Database Query Optimization:**
```
1. Enable query result caching
2. Use database read replicas (5-10 replicas)
3. Redirect 90% reads to replicas
4. Only writes go to master
```

### Progressive Feature Disabling

**Priority Levels:**

**P0 (Keep Running Always):**
- Login
- View content
- Checkout/Purchase

**P1 (Can Disable Temporarily):**
- Comments
- Likes/Reactions
- Notifications

**P2 (Disable First):**
- Recommendations
- Analytics
- Email sending

**Strategy:**
```
If (CPU > 80%): Disable P2 features
If (CPU > 90%): Disable P1 features
If (CPU > 95%): Enable rate limiting on P0
```

---

## 5. Memory Leak Causes Server Crash Every Few Hours

### Problem
Production server runs fine for 2-3 hours, then crashes. Memory usage grows from 500MB to 8GB, then process killed by OS.

### Investigation Steps

**Step 1: Identify Memory Growth Pattern**
```bash
# Monitor memory every minute
ps aux | grep node

# Result shows memory growing steadily
10:00 AM: 500 MB
11:00 AM: 1.2 GB
12:00 PM: 2.8 GB
1:00 PM: 5.6 GB (CRASH)
```

**Step 2: Heap Snapshot Comparison**
```bash
# Take snapshot when app starts
node --heap-prof app.js

# Take snapshot before crash
# Compare both snapshots
```

**Step 3: Common Culprits**

**1. Event Listeners Not Removed**
```javascript
// Problem code
app.get('/api/data', (req, res) => {
  const emitter = new EventEmitter();
  emitter.on('data', handler); // Added every request
  // Never removed - 1000 requests = 1000 listeners!
});
```

**2. Global Cache Growing Unbounded**
```javascript
// Problem code
const cache = {};
app.get('/api/user/:id', (req, res) => {
  cache[req.params.id] = userData;
  // Cache grows forever, never cleared
});
```

**3. Closures Holding Large Objects**
```javascript
// Problem code
function createHandler() {
  const hugeArray = new Array(1000000).fill('data');
  return function() {
    console.log('Handler');
    // hugeArray trapped in closure, can't be garbage collected
  };
}
```

### Solutions

**1. Implement Cache Size Limit**
```javascript
// LRU Cache with max size
const cache = new Map();
const MAX_SIZE = 1000;

function addToCache(key, value) {
  if (cache.size >= MAX_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey); // Remove oldest
  }
  cache.set(key, value);
}
```

**2. Auto-Restart on Memory Threshold**
```javascript
// Monitor memory and restart gracefully
setInterval(() => {
  const usage = process.memoryUsage();
  const usedMB = usage.heapUsed / 1024 / 1024;
  
  if (usedMB > 1500) { // 1.5 GB threshold
    console.log('Memory threshold reached, graceful restart');
    gracefulShutdown();
  }
}, 60000); // Check every minute
```

**3. Use Process Manager (PM2)**
```bash
# PM2 automatically restarts on memory limit
pm2 start app.js --max-memory-restart 1500M

# Monitors memory and restarts before crash
```

---

## 6. Database Suddenly Becomes Extremely Slow

### Problem
Database queries that normally take 50ms now taking 5-10 seconds. Application timing out. No code changes were made.

### Possible Causes and Solutions

**Cause 1: Missing Index / Index Not Used**

**Symptom**: One query suddenly became popular
**Investigation**:
```javascript
// Check query execution plan
db.users.find({ email: 'test@example.com' }).explain('executionStats')

// Result shows:
// totalDocsExamined: 1,000,000 (BAD - full table scan)
// executionTimeMillis: 5000
```

**Solution**:
```javascript
// Add index
db.users.createIndex({ email: 1 })

// After index:
// totalDocsExamined: 1 (GOOD - index scan)
// executionTimeMillis: 5
```

**Cause 2: Table Lock from Long Transaction**

**Symptom**: All write queries blocked
**Investigation**:
```sql
-- Check for blocking queries
SHOW PROCESSLIST;

-- Results shows:
-- Query running for 300 seconds, holding lock
```

**Solution**:
```sql
-- Kill the blocking query
KILL QUERY <process_id>;

-- Prevent future issues
SET SESSION wait_timeout = 30; -- 30 second max
```

**Cause 3: Too Many Concurrent Connections**

**Symptom**: New connections refused
**Investigation**:
```sql
SHOW STATUS LIKE 'Threads_connected';
-- Result: 498 / 500 (max_connections)
```

**Solution**:
- Implement connection pooling (max 20-30 per server)
- Increase max_connections in database config
- Scale horizontally (more app servers sharing load)

**Cause 4: Disk I/O Bottleneck**

**Symptom**: Database server disk at 100% utilization
**Solution**:
- Upgrade to SSD (10x faster)
- Add read replicas
- Implement query result caching
- Archive old data

---

## 7. Third-Party API Rate Limit Exceeded

### Problem
Your application depends on external API (Maps, Payment, Email). During traffic spike, you exceed their rate limit. API returns 429 errors.

### Handling Strategy

**1. Implement Request Queuing**
```
User Request → Queue → Rate Limited API Consumer
                ↓           (100 requests/min max)
           Process queue at allowed rate
```

**2. Caching API Responses**
```javascript
// Cache map geocoding results
async function getCoordinates(address) {
  const cached = await redis.get(`geo:${address}`);
  if (cached) return JSON.parse(cached);
  
  // Only call API if not cached
  const result = await mapsAPI.geocode(address);
  await redis.setex(`geo:${address}`, 86400, JSON.stringify(result));
  return result;
}
```

**3. Retry with Exponential Backoff**
```javascript
async function callExternalAPI(data, attempt = 1) {
  try {
    return await externalAPI.call(data);
  } catch (error) {
    if (error.status === 429 && attempt < 5) {
      // Wait exponentially: 1s, 2s, 4s, 8s, 16s
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
      return callExternalAPI(data, attempt + 1);
    }
    throw error;
  }
}
```

**4. Use Multiple API Keys**
```javascript
// Rotate between multiple API keys
const apiKeys = ['key1', 'key2', 'key3'];
let currentKeyIndex = 0;

function getNextAPIKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return apiKeys[currentKeyIndex];
}
```

---

## Interview Answer Template

**When asked: "How would you handle 1 million concurrent users?"**

**1. Immediate Actions (0-5 min)**
- Enable rate limiting
- Turn on auto-scaling
- Activate CDN caching
- Enable Redis caching

**2. Database Protection (5-15 min)**
- Use read replicas
- Enable query caching
- Implement graceful degradation

**3. Long-term Architecture**
- Horizontal scaling with load balancer
- Multi-layer caching strategy
- Database sharding
- Message queue for async operations

**4. Monitoring**
- Response time, error rate, CPU/memory
- Alert when thresholds exceeded
- Auto-scaling based on metrics

**5. Graceful Degradation**
- Disable non-critical features
- Queue non-urgent operations
- Fail fast with circuit breakers

---

## Key Takeaways

✅ **Plan for 10x traffic** - If you can handle 100K, sudden spike might be 1M
✅ **Auto-scaling is critical** - Manual scaling is too slow
✅ **Cache aggressively** - Most traffic can be served from cache
✅ **Fail fast** - Don't wait for timeouts, use circuit breakers
✅ **Monitor everything** - You can't fix what you can't measure
✅ **Have fallback plans** - Primary service down? Use backup
✅ **Queue non-critical work** - Email, notifications can wait
✅ **Database is usually bottleneck** - Use replicas, caching, pooling

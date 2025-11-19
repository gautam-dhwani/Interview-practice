# 20 Mock Technical Flashcards

Practice these flashcards daily. Cover the answer and try to explain in your own words.

---

## Card 1: Explain closure in JavaScript

**Question:** What is a closure and why is it useful?

**Answer:**
A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.

**Example:**
```javascript
function createCounter() {
  let count = 0;  // Private variable
  return {
    increment: () => ++count,
    getCount: () => count
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.getCount();  // 1
// count is NOT directly accessible
```

**Use Cases:**
- Data privacy/encapsulation
- Function factories
- Event handlers maintaining state
- Module pattern

---

## Card 2: Difference between var, let, const

**Question:** Explain the differences between var, let, and const.

**Answer:**

| Feature | var | let | const |
|---------|-----|-----|-------|
| Scope | Function | Block | Block |
| Hoisting | Yes (undefined) | Yes (TDZ*) | Yes (TDZ*) |
| Redeclare | Yes | No | No |
| Reassign | Yes | Yes | No |

*TDZ = Temporal Dead Zone (cannot access before declaration)

**Example:**
```javascript
// var - function scoped
function test() {
  var x = 1;
  if (true) {
    var x = 2;  // Same variable!
  }
  console.log(x);  // 2
}

// let - block scoped
function test() {
  let x = 1;
  if (true) {
    let x = 2;  // Different variable
  }
  console.log(x);  // 1
}

// const - cannot reassign
const arr = [1, 2];
arr.push(3);     // OK (mutation)
arr = [4, 5];    // Error (reassignment)
```

---

## Card 3: How does Node handle concurrency?

**Question:** Node.js is single-threaded. How does it handle multiple concurrent requests?

**Answer:**
Node.js uses **non-blocking I/O** and the **event loop**:

1. **Single Thread**: JavaScript runs on one thread
2. **Event Loop**: Continuously checks for tasks
3. **Async I/O**: Delegates I/O operations to OS/thread pool
4. **Callbacks**: Executed when operations complete

**Flow:**
```
Request comes in → Non-blocking operation starts → 
Thread continues (handles other requests) → 
Operation completes → Callback queued → 
Event loop executes callback
```

**Example:**
```javascript
// Non-blocking
console.log('Start');
fs.readFile('file.txt', (err, data) => {
  console.log('File read');  // Executes later
});
console.log('End');

// Output: Start, End, File read
```

**Why it works:** I/O operations (file, network, DB) are slow. While waiting, thread handles other requests.

---

## Card 4: How does event loop scheduling work?

**Question:** Explain the order of execution in the event loop.

**Answer:**
**Execution Order:**
1. **Call Stack** (synchronous code)
2. **Microtask Queue** (Promises, queueMicrotask)
3. **Macrotask Queue** (setTimeout, setInterval, setImmediate)

**Example:**
```javascript
console.log('1: Sync');

setTimeout(() => console.log('2: Timeout'), 0);

Promise.resolve().then(() => console.log('3: Promise'));

console.log('4: Sync');

// Output:
// 1: Sync
// 4: Sync
// 3: Promise (microtask - higher priority)
// 2: Timeout (macrotask)
```

**Remember:** Microtasks always run before macrotasks!

---

## Card 5: What is prototype chain?

**Question:** Explain JavaScript's prototype chain.

**Answer:**
Every JavaScript object has an internal link to another object called its **prototype**. When accessing a property, JavaScript searches:
1. The object itself
2. Its prototype
3. The prototype's prototype
4. Until it reaches `Object.prototype`
5. Then `null`

**Example:**
```javascript
function Person(name) {
  this.name = name;
}

Person.prototype.greet = function() {
  return `Hi, I'm ${this.name}`;
};

const john = new Person('John');

// Prototype chain:
// john → Person.prototype → Object.prototype → null

john.greet();  // Found in Person.prototype
john.toString();  // Found in Object.prototype
```

**Benefit:** Memory efficient - methods shared across instances, not duplicated.

---

## Card 6: What is middleware in Express?

**Question:** Explain Express middleware and how it works.

**Answer:**
Middleware functions have access to `req`, `res`, and `next`. They execute in the order defined and can:
- Execute code
- Modify req/res objects
- End request-response cycle
- Call next middleware

**Example:**
```javascript
// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();  // Pass control to next middleware
});

// Auth middleware
const auth = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Use in route
app.get('/protected', auth, (req, res) => {
  res.json({ data: 'Secret' });
});
```

**Order matters!** Middleware executes top to bottom.

---

## Card 7: How do you optimize MongoDB queries?

**Question:** What techniques optimize MongoDB query performance?

**Answer:**

**1. Indexes** (most important)
```javascript
db.users.createIndex({ email: 1 });
db.products.createIndex({ category: 1, price: -1 });
```

**2. Use explain()**
```javascript
db.users.find({ email: 'john@example.com' }).explain('executionStats');
// Look for IXSCAN (good) vs COLLSCAN (bad)
```

**3. Projection** (select only needed fields)
```javascript
db.users.find({}, { name: 1, email: 1 });  // Only return name, email
```

**4. Limit results**
```javascript
db.users.find().limit(20);
```

**5. $match early in aggregation**
```javascript
db.orders.aggregate([
  { $match: { status: 'completed' } },  // Filter first!
  { $group: { _id: '$customerId', total: { $sum: '$amount' } } }
]);
```

**6. Use indexes in $match and $sort**

**7. Avoid** large skip values in pagination

---

## Card 8: What is compound index?

**Question:** Explain compound indexes and when to use them.

**Answer:**
A compound index indexes multiple fields together. Order of fields matters!

**Example:**
```javascript
db.products.createIndex({ category: 1, price: -1 });
```

**This index supports:**
- `{ category: "Electronics" }` ✅
- `{ category: "Electronics", price: { $gt: 500 } }` ✅
- `{ category: "Electronics" }` + sort by price ✅

**Does NOT support:**
- `{ price: { $gt: 500 } }` ❌ (missing leading field)

**Best Practices:**
1. **Equality filters first**
2. **Sort fields next**
3. **Range filters last**

Example query: `{ status: "active", age: { $gt: 25 } }` + sort by `createdAt`

Best index: `{ status: 1, createdAt: -1, age: 1 }`

---

## Card 9: Explain ACID properties

**Question:** What does ACID mean in database transactions?

**Answer:**

**A - Atomicity:** All or nothing. Either all operations succeed or all fail.
```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- Both succeed or both fail
```

**C - Consistency:** Database goes from one valid state to another. Constraints maintained.

**I - Isolation:** Concurrent transactions don't interfere with each other.
```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

**D - Durability:** Committed changes persist even after system crash.

**Example:** Bank transfer must debit and credit atomically, maintain minimum balance (consistency), not see partial updates from other transfers (isolation), and survive crashes (durability).

---

## Card 10: What are SQL joins?

**Question:** Explain different types of SQL joins.

**Answer:**

**INNER JOIN:** Only matching rows from both tables
```sql
SELECT * FROM users
INNER JOIN orders ON users.id = orders.user_id;
-- Returns only users who have orders
```

**LEFT JOIN:** All rows from left table + matching from right
```sql
SELECT * FROM users
LEFT JOIN orders ON users.id = orders.user_id;
-- Returns all users, even those without orders (NULL for order fields)
```

**RIGHT JOIN:** All rows from right table + matching from left

**FULL OUTER JOIN:** All rows from both tables

**Visual:**
```
Users: [A, B, C]
Orders: [for A, for B]

INNER: [A, B]
LEFT: [A, B, C]  (C has NULL order fields)
```

---

## Card 11: What is JWT and refresh token?

**Question:** Explain JWT authentication and refresh tokens.

**Answer:**

**JWT (JSON Web Token):**
- Structure: `Header.Payload.Signature` (Base64 encoded)
- Contains user info and claims
- Stateless (server doesn't store)
- Short-lived (15 mins)

**Refresh Token:**
- Long-lived (7 days)
- Stored in database
- Used to get new access token

**Flow:**
```javascript
// Login
POST /login → { accessToken, refreshToken }

// Access protected resource
GET /api/profile
Headers: { Authorization: "Bearer <accessToken>" }

// Access token expired (after 15 mins)
POST /refresh
Body: { refreshToken }
Response: { accessToken }  // New access token

// Logout
POST /logout → Invalidate refresh token
```

**Security:**
- Access token in memory (or httpOnly cookie)
- Refresh token in httpOnly cookie
- HTTPS only
- Sign with strong secret

---

## Card 12: Difference between PUT and PATCH

**Question:** What's the difference between PUT and PATCH?

**Answer:**

**PUT:** Replace entire resource
```javascript
PUT /users/123
{ name: "John", email: "john@example.com", age: 30 }
// Replaces ALL fields. Missing fields set to null/undefined
```

**PATCH:** Partial update
```javascript
PATCH /users/123
{ age: 31 }
// Updates only age field, others unchanged
```

**Idempotency:**
- Both are **idempotent** (multiple identical requests = same result)

**Example:**
```javascript
// User: { name: "John", email: "john@example.com", age: 30 }

PUT /users/123
{ name: "John" }
// Result: { name: "John", email: null, age: null }  ❌ Lost data!

PATCH /users/123
{ age: 31 }
// Result: { name: "John", email: "john@example.com", age: 31 }  ✅
```

**When to use:**
- PUT: Replace entire resource
- PATCH: Update specific fields

---

## Card 13: What is CORS and how to fix it?

**Question:** Explain CORS and how to enable it.

**Answer:**

**CORS (Cross-Origin Resource Sharing):**
Browser security feature that restricts web pages from making requests to a different domain.

**Origin** = Protocol + Domain + Port
- `http://localhost:3000` and `http://localhost:5000` are different origins

**Problem:**
```javascript
// Frontend (http://localhost:3000)
fetch('http://localhost:5000/api/users')
// Error: Blocked by CORS policy
```

**Solution (Backend):**
```javascript
const cors = require('cors');

// Allow all origins (dev only)
app.use(cors());

// Production - specific origin
app.use(cors({
  origin: 'https://myapp.com',
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Manual
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://myapp.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
```

---

## Card 14: Explain async/await internally

**Question:** How does async/await work under the hood?

**Answer:**

**async/await** is syntactic sugar over Promises.

```javascript
// Async/await
async function getUser(id) {
  const user = await User.findById(id);
  return user;
}

// Equivalent Promise syntax
function getUser(id) {
  return User.findById(id)
    .then(user => user);
}
```

**How it works:**
1. `async` function always returns a Promise
2. `await` pauses execution until Promise resolves
3. Execution continues on next line with resolved value

**Internal:**
```javascript
async function example() {
  const a = await promiseA();  // Pause here
  const b = await promiseB();  // Then pause here
  return a + b;
}

// Becomes (simplified):
function example() {
  return promiseA()
    .then(a => promiseB().then(b => a + b));
}
```

**Error Handling:**
```javascript
// Async/await with try-catch
try {
  const user = await fetchUser();
} catch (error) {
  console.error(error);
}

// Promise with .catch()
fetchUser()
  .then(user => console.log(user))
  .catch(error => console.error(error));
```

---

## Card 15: What are microtasks?

**Question:** What are microtasks and how do they differ from macrotasks?

**Answer:**

**Microtasks:** High-priority tasks executed immediately after current script
- Promises (`.then`, `.catch`, `.finally`)
- `queueMicrotask()`
- `MutationObserver`

**Macrotasks:** Regular tasks executed in next event loop iteration
- `setTimeout`, `setInterval`
- `setImmediate` (Node.js)
- I/O operations

**Execution Order:**
```
1. Execute synchronous code (call stack)
2. Execute ALL microtasks
3. Execute ONE macrotask
4. Repeat from step 2
```

**Example:**
```javascript
console.log('1');

setTimeout(() => console.log('2'), 0);  // Macrotask

Promise.resolve().then(() => console.log('3'));  // Microtask

console.log('4');

// Output: 1, 4, 3, 2
```

**Key Point:** ALL microtasks execute before ANY macrotask!

---

## Card 16: Explain observer vs pub/sub

**Question:** Difference between Observer and Pub/Sub patterns?

**Answer:**

**Observer Pattern:**
- Subject knows its observers directly
- Tight coupling
- Observers subscribe to subject

```javascript
class Subject {
  constructor() {
    this.observers = [];
  }
  subscribe(observer) {
    this.observers.push(observer);
  }
  notify(data) {
    this.observers.forEach(obs => obs.update(data));
  }
}
```

**Pub/Sub Pattern:**
- Publishers don't know subscribers
- Loose coupling via event bus/broker
- Publishers emit events, subscribers listen

```javascript
class EventBus {
  constructor() {
    this.events = {};
  }
  subscribe(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }
  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }
}
```

**Key Difference:**
- Observer: Subject → Observers (direct)
- Pub/Sub: Publisher → EventBus → Subscribers (indirect)

---

## Card 17: What is caching strategy (LRU, TTL)?

**Question:** Explain LRU and TTL caching strategies.

**Answer:**

**LRU (Least Recently Used):**
Evicts least recently accessed item when cache is full.

```javascript
// Capacity = 3
cache.put('a', 1);  // [a]
cache.put('b', 2);  // [a, b]
cache.put('c', 3);  // [a, b, c]
cache.get('a');     // [b, c, a]  (a moved to end)
cache.put('d', 4);  // [c, a, d]  (b evicted - least recent)
```

**Implementation:** LinkedHashMap / Map in JavaScript

**TTL (Time To Live):**
Items expire after specified time.

```javascript
cache.set('user:123', userData, { ttl: 600 });  // 10 minutes
// After 10 mins, automatically removed
```

**Combined Strategy:**
```javascript
// Redis
client.setex('key', 600, 'value');  // TTL = 600 seconds
// Also use LRU eviction when memory full
```

**Use Cases:**
- LRU: Fixed memory cache (in-memory caching)
- TTL: Session data, temporary data
- Both: User sessions, API responses

---

## Card 18: How to design rate limiting?

**Question:** How would you implement rate limiting?

**Answer:**

**Goal:** Limit requests per user/IP (e.g., 100 requests per minute)

**Algorithms:**

**1. Fixed Window:**
```javascript
const requests = {};  // { ip: { count: 5, resetTime: timestamp } }

function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;  // 1 minute
  
  if (!requests[ip] || now > requests[ip].resetTime) {
    requests[ip] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  
  if (requests[ip].count >= 100) {
    return false;  // Rate limited
  }
  
  requests[ip].count++;
  return true;
}
```

**2. Sliding Window (more accurate):**
Use Redis with sorted sets, timestamps as scores

**3. Token Bucket:**
```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;  // tokens per second
    this.lastRefill = Date.now();
  }
  
  consume() {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
  
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }
}
```

**Express Middleware:**
```javascript
app.use('/api', rateLimiter(100, 60000));  // 100 req/min
```

---

## Card 19: Explain horizontal vs vertical scaling

**Question:** Compare horizontal and vertical scaling.

**Answer:**

**Vertical Scaling (Scale Up):**
- Add more resources to single server
- 4 cores → 16 cores, 8GB RAM → 32GB RAM

**Pros:**
- Simple (no code changes)
- No distributed system complexity

**Cons:**
- Limited (hardware limits)
- Expensive at high end
- Single point of failure
- Downtime during upgrade

**Horizontal Scaling (Scale Out):**
- Add more servers
- 1 server → 10 servers

**Pros:**
- Unlimited scaling
- High availability
- Cost-effective (commodity hardware)
- No downtime (rolling updates)

**Cons:**
- Requires stateless architecture
- Load balancer needed
- Data consistency challenges

**When to use:**
- Vertical: Quick fix, small-medium apps
- Horizontal: Large scale, high availability needed

**Example:**
```
Vertical: 1 server (96 cores, 512GB RAM) = $5000/mo
Horizontal: 10 servers (8 cores, 32GB each) = $3000/mo
```

---

## Card 20: How to avoid callback hell?

**Question:** What is callback hell and how do you avoid it?

**Answer:**

**Callback Hell:** Nested callbacks creating pyramid of doom

```javascript
// ❌ Callback Hell
getData(function(a) {
  getMoreData(a, function(b) {
    getMoreData(b, function(c) {
      getMoreData(c, function(d) {
        getMoreData(d, function(e) {
          // Finally use e
        });
      });
    });
  });
});
```

**Solutions:**

**1. Promises:**
```javascript
getData()
  .then(a => getMoreData(a))
  .then(b => getMoreData(b))
  .then(c => getMoreData(c))
  .then(d => getMoreData(d))
  .then(e => console.log(e))
  .catch(error => console.error(error));
```

**2. Async/Await (best):**
```javascript
async function processData() {
  try {
    const a = await getData();
    const b = await getMoreData(a);
    const c = await getMoreData(b);
    const d = await getMoreData(c);
    const e = await getMoreData(d);
    console.log(e);
  } catch (error) {
    console.error(error);
  }
}
```

**3. Named Functions:**
```javascript
function step1(a) {
  getMoreData(a, step2);
}
function step2(b) {
  getMoreData(b, step3);
}
```

**4. Promise.all() for parallel:**
```javascript
const [a, b, c] = await Promise.all([
  getData1(),
  getData2(),
  getData3()
]);
```

---

## How to Use These Flashcards

1. **Daily Practice:** Review 5-10 cards per day
2. **Cover Answer:** Try to explain before looking
3. **Say it Out Loud:** Practice interview speaking
4. **Whiteboard:** Draw diagrams for visual concepts
5. **Code it:** Type out examples from memory
6. **Teach Someone:** Best way to solidify understanding

**Before Interview:** Review all 20 cards in 30 minutes!

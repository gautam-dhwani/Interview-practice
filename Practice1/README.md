# Interview Prep: Node.js, Redis, MongoDB, and DSA

This project provides comprehensive interview preparation covering **25 DSA problems** and **advanced Node.js concepts** including middleware, security, performance monitoring, caching strategies, and database optimization.

- **Node/Concepts/Servers**: `node_concepts.js`
- **DSA (JavaScript only)**: `dsa.js`

## Prerequisites
- Node.js 18+
- MongoDB running locally (or set `MONGODB_URI`)
- Redis running locally (or set `REDIS_URL`)

## Install
```bash
npm install
```

## Scripts
```bash
# Basic concept demos (event loop, closures, sync vs async)
npm run start:concepts

# Advanced Node.js concepts demo
node node_concepts.js advanced

# Start core HTTP server (MongoDB)
npm run start:concepts:server

# Start Redis caching + practice problems server
npm run start:concepts:redis

# Run all 25 DSA problems
npm run start:dsa
```

---

# Node.js & Core Concepts

## Event Loop: Phases and Microtasks
- Phases: Timers -> Pending Callbacks -> Idle/Prepare -> Poll -> Check -> Close
- Microtasks per tick: `process.nextTick()` runs before Promises. Promises resolve before moving to next phase.

```mermaid
graph LR
  A[JS main stack empty] --> B[nextTick queue]
  B --> C[Promise microtasks]
  C --> D[Timers]
  D --> E[Pending Callbacks]
  E --> F[Idle/Prepare]
  F --> G[Poll (I/O)]
  G --> H[Check (setImmediate)]
  H --> I[Close callbacks]
```

- Run: `npm run start:concepts` to see ordering. Expect:
  - Sync logs first.
  - `process.nextTick` then `Promise.then`.
  - I/O callbacks in Poll phase.
  - `setTimeout(...,0)` in Timers; `setImmediate` in Check. Their order is not strictly guaranteed when scheduled from top-level code.

See `eventLoopDemo()` in `node_concepts.js`.

## Advanced Node.js Concepts

### **Middleware Patterns**
- **Logging Middleware**: Request timing and method logging
- **Authentication Middleware**: Token validation and user context
- **Rate Limiting**: IP-based request throttling
- **Error Handling**: Centralized error processing with environment-aware responses

### **Security Best Practices**
- **Input Validation**: Email, password, and name validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: HTML escaping functions
- **Secure Headers**: Helmet.js integration patterns
- **CSRF Protection**: Token-based validation

### **Error Handling Patterns**
- **Async Error Wrapper**: Promise-based error catching
- **Custom Error Classes**: Operational vs programming errors
- **Global Error Handlers**: Uncaught exceptions and unhandled rejections
- **Graceful Shutdown**: Process cleanup and resource management

### **Performance Monitoring**
- **System Metrics**: Memory usage, CPU usage, process uptime
- **Event Loop Lag**: Real-time performance measurement
- **Heap Snapshots**: Memory profiling techniques
- **APM Integration**: New Relic, DataDog patterns

### **Streams and Buffers**
- **Custom Transform Streams**: Data processing pipelines
- **Buffer Operations**: Binary data handling
- **Backpressure Management**: Stream flow control
- **Memory Efficiency**: Large file processing

### **Worker Threads**
- **CPU-Intensive Tasks**: Fibonacci calculation example
- **Message Passing**: Inter-thread communication
- **SharedArrayBuffer**: Memory sharing between threads
- **Thread Pool Management**: Resource allocation

### **Database Optimization**
- **Connection Pooling**: Custom pool implementation
- **Query Optimization**: Index usage and query planning
- **Transaction Management**: ACID compliance
- **Replica Set Handling**: Read/write splitting

### **Caching Strategies**
- **LRU Cache**: In-memory cache with eviction policy
- **Redis Integration**: Distributed caching patterns
- **HTTP Caching**: ETags and Cache-Control headers
- **CDN Integration**: Static asset optimization

### **Run Advanced Concepts:**
```bash
# Basic concepts demo
npm run start:concepts

# Advanced concepts demo
node node_concepts.js advanced
```

## What is a Thread in Node.js?
- Your JS runs on a single main thread (the event loop).
- libuv provides a C++ threadpool (default 4) for CPU-ish async work (fs, crypto, DNS, zlib).
- I/O is non-blocking; heavy CPU tasks should use Worker Threads or move out-of-process.
- You can set `UV_THREADPOOL_SIZE=8 node ...` to enlarge the pool for eligible operations.

## Closures (Simple Examples)
- A closure captures surrounding variables and preserves state between calls.
- See `makeCounter()` and the `var` vs `let` loop example in `closureDemo()` inside `node_concepts.js`.

## Node Internals (libuv, event-driven, async I/O)
- V8 executes your JS. libuv runs the event loop and threadpool.
- Many ops are delegated to OS/kernel or libuv threadpool.
- Callbacks/promises schedule continuations back onto the JS main thread.
- Run `npm run start:concepts` to compare `fs.readFileSync` vs `fs.readFile` in `syncVsAsyncDemo()`.

## Asynchronous vs Synchronous
- Synchronous blocks the event loop until done.
- Async frees the event loop, result delivered later via callback/promise.
- In `syncVsAsyncDemo()`, the sync read completes before the next line; the async read logs after microtasks.

---

# Databases (SQL & NoSQL)

## SQL vs NoSQL (When to use)
- **SQL (Relational)**
  - Structured schema, ACID transactions.
  - Complex joins, strong consistency, normalized data.
  - Use for financial systems, ER-model data, analytics with joins.
- **NoSQL (e.g., MongoDB)**
  - Flexible schema, horizontal scaling, sharding.
  - Document/Key-Value/Wide-Column/Graph models.
  - Use for rapidly evolving schemas, hierarchical docs, high throughput.

## MongoDB: find vs findOne vs aggregate
- **find**: returns a cursor for multiple documents.
- **findOne**: returns a single matching document or `null`.
- **aggregate**: pipeline-based transformations (match, group, sort, project, etc.).

Examples (Node.js driver):
```js
const users = db.collection('users');

// find: get all users aged >= 21
const cursor = users.find({ age: { $gte: 21 } });
const all = await cursor.toArray();

// findOne: get one user by name
const one = await users.findOne({ name: 'Alice' });

// aggregate: group by age and count
const pipeline = [
  { $match: { age: { $ne: null } } },
  { $group: { _id: '$age', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
];
const agg = await users.aggregate(pipeline).toArray();
```

---

# Redis

## Redis Caching Example
- Start server: `npm run start:concepts:redis` (Express on port 5002 by default)
- Endpoint with caching: `GET /user/:id`
  - If connected, checks Redis key `user:<id>` before simulating DB.
  - Caches the response for 60s with `SETEX`.

## Error Handling when Redis is not connected
- The app listens to `connect`, `ready`, `error`, and `end` events.
- If not connected, middleware simply skips cache and continues (safe fallback).

## Small Problems via Redis
- `GET /fib/:n`: Iterative Fibonacci with caching.
- `GET /prime/:n`: Primality test with 6k±1 optimization and caching.
- `POST /pair-sum` with `{ arr:number[], target:number }`: O(n) map-based solution, cached by array hash.

### Test
```bash
# User caching
curl http://localhost:5002/user/7
curl http://localhost:5002/user/7  # second call should be served from cache

# Fibonacci
curl http://localhost:5002/fib/10

# Prime
curl http://localhost:5002/prime/97

# Pair Sum
curl -X POST http://localhost:5002/pair-sum \
  -H 'Content-Type: application/json' \
  -d '{"arr":[2,7,11,15],"target":9}'
```

---

# Backend & APIs

## Core HTTP Server + MongoDB
- Start: `npm run start:concepts:server` (port 5001 by default)
- `POST /users` body `{ name: string, age?: number }`
- Steps inside the handler:
  1. Read raw request body from the socket.
  2. Parse JSON and validate.
  3. Insert into MongoDB via native driver.
  4. Respond with `201` and the `insertedId`.

### Test
```bash
# Health
curl http://localhost:5001/health

# Create user
curl -X POST http://localhost:5001/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","age":25}'
```

### Environment Variables
```bash
# Mongo
export MONGODB_URI="mongodb://127.0.0.1:27017"
export DB_NAME="interviewdb"

# Redis
export REDIS_URL="redis://127.0.0.1:6379"
```

---

# JavaScript & DSA

## 25 Essential DSA Problems

Implemented in `dsa.js` with optimal solutions for interview preparation:

### **Original 5 Problems:**
1. **Distinct elements** - O(n) using hash map
2. **Two Sum** - O(n) single-pass hash map
3. **Maximum subarray sum (Kadane)** - O(n) linear DP
4. **Clock angle** - Mathematical calculation
5. **Sum without +** - Bitwise XOR/AND approach

### **Additional 20 Problems:**

**String Problems:**
6. **Reverse String** - O(n) iterative approach
7. **Palindrome Check** - O(n) two-pointer technique
8. **First Non-Repeating Character** - O(n) frequency counting
9. **Valid Anagram** - O(n) character frequency comparison

**Array Problems:**
10. **Binary Search** - O(log n) iterative implementation
11. **Merge Sorted Arrays** - O(m+n) two-pointer merge
12. **Find Missing Number** - O(n) mathematical sum approach
13. **Rotate Array** - O(n) three-step reversal technique
14. **Move Zeros to End** - O(n) two-pointer approach
15. **Array Intersection** - O(n+m) using Set
16. **Single Number** - O(n) XOR bit manipulation
17. **Majority Element** - O(n) Boyer-Moore voting algorithm
18. **Contains Duplicate** - O(n) Set-based detection
19. **Product Except Self** - O(n) left-right pass technique
20. **Remove Duplicates** - O(n) in-place two-pointer

**Stack/String Problems:**
21. **Valid Parentheses** - O(n) stack-based matching
22. **Longest Common Prefix** - O(S) where S is sum of all characters

**Mathematical Problems:**
23. **Happy Number** - Cycle detection with Set
24. **Climbing Stairs** - O(n) Fibonacci variant
25. **Best Time to Buy/Sell Stock** - O(n) single-pass tracking

### **Time & Space Complexities:**
- Most problems: **O(n) time, O(1) or O(n) space**
- Binary Search: **O(log n) time, O(1) space**
- All solutions avoid built-in shortcuts for interview authenticity

### **Run DSA Problems:**
```bash
npm run start:dsa
```

This will demonstrate all 25 problems with test cases and expected outputs.

---

# Interview Preparation Checklist

## **Core Node.js Concepts**
- ✅ Event Loop phases and microtask queue
- ✅ Single-threaded JS vs multi-threaded libuv
- ✅ Closures and lexical scoping
- ✅ Async/await vs callbacks vs promises
- ✅ Streams and backpressure handling
- ✅ Buffer operations and memory management

## **Advanced Node.js Topics**
- ✅ Middleware patterns and error handling
- ✅ Security best practices (validation, XSS, CSRF)
- ✅ Performance monitoring and profiling
- ✅ Worker threads for CPU-intensive tasks
- ✅ Connection pooling and database optimization
- ✅ Caching strategies (LRU, Redis, HTTP)

## **Database Knowledge**
- ✅ SQL vs NoSQL trade-offs
- ✅ MongoDB operations (find, findOne, aggregate)
- ✅ Connection pooling and transaction management
- ✅ Index optimization and query planning

## **DSA Mastery (25 Problems)**
- ✅ String manipulation (palindrome, anagram, reverse)
- ✅ Array algorithms (two-pointer, sliding window)
- ✅ Hash map techniques (two sum, frequency counting)
- ✅ Stack operations (valid parentheses)
- ✅ Mathematical algorithms (happy number, climbing stairs)
- ✅ Bit manipulation (XOR, single number)
- ✅ Greedy algorithms (stock profit, majority element)

## **System Design Concepts**
- ✅ Caching layers and cache invalidation
- ✅ Rate limiting and throttling
- ✅ Error handling and graceful degradation
- ✅ Monitoring and observability
- ✅ Scalability patterns (clustering, load balancing)

## **Key Interview Points**
- **Event Loop**: Explain phases, microtasks vs macrotasks
- **Performance**: Memory usage, CPU profiling, event loop lag
- **Security**: Input validation, parameterized queries, secure headers
- **Scalability**: Clustering, worker threads, connection pooling
- **Error Handling**: Async wrappers, global handlers, operational vs programming errors
- **Caching**: Redis patterns, LRU implementation, HTTP caching
- **DSA**: Time/space complexity analysis, optimal solutions

## **Demo Commands**
```bash
# Show all concepts in action
npm run start:concepts        # Basic concepts
node node_concepts.js advanced # Advanced concepts
npm run start:dsa             # All 25 DSA problems

# Start servers for live demo
npm run start:concepts:server # MongoDB HTTP server
npm run start:concepts:redis  # Redis caching server
```

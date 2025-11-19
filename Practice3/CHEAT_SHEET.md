# 🚀 Quick Revision Cheat Sheet

## JavaScript (1 min)

- **Closure**: Function + lexical scope. Inner function remembers outer variables.
- **Prototype**: Object inheritance chain. `obj.__proto__` → `Constructor.prototype`
- **Event Loop**: Call Stack → Microtasks (Promise) → Macrotasks (setTimeout)
- **async/await**: Syntactic sugar over Promises. Makes async code look synchronous.
- **this**: Determined by call-site. arrow functions inherit parent `this`.
- **var**: Function-scoped, hoisted. **let/const**: Block-scoped, TDZ.

```js
// Closure
function outer(x) { return (y) => x + y; }
const add5 = outer(5); // add5(3) → 8
```

---

## Node.js (1 min)

- **Middleware**: `(req, res, next) =>` chain. Order matters!
- **Error Handling**: 4-param middleware `(err, req, res, next) =>`
- **Event Loop**: libuv. Non-blocking I/O via callbacks.
- **Worker Threads**: CPU-intensive tasks. Not for I/O.
- **Scaling**: Cluster mode (PM2), horizontal (multiple servers).

```js
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
```

---

## MongoDB (1 min)

- **Index**: B-tree. Speed up queries. `{email: 1}` ascending.
- **Compound Index**: Multiple fields. `{status: 1, createdAt: -1}`
- **explain()**: Analyze query performance. Look for `IXSCAN` not `COLLSCAN`.
- **Aggregation**: `$match` early, `$project` late. Pipeline stages.
- **Pagination**: Skip/limit (bad for large offset). Use range query instead.

```js
db.collection.find({age: {$gt: 25}}).hint({age: 1}).explain('executionStats')
```

---

## MySQL (1 min)

- **Joins**: INNER (matching), LEFT (all left + matching), RIGHT, FULL.
- **Transaction**: BEGIN → queries → COMMIT/ROLLBACK. ACID.
- **Normalization**: 1NF (atomic), 2NF (no partial dependency), 3NF (no transitive).
- **Index**: B+tree. Clustered (primary key), Secondary.
- **Isolation**: READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE.

```sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

---

## REST API (1 min)

- **Status**: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error
- **JWT**: Header.Payload.Signature (Base64). Store in httpOnly cookie.
- **CORS**: Cross-origin. Set `Access-Control-Allow-Origin` header.
- **Idempotent**: GET, PUT, DELETE (safe to retry). POST is NOT.
- **Versioning**: `/api/v1/users` or header `Accept: application/vnd.api+json;version=1`

```js
res.setHeader('Access-Control-Allow-Origin', '*');
const token = jwt.sign({userId: 123}, SECRET, {expiresIn: '1h'});
```

---

## Testing (1 min)

- **Unit**: Test single function. Mock dependencies.
- **Integration**: Test multiple components together.
- **TDD**: Red (write test) → Green (make it pass) → Refactor.
- **Mock**: Replace real implementation. `jest.fn()` or `jest.mock()`

```js
const mockFn = jest.fn().mockReturnValue(42);
expect(mockFn()).toBe(42);
```

---

## Git (1 min)

- **Merge**: Combine branches. Creates merge commit. History preserved.
- **Rebase**: Replay commits on top. Linear history. `git rebase main`
- **Feature Branch**: `git checkout -b feature/xyz`. Merge when done.
- **Cherry-pick**: Apply specific commit. `git cherry-pick <commit-hash>`
- **Tags**: Mark releases. `git tag v1.0.0`

```bash
git checkout main && git pull
git checkout feature && git rebase main  # Linear history
```

---

## System Design (2 min)

### Caching
- **LRU**: Least Recently Used. Evict oldest when full.
- **TTL**: Time To Live. Auto-expire after duration.
- **Layers**: Browser → CDN → App Cache (Redis) → DB

### Queues
- **Use**: Async tasks, decoupling, rate limiting.
- **Types**: RabbitMQ, Redis, SQS, Kafka.
- **Pattern**: Producer → Queue → Consumer (workers)

### Scaling
- **Vertical**: Bigger machine (limited).
- **Horizontal**: More machines (unlimited). Need load balancer.
- **DB**: Read replicas, sharding (split data by key).

### Load Balancing
- **Algorithms**: Round Robin, Least Connections, IP Hash.
- **Layer**: L4 (TCP) or L7 (HTTP). Nginx, HAProxy, ALB.

### DB Sharding
- **Horizontal**: Split rows. User 1-1000 → Shard1, 1001-2000 → Shard2.
- **Key**: Choose shard key carefully (avoid hotspots).

```
Client → Load Balancer → [Server1, Server2, Server3] → Cache (Redis) → DB (Master + Replicas)
```

---

## 🎯 Common Patterns to Mention

1. **Singleton**: One instance (DB connection pool)
2. **Factory**: Create objects without specifying class
3. **Observer**: Event emitters, pub/sub
4. **Middleware Pattern**: Express, Redux
5. **Repository Pattern**: Abstract data access

---

## 🔥 Interview Tips

1. **Think Out Loud**: Explain your thought process
2. **Clarify Requirements**: Ask questions before coding
3. **Start Simple**: Basic solution first, then optimize
4. **Trade-offs**: Mention pros/cons of your approach
5. **Real Examples**: Use e-commerce, social media examples
6. **Draw Diagrams**: For system design questions
7. **Time/Space Complexity**: Always mention Big O

---

## 💡 Quick Wins

- Mention **error handling** in every code example
- Talk about **scalability** when discussing systems
- Use **async/await** instead of callbacks
- Mention **testing** strategy
- Discuss **monitoring** and **logging**
- Talk about **security** (SQL injection, XSS, CSRF)

---

## ⚡ Last Minute Review (5 mins before interview)

1. Closure = function remembering scope
2. Event loop = Call stack → Microtasks → Macrotasks
3. MongoDB indexing = B-tree, explain(), $match early
4. REST = Status codes, JWT, idempotent
5. System Design = Cache, Queue, Scale horizontal, Load balancer

**You got this! 💪**

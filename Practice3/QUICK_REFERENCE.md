# Quick Reference Card - Last Minute Review

Print this or save on phone for quick review before interview.

---

## JavaScript (30 seconds)

**Closure:** Function remembering outer scope  
**Event Loop:** Call Stack → Microtasks (Promise) → Macrotasks (setTimeout)  
**this:** Call-site determines value. Arrow functions inherit parent `this`  
**var:** Function-scoped. **let/const:** Block-scoped

```js
// Closure
const add5 = (x => y => x + y)(5); // add5(3) = 8

// Event Loop
console.log(1); setTimeout(() => console.log(2), 0); 
Promise.resolve().then(() => console.log(3)); console.log(4);
// Output: 1, 4, 3, 2
```

---

## Node.js (30 seconds)

**Middleware:** `(req, res, next) =>` Order matters!  
**Error:** 4-param `(err, req, res, next) =>`  
**Scaling:** Cluster (vertical) or Multiple servers (horizontal)  
**Event Loop:** Non-blocking I/O, single thread handles multiple requests

```js
app.use((err, req, res, next) => res.status(500).json({error: err.message}));
```

---

## MongoDB (30 seconds)

**Index:** B-tree. `{field: 1}` ascending  
**Compound:** `{a: 1, b: -1}` Order = Equality, Sort, Range  
**explain():** IXSCAN ✅ COLLSCAN ❌  
**Aggregation:** $match early, $project late  
**Pagination:** Range query > skip/limit

```js
db.collection.createIndex({category: 1, price: -1});
db.collection.find({age: 25}).explain('executionStats');
```

---

## MySQL (30 seconds)

**INNER JOIN:** Matching rows only  
**LEFT JOIN:** All left + matching right  
**Transaction:** BEGIN → queries → COMMIT/ROLLBACK  
**ACID:** Atomicity, Consistency, Isolation, Durability  
**Normalization:** 1NF (atomic) → 2NF (no partial) → 3NF (no transitive)

```sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

---

## REST API (30 seconds)

**200:** OK. **201:** Created. **400:** Bad Request. **401:** Unauthorized. **404:** Not Found. **500:** Server Error  
**JWT:** Header.Payload.Signature (15 min). Refresh token (7 days)  
**CORS:** `Access-Control-Allow-Origin` header  
**Idempotent:** GET, PUT, DELETE ✅ POST ❌  
**Versioning:** `/api/v1/users`

```js
res.setHeader('Access-Control-Allow-Origin', '*');
const token = jwt.sign({userId: 123}, SECRET, {expiresIn: '15m'});
```

---

## Testing (30 seconds)

**Unit:** Test single function, mock dependencies  
**Integration:** Test multiple components together  
**TDD:** Red (fail) → Green (pass) → Refactor  
**Mock:** `jest.fn()` `jest.mock()`  
**AAA:** Arrange, Act, Assert

```js
expect(add(1, 2)).toBe(3);
const mock = jest.fn().mockResolvedValue('success');
```

---

## Git (30 seconds)

**Merge:** Combines branches, creates merge commit  
**Rebase:** Replays commits, linear history. Never on public branches!  
**Feature Branch:** `git checkout -b feature/name`  
**Cherry-pick:** Apply specific commit `git cherry-pick <hash>`  
**Tag:** `git tag -a v1.0.0 -m "Release"`

```bash
git rebase main # Linear history
git merge --no-ff feature # Merge with commit
```

---

## System Design (60 seconds)

**Caching:**  
- LRU: Evict least recently used  
- TTL: Auto-expire after time  
- Redis: In-memory cache

**Queues:**  
- Producer → Queue → Consumer  
- Async processing, retry logic  
- Use: RabbitMQ, SQS, Redis

**Scaling:**  
- Vertical: Bigger machine (limited)  
- Horizontal: More machines (unlimited) + Load Balancer  
- Stateless required for horizontal

**Load Balancing:**  
- Round Robin, Least Connections, IP Hash  
- Nginx, HAProxy

**Database:**  
- Read Replicas: Scale reads  
- Sharding: Split data (user 1-1000 → Shard1)  
- Indexes: B+tree, faster queries

```
Client → LB → [Server1, Server2, Server3] → Cache → DB
```

---

## Common Patterns (15 seconds)

**Singleton:** One instance (DB pool)  
**Factory:** Create objects  
**Observer:** Event listeners  
**Middleware:** Express pipeline  
**Repository:** Abstract data access

---

## Interview Mantras

✅ **Think out loud** - explain reasoning  
✅ **Clarify first** - understand requirements  
✅ **Start simple** - basic solution, then optimize  
✅ **Draw diagrams** - visualize architecture  
✅ **Mention trade-offs** - pros/cons of approach  
✅ **Use examples** - e-commerce, social media  
✅ **Test code** - walk through examples  
✅ **Discuss scale** - 10K users vs 10M users

---

## Code Template - API Endpoint

```javascript
// Complete endpoint example
app.post('/api/users', [
  // Middleware
  validateInput,
  authenticateToken,
  checkPermission
], asyncHandler(async (req, res) => {
  // Input
  const { email, password } = req.body;
  
  // Validate
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Business logic
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ error: 'User already exists' });
  }
  
  // Create
  const user = await User.create({ email, password: await hash(password) });
  
  // Cache
  await cache.set(`user:${user.id}`, user, 600);
  
  // Response
  res.status(201).json(user);
}));
```

---

## System Design Template

**1. Requirements**
- Users: How many?
- Scale: QPS? Data size?
- Features: What exactly?

**2. High-Level Design**
```
Client → LB → API Servers → Cache → Database
```

**3. Deep Dive**
- API design
- Database schema
- Caching strategy
- Scaling plan

**4. Bottlenecks**
- Database slow → Add indexes, read replicas
- CPU high → Add workers, horizontal scale
- Memory → Add caching

**5. Numbers**
- 1M users, 100K DAU
- 1K QPS average, 10K peak
- 100GB data, 1GB growth/month

---

## Common Questions Quick Answers

**"Tell me about yourself"**  
→ Background, skills, why this role (2 mins)

**"Design URL Shortener"**  
→ Base62 encoding, Redis cache, DB for storage

**"Optimize slow query"**  
→ Add index, use explain(), consider caching

**"Handle 10x traffic"**  
→ Horizontal scaling, load balancer, caching, read replicas

**"Difference between PUT and PATCH"**  
→ PUT replaces entire resource, PATCH partial update

**"What is ACID"**  
→ Atomicity, Consistency, Isolation, Durability - all or nothing

**"Explain event loop"**  
→ Call stack, microtasks (Promise), macrotasks (setTimeout)

**"How does JWT work"**  
→ Header.Payload.Signature, stateless, short-lived access token

---

## Confidence Checklist

Before entering interview:

✅ Took deep breaths  
✅ Reviewed this card  
✅ Ready to think out loud  
✅ Will ask clarifying questions  
✅ Will start with simple solution  
✅ Will discuss trade-offs  
✅ Remember: They want me to succeed!

---

## Emergency Calm Down (If Stuck)

**Breathe:** 4 seconds in, 4 seconds hold, 4 seconds out  
**Verbalize:** "Let me think through this..."  
**Break down:** "First, I'll... Then, I'll..."  
**Ask:** "Can I clarify the requirements?"  
**Pivot:** "If I don't know X, I'd approach it like Y..."

---

**You're prepared. You know your stuff. You got this! 🚀**

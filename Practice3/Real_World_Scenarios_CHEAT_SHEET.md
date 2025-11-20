# Real-World Scenarios – Cheat Sheet (Parts 1–4)

Purpose: Quick revision before interviews. Focus on what, why, and how. No deep code.

---

## Part 1: Data Processing & Performance

- **[1] Large Datasets (Streams, Cursors, Batching)**
  - Use when: Process GB+ files, millions of rows.
  - How: Node streams, DB cursors, process in batches, backpressure.
  - Metrics: Memory steady, throughput stable, errors logged.
  - Pitfalls: Reading all in memory, blocking CPU, no retries for failed chunks.

- **[2] Bulk Upload (Millions of Records)**
  - Use when: CSV/JSON imports, partner data feeds.
  - How: Chunk → Validate → Queue → Workers → Idempotent writes.
  - Metrics: Queue depth, worker rate, error % per batch.
  - Pitfalls: Duplicate inserts, transaction timeouts, lack of DLQ.

- **[3] Bulk Download/Export**
  - Use when: Export many rows to CSV/ZIP.
  - How: Server-side streaming, pagination cursor, gzip, notify via email.
  - Metrics: Time to first byte, memory, chunk size.
  - Pitfalls: Generating whole file in memory, synchronous I/O.

- **[4] Memory Leaks**
  - Symptoms: Memory climbs until crash, GC thrashing.
  - Causes: Unremoved listeners, global maps, timers, stale closures.
  - Fix: Cleanup handlers, LRU caches, close resources, PM2 memory restart.

- **[5] Rate Limiting**
  - Strategies: Fixed window, sliding window (accurate), token bucket (burst).
  - Infra: Redis, consistent keys, X-RateLimit headers.
  - Pitfalls: Clock drift, distributed counters, no per-IP/user separation.

---

## Part 2: Infrastructure & Production

- **[6] DB Connection Pooling**
  - Why: Avoid too many connections, reduce latency.
  - How: Pool size 10–30, timeouts, health checks.
  - Pitfalls: Per-request connects, long-lived transactions.

- **[7] Caching**
  - Layers: L1 in-process → L2 Redis → CDN.
  - Patterns: Cache-aside, write-through, delete-on-write.
  - Pitfalls: Stale data, stampede (use jitter, locks), oversized values.

- **[8] Sessions at Scale**
  - Options: JWT, Redis sessions, hybrid.
  - Trade-offs: Stateless vs revoke, stickiness vs portability.
  - Pitfalls: Storing PII in JWT, no rotation.

- **[9] File Uploads**
  - How: Presigned URLs, chunked/multipart, virus scan async, S3.
  - Pitfalls: Large body buffering, missing size/type validation.

- **[10] Error Handling & Logging**
  - Approach: Custom errors, async handler, centralized logger, correlation IDs.
  - Pitfalls: Swallowing errors, PII in logs, lack of alerts.

---

## Part 3: Security & Architecture

- **[11] API Security**
  - Controls: Input validation, param queries, CSP, CORS, rate limits, secrets mgmt.
  - Pitfalls: Trusting client, weak JWT, missing HTTPS/HSTS.

- **[12] Monitoring & Performance**
  - Monitor: p95 latency, error rate, CPU/mem, DB slow queries.
  - Tools: APM, structured logs, tracing, health endpoints.

- **[13] Microservices Communication**
  - Patterns: Sync (REST/gRPC), async (events), saga, circuit breaker, retries.
  - Pitfalls: Chatty calls, no idempotency, missing DLQ.

- **[14] Schema Design**
  - Rules: Embed 1:1 and 1:few; reference 1:many unbounded.
  - Indexes: Support read paths; avoid scatter-gather.

---

## Part 4: High Traffic & Crisis Management

- **[15] 1M Concurrent Users**
  - Immediate: Rate limit, autoscale, CDN, raise cache TTL.
  - DB: Read replicas, query cache, feature flags to degrade non-critical.
  - Long-term: Sharding, queues, multi-layer cache, load tests.

- **[16] DB Crash at Peak**
  - Immediate: Failover, read-only mode, serve from cache.
  - Prevent: Pooling, slow query kill, backups, replica lag alerts.

- **[17] Cascading Failures (3rd-party down)**
  - Use circuit breaker, short timeouts, exponential backoff, fallbacks/queues.

- **[18] Viral Spike (0→1M in 10m)**
  - HPA/HAS, progressive feature disabling (P2→P1), aggressive caching.

- **[19] Memory Leak Crash**
  - Triage: Heap snapshots, event listener audit, cap caches, PM2 max-memory.

- **[20] DB Suddenly Slow**
  - Check: Missing index, locks, connections, disk I/O.
  - Fix: Add index, kill blockers, pool, SSD, query cache.

- **[21] 3rd-Party API Rate Limits**
  - Queue requests, cache responses, backoff, rotate keys.

---

## Quick Playbook

- **Prioritize**: P0 (checkout/login) > P1 (notifications) > P2 (recommendations).
- **Cache**: L1→L2→CDN; increase TTL in crisis.
- **Protect**: Rate limit, circuit breaker, timeouts.
- **Scale**: Horizontal autoscale; avoid vertical surprises.
- **Observe**: p95 latency, error rate, queue length, DB CPU/conn.

---

## Interview Template (60–90s)

1. Clarify load and SLAs (RPS, p95, availability).
2. Immediate safeguards (rate limit, scale, cache, degrade).
3. DB protection (replicas, pooling, index, query cache).
4. Async offload (queues, workers, idempotency).
5. Monitoring & rollback plan.

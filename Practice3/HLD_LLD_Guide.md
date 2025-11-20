# High Level Design (HLD) & Low Level Design (LLD)

## 1. High Level Design (HLD)

### What is HLD?
High Level Design focuses on the **system architecture** - how different components interact, data flow, and technology choices. Think of it as the blueprint of a house showing rooms and their connections.

### Key Components of HLD

**1. System Architecture**
- **Purpose:** Define major components and their relationships
- **Example:** User Service, Order Service, Payment Gateway, Database, Cache
- **Decision:** Monolith vs Microservices vs Serverless

**2. Data Flow**
- **Purpose:** How data moves through the system
- **Example:** User places order → Validate → Check inventory → Process payment → Confirm order
- **Pattern:** Request → Load Balancer → API Gateway → Services → Database

**3. Technology Stack**
- **Frontend:** React, Vue, Angular
- **Backend:** Node.js, Java, Python
- **Database:** PostgreSQL, MongoDB, Redis
- **Infrastructure:** AWS, GCP, Azure

**4. Scalability Strategy**
- **Horizontal Scaling:** Add more servers (preferred)
- **Vertical Scaling:** Bigger servers (limited)
- **Caching:** Redis for hot data
- **CDN:** Static assets delivery
- **Load Balancing:** Distribute traffic

**5. Database Design**
- **SQL vs NoSQL:** Based on data structure and query patterns
- **Sharding:** Split data across multiple databases
- **Replication:** Master-slave for read scaling
- **Indexing:** Speed up queries

### HLD Interview Approach

**Step 1: Clarify Requirements**
```
Functional Requirements:
- Users can create posts
- Users can like/comment
- Feed shows posts from followed users

Non-Functional Requirements:
- 10M daily active users
- 100K requests per second
- 99.9% uptime
- < 200ms response time
```

**Step 2: High-Level Architecture**
```
Client Apps (Web/Mobile)
       ↓
   API Gateway
       ↓
   Load Balancer
       ↓
   ┌────────────┬────────────┬────────────┐
   ↓            ↓            ↓            ↓
User Service  Post Service  Feed Service  Notification Service
   ↓            ↓            ↓            ↓
   └────────────┴────────────┴────────────┘
                    ↓
           ┌────────┴────────┐
           ↓                 ↓
        Database          Cache (Redis)
           ↓
      File Storage (S3)
```

**Step 3: Deep Dive Components**

**API Gateway:**
- Authentication/Authorization
- Rate limiting
- Request routing
- API versioning

**User Service:**
- User registration/login
- Profile management
- JWT token generation
- Password hashing

**Post Service:**
- Create/edit/delete posts
- Upload media to S3
- Store metadata in DB
- Indexing for search

**Feed Service:**
- Fetch posts from followed users
- Pagination (cursor-based)
- Cache user feeds in Redis
- Real-time updates via WebSocket

**Database Strategy:**
- **Users:** PostgreSQL (ACID for transactions)
- **Posts:** MongoDB (flexible schema)
- **Feed:** Redis (fast reads)
- **Analytics:** ClickHouse (column-oriented)

**Step 4: Scale Considerations**

**Current Load: 1M users**
- 3 API servers
- 1 PostgreSQL master + 2 read replicas
- 1 Redis instance
- 1 MongoDB cluster

**Future Load: 10M users**
- 30 API servers (auto-scaling)
- 5 PostgreSQL read replicas + sharding
- 3 Redis clusters (hash slots)
- MongoDB sharded cluster (by user region)
- CDN for media files
- Message queue for async tasks

**Step 5: Trade-offs Discussion**

**Consistency vs Availability:**
- User profiles: Strong consistency (SQL)
- Feed: Eventual consistency (Cache + async updates)

**Latency vs Accuracy:**
- Like counts: May be slightly delayed (cached)
- Payment: Must be accurate (real-time DB)

---

## 2. Low Level Design (LLD)

### What is LLD?
Low Level Design focuses on **detailed implementation** - classes, functions, data structures, algorithms, and code-level decisions. Think of it as the detailed electrical wiring plan of a house.

### Key Components of LLD

**1. Class Diagrams**
Define entities, their attributes, and relationships.

**Example: E-commerce Order System**
```
User
- id: string
- name: string
- email: string
- orders: Order[]

Order
- id: string
- userId: string
- items: OrderItem[]
- total: number
- status: OrderStatus
- createdAt: Date

OrderItem
- productId: string
- name: string (snapshot)
- price: number (snapshot)
- quantity: number

Product
- id: string
- name: string
- price: number
- stock: number
- category: string
```

**2. Design Patterns**

**Singleton Pattern (Database Connection)**
- **When:** Need single instance (DB pool, Config)
- **Why:** Avoid multiple connections, save resources

**Factory Pattern (Object Creation)**
- **When:** Creating different payment methods (Card, UPI, Wallet)
- **Why:** Encapsulate object creation logic

**Strategy Pattern (Algorithms)**
- **When:** Different shipping methods (Standard, Express, Same-day)
- **Why:** Swap algorithms at runtime

**Observer Pattern (Event System)**
- **When:** Order placed → Send email, Update inventory, Notify user
- **Why:** Loose coupling between components

**Repository Pattern (Data Access)**
- **When:** Abstract database operations
- **Why:** Change DB without changing business logic

**3. API Design**

**RESTful Endpoints:**
```
User Management:
POST   /api/users              - Create user
GET    /api/users/:id          - Get user
PUT    /api/users/:id          - Update user
DELETE /api/users/:id          - Delete user

Order Management:
POST   /api/orders             - Create order
GET    /api/orders/:id         - Get order
GET    /api/users/:id/orders   - Get user's orders
PATCH  /api/orders/:id/status  - Update order status

Product Management:
GET    /api/products           - List products (pagination)
GET    /api/products/:id       - Get product
POST   /api/products           - Create product (admin)
PUT    /api/products/:id       - Update product (admin)
```

**4. Database Schema**

**Users Table (PostgreSQL):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Orders Collection (MongoDB):**
```javascript
{
  _id: ObjectId("..."),
  userId: "uuid",
  items: [
    {
      productId: "uuid",
      nameSnapshot: "iPhone 14",
      priceSnapshot: 999,
      quantity: 1
    }
  ],
  total: 999,
  status: "pending", // pending, confirmed, shipped, delivered
  shippingAddress: {
    street: "123 Main St",
    city: "New York",
    zip: "10001"
  },
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z")
}

// Indexes
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ status: 1 })
```

**5. Algorithm & Data Structure Choices**

**Scenario: Recent Activity Feed**
- **Requirement:** Show last 50 activities from 1000 followed users
- **Data Structure:** Min Heap (Priority Queue)
- **Why:** Efficiently get top K items from N sorted lists
- **Time Complexity:** O(N log K) where K=50, N=1000

**Scenario: Rate Limiting**
- **Requirement:** 100 requests per user per minute
- **Data Structure:** Sliding Window (Redis Sorted Set)
- **Why:** Accurate counting in time window
- **Space Complexity:** O(requests in window)

**Scenario: LRU Cache**
- **Requirement:** Cache with size limit, evict least used
- **Data Structure:** HashMap + Doubly Linked List
- **Why:** O(1) get/put operations
- **Implementation:** Built-in Map in JavaScript maintains insertion order

**6. Error Handling Strategy**

**Layered Error Handling:**
```
1. Validation Layer
   - Input validation
   - Return 400 Bad Request

2. Business Logic Layer
   - Business rule violations
   - Return 409 Conflict

3. Data Layer
   - Database errors
   - Return 500 Internal Server Error

4. External Services
   - Payment gateway timeout
   - Return 503 Service Unavailable
   - Implement retry with exponential backoff
```

**7. Security Considerations**

**Authentication:**
- JWT with short expiration (15 mins)
- Refresh token with long expiration (7 days)
- Store refresh token in DB for revocation

**Authorization:**
- Role-based access control (RBAC)
- Check permissions in middleware
- User roles: admin, seller, customer

**Input Validation:**
- Validate all inputs using schema (Joi, Zod)
- Sanitize to prevent XSS
- Use parameterized queries to prevent SQL injection

**Data Protection:**
- Hash passwords with bcrypt (salt rounds: 10)
- Encrypt sensitive data at rest
- Use HTTPS for data in transit

---

## 3. HLD vs LLD Comparison

| Aspect | HLD | LLD |
|--------|-----|-----|
| **Focus** | System architecture | Implementation details |
| **Audience** | Architects, Stakeholders | Developers |
| **Scope** | Entire system | Individual components |
| **Details** | What and why | How |
| **Example** | "We'll use microservices" | "User service has UserController, UserService, UserRepository" |
| **Decisions** | Technology stack, Infrastructure | Data structures, Algorithms |
| **Artifacts** | Architecture diagrams, Flow charts | Class diagrams, Sequence diagrams |

---

## 4. Common Interview Questions

### HLD Questions

**Q: Design a URL Shortener (like bit.ly)**

**Functional Requirements:**
- Convert long URL to short URL
- Redirect short URL to original URL
- Custom short URLs (optional)

**Non-Functional Requirements:**
- 100M URLs
- Low latency (< 100ms)
- High availability

**Solution:**
```
Components:
1. API Server (Node.js)
2. Database (PostgreSQL for URLs)
3. Cache (Redis for hot URLs)
4. Load Balancer

Flow:
Shorten: 
  User → API → Generate short code → Store in DB → Cache → Return

Redirect:
  User → API → Check cache → If miss, fetch from DB → Redirect

Short Code Generation:
  - Base62 encoding of auto-increment ID
  - 6 characters = 62^6 = 56 billion combinations

Database Schema:
  urls (id, short_code, original_url, created_at, click_count)
  Index on short_code for fast lookup

Caching Strategy:
  - Cache 80-20 rule (20% URLs get 80% traffic)
  - TTL: 24 hours
  - LRU eviction
```

**Q: Design Twitter Feed**

**Requirements:**
- User can post tweets (140 chars)
- User can follow others
- Home timeline shows tweets from followed users
- 10M daily active users

**Solution:**
```
Components:
1. Tweet Service (Create, Delete tweets)
2. Follow Service (Follow, Unfollow)
3. Timeline Service (Generate feed)
4. Database (PostgreSQL/MySQL)
5. Cache (Redis)
6. Message Queue (Kafka)

Timeline Generation:
Approach 1: Fan-out on Write (Push Model)
  - When user posts tweet, push to all followers' timelines
  - Pro: Fast reads (pre-computed)
  - Con: Slow writes (if 1M followers)
  
Approach 2: Fan-out on Read (Pull Model)
  - When user opens timeline, fetch tweets from followed users
  - Pro: Fast writes
  - Con: Slow reads (query N users)

Hybrid Approach:
  - Celebrities (>10K followers): Pull model
  - Regular users: Push model
  - Cache timelines in Redis
```

### LLD Questions

**Q: Design a Parking Lot System**

**Requirements:**
- Multiple floors and spots
- Different vehicle types (Car, Bike, Truck)
- Track availability
- Calculate parking fee

**Entities:**
```
ParkingLot
- floors: Floor[]
- findAvailableSpot(vehicleType): ParkingSpot | null

Floor
- level: number
- spots: ParkingSpot[]

ParkingSpot
- id: string
- type: SpotType (COMPACT, REGULAR, LARGE)
- status: SpotStatus (AVAILABLE, OCCUPIED)
- vehicle: Vehicle | null

Vehicle
- licensePlate: string
- type: VehicleType (CAR, BIKE, TRUCK)

Ticket
- ticketId: string
- vehicleId: string
- spotId: string
- entryTime: Date
- exitTime: Date
- fee: number
```

**Key Methods:**
```
parkVehicle(vehicle):
  1. Find available spot for vehicle type
  2. Mark spot as occupied
  3. Create and return ticket

unparkVehicle(ticketId):
  1. Find ticket
  2. Calculate duration
  3. Calculate fee based on duration
  4. Mark spot as available
  5. Return fee

calculateFee(entryTime, exitTime, vehicleType):
  - Hourly rate based on vehicle type
  - First hour free
  - Maximum daily cap
```

**Q: Design a Library Management System**

**Entities:**
```
Book
- ISBN: string
- title: string
- author: string
- availableCopies: number
- totalCopies: number

Member
- memberId: string
- name: string
- borrowedBooks: BookIssue[]
- maxBooksAllowed: number (default: 5)

BookIssue
- issueId: string
- bookISBN: string
- memberId: string
- issueDate: Date
- dueDate: Date (14 days)
- returnDate: Date | null
- fine: number
```

**Key Operations:**
```
issueBook(memberId, ISBN):
  - Check if member can borrow (< maxBooks, no pending fines)
  - Check book availability
  - Reduce availableCopies
  - Create BookIssue record
  - Set dueDate (14 days)

returnBook(issueId):
  - Find BookIssue
  - Check if overdue
  - Calculate fine (Rs. 10/day)
  - Increment availableCopies
  - Update returnDate

searchBooks(query):
  - Search by title, author, ISBN
  - Return available books
```

---

## 5. Design Pattern Examples

### Factory Pattern (Payment Processing)
**Problem:** Need to support multiple payment methods

**Solution:**
```javascript
function createPaymentProcessor(type) {
  const processors = {
    card: {
      process: (amount, details) => {
        // Process card payment via Stripe
        return { success: true, transactionId: '...' };
      }
    },
    upi: {
      process: (amount, details) => {
        // Process UPI payment via Razorpay
        return { success: true, transactionId: '...' };
      }
    },
    wallet: {
      process: (amount, details) => {
        // Deduct from wallet balance
        return { success: true, transactionId: '...' };
      }
    }
  };
  
  return processors[type];
}

// Usage
const processor = createPaymentProcessor('upi');
const result = processor.process(100, { upiId: 'user@paytm' });
```

### Observer Pattern (Order Updates)
**Problem:** When order status changes, notify multiple services

**Solution:**
```javascript
function createOrderEventEmitter() {
  const subscribers = [];
  
  function subscribe(callback) {
    subscribers.push(callback);
  }
  
  function notify(event) {
    subscribers.forEach(callback => callback(event));
  }
  
  return { subscribe, notify };
}

// Services subscribe
const orderEvents = createOrderEventEmitter();

orderEvents.subscribe((event) => {
  // Email service
  if (event.type === 'ORDER_CONFIRMED') {
    sendEmail(event.order.userEmail, 'Order Confirmed');
  }
});

orderEvents.subscribe((event) => {
  // Inventory service
  if (event.type === 'ORDER_CONFIRMED') {
    decreaseInventory(event.order.items);
  }
});

orderEvents.subscribe((event) => {
  // Notification service
  sendPushNotification(event.order.userId, event.message);
});

// Trigger event
orderEvents.notify({
  type: 'ORDER_CONFIRMED',
  order: { id: '123', userEmail: 'user@example.com', items: [...] }
});
```

---

## Interview Tips

### For HLD:
1. **Start with requirements** - Clarify functional & non-functional
2. **Draw diagrams** - Show components and data flow
3. **Discuss trade-offs** - Why this choice over alternatives
4. **Think about scale** - How to handle 10x traffic
5. **Consider failures** - What if DB goes down?

### For LLD:
1. **Identify entities** - Core objects in the system
2. **Define relationships** - How entities interact
3. **Choose data structures** - HashMap, Tree, Queue based on operations
4. **Handle edge cases** - What if user has 0 followers?
5. **Write clean code** - Follow SOLID principles

### Common Mistakes:
- ❌ Jumping to solution without clarifying requirements
- ❌ Not discussing trade-offs
- ❌ Ignoring scale considerations
- ❌ Overcomplicating with unnecessary components
- ❌ Not handling error cases

### Good Practices:
- ✅ Think out loud - explain your reasoning
- ✅ Ask questions - clarify ambiguities
- ✅ Start simple - add complexity gradually
- ✅ Discuss alternatives - show breadth of knowledge
- ✅ Be pragmatic - balance ideal vs practical

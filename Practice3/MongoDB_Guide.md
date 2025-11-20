# MongoDB Guide

## 1. Indexes

### Explanation
Indexes are special data structures (B-trees) that store a small portion of the collection's data in an easy-to-traverse form. They dramatically improve query performance but slow down writes and consume disk space.

### Key Concepts
- **B-tree Structure**: Sorted, allows fast lookups (O(log n))
- **Single Field Index**: Index on one field
- **Compound Index**: Index on multiple fields (order matters!)
- **Index Types**: Unique, Sparse, TTL, Text, Geospatial
- **Trade-off**: Faster reads, slower writes, more storage

### Real-Time Example
**Library Catalog**: Instead of checking every book to find "Harry Potter", use the index (catalog) organized by title. Index points to exact shelf location.

### Code Block
```javascript
// 1. Create Single Field Index
db.users.createIndex({ email: 1 }); // 1 = ascending, -1 = descending

// Query using index
db.users.find({ email: "john@example.com" }); // Uses index, fast!

// 2. Compound Index (order matters!)
db.products.createIndex({ category: 1, price: -1 });

// Queries that use this index:
db.products.find({ category: "Electronics" });
db.products.find({ category: "Electronics", price: { $gt: 500 } });
db.products.find({ category: "Electronics" }).sort({ price: -1 });

// Query that does NOT use this index efficiently:
db.products.find({ price: { $gt: 500 } }); // Missing category

// 3. Unique Index
db.users.createIndex({ email: 1 }, { unique: true });
// Ensures no duplicate emails

// 4. Sparse Index (only index documents that have the field)
db.users.createIndex({ phoneNumber: 1 }, { sparse: true });
// Saves space if many users don't have phone numbers

// 5. TTL Index (auto-delete documents after time)
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
// Deletes sessions older than 1 hour

// 6. Text Index (full-text search)
db.articles.createIndex({ title: "text", content: "text" });

db.articles.find({ $text: { $search: "mongodb indexing" } });

// 7. Multikey Index (for arrays)
db.products.createIndex({ tags: 1 });

// Query
db.products.find({ tags: "electronics" }); // Uses index

// 8. View all indexes
db.users.getIndexes();

// 9. Drop index
db.users.dropIndex({ email: 1 });

// 10. Real Interview Example: E-commerce Product Search
// Schema
{
  _id: ObjectId("..."),
  name: "iPhone 14",
  category: "Electronics",
  brand: "Apple",
  price: 999,
  inStock: true,
  createdAt: ISODate("2024-01-01")
}

// Create optimal indexes
db.products.createIndex({ category: 1, brand: 1, price: -1 });
db.products.createIndex({ inStock: 1, createdAt: -1 });
db.products.createIndex({ name: "text" });

// Efficient queries
db.products.find({ 
  category: "Electronics", 
  brand: "Apple",
  price: { $lte: 1000 }
}).sort({ price: -1 });

// 11. Index Best Practices
/*
- Create indexes on fields used in:
  * Where clauses
  * Sort operations
  * Join operations
  
- Compound index order:
  1. Equality filters first
  2. Sort fields next
  3. Range filters last
  
- Example: { status: 1, createdAt: -1, age: 1 }
  For query: status = "active" (equality), sort by createdAt (sort), age > 25 (range)

- Don't over-index (each index costs write performance)
- Monitor index usage: db.collection.aggregate([{ $indexStats: {} }])
*/
```

---

## 2. explain()

### Explanation
The `explain()` method provides detailed information about query execution, helping you understand if indexes are being used and how efficiently queries run.

### Key Concepts
- **executionStats**: Detailed performance metrics
- **IXSCAN**: Index scan (good! using index)
- **COLLSCAN**: Collection scan (bad! scanning all documents)
- **nReturned vs totalDocsExamined**: Efficiency ratio
- **executionTimeMillis**: Query execution time

### Real-Time Example
**GPS Navigation**: `explain()` is like seeing your route plan - is it taking highway (index) or local roads (full scan)? How many miles, how long will it take?

### Code Block
```javascript
// 1. Basic explain
db.users.find({ email: "john@example.com" }).explain();

// 2. Execution Stats (more detailed)
db.users.find({ email: "john@example.com" }).explain("executionStats");

// 3. All Plans (shows all considered query plans)
db.users.find({ age: { $gt: 25 } }).explain("allPlansExecution");

// 4. Reading explain() output
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",  // ✅ Good! Using index
        "keyPattern": { "email": 1 },
        "indexName": "email_1"
      }
    }
  },
  "executionStats": {
    "executionTimeMillis": 2,      // Time taken
    "totalDocsExamined": 1,        // Documents scanned
    "nReturned": 1,                // Documents returned
    "executionStages": {
      "stage": "FETCH",
      "nReturned": 1,
      "executionTimeMillisEstimate": 0
    }
  }
}

// 5. Bad Query Example (no index)
db.users.find({ age: 25 }).explain("executionStats");

{
  "winningPlan": {
    "stage": "COLLSCAN",  // ❌ Bad! Full collection scan
    "filter": { "age": { "$eq": 25 } }
  },
  "executionStats": {
    "totalDocsExamined": 1000000,  // Scanned 1M docs
    "nReturned": 100               // Returned only 100
    // Efficiency: 100/1000000 = 0.01% - very inefficient!
  }
}

// Fix: Create index
db.users.createIndex({ age: 1 });

// 6. Compound Index Efficiency
db.products.createIndex({ category: 1, price: -1 });

db.products.find({ 
  category: "Electronics", 
  price: { $gte: 500 } 
}).explain("executionStats");

{
  "winningPlan": {
    "stage": "FETCH",
    "inputStage": {
      "stage": "IXSCAN",
      "keyPattern": { "category": 1, "price": -1 },
      "indexBounds": {
        "category": ["Electronics", "Electronics"],
        "price": [500, Infinity]
      }
    }
  }
}

// 7. Real Interview Example: Optimize Slow Query
// Slow query (3000ms)
db.orders.find({
  status: "pending",
  customerId: 12345,
  orderDate: { $gte: ISODate("2024-01-01") }
}).sort({ orderDate: -1 }).explain("executionStats");

// Analysis from explain():
// - COLLSCAN (no index)
// - totalDocsExamined: 500000
// - nReturned: 50
// - executionTimeMillis: 3000

// Solution: Create compound index
db.orders.createIndex({ 
  customerId: 1,        // Equality first
  orderDate: -1,        // Sort second
  status: 1             // Additional filter
});

// After index (50ms)
// - IXSCAN (using index)
// - totalDocsExamined: 50
// - nReturned: 50
// - executionTimeMillis: 50

// 8. Covered Query (ultra-fast, doesn't fetch documents)
db.users.createIndex({ email: 1, name: 1 });

db.users.find(
  { email: "john@example.com" },
  { _id: 0, email: 1, name: 1 }  // Projection with only indexed fields
).explain("executionStats");

{
  "winningPlan": {
    "stage": "PROJECTION_COVERED",  // ✅ Covered query!
    "inputStage": {
      "stage": "IXSCAN"
    }
  },
  "totalDocsExamined": 0  // Didn't fetch any documents!
}
```

---

## 3. Aggregation Pipelines

### Explanation
Aggregation framework processes data records and returns computed results. It's like a data processing pipeline where documents pass through multiple stages, each transforming the data.

### Key Concepts
- **Pipeline Stages**: Array of operations executed in order
- **$match Early**: Filter as early as possible (uses indexes)
- **$project Late**: Remove fields at the end
- **Common Stages**: $match, $group, $sort, $limit, $lookup, $unwind
- **Performance**: Order of stages matters!

### Real-Time Example
**Assembly Line**: Raw materials ($match) → Shape/cut ($project) → Group by type ($group) → Sort by quality ($sort) → Pack first 100 ($limit)

### Code Block
```javascript
// 1. Basic Aggregation
db.orders.aggregate([
  { $match: { status: "completed" } },              // Filter
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } }, // Group
  { $sort: { total: -1 } },                        // Sort
  { $limit: 10 }                                   // Top 10
]);

// 2. $match EARLY (uses index!)
// ✅ Good
db.products.aggregate([
  { $match: { category: "Electronics", inStock: true } }, // Uses index
  { $group: { _id: "$brand", avgPrice: { $avg: "$price" } } }
]);

// ❌ Bad
db.products.aggregate([
  { $group: { _id: "$brand", avgPrice: { $avg: "$price" } } },
  { $match: { "avgPrice": { $gt: 500 } } }  // Can't use index
]);

// 3. $project (reshape documents)
db.users.aggregate([
  { $match: { age: { $gte: 18 } } },
  { $project: {
      fullName: { $concat: ["$firstName", " ", "$lastName"] },
      age: 1,
      email: 1,
      _id: 0
  }}
]);

// 4. $group with Accumulators
db.sales.aggregate([
  { $group: {
      _id: "$productId",
      totalSales: { $sum: "$quantity" },
      avgPrice: { $avg: "$price" },
      maxPrice: { $max: "$price" },
      minPrice: { $min: "$price" },
      firstSale: { $first: "$date" },
      allCustomers: { $addToSet: "$customerId" }  // Unique customers
  }}
]);

// 5. $lookup (SQL JOIN equivalent)
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $lookup: {
      from: "users",           // Join with users collection
      localField: "userId",    // Field in orders
      foreignField: "_id",     // Field in users
      as: "userDetails"        // Output array field
  }},
  { $unwind: "$userDetails" }, // Convert array to object
  { $project: {
      orderId: "$_id",
      amount: 1,
      userName: "$userDetails.name",
      userEmail: "$userDetails.email"
  }}
]);

// 6. $unwind (deconstruct arrays)
// Document: { _id: 1, tags: ["electronics", "mobile", "apple"] }

db.products.aggregate([
  { $unwind: "$tags" },
  { $group: { _id: "$tags", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Output: Top tags by frequency

// 7. $facet (multiple pipelines)
db.products.aggregate([
  { $facet: {
      "priceRanges": [
        { $bucket: {
            groupBy: "$price",
            boundaries: [0, 100, 500, 1000, 5000],
            default: "Other",
            output: { count: { $sum: 1 } }
        }}
      ],
      "topBrands": [
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]
  }}
]);

// 8. Real Interview Example: E-commerce Analytics
db.orders.aggregate([
  // Stage 1: Filter (uses index!)
  { $match: { 
      orderDate: { 
        $gte: ISODate("2024-01-01"),
        $lte: ISODate("2024-12-31")
      },
      status: "completed"
  }},
  
  // Stage 2: Lookup user details
  { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
  }},
  { $unwind: "$user" },
  
  // Stage 3: Unwind order items
  { $unwind: "$items" },
  
  // Stage 4: Lookup product details
  { $lookup: {
      from: "products",
      localField: "items.productId",
      foreignField: "_id",
      as: "product"
  }},
  { $unwind: "$product" },
  
  // Stage 5: Calculate
  { $addFields: {
      itemTotal: { $multiply: ["$items.quantity", "$items.price"] }
  }},
  
  // Stage 6: Group by category
  { $group: {
      _id: "$product.category",
      totalRevenue: { $sum: "$itemTotal" },
      orderCount: { $sum: 1 },
      uniqueCustomers: { $addToSet: "$userId" },
      avgOrderValue: { $avg: "$itemTotal" }
  }},
  
  // Stage 7: Add calculated fields
  { $addFields: {
      customerCount: { $size: "$uniqueCustomers" }
  }},
  
  // Stage 8: Sort by revenue
  { $sort: { totalRevenue: -1 } },
  
  // Stage 9: Project final shape
  { $project: {
      category: "$_id",
      totalRevenue: 1,
      orderCount: 1,
      customerCount: 1,
      avgOrderValue: { $round: ["$avgOrderValue", 2] },
      _id: 0
  }}
]);

// 9. Performance Tips
/*
1. $match early (use indexes)
2. $project late (reduce data size early with $project if needed)
3. Use $limit after $sort to reduce sorting overhead
4. Create indexes on fields used in $match and $sort
5. Avoid $lookup on large collections (consider embedding)
6. Use allowDiskUse: true for large datasets
*/

db.collection.aggregate(pipeline, { allowDiskUse: true });
```

---

## 4. Pagination

### Explanation
Pagination divides large result sets into smaller pages. Skip/limit method is simple but slow for large offsets. Range queries using indexed fields are much faster.

### Key Concepts
- **Skip/Limit**: Simple but slow (O(n) for offset)
- **Range Query**: Fast (O(log n) with index)
- **Cursor-based**: Most efficient for real-time data
- **Performance**: Skip/limit degrades with offset

### Real-Time Example
**Book Reading**: Skip/limit is like skipping pages one by one to reach page 1000. Range query is like directly opening the bookmark at page 1000.

### Code Block
```javascript
// 1. Skip/Limit (simple but SLOW for large offset)
const page = 10;
const limit = 20;
const skip = (page - 1) * limit;

db.products.find()
  .skip(skip)   // ❌ Slow: MongoDB scans and discards first 180 docs
  .limit(limit)
  .toArray();

// Problem: To get page 1000, MongoDB scans 20,000 documents!

// 2. Range Query (FAST, uses index)
db.products.createIndex({ _id: 1 }); // Usually already exists

// First page
const firstPage = await db.products
  .find()
  .sort({ _id: 1 })
  .limit(20)
  .toArray();

// Next page (using last _id from previous page)
const lastId = firstPage[firstPage.length - 1]._id;

const nextPage = await db.products
  .find({ _id: { $gt: lastId } })
  .sort({ _id: 1 })
  .limit(20)
  .toArray();

// 3. Range Query with Custom Field
db.products.createIndex({ createdAt: -1, _id: -1 });

// First page
const firstPage = await db.products
  .find()
  .sort({ createdAt: -1, _id: -1 })
  .limit(20)
  .toArray();

// Next page
const lastDoc = firstPage[firstPage.length - 1];

const nextPage = await db.products
  .find({
    $or: [
      { createdAt: { $lt: lastDoc.createdAt } },
      { 
        createdAt: lastDoc.createdAt, 
        _id: { $lt: lastDoc._id }
      }
    ]
  })
  .sort({ createdAt: -1, _id: -1 })
  .limit(20)
  .toArray();

// 4. Real Interview Example: API Pagination
const express = require('express');
const app = express();

// ❌ Bad: Skip/Limit
app.get('/api/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  const products = await db.products
    .find()
    .skip(skip)
    .limit(limit)
    .toArray();
  
  const total = await db.products.countDocuments();
  
  res.json({
    products,
    page,
    totalPages: Math.ceil(total / limit)
  });
});

// ✅ Good: Cursor-based Pagination
app.get('/api/products', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const cursor = req.query.cursor; // Last _id from previous page
  
  const query = cursor ? { _id: { $gt: new ObjectId(cursor) } } : {};
  
  const products = await db.products
    .find(query)
    .sort({ _id: 1 })
    .limit(limit + 1)  // Fetch one extra to check if more pages exist
    .toArray();
  
  const hasMore = products.length > limit;
  const results = hasMore ? products.slice(0, -1) : products;
  const nextCursor = hasMore ? results[results.length - 1]._id : null;
  
  res.json({
    products: results,
    nextCursor,
    hasMore
  });
});

// 5. Pagination with Aggregation
app.get('/api/products/search', async (req, res) => {
  const { category, minPrice, cursor, limit = 20 } = req.query;
  
  const matchStage = {
    category,
    price: { $gte: parseInt(minPrice) || 0 }
  };
  
  if (cursor) {
    const [price, _id] = cursor.split('_');
    matchStage.$or = [
      { price: { $gt: parseInt(price) } },
      { price: parseInt(price), _id: { $gt: new ObjectId(_id) } }
    ];
  }
  
  const products = await db.products.aggregate([
    { $match: matchStage },
    { $sort: { price: 1, _id: 1 } },
    { $limit: parseInt(limit) + 1 }
  ]).toArray();
  
  const hasMore = products.length > limit;
  const results = hasMore ? products.slice(0, -1) : products;
  const nextCursor = hasMore 
    ? `${results[results.length - 1].price}_${results[results.length - 1]._id}`
    : null;
  
  res.json({ products: results, nextCursor, hasMore });
});

// 6. Performance Comparison
/*
Skip/Limit for page 1000 (limit 20):
- Scans 20,000 documents
- Time: ~500ms
- Gets slower linearly with page number

Range Query for page 1000:
- Uses index, jumps directly
- Time: ~10ms
- Consistent performance regardless of page number
*/
```

---

## 5. Schema Design

### Explanation
Unlike SQL, MongoDB is schema-less, but good schema design is crucial for performance. Key decision: embed documents vs reference (normalize).

### Key Concepts
- **Embedding**: Nest related data (1-to-1, 1-to-few)
- **Referencing**: Store IDs, query separately (1-to-many, many-to-many)
- **Trade-offs**: Read vs write performance, data duplication
- **Document Size Limit**: 16MB per document

### Real-Time Example
**Social Media Post**: Embed comments if few (<100), reference if thousands. Like keeping sticky notes on your desk vs filing cabinet.

### Code Block
```javascript
// 1. Embedding (One-to-Few)
// ✅ Good: User has 1 address
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  address: {
    street: "123 Main St",
    city: "NYC",
    zip: "10001"
  }
}

// 2. Referencing (One-to-Many)
// ✅ Good: User has many orders

// Users collection
{
  _id: ObjectId("user1"),
  name: "John Doe",
  email: "john@example.com"
}

// Orders collection
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),  // Reference
  items: [...],
  total: 299.99
}

// Query
const user = await db.users.findOne({ _id: userId });
const orders = await db.orders.find({ userId: userId }).toArray();

// 3. Hybrid Approach (Embedding + Referencing)
// Blog post with comments

// Posts collection
{
  _id: ObjectId("post1"),
  title: "MongoDB Schema Design",
  content: "...",
  author: {
    id: ObjectId("user1"),
    name: "John Doe",  // Duplicate for fast reads
    avatar: "url"
  },
  // Embed recent comments for fast display
  recentComments: [
    {
      text: "Great post!",
      author: "Jane",
      createdAt: ISODate("...")
    }
  ],
  commentsCount: 150,
  createdAt: ISODate("...")
}

// Comments collection (all comments)
{
  _id: ObjectId("comment1"),
  postId: ObjectId("post1"),
  text: "Great post!",
  author: {
    id: ObjectId("user2"),
    name: "Jane"
  },
  createdAt: ISODate("...")
}

// 4. Real Interview Example: E-commerce Schema

// Products collection
{
  _id: ObjectId("prod1"),
  name: "iPhone 14",
  description: "...",
  price: 999,
  category: "Electronics",
  brand: "Apple",
  
  // Embed specs (1-to-1)
  specs: {
    color: "Black",
    storage: "128GB",
    ram: "6GB"
  },
  
  // Embed images (1-to-few)
  images: [
    "url1.jpg",
    "url2.jpg"
  ],
  
  // Embed inventory (1-to-1)
  inventory: {
    quantity: 50,
    warehouse: "NYC-01"
  },
  
  // Reference categories (many-to-many via array)
  categoryIds: [ObjectId("cat1"), ObjectId("cat2")],
  
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// Orders collection
{
  _id: ObjectId("order1"),
  userId: ObjectId("user1"),
  
  // Embed order items (1-to-few, snapshot at order time)
  items: [
    {
      productId: ObjectId("prod1"),
      name: "iPhone 14",      // Duplicate (price might change)
      price: 999,
      quantity: 1,
      total: 999
    }
  ],
  
  // Embed shipping address (1-to-1, snapshot)
  shippingAddress: {
    street: "123 Main St",
    city: "NYC",
    zip: "10001"
  },
  
  status: "pending",
  total: 999,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// Users collection
{
  _id: ObjectId("user1"),
  name: "John Doe",
  email: "john@example.com",
  password: "hashed",
  
  // Embed saved addresses (1-to-few)
  addresses: [
    {
      _id: ObjectId("addr1"),
      label: "Home",
      street: "123 Main St",
      city: "NYC",
      default: true
    }
  ],
  
  // Reference orders (1-to-many)
  // Don't embed - grows unbounded
  
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// 5. Schema Design Rules

/*
EMBED when:
- 1-to-1 relationship
- 1-to-few relationship (<100 sub-documents)
- Data accessed together
- Data doesn't change often
- Need atomic updates

REFERENCE when:
- 1-to-many relationship (many > few hundred)
- Many-to-many relationship
- Data accessed independently
- Data changes frequently
- Document size approaching 16MB

DUPLICATE when:
- Read-heavy workload
- Data rarely changes
- Acceptable eventual consistency
- Example: author name in blog posts
*/

// 6. Anti-patterns to Avoid

// ❌ Bad: Massive embedding (unbounded array)
{
  _id: ObjectId("user1"),
  name: "John",
  orders: [
    { ... },  // Could grow to thousands!
    { ... },
    // ... 10,000 orders → exceeds 16MB limit
  ]
}

// ✅ Good: Reference
{
  _id: ObjectId("user1"),
  name: "John"
}
// Separate orders collection with userId reference

// ❌ Bad: Deep nesting (>2-3 levels)
{
  user: {
    profile: {
      address: {
        billing: {
          street: { ... }  // Too deep!
        }
      }
    }
  }
}

// ✅ Good: Flatten
{
  name: "John",
  billingStreet: "123 Main St",
  billingCity: "NYC"
}
```

---

## 6. Transactions in MongoDB

### Explanation
Transactions allow multiple operations to execute as an atomic unit. Either all operations succeed, or all fail (ACID properties).

### When to Use
- **Financial operations**: Transfer money between accounts
- **Multi-document updates**: Update inventory and create order together
- **Data consistency**: Ensure related documents stay in sync

### Requirements
- MongoDB 4.0+ (replica set)
- MongoDB 4.2+ (sharded cluster)

### Example
```javascript
// Transfer money between accounts
const session = client.startSession();

try {
  await session.withTransaction(async () => {
    // Deduct from sender
    await Account.updateOne(
      { userId: senderId },
      { $inc: { balance: -amount } },
      { session }
    );
    
    // Add to receiver
    await Account.updateOne(
      { userId: receiverId },
      { $inc: { balance: amount } },
      { session }
    );
    
    // Create transaction record
    await Transaction.create([{
      from: senderId,
      to: receiverId,
      amount: amount,
      timestamp: new Date()
    }], { session });
  });
  
  console.log('Transaction committed');
} catch (error) {
  console.log('Transaction aborted:', error);
} finally {
  await session.endSession();
}
```

### Trade-offs
- **Pros**: Data consistency, ACID guarantees
- **Cons**: Performance overhead, complexity
- **Alternative**: Design schema to avoid multi-document updates (embed related data)

---

## 7. Change Streams (Real-time Updates)

### Explanation
Change streams allow applications to listen to real-time changes in collections. Like watching a database for INSERT, UPDATE, DELETE operations.

### Real-Time Example
**Live Notifications**: When new message arrives in DB, push notification to user instantly without polling.

### Use Cases
- Real-time dashboards
- Live chat applications
- Notification systems
- Data synchronization

### Example
```javascript
// Watch for changes in orders collection
const changeStream = Order.watch();

changeStream.on('change', (change) => {
  console.log('Change detected:', change);
  
  if (change.operationType === 'insert') {
    const newOrder = change.fullDocument;
    // Send real-time notification
    io.to(newOrder.userId).emit('order-created', newOrder);
  }
  
  if (change.operationType === 'update') {
    const orderId = change.documentKey._id;
    const updates = change.updateDescription.updatedFields;
    
    if (updates.status === 'shipped') {
      // Notify user order shipped
      notifyUser(orderId, 'Your order has shipped!');
    }
  }
});

// Watch specific fields only
const pipeline = [
  { $match: { 'updateDescription.updatedFields.status': { $exists: true } } }
];

const statusChangeStream = Order.watch(pipeline);

statusChangeStream.on('change', (change) => {
  console.log('Status changed:', change.updateDescription.updatedFields.status);
});
```

### Resume Token
If connection drops, resume from where you left off:
```javascript
let resumeToken;

changeStream.on('change', (change) => {
  resumeToken = change._id;  // Save resume token
  // Process change
});

// Later, resume from last position
const newStream = Order.watch([], { resumeAfter: resumeToken });
```

---

## 8. Text Search

### Explanation
MongoDB supports full-text search on string fields. Useful for searching product descriptions, blog posts, etc.

### Setup
```javascript
// Create text index
db.products.createIndex({ 
  name: "text", 
  description: "text" 
});

// Search
db.products.find({ 
  $text: { $search: "laptop gaming" } 
});

// With score (relevance)
db.products.find(
  { $text: { $search: "laptop gaming" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

### Text Search Features
```javascript
// Phrase search (exact phrase)
db.products.find({ $text: { $search: "\"gaming laptop\"" } });

// Exclude terms
db.products.find({ $text: { $search: "laptop -apple" } });

// Case sensitivity
db.products.find({ 
  $text: { 
    $search: "Laptop", 
    $caseSensitive: true 
  } 
});

// Language support
db.products.createIndex(
  { description: "text" },
  { default_language: "spanish" }
);
```

### Limitations
- Only one text index per collection
- No wildcard in phrase search
- Performance degrades with large collections
- Consider Elasticsearch for advanced search

---

## 9. Geospatial Queries

### Explanation
MongoDB supports location-based queries. Find nearby restaurants, delivery drivers, etc.

### Setup
```javascript
// Store location (GeoJSON format)
db.restaurants.insertOne({
  name: "Pizza Place",
  location: {
    type: "Point",
    coordinates: [-73.97, 40.77]  // [longitude, latitude]
  }
});

// Create 2dsphere index
db.restaurants.createIndex({ location: "2dsphere" });
```

### Common Queries
```javascript
// Find restaurants within 5km of location
db.restaurants.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.98, 40.76]
      },
      $maxDistance: 5000  // meters
    }
  }
});

// Find restaurants in a polygon (delivery area)
db.restaurants.find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-73.99, 40.75],
          [-73.97, 40.75],
          [-73.97, 40.78],
          [-73.99, 40.78],
          [-73.99, 40.75]
        ]]
      }
    }
  }
});

// Find drivers within 2km, sorted by distance
db.drivers.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-73.98, 40.76] },
      distanceField: "distance",
      maxDistance: 2000,
      spherical: true
    }
  },
  { $limit: 5 }
]);
```

### Real Interview Example: Uber-like App
```javascript
// Find nearest 5 available drivers
async function findNearestDrivers(userLat, userLong) {
  return await Driver.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [userLong, userLat]
        },
        distanceField: "distanceFromUser",
        maxDistance: 5000,  // 5km radius
        spherical: true,
        query: { available: true }  // Only available drivers
      }
    },
    { $limit: 5 },
    {
      $project: {
        name: 1,
        rating: 1,
        distanceFromUser: 1,
        estimatedTime: {
          $divide: ["$distanceFromUser", 500]  // Assume 500m/min
        }
      }
    }
  ]);
}
```

---

## 10. Data Validation

### Explanation
MongoDB schema validation ensures data quality. Define rules for field types, ranges, required fields.

### Schema Validation
```javascript
// Create collection with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "age"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "must be a valid email"
        },
        age: {
          bsonType: "int",
          minimum: 18,
          maximum: 120,
          description: "must be an integer between 18 and 120"
        },
        status: {
          enum: ["active", "inactive", "banned"],
          description: "must be one of the enum values"
        }
      }
    }
  },
  validationLevel: "strict",  // or "moderate"
  validationAction: "error"   // or "warn"
});

// Test validation
db.users.insertOne({ email: "invalid", age: 15 });
// Error: Document failed validation

db.users.insertOne({ 
  email: "user@example.com", 
  age: 25,
  status: "active"
});
// Success
```

### Update Existing Collection
```javascript
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email"],
      properties: {
        email: { bsonType: "string" }
      }
    }
  }
});
```

### Mongoose Validation (Application Level)
```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Invalid email format'
    }
  },
  age: {
    type: Number,
    required: true,
    min: [18, 'Must be at least 18'],
    max: [120, 'Must be at most 120']
  },
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 20
  }
});

// Custom validation
userSchema.path('email').validate(async (email) => {
  const count = await mongoose.models.User.countDocuments({ email });
  return count === 0;
}, 'Email already exists');
```

---

## 11. Performance Best Practices

### Explanation
Techniques to optimize MongoDB queries and operations for production.

### Key Practices

**1. Use Projection (Select Only Needed Fields)**
```javascript
// ❌ Bad - Fetches entire document
db.users.find({ active: true });

// ✅ Good - Only needed fields
db.users.find(
  { active: true },
  { name: 1, email: 1, _id: 0 }
);
// Reduces network transfer and memory
```

**2. Use Covered Queries**
```javascript
// Index on { status: 1, name: 1 }
db.orders.createIndex({ status: 1, name: 1 });

// Covered query (data from index only, no document read)
db.orders.find(
  { status: "pending" },
  { status: 1, name: 1, _id: 0 }
);
// explain() shows: totalDocsExamined: 0 (no documents read!)
```

**3. Avoid Large Skip Values**
```javascript
// ❌ Bad - Gets slower as page increases
db.products.find().skip(10000).limit(20);

// ✅ Good - Range query with indexed field
db.products.find({ _id: { $gt: lastSeenId } }).limit(20);
```

**4. Use Bulk Operations**
```javascript
// ❌ Slow - N database calls
for (const user of users) {
  await User.create(user);
}

// ✅ Fast - 1 database call
await User.insertMany(users);

// Bulk update
const bulk = db.users.initializeUnorderedBulkOp();
bulk.find({ active: false }).update({ $set: { deleted: true } });
bulk.find({ lastLogin: { $lt: oldDate } }).remove();
await bulk.execute();
```

**5. Use Aggregation for Complex Queries**
```javascript
// ❌ Bad - Multiple queries + in-memory processing
const activeUsers = await User.find({ active: true });
const result = activeUsers.filter(u => u.orders.length > 5);

// ✅ Good - Single aggregation
const result = await User.aggregate([
  { $match: { active: true } },
  { $project: { name: 1, orderCount: { $size: "$orders" } } },
  { $match: { orderCount: { $gt: 5 } } }
]);
```

**6. Monitor Slow Queries**
```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 });  // Log queries > 100ms

// View slow queries
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 });

// Analyze slow query
db.system.profile.find().sort({ millis: -1 }).limit(5);
```

**7. Connection Pooling**
```javascript
// ✅ Proper connection pool
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
});
```

---

## Interview Tips

1. **Draw diagrams** showing index B-tree structure
2. **Compare IXSCAN vs COLLSCAN** in explain() output
3. **Discuss trade-offs** of embedding vs referencing
4. **Mention 16MB document limit**
5. **Explain $match early** in aggregation pipelines
6. **Show pagination performance difference** with numbers
7. **Real examples**: E-commerce, social media, blog
8. **Transactions**: Explain when to use and performance cost
9. **Change Streams**: Real-time updates without polling
10. **Geospatial**: Know $near vs $geoWithin
11. **Validation**: Schema validation at DB level vs application level
12. **Performance**: Covered queries, bulk operations, profiling

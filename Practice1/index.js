const https = require("https");
const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");
const PORT = 4000;

// -------------------------------------------------------------------------------
// const server = https.createServer((req, res) => {
//     res.writeHead(200, {"Content-Type": "text/plain"});
//     res.end("Hello from https server!!!")
// })

// -------------------------------------------------------------------------------


// Express rate limiter...

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: "Too Many request from this IP, please try again later.."
})

app.use(limiter);


// Custom rate limiter application....
// const requestCount = new Map();
// const WINDOW_MS = 60 * 1000 // 1 min.
// const MAX_REQUESTS = 5;

// app.use((req, res, next) => {
//     const ip = req.ip;
//     const now = Date.now();
//     if(!requestCount.has(ip)){
//         requestCount.set(ip, [])
//     }

//     const timestamps = requestCount.get(ip);

//     // Remove the timestamp older than window..
//     while (timestamps.length && now - timestamps[0] > WINDOW_MS) {
//         timestamps.shift();
//     }

//     if(timestamps.length > MAX_REQUESTS) {
//         return res.status(429).send("Too many requests, try again later.");
//     }

//     timestamps.push(now)

//     next()
// })


// ----------------------------------------------------------------------------------
// Multer..
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadDir = path.join(__dirname, "uploads");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/") // folder to save file
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext); // unique filename
    }
})

const upload = multer({ storage });

app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    const filePath = path.join(uploadDir, req.file.filename);

    // Read file immediatly after upload (whole file at once..)
    // fs.readFile(filePath, "utf-8", (err, data) => {
    //     if (err) {
    //         console.error("Error reading file:", err.message);
    //         return res.status(500).send("Error reading uploaded file");
    //     }

    //     console.log("Uploaded file content:\n", data); // Log file content.
    //     res.send(`File uploaded and read successfully: ${req.file.filename}`);
    // })

    /**
     * For large CSV files or multiple files, reading chunk by chunk using streams is much more efficient than reading the whole file at once
     * / 
    // const readline = require("readline");
    // // Create a readable stream
    // const stream = fs.createReadStream(filePath, {encoding: "utf-8"});

    // // use readline for line by line reading..
    // const rl = readline.createInterface({input: stream})

    // rl.on("line", (line) => {
    //     // Each line of CSV will come here.
    //     console.log("line:", line)
    // }) 

    // rl.on("close", () => {
    //     console.log("Finished reading file in streaming mode");
    //     res.send(`File uploaded and streamed successfully: ${req.file.filename}`);
    // })

    // rl.on("error", (err) => {
    //     console.error("Error reading file:", err.message);
    //     res.status(500).send("Error reading uploaded file");
    // })

    /**
     * Chunk bu chunk.
     */
    //   const CHUNK_SIZE = 516; // bytes (1KB chunks for example)
    //   const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

    //   stream.on("data", (chunk) => {
    //     console.log("Received chunk:", chunk.toString());
    //     // You can also push chunk to a parser or buffer here
    //   });

    //   stream.on("end", () => {
    //     console.log("Finished reading file in chunks");
    //     res.send(`File uploaded and read in chunks: ${req.file.filename}`);
    //   });

    //   stream.on("error", (err) => {
    //     console.error("Error reading file:", err.message);
    //     res.status(500).send("Error reading uploaded file");
    //   });

    // By using csv-parser..
    const csv = require("csv-parser");

    // Create a read stream and pipe to csv-parser
    fs.createReadStream(filePath)
        .pipe(csv()) // parse CSV row by row
        .on("data", (row) => {
            // Each row comes as an object: { column1: value, column2: value, ... }
            console.log("CSV Row:", row);
        })
        .on("end", () => {
            console.log("Finished streaming CSV file.");
            res.send(`File uploaded and streamed successfully: ${req.file.filename}`);
        })
        .on("error", (err) => {
            console.error("Error reading CSV file:", err.message);
            res.status(500).send("Error processing uploaded file");
        });



})

// -------------------------------------------------------------------
app.get("/", (req, res) => {
    res.send("Hello from HTTPS + Express!");
})


// Redis Implementations...
const { createClient } = require("redis");
app.use(express.json());
// let redisConnected = false;
// const redisClient = createClient();

// // Redis event listeners
// redisClient.on("connect", () => {
//     redisConnected = true;
//     console.log("✅ Redis connected....");
// });

// redisClient.on("error", (err) => {
//     redisConnected = false;
//     console.error("❌ Redis connection error:", err.message);
// });

// (async () => {
//     try {
//         await redisClient.connect();
//     } catch (err) {
//         console.error("Failed to connect to Redis:", err.message);
//     }
// })();

//Middleware to check cache..

async function cache(req, res, next) {
    if (!redisConnected) {
        console.warn("⚠️ Redis not connected, skipping cache");
        return next(); // fallback to DB/API
    }

    const { id } = req.params;
    try {
        const cacheData = await redisClient.get(id);
        if (cacheData) {
            console.log("Cache Hit..");
            return res.status(200).json({ source: "cache", data: JSON.parse(cacheData) })
        }
        next();
    } catch (error) {
        console.error("Redis Error", err)
        next(); // fallback to db..
    }
}

// Route with caching..

app.get("/user/:id", cache, async (req, res, next) => {
    const { id } = req.params;

    //Simulate Db and fetch API.
    const userData = { id, name: `User${id}`, age: 20 + parseInt(id) };

    if (redisConnected) {
        try {
            await redisClient.setEx(id, 60, JSON.stringify(userData));
            console.log("Data cached in Redis");
        } catch (err) {
            console.error("Redis set error:", err.message);
        }
    }

    res.json({ source: "db", data: userData });
})


// ----------------------------------------------------------------------------------------------------------
// BULL QUEUE IMPLEMENTATION
// Definition: Bull is a Redis-based queue for handling distributed jobs and messages
// Use Cases: Email sending, image processing, report generation, background tasks
// Benefits: Job retry, delayed jobs, job prioritization, job progress tracking

const Queue = require("bull")

// Create multiple queues for different job types
const emailQueue = new Queue("email-queue", {
    redis: { host: "127.0.0.1", port: 6379 }
});


const imageQueue = new Queue("image-processing", {
    redis: { host: "127.0.0.1", port: 6379 }
});

// PRODUCER: Add jobs to queue
app.post("/send-email", async (req, res) => {
    const { email, subject, body, priority = 'normal' } = req.body;

    // Add job with options (delay, priority, retry)
    const job = await emailQueue.add('send-email', 
        { email, subject, body }, 
        {
            priority: priority === 'high' ? 1 : 5,
            delay: 2000, // 2 second delay
            attempts: 3, // retry 3 times
            backoff: 'exponential'
        }
    );
    
    res.json({ 
        message: "Email job queued", 
        jobId: job.id,
        priority: job.opts.priority 
    });
});

app.post("/process-image", async (req, res) => {
    const { imageUrl, filters } = req.body;
    
    const job = await imageQueue.add('resize-image', 
        { imageUrl, filters },
        { attempts: 2 }
    );
    
    res.json({ message: "Image processing queued", jobId: job.id });
});

// CONSUMER: Process jobs with concurrency
emailQueue.process('send-email', 5, async (job) => {
    console.log(`📧 Processing email job ${job.id}`);
    console.log(`To: ${job.data.email}, Subject: ${job.data.subject}`);
    
    // Update job progress
    job.progress(50);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    job.progress(100);
    console.log(`✅ Email sent to: ${job.data.email}`);
    
    return { status: "sent", timestamp: new Date() };
});

imageQueue.process('resize-image', 2, async (job) => {
    console.log(`🖼️ Processing image: ${job.data.imageUrl}`);
    
    // Simulate image processing
    for (let i = 0; i <= 100; i += 20) {
        job.progress(i);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return { processedUrl: `processed_${job.data.imageUrl}` };
});

// Job event listeners
emailQueue.on("completed", (job, result) => {
    console.log(`✅ Email job ${job.id} completed:`, result);
});

emailQueue.on("failed", (job, err) => {
    console.log(`❌ Email job ${job.id} failed:`, err.message);
});

emailQueue.on("progress", (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

// ----------------------------------------------------------------------------------------------------------
// KAFKA IMPLEMENTATION
// Definition: Apache Kafka is a distributed streaming platform for building real-time data pipelines
// Use Cases: Event streaming, log aggregation, real-time analytics, microservice communication
// Benefits: High throughput, fault tolerance, scalability, durability

// Note: Install kafkajs: npm install kafkajs
// const { Kafka } = require('kafkajs');

// const kafka = new Kafka({
//     clientId: 'my-app',
//     brokers: ['localhost:9092']
// });

// // PRODUCER: Send messages to Kafka topic
// const producer = kafka.producer();

// app.post("/kafka/send", async (req, res) => {
//     const { topic, message, key } = req.body;
    
//     try {
//         await producer.connect();
        
//         const result = await producer.send({
//             topic: topic || 'user-events',
//             messages: [{
//                 key: key || Date.now().toString(),
//                 value: JSON.stringify(message),
//                 timestamp: Date.now()
//             }]
//         });
        
//         res.json({ 
//             message: "Message sent to Kafka", 
//             partition: result[0].partition,
//             offset: result[0].baseOffset 
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // CONSUMER: Read messages from Kafka topic
// const consumer = kafka.consumer({ groupId: 'my-group' });

// async function startKafkaConsumer() {
//     await consumer.connect();
//     await consumer.subscribe({ topic: 'user-events' });
    
//     await consumer.run({
//         eachMessage: async ({ topic, partition, message }) => {
//             console.log(`📨 Kafka message received:`);
//             console.log(`Topic: ${topic}, Partition: ${partition}`);
//             console.log(`Key: ${message.key?.toString()}`);
//             console.log(`Value: ${message.value?.toString()}`);
//             console.log(`Timestamp: ${new Date(parseInt(message.timestamp))}`);
//         },
//     });
// }

// // Uncomment to start Kafka consumer
// // startKafkaConsumer().catch(console.error);

// ----------------------------------------------------------------------------------------------------------
// AWS SQS IMPLEMENTATION  
// Definition: Amazon Simple Queue Service - fully managed message queuing service
// Use Cases: Decoupling microservices, batch job processing, auto-scaling triggers
// Benefits: Serverless, automatic scaling, dead letter queues, message visibility timeout

// Note: Install aws-sdk: npm install aws-sdk
// const AWS = require('aws-sdk');

// // Configure AWS (use environment variables in production)
// AWS.config.update({
//     region: 'us-east-1',
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// const sqs = new AWS.SQS();
// const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue';

// // PRODUCER: Send message to SQS
// app.post("/sqs/send", async (req, res) => {
//     const { message, delaySeconds = 0 } = req.body;
    
//     const params = {
//         QueueUrl: queueUrl,
//         MessageBody: JSON.stringify(message),
//         DelaySeconds: delaySeconds,
//         MessageAttributes: {
//             'MessageType': {
//                 DataType: 'String',
//                 StringValue: 'UserAction'
//             },
//             'Timestamp': {
//                 DataType: 'Number',
//                 StringValue: Date.now().toString()
//             }
//         }
//     };
    
//     try {
//         const result = await sqs.sendMessage(params).promise();
//         res.json({ 
//             message: "Message sent to SQS", 
//             messageId: result.MessageId 
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// // CONSUMER: Poll messages from SQS
// async function pollSQSMessages() {
//     const params = {
//         QueueUrl: queueUrl,
//         MaxNumberOfMessages: 10,
//         WaitTimeSeconds: 20, // Long polling
//         VisibilityTimeoutSeconds: 30
//     };
    
//     try {
//         const data = await sqs.receiveMessage(params).promise();
        
//         if (data.Messages) {
//             for (const message of data.Messages) {
//                 console.log(`📬 SQS Message received:`);
//                 console.log(`Body: ${message.Body}`);
//                 console.log(`MessageId: ${message.MessageId}`);
                
//                 // Process message here
//                 await processMessage(JSON.parse(message.Body));
                
//                 // Delete message after processing
//                 await sqs.deleteMessage({
//                     QueueUrl: queueUrl,
//                     ReceiptHandle: message.ReceiptHandle
//                 }).promise();
//             }
//         }
//     } catch (error) {
//         console.error('SQS polling error:', error);
//     }
// }

// async function processMessage(messageData) {
//     console.log('Processing message:', messageData);
//     // Add your message processing logic here
// }

// // Start SQS polling (uncomment to use)
// // setInterval(pollSQSMessages, 5000);





// Node.js Clustering......

const os = require("os");
const cluster = require("cluster");
const numCPUs = os.cpus.length || 2;  // Number of cpu cores..
if (!cluster.isPrimary) {
    console.log(`Master ${process.pid} is running`)

    // fork worker..
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
    }

    // Log workers after they start
    cluster.on("online", (worker) => {
        console.log(`Worker ${worker.process.pid} is online`);
    });

    // Restart if worker dies
    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });

} else {
    // Worker process
    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} started on port ${PORT}`);
    });
}

// ----------------------------------------------------------------------------------------------------------
// JWT AUTHENTICATION
// Definition: JSON Web Token - secure way to transmit information between parties
// Use Cases: User authentication, API authorization, session management
// Benefits: Stateless, scalable, cross-domain, self-contained

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock user database
const users = [
    { id: 1, email: 'user@example.com', password: '$2b$10$hashedpassword' }
];

// Login endpoint
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password (in real app, compare with bcrypt)
    // const isValid = await bcrypt.compare(password, user.password);
    const isValid = password === 'password123'; // Simplified for demo
    
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    res.json({ 
        message: 'Login successful',
        token,
        user: { id: user.id, email: user.email }
    });
});

// JWT Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Protected route
app.get('/auth/profile', authenticateToken, (req, res) => {
    res.json({ 
        message: 'Protected route accessed',
        user: req.user 
    });
});

// ----------------------------------------------------------------------------------------------------------
// WEBSOCKETS IMPLEMENTATION
// Definition: WebSocket provides full-duplex communication over a single TCP connection
// Use Cases: Real-time chat, live notifications, gaming, collaborative editing
// Benefits: Low latency, bidirectional, persistent connection

const http = require('http');
const socketIo = require('socket.io');

// Create HTTP server for WebSocket
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);
    
    // Join a room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', { 
            userId: socket.id, 
            message: 'A user joined the room' 
        });
        console.log(`User ${socket.id} joined room: ${roomId}`);
    });
    
    // Handle chat messages
    socket.on('chat-message', (data) => {
        const { roomId, message, username } = data;
        
        // Broadcast to all users in the room
        io.to(roomId).emit('message-received', {
            id: Date.now(),
            username: username || 'Anonymous',
            message,
            timestamp: new Date()
        });
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('user-typing', {
            userId: socket.id,
            username: data.username
        });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
    });
});

// REST endpoint to send notifications
app.post('/notify', (req, res) => {
    const { roomId, message, type = 'info' } = req.body;
    
    // Send notification to specific room
    io.to(roomId).emit('notification', {
        type,
        message,
        timestamp: new Date()
    });
    
    res.json({ message: 'Notification sent' });
});

// ----------------------------------------------------------------------------------------------------------
// DATABASE TRANSACTIONS
// Definition: A transaction is a sequence of operations performed as a single logical unit
// Use Cases: Financial operations, data consistency, atomic operations
// Benefits: ACID properties (Atomicity, Consistency, Isolation, Durability)

const mongoose = require('mongoose');

// Example schemas
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    balance: { type: Number, default: 0 }
});

const TransactionSchema = new mongoose.Schema({
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// Money transfer with transaction
app.post('/transfer', async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body;
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    
    try {
        // Start transaction
        session.startTransaction();
        
        // Find users
        const fromUser = await User.findById(fromUserId).session(session);
        const toUser = await User.findById(toUserId).session(session);
        
        if (!fromUser || !toUser) {
            throw new Error('User not found');
        }
        
        if (fromUser.balance < amount) {
            throw new Error('Insufficient balance');
        }
        
        // Create transaction record
        const transaction = new Transaction({
            fromUser: fromUserId,
            toUser: toUserId,
            amount
        });
        await transaction.save({ session });
        
        // Update balances
        fromUser.balance -= amount;
        toUser.balance += amount;
        
        await fromUser.save({ session });
        await toUser.save({ session });
        
        // Update transaction status
        transaction.status = 'completed';
        await transaction.save({ session });
        
        // Commit transaction
        await session.commitTransaction();
        
        res.json({ 
            message: 'Transfer successful',
            transactionId: transaction._id,
            fromBalance: fromUser.balance,
            toBalance: toUser.balance
        });
        
    } catch (error) {
        // Rollback transaction on error
        await session.abortTransaction();
        
        res.status(400).json({ 
            error: error.message,
            message: 'Transfer failed - transaction rolled back'
        });
    } finally {
        // End session
        session.endSession();
    }
});

// ----------------------------------------------------------------------------------------------------------
// CACHING STRATEGIES
// Definition: Caching stores frequently accessed data in fast storage for quick retrieval
// Types: In-memory, Redis, CDN, Database query cache, Application cache
// Patterns: Cache-aside, Write-through, Write-behind, Refresh-ahead

// In-memory cache with TTL
class InMemoryCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }
    
    set(key, value, ttlSeconds = 300) {
        // Clear existing timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        // Set value
        this.cache.set(key, value);
        
        // Set TTL timer
        const timer = setTimeout(() => {
            this.cache.delete(key);
            this.timers.delete(key);
        }, ttlSeconds * 1000);
        
        this.timers.set(key, timer);
    }
    
    get(key) {
        return this.cache.get(key);
    }
    
    has(key) {
        return this.cache.has(key);
    }
    
    delete(key) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }
}

const memoryCache = new InMemoryCache();

// Cache middleware
function cacheMiddleware(ttlSeconds = 300) {
    return (req, res, next) => {
        const key = req.originalUrl;
        
        // Check cache
        if (memoryCache.has(key)) {
            console.log(`🎯 Cache HIT for ${key}`);
            return res.json(memoryCache.get(key));
        }
        
        console.log(`❌ Cache MISS for ${key}`);
        
        // Override res.json to cache response
        const originalJson = res.json;
        res.json = function(data) {
            memoryCache.set(key, data, ttlSeconds);
            console.log(`💾 Cached response for ${key}`);
            originalJson.call(this, data);
        };
        
        next();
    };
}

// Cached endpoint
app.get('/api/expensive-operation', cacheMiddleware(60), async (req, res) => {
    // Simulate expensive operation
    console.log('🔄 Performing expensive operation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
        data: 'Expensive operation result',
        timestamp: new Date(),
        processTime: '2000ms'
    });
});

// ----------------------------------------------------------------------------------------------------------
// ERROR HANDLING & LOGGING
// Definition: Systematic approach to catch, log, and handle application errors
// Types: Operational errors, Programming errors, Unhandled exceptions
// Best Practices: Centralized logging, error monitoring, graceful degradation

const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Custom error class
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// Global error handler middleware
function globalErrorHandler(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    // Send error response
    if (process.env.NODE_ENV === 'production') {
        // Production: don't leak error details
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!'
            });
        }
    } else {
        // Development: send full error
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err
        });
    }
}

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Example route with error handling
app.get('/api/error-demo', asyncHandler(async (req, res, next) => {
    const { type } = req.query;
    
    if (type === 'operational') {
        throw new AppError('This is an operational error', 400);
    } else if (type === 'programming') {
        // This will cause a programming error
        const obj = null;
        obj.someProperty; // TypeError
    } else {
        res.json({ message: 'No error occurred' });
    }
}));

// Apply global error handler
app.use(globalErrorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});



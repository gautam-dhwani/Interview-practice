require("dotenv").config()
const express = require("express");
const userRoute = require("./routes/user.js")
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const PORT = process.env.PORT



const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

//Rate limiter..

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    message: 'Too many requests from this IP, please try again later.'
})

app.use(limiter);

//static uploads folder
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));


//Parsing the Req body JSON..
app.use(express.json());

//Routes...
app.use("/user", userRoute)

// Health
app.get('/', (req, res) => res.json({ ok: true, pid: process.pid }));

// 404
app.use((req, res, next) => res.status(404).json({ error: 'Not Found' }));



module.exports = app;
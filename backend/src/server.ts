import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import winston from 'winston';
import cron from 'node-cron';
import { generateRecurringTasks } from './features/tasks/recurrence.service';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorMiddleware';

// Import Routes
import authRoutes from './features/auth/auth.routes';
import familyRoutes from './features/family/family.routes';
import taskRoutes from './features/tasks/task.routes';
import eventRoutes from './features/events/event.routes';
import inviteRoutes from './features/invites/invite.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/familymatters_dev';

// Basic Logging Setup (Customize further later)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
        // Add file transport if needed
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// Middlewares
app.use(express.json()); // Body parser

// --- CORS Setup --- 
// Use environment variable for frontend URL, fallback for development
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log(`Configuring CORS for frontend URL: ${frontendUrl}`);
app.use(cors({
    origin: frontendUrl,
    // Add other CORS options if needed (e.g., credentials: true)
}));

// Basic Route
app.get('/', (req: Request, res: Response) => {
    res.send('FamilyMatters Backend API');
});

// Mount Routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/families', familyRoutes);
app.use('/api/v1/invites', inviteRoutes);

// Mount nested routes onto familyRoutes *before* the generic family ID handlers
// This ensures `/api/v1/families/:familyId/tasks` is matched correctly
familyRoutes.use('/:familyId/tasks', taskRoutes);
familyRoutes.use('/:familyId/events', eventRoutes);

// TODO: Review if taskRoutes and eventRoutes should be mounted directly under /api/v1/families
// Example: app.use('/api/v1/families', taskRoutes); requires task routes to handle /:familyId/tasks internally
// Current setup with nested use() on familyRoutes is common for accessing parent params.

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        logger.info('Successfully connected to MongoDB');
        
        // --- Start the HTTP server (with Socket.IO attached) --- 
        // Move the correct listener here
        server.listen(PORT, () => {
            logger.info(`HTTP server with Socket.IO running on port ${PORT}`);
        });

    })
    .catch(err => {
        logger.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit if DB connection fails
    });

// --- Schedule Recurring Task Generation --- 
// Runs every day at 2:00 AM (adjust schedule as needed)
cron.schedule('0 2 * * *', () => {
    logger.info('Running scheduled job: Generating recurring task instances...');
    // Call the actual task generation service function
    generateRecurringTasks().catch(err => logger.error('Error during recurring task generation:', err));
    // console.log('Placeholder: Would generate recurring tasks now.');
}, {
    scheduled: true,
    timezone: "Etc/UTC" // Specify timezone, e.g., UTC or "America/New_York"
});

logger.info('Recurring task generation job scheduled.');

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', err);
    // Optionally shutdown server gracefully
    // server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception thrown:', err);
    // Optionally shutdown server gracefully
    // server.close(() => process.exit(1));
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// --- Socket.io Setup ---
const server = http.createServer(app); // Create HTTP server from Express app
const io = new SocketIOServer(server, { // Initialize Socket.IO server
    cors: {
        origin: frontendUrl,
        methods: ["GET", "POST"] // Allowed methods for socket connection
    }
});

export let socketIOInstance: SocketIOServer | null = null; // Exportable instance
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_family_room', (familyId) => {
        if (familyId) {
            console.log(`Socket ${socket.id} joining room: family_${familyId}`);
            socket.join(`family_${familyId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});
socketIOInstance = io; // Assign instance after setup

// REMOVE the listener from here (it was moved into the .then() block above)
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 
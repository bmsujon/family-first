"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketIOInstance = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const winston_1 = __importDefault(require("winston"));
const node_cron_1 = __importDefault(require("node-cron"));
const recurrence_service_1 = require("./features/tasks/recurrence.service");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
// Import Routes
const auth_routes_1 = __importDefault(require("./features/auth/auth.routes"));
const family_routes_1 = __importDefault(require("./features/family/family.routes"));
const task_routes_1 = __importDefault(require("./features/tasks/task.routes"));
const event_routes_1 = __importDefault(require("./features/events/event.routes"));
const invite_routes_1 = __importDefault(require("./features/invites/invite.routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/familymatters_dev';
// Basic Logging Setup (Customize further later)
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.json(),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
        // Add file transport if needed
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),
    ],
});
// Middlewares
app.use(express_1.default.json()); // Body parser
// --- CORS Setup --- 
// Use environment variable for frontend URL, fallback for development
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log(`Configuring CORS for frontend URL: ${frontendUrl}`);
app.use((0, cors_1.default)({
    origin: frontendUrl,
    // Add other CORS options if needed (e.g., credentials: true)
}));
// Basic Route
app.get('/', (req, res) => {
    res.send('FamilyMatters Backend API');
});
// Mount Routers
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/families', family_routes_1.default);
app.use('/api/v1/invites', invite_routes_1.default);
// Mount nested routes onto familyRoutes *before* the generic family ID handlers
// This ensures `/api/v1/families/:familyId/tasks` is matched correctly
family_routes_1.default.use('/:familyId/tasks', task_routes_1.default);
family_routes_1.default.use('/:familyId/events', event_routes_1.default);
// TODO: Review if taskRoutes and eventRoutes should be mounted directly under /api/v1/families
// Example: app.use('/api/v1/families', taskRoutes); requires task routes to handle /:familyId/tasks internally
// Current setup with nested use() on familyRoutes is common for accessing parent params.
// Connect to MongoDB
mongoose_1.default.connect(MONGO_URI)
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
node_cron_1.default.schedule('0 2 * * *', () => {
    logger.info('Running scheduled job: Generating recurring task instances...');
    // Call the actual task generation service function
    (0, recurrence_service_1.generateRecurringTasks)().catch(err => logger.error('Error during recurring task generation:', err));
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
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
// --- Socket.io Setup ---
const server = http_1.default.createServer(app); // Create HTTP server from Express app
const io = new socket_io_1.Server(server, {
    cors: {
        origin: frontendUrl,
        methods: ["GET", "POST"] // Allowed methods for socket connection
    }
});
exports.socketIOInstance = null; // Exportable instance
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
exports.socketIOInstance = io; // Assign instance after setup
// REMOVE the listener from here (it was moved into the .then() block above)
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 

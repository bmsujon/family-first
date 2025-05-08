"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFound = void 0;
/**
 * Middleware for handling 404 Not Found errors.
 * Catches requests that don't match any route.
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
exports.notFound = notFound;
/**
 * Generic error handling middleware.
 * Catches errors passed via next(error).
 */
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    // Determine status code: use error's status code if it exists, otherwise default to 500
    // Some errors might have a statusCode property (like custom AppError)
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    if (err.statusCode) {
        statusCode = err.statusCode;
    }
    // Set the status code on the response
    res.status(statusCode);
    // Send JSON response with error message
    // Avoid sending stack trace in production environment
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
exports.errorHandler = errorHandler;

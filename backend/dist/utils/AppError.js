"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
/**
 * Custom Error class to provide status codes along with messages.
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
        // Capture the stack trace, excluding the constructor call from it.
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;

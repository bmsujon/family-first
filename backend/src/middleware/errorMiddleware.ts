import { Request, Response, NextFunction } from 'express';

/**
 * Middleware for handling 404 Not Found errors.
 * Catches requests that don't match any route.
 */
const notFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

/**
 * Generic error handling middleware.
 * Catches errors passed via next(error).
 */
const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction 
): void => {
    // Determine status code: use error's status code if it exists, otherwise default to 500
    // Some errors might have a statusCode property (like custom AppError)
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    if ((err as any).statusCode) {
        statusCode = (err as any).statusCode;
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

export { notFound, errorHandler }; 
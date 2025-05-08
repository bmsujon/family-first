import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, Secret, VerifyErrors } from 'jsonwebtoken';
import User, { IUser } from '../../models/User';

// Define a custom Request interface extending Express's Request
// to include the user property we'll add.
export interface ProtectedRequest extends Request {
    user?: IUser; // Add user property
}

const JWT_SECRET = (process.env.JWT_SECRET || 'YOUR_DEFAULT_VERY_SECRET_KEY_REPLACE_THIS') as Secret;
const TOKEN_LIFETIME_SECONDS = parseInt(process.env.TOKEN_LIFETIME_SECONDS || '86400', 10); // Default: 1 day (24*60*60)

export const protect = async (req: ProtectedRequest, res: Response, next: NextFunction): Promise<void> => {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

            // Check token expiry manually based on `iat` (issued at)
            if (decoded.iat) {
                const issuedAt = decoded.iat; // Timestamp in seconds
                const now = Math.floor(Date.now() / 1000); // Current time in seconds
                if (now > issuedAt + TOKEN_LIFETIME_SECONDS) {
                    res.status(401).json({ message: 'Not authorized, token expired' });
                    return;
                }
            }

            // Get user from the token payload (using the id)
            // Ensure passwordHash is not selected
            req.user = await User.findById(decoded.id).select('-passwordHash');

            if (!req.user) {
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }

            next(); // Proceed to the next middleware/route handler
        } catch (error) {
            console.error('Token verification error:', error);
            const message = (error instanceof jwt.JsonWebTokenError) 
                            ? 'Not authorized, token failed' 
                            : 'Not authorized';
            res.status(401).json({ message });
            return;
        }
    } 

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Optional: Middleware to check for specific roles
export const authorize = (...roles: string[]) => {
    return (req: ProtectedRequest, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.roles.some(role => roles.includes(role))) {
            res.status(403).json({ message: 'User role not authorized' });
            return;
        }
        next();
    };
}; 
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../../models/User"));
const JWT_SECRET = (process.env.JWT_SECRET || 'YOUR_DEFAULT_VERY_SECRET_KEY_REPLACE_THIS');
const TOKEN_LIFETIME_SECONDS = parseInt(process.env.TOKEN_LIFETIME_SECONDS || '86400', 10); // Default: 1 day (24*60*60)
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
            req.user = yield User_1.default.findById(decoded.id).select('-passwordHash');
            if (!req.user) {
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }
            next(); // Proceed to the next middleware/route handler
        }
        catch (error) {
            console.error('Token verification error:', error);
            const message = (error instanceof jsonwebtoken_1.default.JsonWebTokenError)
                ? 'Not authorized, token failed'
                : 'Not authorized';
            res.status(401).json({ message });
            return;
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
});
exports.protect = protect;
// Optional: Middleware to check for specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles.some(role => roles.includes(role))) {
            res.status(403).json({ message: 'User role not authorized' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;

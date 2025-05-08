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
exports.checkFamilyMembership = exports.protect = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User")); // Import IUser
const Family_1 = __importDefault(require("../models/Family")); // Corrected path
// Middleware to protect routes - Verifies JWT
const protect = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // Get user from the token (excluding password)
            req.user = yield User_1.default.findById(decoded.id).select('-password');
            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }
            next();
        }
        catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
}));
exports.protect = protect;
// Middleware to check if the authenticated user is a member of the requested family
const checkFamilyMembership = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const familyId = req.params.familyId;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    if (!userId) {
        res.status(401);
        throw new Error('User not authenticated');
    }
    if (!familyId) {
        res.status(400);
        throw new Error('Family ID is required in route parameters');
    }
    try {
        const family = yield Family_1.default.findById(familyId).select('members'); // Select only members field
        if (!family) {
            res.status(404);
            throw new Error('Family not found');
        }
        // Correctly check if the user's ID is present in the members array's userId field
        // Use optional chaining for safety
        const isMember = (_b = family.members) === null || _b === void 0 ? void 0 : _b.some(member => {
            // Ensure both member.userId and userId exist and are comparable
            if (member.userId && userId) {
                // Mongoose ObjectId.equals() handles comparison between ObjectId and string representation
                // Explicitly cast userId to Types.ObjectId for comparison if needed
                try {
                    // Attempt comparison, assuming member.userId is ObjectId and userId might be string or ObjectId
                    return member.userId.equals(userId);
                }
                catch (e) {
                    // Handle potential errors if casting/comparison fails unexpectedly
                    console.error("Error during ObjectId comparison:", e);
                    return false;
                }
            }
            return false;
        });
        if (!isMember) {
            res.status(403); // Forbidden
            throw new Error('User is not a member of this family');
        }
        next();
    }
    catch (error) {
        // Handle potential CastError if familyId is not a valid ObjectId
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            res.status(400);
            throw new Error(`Invalid Family ID format: ${familyId}`);
        }
        // Rethrow other errors to be handled by the global error handler
        console.error('Error in checkFamilyMembership:', error);
        if (!res.statusCode || res.statusCode < 400) {
            res.status(500);
        }
        throw error;
    }
}));
exports.checkFamilyMembership = checkFamilyMembership;

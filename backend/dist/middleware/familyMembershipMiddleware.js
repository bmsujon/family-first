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
exports.checkFamilyMembership = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const Family_1 = __importDefault(require("../models/Family"));
// Extend Express Request type to include user
// Alternatively, use type assertion: (req as Request & { user: IUser }).user
/**
 * Middleware to check if the authenticated user is a member of the specified family.
 * Assumes req.user is populated by the authMiddleware.
 * Assumes familyId is present in req.params.
 */
exports.checkFamilyMembership = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const familyId = req.params.familyId;
    const user = req.user;
    console.log(`[Membership Check] ENTER - User: ${user === null || user === void 0 ? void 0 : user._id} | Family: ${familyId}`);
    if (!user || !user._id) {
        console.log('[Membership Check] Failed: User not authenticated.');
        res.status(401); // Unauthorized
        return next(new Error('Not authorized, no user found'));
    }
    const userId = user._id;
    if (!familyId || !mongoose_1.default.Types.ObjectId.isValid(familyId)) {
        console.log(`[Membership Check] Failed: Invalid familyId format: ${familyId}`);
        res.status(400); // Bad Request
        return next(new Error('Invalid family ID format'));
    }
    // 3. Check if the user is a member of the family
    let family;
    try {
        console.log(`[Membership Check] DB Query START - _id: ${familyId}, members.userId: ${userId}`);
        family = yield Family_1.default.findOne({
            _id: familyId,
            'members.userId': userId, // Corrected: Query nested userId field in the members array
        }).lean(); // Using .lean() for performance if we don't need Mongoose methods
        console.log(`[Membership Check] DB Query END - Found family: ${!!family}`); // Log if family was found
    }
    catch (error) {
        console.error('[Membership Check] DB Query ERROR:', error);
        res.status(500); // Internal Server Error
        return next(new Error('Server error during permission check database query'));
    }
    // Check result after the try-catch block
    if (!family) {
        console.log(`[Membership Check] Failed: No matching family/membership found after query.`);
        res.status(403); // Forbidden
        return next(new Error("Forbidden: You do not have permission to access this family's resources"));
    }
    // 4. User is a member, proceed
    console.log(`[Membership Check] Success - Calling next()`);
    next();
    console.log(`[Membership Check] EXIT - After next()`); // Check if code execution continues after next()
}));

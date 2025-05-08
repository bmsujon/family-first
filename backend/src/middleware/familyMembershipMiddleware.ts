import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Family from '../models/Family';
import { IUser } from '../models/User';

// Extend Express Request type to include user
// Alternatively, use type assertion: (req as Request & { user: IUser }).user

/**
 * Middleware to check if the authenticated user is a member of the specified family.
 * Assumes req.user is populated by the authMiddleware.
 * Assumes familyId is present in req.params.
 */
export const checkFamilyMembership = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const familyId = req.params.familyId;
        const user = (req as Request & { user: IUser }).user;

        console.log(`[Membership Check] ENTER - User: ${user?._id} | Family: ${familyId}`);

        if (!user || !user._id) {
            console.log('[Membership Check] Failed: User not authenticated.');
            res.status(401); // Unauthorized
            return next(new Error('Not authorized, no user found'));
        }

        const userId = user._id;

        if (!familyId || !mongoose.Types.ObjectId.isValid(familyId)) {
            console.log(`[Membership Check] Failed: Invalid familyId format: ${familyId}`);
            res.status(400); // Bad Request
            return next(new Error('Invalid family ID format'));
        }

        // 3. Check if the user is a member of the family
        let family;
        try {
            console.log(`[Membership Check] DB Query START - _id: ${familyId}, members.userId: ${userId}`);
            family = await Family.findOne({
                _id: familyId,
                'members.userId': userId, // Corrected: Query nested userId field in the members array
            }).lean(); // Using .lean() for performance if we don't need Mongoose methods
            console.log(`[Membership Check] DB Query END - Found family: ${!!family}`); // Log if family was found

        } catch (error) {
            console.error('[Membership Check] DB Query ERROR:', error);
            res.status(500); // Internal Server Error
            return next(new Error('Server error during permission check database query'));
        }
        
        // Check result after the try-catch block
        if (!family) {
            console.log(`[Membership Check] Failed: No matching family/membership found after query.`);
            res.status(403); // Forbidden
            return next(
                new Error(
                    "Forbidden: You do not have permission to access this family's resources"
                )
            );
        }

        // 4. User is a member, proceed
        console.log(`[Membership Check] Success - Calling next()`);
        next();
        console.log(`[Membership Check] EXIT - After next()`); // Check if code execution continues after next()
    }
); 
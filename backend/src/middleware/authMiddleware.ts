import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import User, { IUser } from '../models/User'; // Import IUser
import Family from '../models/Family'; // Corrected path

// Export the extended Express Request interface to include user
export interface AuthRequest extends Request {
    user?: IUser | null; // Use the imported IUser type
}

// Middleware to protect routes - Verifies JWT
const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

            // Get user from the token (excluding password)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

// Middleware to check if the authenticated user is a member of the requested family
const checkFamilyMembership = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    const familyId = req.params.familyId;
    const userId = req.user?._id;

    if (!userId) {
        res.status(401); throw new Error('User not authenticated');
    }
    if (!familyId) {
        res.status(400); throw new Error('Family ID is required in route parameters');
    }

    try {
        const family = await Family.findById(familyId).select('members'); // Select only members field

        if (!family) {
            res.status(404); throw new Error('Family not found');
        }

        // Correctly check if the user's ID is present in the members array's userId field
        // Use optional chaining for safety
        const isMember = family.members?.some(member => {
            // Ensure both member.userId and userId exist and are comparable
            if (member.userId && userId) {
                // Mongoose ObjectId.equals() handles comparison between ObjectId and string representation
                // Explicitly cast userId to Types.ObjectId for comparison if needed
                try {
                    // Attempt comparison, assuming member.userId is ObjectId and userId might be string or ObjectId
                    return member.userId.equals(userId as Types.ObjectId | string);
                } catch (e) {
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
    } catch (error: any) {
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
});

// Only export the middleware functions here
export { protect, checkFamilyMembership }; 
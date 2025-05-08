import User, { IUser } from '../../models/User';
import Family, { IFamily } from '../../models/Family';
import Invitation from '../../models/Invitation';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config(); // Loads .env file variables into process.env

// Ensure consistent access to JWT_SECRET, relying solely on environment variable
// Throw an error during startup if it's not set.
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1); // Exit if secret is not set
}
const JWT_SECRET = process.env.JWT_SECRET as Secret; // Access directly

// const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; // Expiry handled in middleware for now

interface RegisterUserData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    familyName: string;
}

interface JwtPayload {
    id: string;
}

// Generate JWT
export const generateToken = (id: mongoose.Types.ObjectId): string => {
    const payload: JwtPayload = { id: id.toString() };
    // Removed expiresIn option due to persistent typing issues
    // Expiry will be checked in auth middleware
    return jwt.sign(payload, JWT_SECRET /*, options */);
};

// Interface for invited user registration
interface RegisterInvitedUserData extends RegisterUserData {
    invitationToken: string;
}

// Register a new user
export const registerUser = async (userData: RegisterUserData): Promise<{ user: IUser, token: string }> => {
    const { email, password, firstName, lastName, familyName } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists with this email');
    }

    // Create new user instance (password will be hashed by pre-save hook)
    const user = new User({
        email,
        passwordHash: password, // Pass the plain password, it gets hashed by the model hook
        firstName,
        lastName,
    });

    const savedUser = await user.save();

    // Ensure _id is treated as ObjectId
    const userId = savedUser._id as mongoose.Types.ObjectId;

    // --- Add Family Creation Logic ---
    try {
        // Use the provided familyName, fallback to Default Family if somehow empty
        const actualFamilyName = familyName && familyName.trim() !== '' ? familyName.trim() : 'Default Family'; 
        const newFamily = new Family({
            name: actualFamilyName,
            createdBy: userId,
            // Remove explicit members array - let the pre-save hook handle adding the creator
            // members: [{ userId: userId, role: MemberRole.Admin }], 
        });
        const savedFamily = await newFamily.save(); // The pre-save hook will add the creator as 'Primary User'
        // Log the saved family, specifically the members array
        console.log(`>>> Saved Family Details for user ${userId}: ID=${savedFamily._id}, Name=${savedFamily.name} <<<`);
        console.log(`>>> Saved Family Members for user ${userId}:`, JSON.stringify(savedFamily.members, null, 2));
        // console.log(`>>> Default family '${actualFamilyName}' created for user ${userId} <<<`); // Original log
    } catch (familyError) {
        console.error(`!!! CRITICAL ERROR: User ${userId} created, but failed to create default family:`, familyError);
        // Ideally, we should delete the user here or use a transaction
        // For now, just log the critical error. The user exists but has no family.
        // Re-throwing the error might be appropriate depending on desired flow
        // throw new Error('User created but failed to create default family.');
    }
    // --- End Family Creation Logic ---

    const token = generateToken(userId);

    return { user: savedUser, token };
};

// Function to handle registration via invitation token
export const registerInvitedUser = async (
    userData: RegisterInvitedUserData
): Promise<{ user: IUser, token: string }> => {
    const { email, password, firstName, lastName, familyName, invitationToken } = userData;

    // Start Mongoose Session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Validate Invitation Token
        const invitation = await Invitation.findOne({
            token: invitationToken,
            status: 'pending' // Only find pending invites
        }).session(session);

        if (!invitation) {
            throw new Error('Invalid or expired invitation token.');
        }

        // Check expiry (optional but recommended)
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            await invitation.save({ session });
            throw new Error('Invitation has expired.');
        }

        // Verify email matches the invitation
        if (invitation.email !== email.toLowerCase()) {
            throw new Error('Registration email does not match the invitation email.');
        }

        // 2. Register the User (similar to registerUser)
        const existingUser = await User.findOne({ email }).session(session);
        if (existingUser) {
            // If user exists but invite is pending, handle differently?
            // For now, assume registration implies new user for this invite flow.
            throw new Error('User already exists with this email.');
        }

        const user = new User({
            email,
            passwordHash: password, // Hashed by pre-save hook
            firstName,
            lastName,
        });
        const savedUser = await user.save({ session });
        const userId = savedUser._id as mongoose.Types.ObjectId;

        // 3. Add User to Family
        const family = await Family.findById(invitation.familyId).session(session);
        if (!family) {
            // Should not happen if invite is valid, but good safety check
            throw new Error('Family associated with invitation not found.');
        }

        // Ensure user is not already somehow a member (double check)
        const isAlreadyMember = family.members.some(
            member => member.userId && member.userId.equals(userId)
        );
        if (!isAlreadyMember) {
            family.members.push({
                userId: userId,
                role: invitation.role, // Use role from invitation
                joinedAt: new Date(),
                permissions: [],
            });
            await family.save({ session });
        }

        // 4. Update Invitation Status
        invitation.status = 'accepted';
        await invitation.save({ session });

        // 5. Commit Transaction
        await session.commitTransaction();

        // 6. Generate Login Token
        const token = generateToken(userId);

        return { user: savedUser, token };

    } catch (error) {
        // If any error occurs, abort the transaction
        await session.abortTransaction();
        console.error("Error during invited user registration:", error);
        // Re-throw the error to be handled by the controller
        throw error;
    } finally {
        // End the session
        session.endSession();
    }
};

// Login a user
export const loginUser = async (email: string, password: string): Promise<{ user: IUser, token: string }> => {
    // Find user by email
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // Update last login time (optional)
    user.lastLogin = new Date();
    const savedUser = await user.save();

    // Ensure _id is treated as ObjectId
    const userId = savedUser._id as mongoose.Types.ObjectId;
    const token = generateToken(userId);

    return { user: savedUser, token };
};

// Retrieve families for a user
export const getFamiliesByUser = async (userId: mongoose.Types.ObjectId): Promise<IFamily[]> => {
    const families = await Family.find({ 'members.userId': userId }).exec();
    return families;
}; 
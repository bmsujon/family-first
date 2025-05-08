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
exports.getFamiliesByUser = exports.loginUser = exports.registerInvitedUser = exports.registerUser = exports.generateToken = void 0;
const User_1 = __importDefault(require("../../models/User"));
const Family_1 = __importDefault(require("../../models/Family"));
const Invitation_1 = __importDefault(require("../../models/Invitation"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Loads .env file variables into process.env
// Ensure consistent access to JWT_SECRET, relying solely on environment variable
// Throw an error during startup if it's not set.
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1); // Exit if secret is not set
}
const JWT_SECRET = process.env.JWT_SECRET; // Access directly
// Generate JWT
const generateToken = (id) => {
    const payload = { id: id.toString() };
    // Removed expiresIn option due to persistent typing issues
    // Expiry will be checked in auth middleware
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET /*, options */);
};
exports.generateToken = generateToken;
// Register a new user
const registerUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, firstName, lastName, familyName } = userData;
    // Check if user already exists
    const existingUser = yield User_1.default.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists with this email');
    }
    // Create new user instance (password will be hashed by pre-save hook)
    const user = new User_1.default({
        email,
        passwordHash: password, // Pass the plain password, it gets hashed by the model hook
        firstName,
        lastName,
    });
    const savedUser = yield user.save();
    // Ensure _id is treated as ObjectId
    const userId = savedUser._id;
    // --- Add Family Creation Logic ---
    try {
        // Use the provided familyName, fallback to Default Family if somehow empty
        const actualFamilyName = familyName && familyName.trim() !== '' ? familyName.trim() : 'Default Family';
        const newFamily = new Family_1.default({
            name: actualFamilyName,
            createdBy: userId,
            // Remove explicit members array - let the pre-save hook handle adding the creator
            // members: [{ userId: userId, role: MemberRole.Admin }], 
        });
        const savedFamily = yield newFamily.save(); // The pre-save hook will add the creator as 'Primary User'
        // Log the saved family, specifically the members array
        console.log(`>>> Saved Family Details for user ${userId}: ID=${savedFamily._id}, Name=${savedFamily.name} <<<`);
        console.log(`>>> Saved Family Members for user ${userId}:`, JSON.stringify(savedFamily.members, null, 2));
        // console.log(`>>> Default family '${actualFamilyName}' created for user ${userId} <<<`); // Original log
    }
    catch (familyError) {
        console.error(`!!! CRITICAL ERROR: User ${userId} created, but failed to create default family:`, familyError);
        // Ideally, we should delete the user here or use a transaction
        // For now, just log the critical error. The user exists but has no family.
        // Re-throwing the error might be appropriate depending on desired flow
        // throw new Error('User created but failed to create default family.');
    }
    // --- End Family Creation Logic ---
    const token = (0, exports.generateToken)(userId);
    return { user: savedUser, token };
});
exports.registerUser = registerUser;
// Function to handle registration via invitation token
const registerInvitedUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, firstName, lastName, familyName, invitationToken } = userData;
    // Start Mongoose Session for transaction
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // 1. Validate Invitation Token
        const invitation = yield Invitation_1.default.findOne({
            token: invitationToken,
            status: 'pending' // Only find pending invites
        }).session(session);
        if (!invitation) {
            throw new Error('Invalid or expired invitation token.');
        }
        // Check expiry (optional but recommended)
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            yield invitation.save({ session });
            throw new Error('Invitation has expired.');
        }
        // Verify email matches the invitation
        if (invitation.email !== email.toLowerCase()) {
            throw new Error('Registration email does not match the invitation email.');
        }
        // 2. Register the User (similar to registerUser)
        const existingUser = yield User_1.default.findOne({ email }).session(session);
        if (existingUser) {
            // If user exists but invite is pending, handle differently?
            // For now, assume registration implies new user for this invite flow.
            throw new Error('User already exists with this email.');
        }
        const user = new User_1.default({
            email,
            passwordHash: password, // Hashed by pre-save hook
            firstName,
            lastName,
        });
        const savedUser = yield user.save({ session });
        const userId = savedUser._id;
        // 3. Add User to Family
        const family = yield Family_1.default.findById(invitation.familyId).session(session);
        if (!family) {
            // Should not happen if invite is valid, but good safety check
            throw new Error('Family associated with invitation not found.');
        }
        // Ensure user is not already somehow a member (double check)
        const isAlreadyMember = family.members.some(member => member.userId && member.userId.equals(userId));
        if (!isAlreadyMember) {
            family.members.push({
                userId: userId,
                role: invitation.role, // Use role from invitation
                joinedAt: new Date(),
                permissions: [],
            });
            yield family.save({ session });
        }
        // 4. Update Invitation Status
        invitation.status = 'accepted';
        yield invitation.save({ session });
        // 5. Commit Transaction
        yield session.commitTransaction();
        // 6. Generate Login Token
        const token = (0, exports.generateToken)(userId);
        return { user: savedUser, token };
    }
    catch (error) {
        // If any error occurs, abort the transaction
        yield session.abortTransaction();
        console.error("Error during invited user registration:", error);
        // Re-throw the error to be handled by the controller
        throw error;
    }
    finally {
        // End the session
        session.endSession();
    }
});
exports.registerInvitedUser = registerInvitedUser;
// Login a user
const loginUser = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
    // Find user by email
    const user = yield User_1.default.findOne({ email }).select('+passwordHash');
    if (!user) {
        throw new Error('Invalid email or password');
    }
    // Compare password
    const isMatch = yield user.comparePassword(password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }
    // Update last login time (optional)
    user.lastLogin = new Date();
    const savedUser = yield user.save();
    // Ensure _id is treated as ObjectId
    const userId = savedUser._id;
    const token = (0, exports.generateToken)(userId);
    return { user: savedUser, token };
});
exports.loginUser = loginUser;
// Retrieve families for a user
const getFamiliesByUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const families = yield Family_1.default.find({ 'members.userId': userId }).exec();
    return families;
});
exports.getFamiliesByUser = getFamiliesByUser;

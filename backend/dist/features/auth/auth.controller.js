"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWithInvite = exports.getProfile = exports.login = exports.register = void 0;
const AuthService = __importStar(require("./auth.service"));
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('>>> Register controller hit <<<');
    console.log('Request Body:', req.body);
    try {
        const { email, password, firstName, lastName, familyName } = req.body;
        if (!email || !password || !familyName) {
            console.log('>>> Register validation failed: Missing email, password, or familyName <<<');
            res.status(400).json({ message: 'Email, password, and family name are required' });
            return;
        }
        console.log(`>>> Calling AuthService.registerUser for ${email} <<<`);
        const { user, token } = yield AuthService.registerUser({
            email,
            password,
            firstName,
            lastName,
            familyName,
        });
        console.log(`>>> AuthService.registerUser succeeded for ${email} <<<`);
        // Exclude password hash from the response
        const userResponse = Object.assign({}, user.toObject());
        delete userResponse.passwordHash;
        console.log(`>>> Sending 201 response for ${email} <<<`);
        res.status(201).json({ message: 'User registered successfully', user: userResponse, token });
    }
    catch (error) {
        console.error('>>> ERROR in register controller:', error);
        // Check for specific errors
        if (error.message === 'User already exists with this email') {
            // Send 409 Conflict if user exists
            if (!res.headersSent) {
                res.status(409).json({ message: error.message });
            }
        }
        else {
            // Send 500 for other errors
            if (!res.headersSent) {
                res.status(500).json({ message: error.message || 'Error registering user' });
            }
        }
        // Log if headers were already sent (should not happen often here)
        if (res.headersSent) {
            console.error('Headers already sent, could not send error response.');
        }
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const { user, token } = yield AuthService.loginUser(email, password);
        // Exclude password hash from the response
        const userResponse = Object.assign({}, user.toObject());
        delete userResponse.passwordHash;
        res.status(200).json({ message: 'Login successful', user: userResponse, token });
    }
    catch (error) {
        res.status(401).json({ message: error.message || 'Invalid credentials' });
    }
});
exports.login = login;
// Add the getProfile controller function
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('>>> getProfile controller hit <<<');
    try {
        // req.user should be populated by the 'protect' middleware
        if (!req.user) {
            // This case should technically not be reachable if protect middleware is effective
            console.error('>>> ERROR in getProfile: req.user not found after protect middleware <<<');
            res.status(401).json({ message: 'Not authorized, user data missing' });
            return;
        }
        // Convert Mongoose document to plain object
        const userProfile = req.user.toObject ? req.user.toObject() : Object.assign({}, req.user);
        // Optionally remove password hash if it was somehow included by `protect`
        // delete userProfile.passwordHash; 
        console.log(`>>> Sending user profile for user ID: ${userProfile._id} <<<`);
        res.status(200).json(userProfile);
    }
    catch (error) {
        console.error('>>> ERROR in getProfile controller:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Error fetching user profile' });
        }
    }
});
exports.getProfile = getProfile;
// Controller to handle registration via invitation
const registerWithInvite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    console.log('>>> Register via Invite controller hit <<<');
    console.log('Request Body:', req.body);
    try {
        // Extract user details AND the invitation token
        const { email, password, firstName, lastName, invitationToken } = req.body;
        // Basic validation
        if (!email || !password || !invitationToken) {
            console.log('>>> Invite Register validation failed: Missing email, password, or token <<<');
            res.status(400).json({ message: 'Email, password, and invitation token are required' });
            return;
        }
        console.log(`>>> Calling AuthService.registerInvitedUser for ${email} <<<`);
        const { user, token } = yield AuthService.registerInvitedUser({
            email,
            password,
            firstName,
            lastName,
            // familyName is not used/needed in this flow
            familyName: '', // Pass empty string or omit if interface allows optional
            invitationToken,
        });
        console.log(`>>> AuthService.registerInvitedUser succeeded for ${email} <<<`);
        // Exclude password hash from the response
        const userResponse = Object.assign({}, user.toObject());
        delete userResponse.passwordHash;
        console.log(`>>> Sending 201 response for ${email} (Invite Accepted) <<<`);
        res.status(201).json({ message: 'User registered successfully via invitation', user: userResponse, token });
    }
    catch (error) {
        console.error('>>> ERROR in registerWithInvite controller:', error);
        // Check for specific errors (Token invalid/expired, User exists, etc.)
        let statusCode = 500;
        let message = error.message || 'Error registering user via invitation';
        if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('invitation token')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('expired'))) {
            statusCode = 400; // Bad Request for invalid/expired token
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('email does not match')) {
            statusCode = 400;
        }
        else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('User already exists')) {
            statusCode = 409; // Conflict
        }
        else if ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('Family associated with invitation not found')) {
            // This indicates a data integrity issue
            statusCode = 500;
            message = 'Error processing invitation: associated family not found.';
        }
        if (!res.headersSent) {
            res.status(statusCode).json({ message });
        }
        if (res.headersSent) {
            console.error('Headers already sent, could not send error response.');
        }
    }
});
exports.registerWithInvite = registerWithInvite;

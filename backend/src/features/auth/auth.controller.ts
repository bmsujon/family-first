import { Request, Response } from 'express';
import * as AuthService from './auth.service';
import { ProtectedRequest } from '../auth/auth.middleware'; // Import interface for authenticated requests

export const register = async (req: Request, res: Response): Promise<void> => {
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
        const { user, token } = await AuthService.registerUser({
            email,
            password,
            firstName,
            lastName,
            familyName,
        });
        console.log(`>>> AuthService.registerUser succeeded for ${email} <<<`);

        // Exclude password hash from the response
        const userResponse = { ...user.toObject() };
        delete userResponse.passwordHash;

        console.log(`>>> Sending 201 response for ${email} <<<`);
        res.status(201).json({ message: 'User registered successfully', user: userResponse, token });
    } catch (error: any) {
        console.error('>>> ERROR in register controller:', error);

        // Check for specific errors
        if (error.message === 'User already exists with this email') {
            // Send 409 Conflict if user exists
            if (!res.headersSent) {
                res.status(409).json({ message: error.message });
            }
        } else {
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
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        const { user, token } = await AuthService.loginUser(email, password);

        // Exclude password hash from the response
        const userResponse = { ...user.toObject() };
        delete userResponse.passwordHash;

        res.status(200).json({ message: 'Login successful', user: userResponse, token });
    } catch (error: any) {
        res.status(401).json({ message: error.message || 'Invalid credentials' });
    }
};

// Add the getProfile controller function
export const getProfile = async (req: ProtectedRequest, res: Response): Promise<void> => {
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
        const userProfile = req.user.toObject ? req.user.toObject() : { ...req.user }; 
        // Optionally remove password hash if it was somehow included by `protect`
        // delete userProfile.passwordHash; 
        
        console.log(`>>> Sending user profile for user ID: ${userProfile._id} <<<`);
        res.status(200).json(userProfile);

    } catch (error: any) {
        console.error('>>> ERROR in getProfile controller:', error);
        if (!res.headersSent) {
             res.status(500).json({ message: error.message || 'Error fetching user profile' });
        }
    }
};

// Controller to handle registration via invitation
export const registerWithInvite = async (req: Request, res: Response): Promise<void> => {
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
        const { user, token } = await AuthService.registerInvitedUser({
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
        const userResponse = { ...user.toObject() };
        delete userResponse.passwordHash;

        console.log(`>>> Sending 201 response for ${email} (Invite Accepted) <<<`);
        res.status(201).json({ message: 'User registered successfully via invitation', user: userResponse, token });
    } catch (error: any) {
        console.error('>>> ERROR in registerWithInvite controller:', error);

        // Check for specific errors (Token invalid/expired, User exists, etc.)
        let statusCode = 500;
        let message = error.message || 'Error registering user via invitation';

        if (error.message?.includes('invitation token') || error.message?.includes('expired')) {
            statusCode = 400; // Bad Request for invalid/expired token
        } else if (error.message?.includes('email does not match')) {
            statusCode = 400;
        } else if (error.message?.includes('User already exists')) {
            statusCode = 409; // Conflict
        } else if (error.message?.includes('Family associated with invitation not found')){
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
}; 
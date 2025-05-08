import { Request, Response } from 'express';
import * as FamilyService from './family.service';
import { ProtectedRequest } from '../auth/auth.middleware'; // Import interface for authenticated requests
import mongoose from 'mongoose'; // Import mongoose for ObjectId type
import asyncHandler from 'express-async-handler';

// Controller to handle creating a new family
export const createNewFamily = async (req: ProtectedRequest, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        const creatorUserId = req.user?._id; // Get user ID from the authenticated request

        if (!name) {
            res.status(400).json({ message: 'Family name is required' });
            return;
        }

        if (!creatorUserId) {
            // This should technically not happen if protect middleware is used correctly
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }

        // We've checked creatorUserId exists, so we can assert it is not undefined
        // Asserting the type to satisfy the createFamily service function signature
        const familyData = {
            name,
            creatorUserId: creatorUserId as mongoose.Types.ObjectId, 
        };

        const newFamily = await FamilyService.createFamily(familyData);

        res.status(201).json({ message: 'Family created successfully', family: newFamily });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Error creating family' });
    }
};

// Controller to get families for the logged-in user
export const getMyFamilies = async (req: ProtectedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }

        // Assert userId type as we've confirmed it exists
        const families = await FamilyService.getFamiliesByUser(userId as mongoose.Types.ObjectId);

        res.status(200).json({ families });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Error fetching families' });
    }
};

// Controller to get details for a specific family
export const getFamilyDetails = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    console.log(`>>> [FamilyController.getFamilyDetails] ENTER - Family ID: ${req.params.familyId}, User ID: ${req.user?._id}`);
    try {
        const familyId = req.params.familyId;
        const requestingUserId = req.user?._id;

        // User authentication is handled by `protect` middleware
        if (!requestingUserId) {
            console.log(`>>> [FamilyController.getFamilyDetails] Failed: User not authenticated.`);
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }

        // Family ID format validation 
        if (!mongoose.Types.ObjectId.isValid(familyId)) {
            console.log(`>>> [FamilyController.getFamilyDetails] Failed: Invalid Family ID format: ${familyId}`);
            res.status(400).json({ message: 'Invalid Family ID format' });
            return;
        }

        console.log(`>>> [FamilyController.getFamilyDetails] Calling FamilyService.getFamilyById...`);
        // Call the service function
        const family = await FamilyService.getFamilyById(
            familyId,
            requestingUserId as mongoose.Types.ObjectId
        );
        console.log(`>>> [FamilyController.getFamilyDetails] FamilyService.getFamilyById returned: ${!!family}`);

        if (!family) {
            console.log(`>>> [FamilyController.getFamilyDetails] Failed: Family not found or access denied.`);
            res.status(404).json({ message: 'Family not found or access denied' });
            return;
        }

        // Send the populated family details
        console.log(`>>> [FamilyController.getFamilyDetails] Success - Sending family details.`);
        res.status(200).json({ family });

    } catch (error: any) {
        console.error(`>>> [FamilyController.getFamilyDetails] ERROR:`, error);
        // Handle specific errors like permission denied from the service
        if (error.statusCode === 403) {
             res.status(403).json({ message: error.message });
        } else if (error.message?.includes('ID format')) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: error.message || 'Error fetching family details' });
        }
    }
    console.log(`>>> [FamilyController.getFamilyDetails] EXIT`);
});

// Controller to add a member to a family
export const addMember = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    try {
        const familyId = req.params.familyId;
        const requestingUserId = req.user?._id;
        const { email: emailToAdd, role } = req.body; // Get email and role from body

        // 1. Basic Validation
        if (!requestingUserId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (!emailToAdd) {
            res.status(400).json({ message: 'Email of user to add is required' });
            return;
        }
        if (!role) {
            res.status(400).json({ message: 'Role for the new member is required' });
            return;
        }
        // Family ID format is likely checked by middleware, but could be checked here too
        if (!mongoose.Types.ObjectId.isValid(familyId)) {
            res.status(400).json({ message: 'Invalid Family ID format' });
            return;
        }

        // 2. Prepare data for service
        const addMemberData = {
            familyId,
            emailToAdd,
            role,
            requestingUserId: requestingUserId as mongoose.Types.ObjectId
        };

        // 3. Call Service
        const updatedFamily = await FamilyService.addMemberToFamily(addMemberData);

        // 4. Respond
        res.status(200).json({
            message: `User ${emailToAdd} added successfully to the family.`,
            family: updatedFamily // Return updated family with populated member
        });

    } catch (error: any) {
        // Handle errors from service (e.g., user not found, family not found, permission denied, already member)
        if (error.statusCode === 403) {
             res.status(403).json({ message: error.message });
        } else if (error.message?.includes('not found') || error.message?.includes('already a member')) {
            // Specific user-friendly errors
            res.status(400).json({ message: error.message });
        } else if (error.message?.includes('ID format') || error.message?.includes('email format')) {
             res.status(400).json({ message: error.message });
        } else {
            // Generic server error
            console.error("Error adding member:", error);
            res.status(500).json({ message: error.message || 'Error adding member to family' });
        }
    }
});

// Controller to update family details
export const updateFamily = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    try {
        const familyId = req.params.familyId;
        const requestingUserId = req.user?._id;
        const { name, description } = req.body; // Extract fields to update

        // 1. Basic Validation
        if (!requestingUserId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // Family ID format checked by middleware
        
        // Ensure at least one field is provided for update
        if (name === undefined && description === undefined) {
            res.status(400).json({ message: 'No update data provided (name or description required)' });
            return;
        }

        // Prepare update data, only including fields that were actually sent
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        // 2. Call Service
        const updatedFamily = await FamilyService.updateFamily(
            familyId,
            updateData,
            requestingUserId as mongoose.Types.ObjectId
        );

        if (!updatedFamily) {
            // Service returns null if family not found (shouldn't happen if middleware passed)
            // Or potentially if update failed validation (service throws specific errors for that)
            res.status(404).json({ message: 'Family not found or update failed' });
            return;
        }

        // 3. Respond
        res.status(200).json({
            message: 'Family updated successfully.',
            family: updatedFamily
        });

    } catch (error: any) {
        // Handle specific errors from service
        if (error.statusCode === 403) {
            res.status(403).json({ message: error.message });
        } else if (error.message?.includes('ID format') || error.message?.includes('cannot be empty') || error.message?.includes('No update data')) {
            res.status(400).json({ message: error.message });
        } else {
            console.error("Error updating family:", error);
            res.status(500).json({ message: error.message || 'Error updating family' });
        }
    }
});

// Controller to send a family invitation
export const sendInvite = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    try {
        const familyId = req.params.familyId;
        const requestingUserId = req.user?._id;
        const { email: emailToInvite, role } = req.body; // Get email and role from body

        // 1. Basic Validation
        if (!requestingUserId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (!emailToInvite) {
            res.status(400).json({ message: 'Email of user to invite is required' });
            return;
        }
        if (!role) {
            res.status(400).json({ message: 'Role for the invited member is required' });
            return;
        }
        // Family ID format checked by middleware
        if (!mongoose.Types.ObjectId.isValid(familyId)) {
            res.status(400).json({ message: 'Invalid Family ID format' });
            return;
        }

        // 2. Prepare data for service
        const invitationData = {
            familyId,
            emailToInvite,
            role,
            requestingUserId: requestingUserId as mongoose.Types.ObjectId
        };

        // 3. Call Service to create invitation (and send email placeholder)
        const newInvitation = await FamilyService.createInvitation(invitationData);

        // 4. Respond
        res.status(201).json({
            message: `Invitation sent successfully to ${emailToInvite}.`,
            // Optionally return limited invitation details (like ID, status)
            invitationId: newInvitation._id 
        });

    } catch (error: any) {
        // Handle specific errors from service (e.g., permission denied, already member, already pending)
        if (error.statusCode === 403) {
            res.status(403).json({ message: error.message });
        } else if (
            error.message?.includes('not found') || 
            error.message?.includes('already a member') || 
            error.message?.includes('already pending')
        ) {
            res.status(400).json({ message: error.message });
        } else if (error.message?.includes('ID format') || error.message?.includes('email format')) {
            res.status(400).json({ message: error.message });
        } else {
            // Generic server error
            console.error("Error sending invitation:", error);
            res.status(500).json({ message: error.message || 'Error sending invitation' });
        }
    }
});

// Controller to accept a family invitation (for logged-in users)
export const acceptInvite = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    try {
        const invitationToken = req.params.token; // Get token from URL parameter
        const loggedInUserId = req.user?._id;    // Get user ID from authenticated request

        // Basic Validation
        if (!loggedInUserId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (!invitationToken) {
            res.status(400).json({ message: 'Invitation token is required' });
            return;
        }

        // Prepare data for service
        const acceptData = {
            invitationToken,
            loggedInUserId: loggedInUserId as mongoose.Types.ObjectId
        };

        // Call Service
        const updatedFamily = await FamilyService.acceptInvitation(acceptData);

        // Respond
        res.status(200).json({
            message: 'Invitation accepted successfully.',
            family: updatedFamily // Return updated family details
        });

    } catch (error: any) {
        // Handle specific errors from service
        let statusCode = 500;
        let message = error.message || 'Error accepting invitation';

        if (error.message?.includes('invitation token') || error.message?.includes('expired')) {
            statusCode = 400;
        } else if (error.message?.includes('email does not match') || error.message?.includes('User is already a member')) {
            statusCode = 400;
        } else if (error.message?.includes('not found')) {
            // Distinguish between user not found (401 should have caught) and family not found (500?)
            if (error.message.includes('Logged-in user')){
                 statusCode = 401; // Or 500 if it implies internal error
            } else if (error.message.includes('Family associated')){
                 statusCode = 404; // Family linked to invite not found
            }
            else {
                 statusCode = 404; // Generic not found
            }
        }

        if (!res.headersSent) {
            res.status(statusCode).json({ message });
        }
        if (res.headersSent) {
             console.error('Headers already sent, could not send error response.');
        }
    }
});

// @desc    Get invitation details by token
// @route   GET /api/invitations/:token/details
// @access  Public
export const getInviteDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    if (!token) {
        res.status(400).json({ message: 'Invitation token is required' });
        return;
    }
    try {
        const details = await FamilyService.getInvitationDetailsByToken(token);
        if (!details) {
            // This path should technically not be reached if service throws errors,
            // but kept as a fallback.
            res.status(404).json({ message: 'Invitation details not found.' });
        } else {
            // The 'details' object now matches PublicInvitationDetails
            // (email, role, familyName, isExistingUser)
            res.status(200).json(details);
        }
    } catch (error: any) {
        // Log the full error for debugging on the server
        console.error(`[Invite Details Error] Token: ${token || 'N/A'} - ${error.message}`);

        // Send back appropriate status code and message based on error thrown by service
        if (error.statusCode) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            // Generic fallback for unexpected errors
            res.status(500).json({ message: 'An error occurred while fetching invitation details.' });
        }
    }
});

// @desc    Register a new user AND accept an invitation
// @route   POST /api/invitations/accept-register
// @access  Public
export const registerAndAcceptInvitationHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!token || !firstName || !lastName || !email || !password) {
        res.status(400).json({ message: 'Missing required fields: token, firstName, lastName, email, password' });
        return; // Important to return here
    }

    // No need for explicit try/catch, asyncHandler handles errors
    const result = await FamilyService.registerAndAcceptInvitation({ token, firstName, lastName, email, password });

    // Respond with user details, JWT token, and family info
    // On success, the service returns { user: ReturnedUser, token: string, family: IFamily }
    res.status(201).json({
        message: 'User registered and invitation accepted successfully',
        user: result.user,    // The slimmed-down user object
        token: result.token,  // The JWT for automatic login
        family: result.family, // Optionally return limited family info if needed
    });
});

// @desc    Remove a member from a family
// @route   DELETE /api/families/:familyId/members/:memberId
// @access  Protected (Requires login, family membership, and likely creator role)
export const removeMember = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    const { familyId, memberId } = req.params; // Get IDs from URL params
    const requestingUserId = req.user?._id; // Get ID of user making the request

    // 1. Basic Validation (User ID is already validated by `protect` middleware)
    if (!requestingUserId) {
        // Should not happen due to `protect` middleware
        res.status(401).json({ message: 'User not authenticated' });
        return;
    }
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        res.status(400).json({ message: 'Invalid Family ID format' });
        return;
    }
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
        res.status(400).json({ message: 'Invalid Member ID format' });
        return;
    }

    // 2. Prepare data for service
    const removeData = {
        familyId,
        memberIdToRemove: memberId,
        requestingUserId: requestingUserId as mongoose.Types.ObjectId,
    };

    // 3. Call Service (asyncHandler catches errors)
    const updatedFamily = await FamilyService.removeMemberFromFamily(removeData);

    // 4. Respond
    res.status(200).json({
        message: 'Member removed successfully',
        family: updatedFamily, // Return updated family
    });
});

// @desc    Change a member's role in a family
// @route   PUT /api/families/:familyId/members/:memberId/role
// @access  Protected (Requires login, family membership, and likely creator role)
export const changeMemberRoleHandler = asyncHandler(async (req: ProtectedRequest, res: Response): Promise<void> => {
    const { familyId, memberId } = req.params; // Get IDs from URL params
    const { role: newRole } = req.body; // Get the new role from the request body
    const requestingUserId = req.user?._id; // Get ID of user making the request

    // 1. Basic Validation
    if (!requestingUserId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
    }
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        res.status(400).json({ message: 'Invalid Family ID format' });
        return;
    }
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
        res.status(400).json({ message: 'Invalid Member ID format' });
        return;
    }
    if (!newRole || typeof newRole !== 'string') {
        res.status(400).json({ message: 'New role is required and must be a string.' });
        return;
    }

    // 2. Prepare data for service
    const changeRoleData = {
        familyId,
        memberIdToChange: memberId,
        newRole,
        requestingUserId: requestingUserId as mongoose.Types.ObjectId,
    };

    // 3. Call Service (asyncHandler catches errors)
    const updatedFamily = await FamilyService.changeMemberRole(changeRoleData);

    // 4. Respond
    res.status(200).json({
        message: 'Member role updated successfully',
        family: updatedFamily, // Return updated family
    });
});

// TODO:
// - Implement permission checks more robustly (e.g., can user X update family Y?)
// - Add handlers for updating/removing members (with permissions)
// - Potentially split controllers if they become too large
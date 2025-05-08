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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeMemberRoleHandler = exports.removeMember = exports.registerAndAcceptInvitationHandler = exports.getInviteDetails = exports.acceptInvite = exports.sendInvite = exports.updateFamily = exports.addMember = exports.getFamilyDetails = exports.getMyFamilies = exports.createNewFamily = void 0;
const FamilyService = __importStar(require("./family.service"));
const mongoose_1 = __importDefault(require("mongoose")); // Import mongoose for ObjectId type
const express_async_handler_1 = __importDefault(require("express-async-handler"));
// Controller to handle creating a new family
const createNewFamily = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name } = req.body;
        const creatorUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Get user ID from the authenticated request
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
            creatorUserId: creatorUserId,
        };
        const newFamily = yield FamilyService.createFamily(familyData);
        res.status(201).json({ message: 'Family created successfully', family: newFamily });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Error creating family' });
    }
});
exports.createNewFamily = createNewFamily;
// Controller to get families for the logged-in user
const getMyFamilies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // Assert userId type as we've confirmed it exists
        const families = yield FamilyService.getFamiliesByUser(userId);
        res.status(200).json({ families });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Error fetching families' });
    }
});
exports.getMyFamilies = getMyFamilies;
// Controller to get details for a specific family
exports.getFamilyDetails = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    console.log(`>>> [FamilyController.getFamilyDetails] ENTER - Family ID: ${req.params.familyId}, User ID: ${(_a = req.user) === null || _a === void 0 ? void 0 : _a._id}`);
    try {
        const familyId = req.params.familyId;
        const requestingUserId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        // User authentication is handled by `protect` middleware
        if (!requestingUserId) {
            console.log(`>>> [FamilyController.getFamilyDetails] Failed: User not authenticated.`);
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        // Family ID format validation 
        if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
            console.log(`>>> [FamilyController.getFamilyDetails] Failed: Invalid Family ID format: ${familyId}`);
            res.status(400).json({ message: 'Invalid Family ID format' });
            return;
        }
        console.log(`>>> [FamilyController.getFamilyDetails] Calling FamilyService.getFamilyById...`);
        // Call the service function
        const family = yield FamilyService.getFamilyById(familyId, requestingUserId);
        console.log(`>>> [FamilyController.getFamilyDetails] FamilyService.getFamilyById returned: ${!!family}`);
        if (!family) {
            console.log(`>>> [FamilyController.getFamilyDetails] Failed: Family not found or access denied.`);
            res.status(404).json({ message: 'Family not found or access denied' });
            return;
        }
        // Send the populated family details
        console.log(`>>> [FamilyController.getFamilyDetails] Success - Sending family details.`);
        res.status(200).json({ family });
    }
    catch (error) {
        console.error(`>>> [FamilyController.getFamilyDetails] ERROR:`, error);
        // Handle specific errors like permission denied from the service
        if (error.statusCode === 403) {
            res.status(403).json({ message: error.message });
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('ID format')) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: error.message || 'Error fetching family details' });
        }
    }
    console.log(`>>> [FamilyController.getFamilyDetails] EXIT`);
}));
// Controller to add a member to a family
exports.addMember = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const familyId = req.params.familyId;
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
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
        if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
            res.status(400).json({ message: 'Invalid Family ID format' });
            return;
        }
        // 2. Prepare data for service
        const addMemberData = {
            familyId,
            emailToAdd,
            role,
            requestingUserId: requestingUserId
        };
        // 3. Call Service
        const updatedFamily = yield FamilyService.addMemberToFamily(addMemberData);
        // 4. Respond
        res.status(200).json({
            message: `User ${emailToAdd} added successfully to the family.`,
            family: updatedFamily // Return updated family with populated member
        });
    }
    catch (error) {
        // Handle errors from service (e.g., user not found, family not found, permission denied, already member)
        if (error.statusCode === 403) {
            res.status(403).json({ message: error.message });
        }
        else if (((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('not found')) || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('already a member'))) {
            // Specific user-friendly errors
            res.status(400).json({ message: error.message });
        }
        else if (((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('ID format')) || ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('email format'))) {
            res.status(400).json({ message: error.message });
        }
        else {
            // Generic server error
            console.error("Error adding member:", error);
            res.status(500).json({ message: error.message || 'Error adding member to family' });
        }
    }
}));
// Controller to update family details
exports.updateFamily = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const familyId = req.params.familyId;
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
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
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        // 2. Call Service
        const updatedFamily = yield FamilyService.updateFamily(familyId, updateData, requestingUserId);
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
    }
    catch (error) {
        // Handle specific errors from service
        if (error.statusCode === 403) {
            res.status(403).json({ message: error.message });
        }
        else if (((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('ID format')) || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('cannot be empty')) || ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('No update data'))) {
            res.status(400).json({ message: error.message });
        }
        else {
            console.error("Error updating family:", error);
            res.status(500).json({ message: error.message || 'Error updating family' });
        }
    }
}));
// Controller to send a family invitation
exports.sendInvite = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const familyId = req.params.familyId;
        const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
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
        if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
            res.status(400).json({ message: 'Invalid Family ID format' });
            return;
        }
        // 2. Prepare data for service
        const invitationData = {
            familyId,
            emailToInvite,
            role,
            requestingUserId: requestingUserId
        };
        // 3. Call Service to create invitation (and send email placeholder)
        const newInvitation = yield FamilyService.createInvitation(invitationData);
        // 4. Respond
        res.status(201).json({
            message: `Invitation sent successfully to ${emailToInvite}.`,
            // Optionally return limited invitation details (like ID, status)
            invitationId: newInvitation._id
        });
    }
    catch (error) {
        // Handle specific errors from service (e.g., permission denied, already member, already pending)
        if (error.statusCode === 403) {
            res.status(403).json({ message: error.message });
        }
        else if (((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('not found')) ||
            ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('already a member')) ||
            ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('already pending'))) {
            res.status(400).json({ message: error.message });
        }
        else if (((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('ID format')) || ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes('email format'))) {
            res.status(400).json({ message: error.message });
        }
        else {
            // Generic server error
            console.error("Error sending invitation:", error);
            res.status(500).json({ message: error.message || 'Error sending invitation' });
        }
    }
}));
// Controller to accept a family invitation (for logged-in users)
exports.acceptInvite = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const invitationToken = req.params.token; // Get token from URL parameter
        const loggedInUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Get user ID from authenticated request
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
            loggedInUserId: loggedInUserId
        };
        // Call Service
        const updatedFamily = yield FamilyService.acceptInvitation(acceptData);
        // Respond
        res.status(200).json({
            message: 'Invitation accepted successfully.',
            family: updatedFamily // Return updated family details
        });
    }
    catch (error) {
        // Handle specific errors from service
        let statusCode = 500;
        let message = error.message || 'Error accepting invitation';
        if (((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('invitation token')) || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('expired'))) {
            statusCode = 400;
        }
        else if (((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('email does not match')) || ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('User is already a member'))) {
            statusCode = 400;
        }
        else if ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes('not found')) {
            // Distinguish between user not found (401 should have caught) and family not found (500?)
            if (error.message.includes('Logged-in user')) {
                statusCode = 401; // Or 500 if it implies internal error
            }
            else if (error.message.includes('Family associated')) {
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
}));
// @desc    Get invitation details by token
// @route   GET /api/invitations/:token/details
// @access  Public
exports.getInviteDetails = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    if (!token) {
        res.status(400).json({ message: 'Invitation token is required' });
        return;
    }
    try {
        const details = yield FamilyService.getInvitationDetailsByToken(token);
        if (!details) {
            // This path should technically not be reached if service throws errors,
            // but kept as a fallback.
            res.status(404).json({ message: 'Invitation details not found.' });
        }
        else {
            // The 'details' object now matches PublicInvitationDetails
            // (email, role, familyName, isExistingUser)
            res.status(200).json(details);
        }
    }
    catch (error) {
        // Log the full error for debugging on the server
        console.error(`[Invite Details Error] Token: ${token || 'N/A'} - ${error.message}`);
        // Send back appropriate status code and message based on error thrown by service
        if (error.statusCode) {
            res.status(error.statusCode).json({ message: error.message });
        }
        else {
            // Generic fallback for unexpected errors
            res.status(500).json({ message: 'An error occurred while fetching invitation details.' });
        }
    }
}));
// @desc    Register a new user AND accept an invitation
// @route   POST /api/invitations/accept-register
// @access  Public
exports.registerAndAcceptInvitationHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, firstName, lastName, email, password } = req.body;
    // Basic validation
    if (!token || !firstName || !lastName || !email || !password) {
        res.status(400).json({ message: 'Missing required fields: token, firstName, lastName, email, password' });
        return; // Important to return here
    }
    // No need for explicit try/catch, asyncHandler handles errors
    const result = yield FamilyService.registerAndAcceptInvitation({ token, firstName, lastName, email, password });
    // Respond with user details, JWT token, and family info
    // On success, the service returns { user: ReturnedUser, token: string, family: IFamily }
    res.status(201).json({
        message: 'User registered and invitation accepted successfully',
        user: result.user, // The slimmed-down user object
        token: result.token, // The JWT for automatic login
        family: result.family, // Optionally return limited family info if needed
    });
}));
// @desc    Remove a member from a family
// @route   DELETE /api/families/:familyId/members/:memberId
// @access  Protected (Requires login, family membership, and likely creator role)
exports.removeMember = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { familyId, memberId } = req.params; // Get IDs from URL params
    const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Get ID of user making the request
    // 1. Basic Validation (User ID is already validated by `protect` middleware)
    if (!requestingUserId) {
        // Should not happen due to `protect` middleware
        res.status(401).json({ message: 'User not authenticated' });
        return;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
        res.status(400).json({ message: 'Invalid Family ID format' });
        return;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(memberId)) {
        res.status(400).json({ message: 'Invalid Member ID format' });
        return;
    }
    // 2. Prepare data for service
    const removeData = {
        familyId,
        memberIdToRemove: memberId,
        requestingUserId: requestingUserId,
    };
    // 3. Call Service (asyncHandler catches errors)
    const updatedFamily = yield FamilyService.removeMemberFromFamily(removeData);
    // 4. Respond
    res.status(200).json({
        message: 'Member removed successfully',
        family: updatedFamily, // Return updated family
    });
}));
// @desc    Change a member's role in a family
// @route   PUT /api/families/:familyId/members/:memberId/role
// @access  Protected (Requires login, family membership, and likely creator role)
exports.changeMemberRoleHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { familyId, memberId } = req.params; // Get IDs from URL params
    const { role: newRole } = req.body; // Get the new role from the request body
    const requestingUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Get ID of user making the request
    // 1. Basic Validation
    if (!requestingUserId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
        res.status(400).json({ message: 'Invalid Family ID format' });
        return;
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(memberId)) {
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
        requestingUserId: requestingUserId,
    };
    // 3. Call Service (asyncHandler catches errors)
    const updatedFamily = yield FamilyService.changeMemberRole(changeRoleData);
    // 4. Respond
    res.status(200).json({
        message: 'Member role updated successfully',
        family: updatedFamily, // Return updated family
    });
}));
// TODO:
// - Implement permission checks more robustly (e.g., can user X update family Y?)
// - Add handlers for updating/removing members (with permissions)
// - Potentially split controllers if they become too large

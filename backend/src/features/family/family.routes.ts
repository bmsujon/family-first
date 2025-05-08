import express from 'express';
import * as FamilyController from './family.controller';
import { protect } from '../auth/auth.middleware'; // Import the protect middleware
import { checkFamilyMembership } from '../../middleware/familyMembershipMiddleware'; // Import middleware
import { registerAndAcceptInvitationHandler, removeMember, changeMemberRoleHandler } from './family.controller'; // Import the new handler

const router = express.Router();

// Route to get families for the current user (protected)
router.get('/mine', protect, FamilyController.getMyFamilies);

// Route to create a new family (protected)
router.post('/', protect, FamilyController.createNewFamily);

// Route to get details for a specific family
router.get(
    '/:familyId', 
    protect,              // 1. Ensure user is logged in
    checkFamilyMembership, // 2. Ensure user is a member of this family
    FamilyController.getFamilyDetails // 3. Get the details
);

// Route to add a member to a specific family
router.post(
    '/:familyId/members',
    protect,                // 1. Ensure user is logged in
    checkFamilyMembership,   // 2. Ensure requesting user is part of the family
                             // 3. Service function checks if user is creator (for now)
    FamilyController.addMember // 4. Add the member
);

// Route to update family details
router.put(
    '/:familyId',
    protect,                // 1. Ensure user is logged in
    checkFamilyMembership,   // 2. Ensure requesting user is part of the family
                             // 3. Service function checks if user is creator (for now)
    FamilyController.updateFamily // 4. Update the family
);

// Route to send an invitation for a specific family
router.post(
    '/:familyId/invites',
    protect,                // 1. Ensure user is logged in
    checkFamilyMembership,   // 2. Ensure requesting user is part of the family
                             // 3. Service checks if user is creator (for now)
    FamilyController.sendInvite // 4. Create invitation and send email (placeholder)
);

// Route to accept an invitation
router.post('/invitations/accept/:token', protect, FamilyController.acceptInvite);

// Route to get invitation details
router.get('/invitations/:token/details', FamilyController.getInviteDetails);

// Route to register and accept an invitation
router.post('/invitations/accept-register', registerAndAcceptInvitationHandler);

// Routes for managing family members within a specific family
router.route('/:familyId/members')
    .post(protect, checkFamilyMembership, FamilyController.addMember)      // Add a member to the family
    // TODO: Add PUT (update member role)

// Add DELETE route for removing a member
router.route('/:familyId/members/:memberId')
    .delete(protect, checkFamilyMembership, removeMember); // Requires login, family membership, service checks creator role

// Add PUT route for changing a member's role
router.route('/:familyId/members/:memberId/role')
    .put(protect, checkFamilyMembership, changeMemberRoleHandler); // Requires login, family membership, service checks creator role

// TODO: Add routes for:
// - GET / (Alternative to /mine? Maybe admin only?)
// - DELETE /:familyId (Delete family - protected, permission check needed)

export default router; 
import express from 'express';
import * as FamilyController from '../family/family.controller'; // Assuming controller is there for now
import { protect } from '../auth/auth.middleware'; // Import protect middleware

const router = express.Router();

// Route to get public details of an invitation by token
// GET /api/v1/invites/:token/details 
router.get(
    '/:token/details',
    FamilyController.getInviteDetails // No auth needed
);

// Route for existing logged-in user to accept an invitation
// POST /api/v1/invites/:token/accept
router.post(
    '/:token/accept', 
    protect, // User must be logged in
    FamilyController.acceptInvite // Controller handles the logic
);

// TODO: Add other invite related routes? 
// e.g., GET /:token/details to fetch invite info before accepting/registering?

export default router; 
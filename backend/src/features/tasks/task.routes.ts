import express from 'express';
import {
    createTaskHandler,
    getTasksHandler,
    getTaskByIdHandler,
    updateTaskHandler,
    deleteTaskHandler,
    updateTaskStatusHandler
} from './task.controller';
import { protect } from '../../middleware/authMiddleware';
import { checkFamilyMembership } from '../../middleware/familyMembershipMiddleware';
// TODO: Import middleware to check family membership
// import { checkFamilyMembership } from '../middleware/familyMiddleware'; 

const router = express.Router({
    mergeParams: true // Important to access :familyId from the parent router (families)
});

// Define common middleware for routes needing family membership check
// const requireFamilyMembership = [protect, checkFamilyMembership]; // Create this middleware later

// --- Middleware applied to all task routes for this family --- 
// Ensure user is logged in AND a member of the family specified in the URL
router.use(protect);
router.use(checkFamilyMembership);

// --- Task Routes --- 

// POST /api/families/:familyId/tasks - Create a new task for the family
router.route('/')
    .post(createTaskHandler)
    .get(getTasksHandler);

// GET /api/families/:familyId/tasks/:taskId - Get a specific task
// PUT /api/families/:familyId/tasks/:taskId - Update a specific task
// DELETE /api/families/:familyId/tasks/:taskId - Delete a specific task
router.route('/:taskId')
    .get(getTaskByIdHandler)
    .put(updateTaskHandler)
    .delete(deleteTaskHandler);

// PATCH /api/families/:familyId/tasks/:taskId/status
// Update the status of a specific task (e.g., mark complete/incomplete)
router.patch(
    '/:taskId/status',
    // Middleware already applied via router.use()
    // protect,               
    // checkFamilyMembership, 
    updateTaskStatusHandler
);

export default router; 
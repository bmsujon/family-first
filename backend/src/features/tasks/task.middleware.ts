import { Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Task from '../../models/Task'; // Correct path to Task model
import { AuthRequest } from '../../middleware/authMiddleware'; // Import AuthRequest for req.user type
import { IUser } from '../../models/User';

/**
 * Middleware to check if the authenticated user has permission to modify/delete a specific task.
 * Assumes `protect` and `checkFamilyMembership` middleware have already run.
 * Checks if the user is the creator or one of the assignees.
 */
export const checkTaskPermissions = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        const taskId = req.params.taskId;
        const familyId = req.params.familyId; // Available due to mergeParams
        const user = req.user as IUser; // User guaranteed by `protect` middleware

        // 1. Validate IDs (basic checks, existence checked by previous middleware/service)
        if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
            res.status(400);
            return next(new Error('Invalid Task ID format'));
        }
         if (!familyId || !mongoose.Types.ObjectId.isValid(familyId)) {
             // Should have been caught by checkFamilyMembership, but double-check
             res.status(400);
             return next(new Error('Invalid Family ID format'));
         }

        try {
            // 2. Find the task, selecting only fields needed for permission check
            const task = await Task.findOne({ _id: taskId, familyId: familyId })
                                   .select('createdBy assignedTo')
                                   .lean()
                                   .exec();

            // 3. Check if task exists within the family (should exist if previous middleware passed)
            if (!task) {
                res.status(404);
                return next(new Error('Task not found within this family'));
            }

            // 4. Perform Permission Check
            const userId = user._id;

            // Compare by converting to strings for simplicity and robustness
            const isCreator = task.createdBy && String(task.createdBy) === String(userId);

            const isAssignee = task.assignedTo?.some(
                assigneeId => assigneeId && String(assigneeId) === String(userId)
            );

            // Allow if user is creator OR assignee
            if (isCreator || isAssignee) {
                next(); // User has permission, proceed
            } else {
                // TODO: Consider adding family admin role check here later
                res.status(403); // Forbidden
                return next(
                    new Error('Forbidden: You do not have permission to modify or delete this task')
                );
            }
        } catch (error) {
            console.error('Error checking task permissions:', error);
            res.status(500);
            return next(new Error('Server error during task permission check'));
        }
    }
); 
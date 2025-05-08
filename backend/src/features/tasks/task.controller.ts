import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose, { Types } from 'mongoose';
import * as TaskService from './task.service';
import { AuthRequest } from '../../middleware/authMiddleware';
import { AppError } from '../../utils/AppError'; // Import AppError if needed for type checks (optional)

// @desc    Create a new task for a family
// @route   POST /api/families/:familyId/tasks
// @access  Protected (Requires login and family membership)
export const createTaskHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    // User check is implicitly handled by protect middleware, but explicit check adds clarity
    if (!req.user) {
        throw new AppError('User not authenticated', 401); // Throw standardized error
    }
    const createdById = req.user._id as Types.ObjectId;
    const { title, description, category, priority, status, dueDate, assignedTo } = req.body;

    if (!title) {
        throw new AppError('Task title is required', 400);
    }

    // Prepare data matching the service function's expected interface
    const taskData = {
        familyId: familyId as string,
        createdById: createdById,
        title,
        description,
        category,
        priority,
        status,
        dueDate,
        assignedTo,
    };

    // Remove manual try/catch, rely on asyncHandler and global error handler
    const newTask = await TaskService.createTaskForFamily(taskData);
    res.status(201).json(newTask);
});

// @desc    Get tasks for a specific family
// @route   GET /api/families/:familyId/tasks
// @access  Protected (Requires login and family membership)
export const getTasksHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { familyId } = req.params;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;
    const { status, assignedToUserId, sortBy, sortOrder, page, limit } = req.query;

    const options = {
        familyId: familyId as string,
        requestingUserId: requestingUserId,
        status: status as string | undefined,
        assignedToUserId: assignedToUserId as string | undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
    };

    // Service handles permission and throws AppError on failure
    const paginatedResult = await TaskService.getTasksByFamily(options);
    res.status(200).json(paginatedResult);
});

// @desc    Get a single task by ID
// @route   GET /api/families/:familyId/tasks/:taskId
// @access  Protected (Requires login and family membership)
export const getTaskByIdHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;

    // Updated service call: only taskId and userId needed
    // Service throws AppError (404, 403, 400) on failure
    const task = await TaskService.getTaskById(taskId, requestingUserId);

    // If service didn't throw, task was found and user has permission
    res.status(200).json(task);
    // No need for explicit null check, asyncHandler handles errors
});

// @desc    Update a task
// @route   PUT /api/families/:familyId/tasks/:taskId
// @access  Protected (Requires login and family membership)
export const updateTaskHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    const updateData = req.body;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;

    // Updated service call: taskId, updateData, userId
    // Service throws AppError on failure (404 not found, 400 invalid input, 403 permission)
    const updatedTask = await TaskService.updateTaskDetails(
        taskId,
        updateData,
        requestingUserId
    );

    // If service didn't throw, task was updated successfully
    res.status(200).json(updatedTask);
    // No need for explicit catch block, asyncHandler passes errors
});

// @desc    Delete a task
// @route   DELETE /api/families/:familyId/tasks/:taskId
// @access  Protected (Requires login and family membership)
export const deleteTaskHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;

    // Updated service call: taskId, userId
    // Service throws AppError on failure (e.g., 404 not found, 403 permission)
    // Service now returns void
    await TaskService.deleteTaskById(
        taskId,
        requestingUserId
    );

    // If service didn't throw, task was deleted successfully
    res.status(200).json({ message: 'Task deleted successfully' }); // Adjusted response
    // No need for explicit catch block
});

// @desc    Update task status
// @route   PATCH /api/families/:familyId/tasks/:taskId/status
// @access  Protected (Requires login and family membership)
export const updateTaskStatusHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    const { status } = req.body;
    if (!req.user) {
        throw new AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id as Types.ObjectId;

    if (!status) {
        throw new AppError('Status is required in the request body', 400);
    }

    // Updated service call: taskId, status, userId
    // Service throws AppError on failure (404 not found, 400 invalid status, 403 permission)
    const updatedTask = await TaskService.updateTaskStatusById(
        taskId,
        status, // Ensure status type matches service expectation (TaskStatus)
        requestingUserId
    );

    // If service didn't throw, status was updated successfully
    res.status(200).json(updatedTask);
    // No need for explicit catch block
}); 
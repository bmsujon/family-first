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
exports.updateTaskStatusHandler = exports.deleteTaskHandler = exports.updateTaskHandler = exports.getTaskByIdHandler = exports.getTasksHandler = exports.createTaskHandler = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const TaskService = __importStar(require("./task.service"));
const AppError_1 = require("../../utils/AppError"); // Import AppError if needed for type checks (optional)
// @desc    Create a new task for a family
// @route   POST /api/families/:familyId/tasks
// @access  Protected (Requires login and family membership)
exports.createTaskHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId } = req.params;
    // User check is implicitly handled by protect middleware, but explicit check adds clarity
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401); // Throw standardized error
    }
    const createdById = req.user._id;
    const { title, description, category, priority, status, dueDate, assignedTo } = req.body;
    if (!title) {
        throw new AppError_1.AppError('Task title is required', 400);
    }
    // Prepare data matching the service function's expected interface
    const taskData = {
        familyId: familyId,
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
    const newTask = yield TaskService.createTaskForFamily(taskData);
    res.status(201).json(newTask);
}));
// @desc    Get tasks for a specific family
// @route   GET /api/families/:familyId/tasks
// @access  Protected (Requires login and family membership)
exports.getTasksHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId } = req.params;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    const { status, assignedToUserId, sortBy, sortOrder, page, limit } = req.query;
    const options = {
        familyId: familyId,
        requestingUserId: requestingUserId,
        status: status,
        assignedToUserId: assignedToUserId,
        sortBy: sortBy,
        sortOrder: sortOrder,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
    };
    // Service handles permission and throws AppError on failure
    const paginatedResult = yield TaskService.getTasksByFamily(options);
    res.status(200).json(paginatedResult);
}));
// @desc    Get a single task by ID
// @route   GET /api/families/:familyId/tasks/:taskId
// @access  Protected (Requires login and family membership)
exports.getTaskByIdHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    // Updated service call: only taskId and userId needed
    // Service throws AppError (404, 403, 400) on failure
    const task = yield TaskService.getTaskById(taskId, requestingUserId);
    // If service didn't throw, task was found and user has permission
    res.status(200).json(task);
    // No need for explicit null check, asyncHandler handles errors
}));
// @desc    Update a task
// @route   PUT /api/families/:familyId/tasks/:taskId
// @access  Protected (Requires login and family membership)
exports.updateTaskHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    const updateData = req.body;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    // Updated service call: taskId, updateData, userId
    // Service throws AppError on failure (404 not found, 400 invalid input, 403 permission)
    const updatedTask = yield TaskService.updateTaskDetails(taskId, updateData, requestingUserId);
    // If service didn't throw, task was updated successfully
    res.status(200).json(updatedTask);
    // No need for explicit catch block, asyncHandler passes errors
}));
// @desc    Delete a task
// @route   DELETE /api/families/:familyId/tasks/:taskId
// @access  Protected (Requires login and family membership)
exports.deleteTaskHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    // Updated service call: taskId, userId
    // Service throws AppError on failure (e.g., 404 not found, 403 permission)
    // Service now returns void
    yield TaskService.deleteTaskById(taskId, requestingUserId);
    // If service didn't throw, task was deleted successfully
    res.status(200).json({ message: 'Task deleted successfully' }); // Adjusted response
    // No need for explicit catch block
}));
// @desc    Update task status
// @route   PATCH /api/families/:familyId/tasks/:taskId/status
// @access  Protected (Requires login and family membership)
exports.updateTaskStatusHandler = (0, express_async_handler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { taskId } = req.params; // familyId from params is not needed for the service call anymore
    const { status } = req.body;
    if (!req.user) {
        throw new AppError_1.AppError('User not authenticated', 401);
    }
    const requestingUserId = req.user._id;
    if (!status) {
        throw new AppError_1.AppError('Status is required in the request body', 400);
    }
    // Updated service call: taskId, status, userId
    // Service throws AppError on failure (404 not found, 400 invalid status, 403 permission)
    const updatedTask = yield TaskService.updateTaskStatusById(taskId, status, // Ensure status type matches service expectation (TaskStatus)
    requestingUserId);
    // If service didn't throw, status was updated successfully
    res.status(200).json(updatedTask);
    // No need for explicit catch block
}));

"use strict";
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
exports.checkTaskPermissions = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
const Task_1 = __importDefault(require("../../models/Task")); // Correct path to Task model
/**
 * Middleware to check if the authenticated user has permission to modify/delete a specific task.
 * Assumes `protect` and `checkFamilyMembership` middleware have already run.
 * Checks if the user is the creator or one of the assignees.
 */
exports.checkTaskPermissions = (0, express_async_handler_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const taskId = req.params.taskId;
    const familyId = req.params.familyId; // Available due to mergeParams
    const user = req.user; // User guaranteed by `protect` middleware
    // 1. Validate IDs (basic checks, existence checked by previous middleware/service)
    if (!taskId || !mongoose_1.default.Types.ObjectId.isValid(taskId)) {
        res.status(400);
        return next(new Error('Invalid Task ID format'));
    }
    if (!familyId || !mongoose_1.default.Types.ObjectId.isValid(familyId)) {
        // Should have been caught by checkFamilyMembership, but double-check
        res.status(400);
        return next(new Error('Invalid Family ID format'));
    }
    try {
        // 2. Find the task, selecting only fields needed for permission check
        const task = yield Task_1.default.findOne({ _id: taskId, familyId: familyId })
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
        const isAssignee = (_a = task.assignedTo) === null || _a === void 0 ? void 0 : _a.some(assigneeId => assigneeId && String(assigneeId) === String(userId));
        // Allow if user is creator OR assignee
        if (isCreator || isAssignee) {
            next(); // User has permission, proceed
        }
        else {
            // TODO: Consider adding family admin role check here later
            res.status(403); // Forbidden
            return next(new Error('Forbidden: You do not have permission to modify or delete this task'));
        }
    }
    catch (error) {
        console.error('Error checking task permissions:', error);
        res.status(500);
        return next(new Error('Server error during task permission check'));
    }
}));

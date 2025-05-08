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
exports.updateTaskStatusById = exports.deleteTaskById = exports.updateTaskDetails = exports.getTaskById = exports.getTasksByFamily = exports.createTaskForFamily = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Task_1 = __importStar(require("../../models/Task")); // Import constants
const Family_1 = __importDefault(require("../../models/Family")); // Import Family model
const AppError_1 = require("../../utils/AppError"); // Corrected import: Use named import
const server_1 = require("../../server"); // Import the socket instance
// Function to emit task updates via Socket.IO
const emitTaskUpdate = (familyId, event, data) => {
    if (server_1.socketIOInstance) {
        const room = `family_${familyId.toString()}`;
        console.log(`Emitting event [${event}] to room [${room}]`, (data === null || data === void 0 ? void 0 : data._id) || data);
        server_1.socketIOInstance.to(room).emit(event, data);
    }
    else {
        console.warn('Socket.IO instance not available, cannot emit task update.');
    }
};
// Service to create a new task for a specific family
const createTaskForFamily = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId, title, createdById, assignedTo } = data;
    if (!mongoose_1.default.Types.ObjectId.isValid(familyId) || !mongoose_1.default.Types.ObjectId.isValid(createdById)) {
        throw new AppError_1.AppError('Invalid Family or Creator User ID format', 400);
    }
    const family = yield Family_1.default.findById(familyId).select('members').lean();
    if (!family) {
        throw new AppError_1.AppError('Family not found', 404);
    }
    // Linter Fix: Use string comparison for lean() results
    const creatorIdString = createdById.toString();
    if (!family.members || !family.members.some(memberId => memberId.toString() === creatorIdString)) {
        throw new AppError_1.AppError('User does not have permission to create tasks in this family', 403);
    }
    if (assignedTo && assignedTo.some(id => !mongoose_1.default.Types.ObjectId.isValid(id))) {
        throw new AppError_1.AppError('Invalid User ID format in assignedTo array', 400);
    }
    const task = new Task_1.default(Object.assign(Object.assign({}, data), { createdBy: createdById })); // Simplified creation
    yield task.save();
    yield task.populate(['createdBy', 'assignedTo']);
    // Emit event AFTER successful save and populate
    emitTaskUpdate(familyId, 'task_created', task.toObject()); // Send plain object
    return task;
});
exports.createTaskForFamily = createTaskForFamily;
// Service to get tasks for a family (with filtering, sorting, and pagination)
const getTasksByFamily = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { familyId, requestingUserId, status, assignedToUserId, sortBy, sortOrder, 
    // Destructure pagination params with defaults
    page = 1, // Default to page 1
    limit = 10 // Default to 10 items per page
     } = options;
    // --- Input Validation --- 
    if (!mongoose_1.default.Types.ObjectId.isValid(familyId)) {
        throw new AppError_1.AppError('Invalid Family ID format', 400);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError_1.AppError('Invalid User ID format for requesting user', 400);
    }
    // Validate page and limit
    const pageNumber = Math.max(1, Number(page)); // Ensure page is at least 1
    const limitNumber = Math.max(1, Number(limit)); // Ensure limit is at least 1
    const skip = (pageNumber - 1) * limitNumber;
    // --- Query Construction --- 
    const query = { familyId };
    if (status && Task_1.TASK_STATUSES.includes(status)) {
        query.status = status;
    }
    if (assignedToUserId && mongoose_1.default.Types.ObjectId.isValid(assignedToUserId)) {
        query.assignedTo = assignedToUserId;
    }
    // --- Sorting Logic --- 
    let sortQuery = { createdAt: -1 };
    const allowedSortFields = ['createdAt', 'dueDate', 'priority', 'status', 'title'];
    if (sortBy && allowedSortFields.includes(sortBy)) {
        const order = sortOrder === 'asc' ? 1 : -1;
        sortQuery = { [sortBy]: order };
    }
    // --- Database Operations --- 
    // Use Promise.all to run count and find operations concurrently
    const [totalTasks, tasks] = yield Promise.all([
        Task_1.default.countDocuments(query).exec(), // Get total count matching filters
        Task_1.default.find(query)
            .populate('createdBy', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email profilePicture')
            .sort(sortQuery)
            .skip(skip) // Apply skip for pagination
            .limit(limitNumber) // Apply limit for pagination
            .exec()
    ]);
    // --- Calculate Pagination Results --- 
    const totalPages = Math.ceil(totalTasks / limitNumber);
    // --- Return Paginated Result --- 
    return {
        tasks,
        totalTasks,
        currentPage: pageNumber,
        totalPages,
    };
});
exports.getTasksByFamily = getTasksByFamily;
/**
 * Retrieves a single task by its ID and verifies user permission.
 * Throws specific errors for not found vs permission denied.
 */
const getTaskById = (taskId, requestingUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(taskId)) {
        throw new AppError_1.AppError('Invalid Task ID format', 400);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError_1.AppError('Invalid User ID format', 400);
    }
    const task = yield Task_1.default.findById(taskId)
        .populate('createdBy', 'firstName lastName email profilePicture')
        .populate('assignedTo', 'firstName lastName email profilePicture');
    if (!task) {
        throw new AppError_1.AppError('Task not found', 404);
    }
    // Now, check permission using the task's familyId
    const family = yield Family_1.default.findById(task.familyId).select('members').lean(); // Fetch the family associated with the task
    if (!family) {
        // This indicates an data integrity issue (task exists but family doesn't)
        console.error(`Data integrity issue: Task ${taskId} references non-existent family ${task.familyId}`);
        throw new AppError_1.AppError('Task found, but associated family is missing', 500);
    }
    // Linter Fix: Use string comparison for lean() results
    const requestingUserIdString = requestingUserId.toString();
    if (!family.members || !family.members.some(memberId => memberId.toString() === requestingUserIdString)) {
        throw new AppError_1.AppError('Permission denied: User is not a member of the task family', 403);
    }
    // If task found and permission granted, return the task
    return task;
});
exports.getTaskById = getTaskById;
// Service to update task details
const updateTaskDetails = (taskId, updates, userId // Renamed for clarity, this is the requesting user
) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Validate IDs and Get Task (getTaskById now handles validation and permission)
    // Note: getTaskById now takes taskId and userId
    const task = yield (0, exports.getTaskById)(taskId, userId);
    // --- Validate and Apply Updates ---
    const allowedUpdateKeys = [
        'title', 'description', 'category', 'priority', 'status', 'dueDate', 'assignedTo', 'recurring', 'recurrenceRule'
    ];
    let hasValidUpdate = false;
    // Apply updates directly to the task object
    for (const key of allowedUpdateKeys) {
        // Check if the key exists in the updates object before accessing
        if (key in updates) {
            const updateValue = updates[key]; // Use 'as any' or a type assertion
            // Add specific validation if needed (e.g., for status, priority)
            if (key === 'status' && updateValue !== undefined && !Task_1.TASK_STATUSES.includes(updateValue)) {
                throw new AppError_1.AppError(`Invalid status value: ${updateValue}`, 400);
            }
            if (key === 'priority' && updateValue !== undefined && !Task_1.TASK_PRIORITIES.includes(updateValue)) { // Assuming TASK_PRIORITIES exists
                throw new AppError_1.AppError(`Invalid priority value: ${updateValue}`, 400);
            }
            if (key === 'assignedTo' && updateValue !== undefined) {
                const assignees = updateValue;
                if (!Array.isArray(assignees) || assignees.some(id => !mongoose_1.default.Types.ObjectId.isValid(id))) {
                    throw new AppError_1.AppError('Invalid User ID format in assignedTo array', 400);
                }
                // Optional Check: Ensure assignees are family members
                // const familyMembers = family?.members?.map(m => m.toString()); // Use family fetched in getTaskById if possible, otherwise fetch again
                // if (assignees.some(assigneeId => !familyMembers?.includes(assigneeId.toString()))) {
                //    throw new AppError('One or more assigned users are not members of the family', 400);
                // }
            }
            // Handle null explicitly for optional fields like dueDate, recurrenceRule
            if ((key === 'dueDate' || key === 'recurrenceRule') && updateValue === null) {
                task[key] = null;
            }
            else if (updateValue !== undefined) { // Ensure we don't assign undefined
                task[key] = updateValue;
            }
            hasValidUpdate = true;
        }
    }
    if (!hasValidUpdate) {
        throw new AppError_1.AppError('No valid fields provided for update', 400);
    }
    // Handle 'Completed' status side-effects
    if (updates.status === 'Completed' && task.status !== 'Completed') {
        task.completedAt = new Date();
        task.completedBy = new mongoose_1.Types.ObjectId(userId); // Assign the user who completed it
    }
    else if (updates.status && updates.status !== 'Completed' && task.completedAt) { // Only clear if changing FROM completed
        task.completedAt = undefined;
        task.completedBy = undefined;
    }
    // 4. Save and Repopulate (optional)
    const updatedTask = yield task.save();
    // Repopulate if necessary, save might clear populated fields
    // Check if populate method exists before calling
    if (typeof updatedTask.populate === 'function') {
        yield updatedTask.populate(['createdBy', 'assignedTo', 'completedBy']); // Populate completedBy as well
    }
    // Emit event AFTER successful save and populate
    emitTaskUpdate(updatedTask.familyId, 'task_updated', updatedTask.toObject());
    return updatedTask;
});
exports.updateTaskDetails = updateTaskDetails;
// Service to delete a task by its ID
const deleteTaskById = (taskId, userId // Renamed for clarity, this is the requesting user
) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Validate IDs and Get Task (getTaskById handles validation, existence, and permission)
    // Note: getTaskById now takes taskId and userId
    yield (0, exports.getTaskById)(taskId, userId); // This ensures the task exists and user has permission
    // 2. Delete Task
    const result = yield Task_1.default.findByIdAndDelete(taskId);
    if (!result) {
        // This case should technically be caught by getTaskById, but defensive check
        console.error(`Deletion failed after permission check for task ${taskId}`);
        throw new AppError_1.AppError('Task not found during deletion attempt (post-permission check)', 404);
    }
    // Emit event AFTER successful deletion
    // Send taskId and familyId for context
    emitTaskUpdate(result.familyId, 'task_deleted', { taskId: taskId.toString(), familyId: result.familyId.toString() });
});
exports.deleteTaskById = deleteTaskById;
// Service to update only the status of a task
const updateTaskStatusById = (taskId, // Allow ObjectId
status, requestingUserId // Allow ObjectId
) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Validate Status first
    if (!Task_1.TASK_STATUSES.includes(status)) {
        throw new AppError_1.AppError(`Invalid status value: ${status}`, 400);
    }
    // 2. Validate IDs & Get Task (getTaskById handles validation, existence, and permission)
    const task = yield (0, exports.getTaskById)(taskId, requestingUserId);
    // --- Update Status ---
    task.status = status;
    // Handle 'Completed' status side-effects
    if (status === 'Completed') {
        task.completedAt = new Date();
        task.completedBy = new mongoose_1.Types.ObjectId(requestingUserId);
    }
    else if (task.completedAt) { // Only clear if changing FROM completed
        task.completedAt = undefined;
        task.completedBy = undefined;
    }
    yield task.save();
    // Repopulate if necessary
    yield task.populate('createdBy', 'firstName lastName email profilePicture');
    yield task.populate('assignedTo', 'firstName lastName email profilePicture');
    yield task.populate('completedBy', 'firstName lastName email profilePicture'); // Populate completedBy
    // Emit event AFTER successful save and populate
    emitTaskUpdate(task.familyId, 'task_updated', task.toObject()); // Treat status update as a general task update
    return task;
});
exports.updateTaskStatusById = updateTaskStatusById;

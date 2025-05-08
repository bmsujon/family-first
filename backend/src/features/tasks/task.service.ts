import mongoose, { Types, FilterQuery, SortOrder } from 'mongoose';
import Task, { ITask, TASK_STATUSES, TASK_PRIORITIES } from '../../models/Task'; // Import constants
import Family, { IFamily } from '../../models/Family'; // Import Family model
import User, { IUser } from '../../models/User'; // Import User model
import { AppError } from '../../utils/AppError'; // Corrected import: Use named import
import { socketIOInstance } from '../../server'; // Import the socket instance

// Define TaskStatus type from the constant array
type TaskStatus = typeof TASK_STATUSES[number];

// Define the structure for data needed to create a task
// Note: assignedTo might be empty initially
interface CreateTaskData {
    familyId: string | Types.ObjectId;
    title: string;
    createdBy: string | Types.ObjectId;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    dueDate?: Date;
    assignedTo?: (string | Types.ObjectId)[]; 
    recurring?: boolean;
    recurrenceRule?: string;
    // Add other fields as needed from ITask (recurring, reminders, etc.)
}

// Interface for the data payload when updating a task
// All fields are optional as the user might only update some
interface UpdateTaskData {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    dueDate?: Date | null;
    assignedTo?: (string | Types.ObjectId)[];
    recurring?: boolean;
    recurrenceRule?: string | null;
    // Add other updatable fields from ITask
}

// Combined options for querying tasks
interface TaskQueryOptions {
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title'; // Fields to sort by
    sortOrder?: 'asc' | 'desc'; // Sort order
    filterByStatus?: string; // Allow filtering by status
    filterByPriority?: string; // Allow filtering by priority
    filterByAssignee?: string; // Allow filtering by assigned user ID
    filterByCategory?: string; // Filter by category
    filterByDueDateStart?: string; // Filter by due date start (ISO string)
    filterByDueDateEnd?: string;   // Filter by due date end (ISO string)
}

// Interface for the result of fetching tasks (includes pagination)
export interface PaginatedTasksResult {
    tasks: ITask[];
    totalTasks: number;
    currentPage: number;
    totalPages: number;
}

// Interface for data needed to create a task
// Ensure it aligns with frontend CreateTaskPayload if possible
interface CreateTaskDataForFamily {
    familyId: string | mongoose.Types.ObjectId;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    dueDate?: Date | string;
    assignedTo?: (string | mongoose.Types.ObjectId)[]; // Array of User IDs
    createdById: string | mongoose.Types.ObjectId; // User performing the action
}

// Function to emit task updates via Socket.IO
const emitTaskUpdate = (familyId: string | Types.ObjectId, event: string, data: any) => {
    if (socketIOInstance) {
        const room = `family_${familyId.toString()}`;
        console.log(`Emitting event [${event}] to room [${room}]`, data?._id || data);
        socketIOInstance.to(room).emit(event, data);
    } else {
        console.warn('Socket.IO instance not available, cannot emit task update.');
    }
};

// Service to create a new task for a specific family
export const createTaskForFamily = async (data: CreateTaskDataForFamily): Promise<ITask> => {
    const { familyId, title, createdById, assignedTo } = data;

    if (!mongoose.Types.ObjectId.isValid(familyId) || !mongoose.Types.ObjectId.isValid(createdById)) {
        throw new AppError('Invalid Family or Creator User ID format', 400);
    }

    const family = await Family.findById(familyId).select('members').lean();
    if (!family) {
        throw new AppError('Family not found', 404);
    }
    // Linter Fix: Use string comparison for lean() results
    const creatorIdString = (createdById as Types.ObjectId).toString();
    if (!family.members || !family.members.some(memberId => memberId.toString() === creatorIdString)) {
        throw new AppError('User does not have permission to create tasks in this family', 403);
    }

    if (assignedTo && assignedTo.some(id => !mongoose.Types.ObjectId.isValid(id))) {
        throw new AppError('Invalid User ID format in assignedTo array', 400);
    }

    const task = new Task({ ...data, createdBy: createdById }); // Simplified creation
    await task.save();
    await task.populate(['createdBy', 'assignedTo']);

    // Emit event AFTER successful save and populate
    emitTaskUpdate(familyId, 'task_created', task.toObject()); // Send plain object

    return task;
};

// Interface for fetching tasks
interface GetTasksOptions {
    familyId: string | mongoose.Types.ObjectId;
    requestingUserId: string | mongoose.Types.ObjectId; // Added for permission check
    status?: string; 
    assignedToUserId?: string | mongoose.Types.ObjectId; 
    sortBy?: string; // Added for sorting
    sortOrder?: 'asc' | 'desc'; // Added for sorting
    // Add pagination params
    page?: number;
    limit?: number;
}

// Service to get tasks for a family (with filtering, sorting, and pagination)
export const getTasksByFamily = async (options: GetTasksOptions): Promise<PaginatedTasksResult> => {
    const { 
        familyId, 
        requestingUserId, 
        status, 
        assignedToUserId, 
        sortBy, 
        sortOrder, 
        // Destructure pagination params with defaults
        page = 1, // Default to page 1
        limit = 10 // Default to 10 items per page
    } = options;

    // --- Input Validation --- 
    if (!mongoose.Types.ObjectId.isValid(familyId)) {
        throw new AppError('Invalid Family ID format', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError('Invalid User ID format for requesting user', 400);
    }
    // Validate page and limit
    const pageNumber = Math.max(1, Number(page)); // Ensure page is at least 1
    const limitNumber = Math.max(1, Number(limit)); // Ensure limit is at least 1
    const skip = (pageNumber - 1) * limitNumber;

    // --- Query Construction --- 
    const query: FilterQuery<ITask> = { familyId };
    if (status && TASK_STATUSES.includes(status as TaskStatus)) { 
        query.status = status;
    }
    if (assignedToUserId && mongoose.Types.ObjectId.isValid(assignedToUserId)) {
        query.assignedTo = assignedToUserId; 
    }

    // --- Sorting Logic --- 
    let sortQuery: { [key: string]: SortOrder } = { createdAt: -1 }; 
    const allowedSortFields = ['createdAt', 'dueDate', 'priority', 'status', 'title'];
    if (sortBy && allowedSortFields.includes(sortBy)) {
        const order: SortOrder = sortOrder === 'asc' ? 1 : -1;
        sortQuery = { [sortBy]: order };
    }

    // --- Database Operations --- 
    // Use Promise.all to run count and find operations concurrently
    const [totalTasks, tasks] = await Promise.all([
        Task.countDocuments(query).exec(), // Get total count matching filters
        Task.find(query)
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
};

/**
 * Retrieves a single task by its ID and verifies user permission.
 * Throws specific errors for not found vs permission denied.
 */
export const getTaskById = async (
    taskId: string | Types.ObjectId,
    requestingUserId: string | Types.ObjectId
): Promise<ITask> => {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new AppError('Invalid Task ID format', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(requestingUserId)) {
        throw new AppError('Invalid User ID format', 400);
    }

    const task = await Task.findById(taskId)
        .populate('createdBy', 'firstName lastName email profilePicture')
        .populate('assignedTo', 'firstName lastName email profilePicture');

    if (!task) {
        throw new AppError('Task not found', 404);
    }

    // Now, check permission using the task's familyId
    const family = await Family.findById(task.familyId).select('members').lean(); // Fetch the family associated with the task
    if (!family) {
        // This indicates an data integrity issue (task exists but family doesn't)
        console.error(`Data integrity issue: Task ${taskId} references non-existent family ${task.familyId}`);
        throw new AppError('Task found, but associated family is missing', 500);
    }

    // Linter Fix: Use string comparison for lean() results
    const requestingUserIdString = (requestingUserId as Types.ObjectId).toString();
    if (!family.members || !family.members.some(memberId => memberId.toString() === requestingUserIdString)) {
        throw new AppError('Permission denied: User is not a member of the task family', 403);
    }

    // If task found and permission granted, return the task
    return task;
};

// Service to update task details
export const updateTaskDetails = async (
    taskId: Types.ObjectId | string,
    updates: Partial<Omit<ITask, 'familyId' | 'createdBy' | 'createdAt' | 'updatedAt'>>,
    userId: Types.ObjectId | string // Renamed for clarity, this is the requesting user
): Promise<ITask> => {
    // 1. Validate IDs and Get Task (getTaskById now handles validation and permission)
    // Note: getTaskById now takes taskId and userId
    const task = await getTaskById(taskId, userId);

    // --- Validate and Apply Updates ---
    const allowedUpdateKeys: (keyof UpdateTaskData)[] = [ // Use UpdateTaskData keys
        'title', 'description', 'category', 'priority', 'status', 'dueDate', 'assignedTo', 'recurring', 'recurrenceRule'
    ];
    let hasValidUpdate = false;

    // Apply updates directly to the task object
    for (const key of allowedUpdateKeys) {
         // Check if the key exists in the updates object before accessing
        if (key in updates) {
            const updateValue = (updates as any)[key]; // Use 'as any' or a type assertion

            // Add specific validation if needed (e.g., for status, priority)
            if (key === 'status' && updateValue !== undefined && !TASK_STATUSES.includes(updateValue as TaskStatus)) {
                throw new AppError(`Invalid status value: ${updateValue}`, 400);
            }
            if (key === 'priority' && updateValue !== undefined && !TASK_PRIORITIES.includes(updateValue as any)) { // Assuming TASK_PRIORITIES exists
                throw new AppError(`Invalid priority value: ${updateValue}`, 400);
            }
            if (key === 'assignedTo' && updateValue !== undefined) {
                const assignees = updateValue as (string | Types.ObjectId)[];
                if (!Array.isArray(assignees) || assignees.some(id => !mongoose.Types.ObjectId.isValid(id))) {
                    throw new AppError('Invalid User ID format in assignedTo array', 400);
                }
                 // Optional Check: Ensure assignees are family members
                 // const familyMembers = family?.members?.map(m => m.toString()); // Use family fetched in getTaskById if possible, otherwise fetch again
                 // if (assignees.some(assigneeId => !familyMembers?.includes(assigneeId.toString()))) {
                 //    throw new AppError('One or more assigned users are not members of the family', 400);
                 // }
            }

            // Handle null explicitly for optional fields like dueDate, recurrenceRule
            if ((key === 'dueDate' || key === 'recurrenceRule') && updateValue === null) {
                 (task as any)[key] = null;
            } else if (updateValue !== undefined) { // Ensure we don't assign undefined
                (task as any)[key] = updateValue;
            }
            hasValidUpdate = true;
        }
    }

    if (!hasValidUpdate) {
        throw new AppError('No valid fields provided for update', 400);
    }

    // Handle 'Completed' status side-effects
    if (updates.status === 'Completed' && task.status !== 'Completed') {
        task.completedAt = new Date();
        task.completedBy = new Types.ObjectId(userId as string); // Assign the user who completed it
    } else if (updates.status && updates.status !== 'Completed' && task.completedAt) { // Only clear if changing FROM completed
        task.completedAt = undefined;
        task.completedBy = undefined;
    }

    // 4. Save and Repopulate (optional)
    const updatedTask = await task.save();
    // Repopulate if necessary, save might clear populated fields
    // Check if populate method exists before calling
    if (typeof updatedTask.populate === 'function') {
         await updatedTask.populate(['createdBy', 'assignedTo', 'completedBy']); // Populate completedBy as well
    }

    // Emit event AFTER successful save and populate
    emitTaskUpdate(updatedTask.familyId, 'task_updated', updatedTask.toObject());

    return updatedTask;
};

// Service to delete a task by its ID
export const deleteTaskById = async (
    taskId: Types.ObjectId | string,
    userId: Types.ObjectId | string // Renamed for clarity, this is the requesting user
): Promise<void> => {
    // 1. Validate IDs and Get Task (getTaskById handles validation, existence, and permission)
    // Note: getTaskById now takes taskId and userId
    await getTaskById(taskId, userId); // This ensures the task exists and user has permission

    // 2. Delete Task
    const result = await Task.findByIdAndDelete(taskId);

    if (!result) {
        // This case should technically be caught by getTaskById, but defensive check
        console.error(`Deletion failed after permission check for task ${taskId}`);
        throw new AppError('Task not found during deletion attempt (post-permission check)', 404);
    }

    // Emit event AFTER successful deletion
    // Send taskId and familyId for context
    emitTaskUpdate(result.familyId, 'task_deleted', { taskId: taskId.toString(), familyId: result.familyId.toString() });
};

// Service to update only the status of a task
export const updateTaskStatusById = async (
    taskId: string | Types.ObjectId, // Allow ObjectId
    status: TaskStatus,
    requestingUserId: string | Types.ObjectId // Allow ObjectId
): Promise<ITask> => {
    // 1. Validate Status first
    if (!TASK_STATUSES.includes(status)) {
        throw new AppError(`Invalid status value: ${status}`, 400);
    }

    // 2. Validate IDs & Get Task (getTaskById handles validation, existence, and permission)
    const task = await getTaskById(taskId, requestingUserId);

    // --- Update Status ---
    task.status = status;

    // Handle 'Completed' status side-effects
    if (status === 'Completed') {
         task.completedAt = new Date();
         task.completedBy = new Types.ObjectId(requestingUserId as string);
    } else if (task.completedAt) { // Only clear if changing FROM completed
         task.completedAt = undefined;
         task.completedBy = undefined;
    }

    await task.save();

    // Repopulate if necessary
    await task.populate('createdBy', 'firstName lastName email profilePicture');
    await task.populate('assignedTo', 'firstName lastName email profilePicture');
    await task.populate('completedBy', 'firstName lastName email profilePicture'); // Populate completedBy

    // Emit event AFTER successful save and populate
    emitTaskUpdate(task.familyId, 'task_updated', task.toObject()); // Treat status update as a general task update

    return task;
};
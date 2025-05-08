// import { Types } from 'mongoose'; // REMOVE: Mongoose should not be imported in frontend

// --- User Related Types --- //

// Interface for User Settings (matching backend)
export interface UserSettings {
    language?: string;
    notifications?: {
        email?: boolean;
        push?: boolean;
        inApp?: boolean;
    };
    theme?: string;
}

// Base User interface
export interface User {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    lastLogin?: Date;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Standard Registration Request Payload
export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

// Response from login/register endpoints
export interface LoginResponse {
    message?: string;
    token: string;
    user: User;
}

// --- Family Related Types --- //

// Interface for Family Member (matching backend structure)
export interface FamilyMember {
    userId: User | string; // Can be populated or just the ID
    role: 'Creator' | 'Admin' | 'Member' | string; // Use specific roles
    joinedAt?: string; // Date as string
}

// Interface for Family (matching backend)
export interface Family {
    _id: string;
    name: string;
    description?: string;
    createdBy?: User | string; // Can be populated or just the ID
    members: FamilyMember[];
    settings?: {
        currency?: string;
        timezone?: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

// --- Task Related Types --- //

// Export these type aliases so they can be imported elsewhere
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked'; // Match backend TASK_STATUSES
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent'; // Match backend TASK_PRIORITIES

// Interface for Task object
export interface Task {
    _id: string;
    familyId: string; // Reference to Family
    title: string;
    description?: string;
    category?: string; // e.g., 'Shopping', 'Appointment', 'Chore'
    status: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: (User | string)[]; // Array of User references or IDs
    createdBy: User | string; // Reference to User
    dueDate?: string; // Date as string
    completedAt?: string; // Date as string
    completedBy?: User | string; // Reference to User
    recurring?: boolean;
    recurrenceRule?: string;
    createdAt: string; // Date as string
    updatedAt: string; // Date as string
}

// Payload for creating a task
export interface CreateTaskPayload {
    title: string;
    description?: string;
    category?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: string; // User ID (string for payload)
    dueDate?: string | Date; // Allow string for form input, convert before sending if needed
}

// Options for fetching tasks (sorting, filtering, pagination)
export interface FetchTasksOptions {
    sortBy?: string; // e.g., 'createdAt', 'dueDate', 'priority'
    sortOrder?: 'asc' | 'desc';
    filterByStatus?: string;
    filterByCategory?: string;
    filterByAssignedTo?: string; // User ID
    filterByPriority?: string;
    filterByDueDateStart?: string;
    filterByDueDateEnd?: string;
    page?: number;
    limit?: number;
}

// Arguments for fetchTasksByFamily thunk
export interface FetchTasksArgs {
    familyId: string;
    options?: FetchTasksOptions;
}

// Structure for the response when fetching tasks (includes pagination)
export interface PaginatedTasksResponse {
    tasks: Task[];
    page: number;
    limit: number;
    totalPages: number;
    totalTasks: number;
    message?: string; // Optional message
}

// Payload for creating a family
export interface CreateFamilyPayload {
    name: string;
}

// Payload for adding a member
export interface AddMemberPayload {
    familyId: string;
    email: string;
    role: string;
}

// Payload for updating family details
export interface UpdateFamilyPayload {
    familyId: string;
    updateData: { // Define the shape of data that can be updated
        name?: string;
        description?: string;
        // Add other updatable fields from your service if needed
    };
}

// --- Event Related Types ---
export interface IEvent {
    _id: string;
    title: string;
    description?: string;
    startTime: string; // Dates received as strings from JSON
    endTime: string;   // Dates received as strings from JSON
    allDay: boolean;
    familyId: string; 
    createdBy: User | string; // Can be populated or ID
    participants?: (User | string)[]; // Can be populated or IDs
    location?: string;
    category?: string; 
    createdAt: string;
    updatedAt: string;
} 
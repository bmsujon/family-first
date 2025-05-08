import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// import { RootState } from '../store'; // Assuming store setup
import { RootState } from '../../store/store'; // Corrected import path
// Import Task type AND TaskStatus/TaskPriority enums/types
import { Task, TaskStatus, TaskPriority, IEvent, Family, FamilyMember, User } from '../../types/models';

// Define the expected paginated response structure from the backend
export interface PaginatedTasksResponse {
    tasks: Task[];
    totalTasks: number;
    currentPage: number;
    totalPages: number;
}

// Define the base API slice
export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ 
        baseUrl: '/api',
        prepareHeaders: (headers, { getState }) => {
            // Add auth token if available
            const token = (getState() as RootState).auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['User', 'Family', 'Task', 'Invitation', 'Event'], // Add relevant tag types
    endpoints: (builder) => ({
        // Endpoint to get the logged-in user's profile
        getUser: builder.query<User, void>({
            query: () => '/v1/auth/profile',
            providesTags: ['User'],
        }),
        
        // New Standard Registration Mutation
        registerUser: builder.mutation<LoginResponse, RegisterRequest>({
            query: (credentials) => ({
                url: '/v1/auth/register',
                method: 'POST',
                body: credentials,
            }),
            // Invalidate User tag if necessary upon registration?
            // For now, successful registration usually leads to login state update via authSlice.
            // invalidatesTags: ['User'], 
        }),
        
        // New Login Mutation
        loginUser: builder.mutation<LoginResponse, Pick<RegisterRequest, 'email' | 'password'>>({
            query: (credentials) => ({
                url: '/v1/auth/login',
                method: 'POST',
                body: credentials,
            }),
            // Optionally invalidate tags if login should refetch other data
            // invalidatesTags: [...] 
        }),
        
        // --- Add new endpoint for Invitation Details --- 
        getInvitationDetails: builder.query<PublicInvitationDetails, string>({ 
            query: (token) => `/v1/families/invitations/${token}/details`,
            providesTags: (result, error, token) => [{ type: 'Invitation', id: token }], 
        }),
        // --- End new endpoint --- 

        // --- Add mutation endpoint for Register & Accept Invite --- (Placeholder for next step)
        registerAndAcceptInvite: builder.mutation<RegisterAcceptResponse, RegisterAcceptRequest>({ 
            query: (credentials) => ({
                url: '/v1/families/invitations/accept-register',
                method: 'POST',
                body: credentials,
            }),
            // TODO: Define RegisterAcceptResponse and RegisterAcceptRequest interfaces
            // Potentially invalidate tags if needed
            invalidatesTags: [{ type: 'Family', id: 'LIST' }], // Invalidate family list on join
        }),
        // --- End mutation endpoint --- 

        // --- Add mutation endpoint for Accept Invite (Logged In) ---
        acceptInvite: builder.mutation<Family, string>({ 
            query: (token) => ({
                url: `/v1/families/invitations/accept/${token}`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, token) => [{ type: 'Family', id: 'LIST' }, { type: 'Invitation', id: token }],
        }),
        // --- End mutation endpoint --- 

        // --- NEW: Send Invitation Mutation ---
        sendInvitation: builder.mutation<Invitation, SendInvitationRequest>({ 
            query: ({ familyId, ...body }) => ({
                url: `/v1/families/${familyId}/invites`, // Matches backend route
                method: 'POST',
                body: body, // Send { email, role }
            }),
            // Optionally invalidate invitation list or family details if needed
            invalidatesTags: (result, error, { familyId }) => [{ type: 'Invitation', id: 'LIST' }, { type: 'Family', id: familyId }],
        }),
        // --- End new mutation endpoint --- 

        // --- Remove Member ---
        removeMember: builder.mutation<RemoveMemberResponse, RemoveMemberRequest>({ 
            query: ({ familyId, memberId }) => ({
                url: `/v1/families/${familyId}/members/${memberId}`,
                method: 'DELETE',
            }),
             // Invalidate the specific family tag to refetch its details (including members)
            invalidatesTags: (result, error, { familyId }) => [{ type: 'Family', id: familyId }],
        }),
        // --- End mutation endpoint --- 

        // --- Add mutation endpoint for Change Member Role ---
        changeMemberRole: builder.mutation<ChangeMemberRoleResponse, ChangeMemberRoleRequest>({ 
            query: ({ familyId, memberId, role }) => ({
                url: `/v1/families/${familyId}/members/${memberId}/role`,
                method: 'PUT',
                body: { role }, // Send the new role in the body
            }),
            // Invalidate the specific family tag to refetch its details (including members)
            invalidatesTags: (result, error, { familyId }) => [{ type: 'Family', id: familyId }],
        }),
        // --- End mutation endpoint --- 

        // --- Task Endpoints --- 

        // Get Tasks for a Family (Now Paginated)
        getTasksByFamily: builder.query<PaginatedTasksResponse, GetTasksRequest>({ 
            query: ({ familyId, ...params }) => { 
                const searchParams = new URLSearchParams();
                // Append defined params to searchParams
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined) {
                        searchParams.append(key, String(value));
                    }
                });
                const queryString = searchParams.toString();
                return `/v1/families/${familyId}/tasks${queryString ? `?${queryString}` : ''}`;
            },
            // providesTags can be more sophisticated with pagination, but LIST tag is often sufficient for invalidation
            providesTags: (result, error, { familyId }) => 
                result?.tasks // Check if result and result.tasks exist
                    ? [
                          ...result.tasks.map(({ _id }) => ({ type: 'Task' as const, id: _id })),
                          { type: 'Task', id: `LIST-${familyId}` }, 
                      ]
                    : [{ type: 'Task', id: `LIST-${familyId}` }],
        }),

        // Get Single Task by ID
        getTaskById: builder.query<Task, GetTaskByIdRequest>({ 
            query: ({ familyId, taskId }) => `/v1/families/${familyId}/tasks/${taskId}`,
            providesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }],
        }),

        // Create Task
        createTask: builder.mutation<Task, CreateTaskRequest>({ 
            query: ({ familyId, ...taskData }) => ({
                url: `/v1/families/${familyId}/tasks`,
                method: 'POST',
                body: taskData,
            }),
            // Invalidate the general list tag for this family to refetch the list
            invalidatesTags: (result, error, { familyId }) => [{ type: 'Task', id: `LIST-${familyId}` }],
        }),

        // Update Task
        updateTask: builder.mutation<Task, UpdateTaskRequest>({ 
            query: ({ familyId, taskId, ...updateData }) => ({
                url: `/v1/families/${familyId}/tasks/${taskId}`,
                method: 'PUT',
                body: updateData,
            }),
            // Invalidate the specific task tag and the list tag
            invalidatesTags: (result, error, { familyId, taskId }) => [
                { type: 'Task', id: taskId },
                { type: 'Task', id: `LIST-${familyId}` },
            ],
        }),

        // Delete Task
        deleteTask: builder.mutation<{ message: string; task: Task }, DeleteTaskRequest>({ 
            query: ({ familyId, taskId }) => ({
                url: `/v1/families/${familyId}/tasks/${taskId}`,
                method: 'DELETE',
            }),
            // Invalidate the specific task tag and the list tag
            invalidatesTags: (result, error, { familyId, taskId }) => [
                { type: 'Task', id: taskId },
                { type: 'Task', id: `LIST-${familyId}` },
            ],
        }),

        // --- Keep getMyFamilies (problematic) --- 
        getMyFamilies: builder.query<{ families: Family[] }, void>({ 
            query: () => '/v1/families/mine', // Corrected path
            providesTags: (result) => 
                result?.families
                    ? [
                          ...result.families.map(({ _id }) => ({ type: 'Family' as const, id: _id })),
                          { type: 'Family', id: 'LIST' },
                      ]
                    : [{ type: 'Family', id: 'LIST' }],
        }),

        // New endpoint to get a single family by ID
        getFamilyById: builder.query<Family, { familyId: string }>({ 
            query: ({ familyId }) => `/v1/families/${familyId}`, // Path relative to baseUrl ('/api')
            providesTags: (result, error, { familyId }) => [{ type: 'Family', id: familyId }],
        }),

        // --- Keep createFamily (problematic) --- 
        createFamily: builder.mutation<Family, { name: string }>({ 
            query: (body) => ({
                url: '/v1/families',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Family', id: 'LIST' }],
        }),

        // --- Event Endpoints --- 
        getEventsByFamily: builder.query<IEvent[], GetEventsRequest>({ // Added Event query
            query: ({ familyId, startDate, endDate }) => {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                const queryString = params.toString();
                return `/v1/families/${familyId}/events${queryString ? `?${queryString}` : ''}`;
            },
            // Provide tags for caching: a general list tag and individual event tags
            providesTags: (result, error, { familyId }) => 
                result
                    ? [
                          ...result.map(({ _id }) => ({ type: 'Event' as const, id: _id })),
                          { type: 'Event', id: `LIST-${familyId}` }, // List tag specific to family
                      ]
                    : [{ type: 'Event', id: `LIST-${familyId}` }],
        }),
        getEventById: builder.query<IEvent, GetEventByIdRequest>({ // Add getEventById query
            query: ({ familyId, eventId }) => `/v1/families/${familyId}/events/${eventId}`,
            providesTags: (result, error, { eventId }) => [{ type: 'Event', id: eventId }],
        }),
        createEvent: builder.mutation<IEvent, CreateEventRequest>({ // Added Event mutation
            query: ({ familyId, ...eventData }) => ({
                url: `/v1/families/${familyId}/events`,
                method: 'POST',
                body: eventData,
            }),
            invalidatesTags: (result, error, { familyId }) => [{ type: 'Event', id: `LIST-${familyId}` }],
        }),
        updateEvent: builder.mutation<IEvent, UpdateEventRequest>({ // Add updateEvent mutation
            query: ({ familyId, eventId, ...updateData }) => ({
                url: `/v1/families/${familyId}/events/${eventId}`,
                method: 'PUT',
                body: updateData,
            }),
            invalidatesTags: (result, error, { familyId, eventId }) => [
                { type: 'Event', id: eventId },
                { type: 'Event', id: `LIST-${familyId}` },
            ],
        }),
        deleteEvent: builder.mutation<DeleteEventResponse, DeleteEventRequest>({ // Added deleteEvent mutation
            query: ({ familyId, eventId }) => ({
                url: `/v1/families/${familyId}/events/${eventId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { familyId, eventId }) => [
                { type: 'Event', id: eventId },
                { type: 'Event', id: `LIST-${familyId}` },
            ],
        }),

    }),
});

// Export hooks for usage in components
export const {
    useGetUserQuery,
    useRegisterUserMutation, // Export the new mutation hook
    useLoginUserMutation, // Export the new login mutation hook
    useGetInvitationDetailsQuery, // Export the new query hook
    useRegisterAndAcceptInviteMutation, // Export the new mutation hook
    useAcceptInviteMutation, // Export the hook for accepting invites when logged in
    useSendInvitationMutation, // Export the new mutation hook
    useRemoveMemberMutation, // Export the new mutation hook
    useChangeMemberRoleMutation, // Export the new mutation hook
    useGetTasksByFamilyQuery,
    useGetTaskByIdQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
    useGetMyFamiliesQuery,
    useGetFamilyByIdQuery, // Export new query hook
    useCreateFamilyMutation,
    useGetEventsByFamilyQuery, // Added Event query hook
    useGetEventByIdQuery, // Export the new query hook
    useCreateEventMutation,   // Added Event mutation hook
    useUpdateEventMutation,   // Export the updateEvent hook
    useDeleteEventMutation,   // Export the deleteEvent hook
} = apiSlice;

// --- Interface Definitions --- 

// Add interfaces for Login/Register if not defined elsewhere
interface LoginRequest { email: string, password: string }
interface LoginResponse { user: User, token: string }
interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}
interface RegisterResponse { user: ReturnedUser, token: string }

// Matches backend service PublicInvitationDetails
interface PublicInvitationDetails {
    email: string;
    role: string;
    familyName: string;
    isExistingUser: boolean;
}

// Matches backend service ReturnedUser
interface ReturnedUser {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
}

// Response for registerAndAcceptInvite
interface RegisterAcceptResponse {
    user: User;
    token: string;
    family: Family;
}

// Request for registerAndAcceptInvite
export interface RegisterAcceptRequest {
    token: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

// Request for removeMember
interface RemoveMemberRequest {
    familyId: string;
    memberId: string;
}

// Response for removeMember 
interface RemoveMemberResponse {
    message: string;
    family: Family;
}

// Request for changeMemberRole
interface ChangeMemberRoleRequest {
    familyId: string;
    memberId: string;
    role: string;
}

// Response for changeMemberRole 
interface ChangeMemberRoleResponse {
    message: string;
    family: Family;
}

// Request for getTasksByFamily (ensure complete)
export interface GetTasksRequest {
    familyId: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedToUserId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number; // Added limit for pagination control
}

// Request for getTaskById
interface GetTaskByIdRequest {
    familyId: string;
    taskId: string;
}

// Request for createTask (ensure matches backend)
export interface CreateTaskRequest {
    familyId: string;
    title: string;
    description?: string;
    category?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string;
    assignedTo?: string[];
}

// Request for updateTask (ensure matches backend)
export interface UpdateTaskRequest {
    familyId: string;
    taskId: string;
    title?: string;
    description?: string;
    category?: string;
    priority?: TaskPriority | ''; 
    status?: TaskStatus;
    dueDate?: string | null;
    assignedTo?: string[] | null;
}

// Request for deleteTask
interface DeleteTaskRequest {
    familyId: string;
    taskId: string;
}

// --- Event Interfaces --- 

// Request for getEventsByFamily
export interface GetEventsRequest {
    familyId: string;
    startDate?: string; // Dates as ISO strings usually
    endDate?: string;
}

// Request for createEvent (match backend CreateEventData, excluding createdById)
export interface CreateEventRequest {
    familyId: string;
    title: string;
    startTime: string; // Send dates as ISO strings
    endTime: string;
    description?: string;
    allDay?: boolean;
    participants?: string[]; // Array of user IDs
    location?: string;
    category?: string;
}

// Add interfaces for Delete Event
export interface DeleteEventRequest {
    familyId: string;
    eventId: string;
}

export interface DeleteEventResponse {
    message: string;
    // Optionally, include the deleted event ID or other info
}

// Request for Update Event (matches backend UpdateEventData + IDs)
export interface UpdateEventRequest {
    familyId: string;
    eventId: string;
    // Fields from UpdateEventData in service
    title?: string;
    startTime?: string; // Send as ISO string
    endTime?: string;   // Send as ISO string
    description?: string;
    allDay?: boolean;
    participants?: string[];
    location?: string;
    category?: string;
}

// Request for Get Event by ID
interface GetEventByIdRequest {
    familyId: string;
    eventId: string;
}

// --- Family Types (if defined locally) --- 

// Request type for getFamilyById
interface GetFamilyByIdRequest { // Define if not already defined
    familyId: string;
}

// Request interface for the new sendInvitation mutation
interface SendInvitationRequest {
    familyId: string;
    email: string;
    role: string;
}

// Response type for sendInvitation (assuming backend returns the created Invitation object)
interface Invitation {
    _id: string;
    familyId: string;
    email: string;
    role: string;
    token: string; // The generated token
    status: 'Pending' | 'Accepted' | 'Expired';
    sentBy: string; // User ID
    expiresAt: string; // ISO Date string
    createdAt: string; // ISO Date string
    updatedAt: string; // ISO Date string
} 
import apiClient from './apiClient';
// Import specific types - removed GetFamiliesResponse alias
import { Family, CreateFamilyPayload, AddMemberPayload, UpdateFamilyPayload } from '../types/models';

// Base URL for the API
const API_BASE_URL = '/api/v1'; // Assuming proxy or Nginx handles routing to backend

// Add a request interceptor to include the token
apiClient.interceptors.request.use(
    (config) => {
        let token: string | null = null;
        try {
            const storedToken = localStorage.getItem('userToken');
            token = storedToken ? JSON.parse(storedToken) : null;
        } catch (e) {
            console.error("Failed to parse userToken from localStorage for API request", e);
            localStorage.removeItem('userToken'); // Clear invalid token
        }

        if (token && config.headers) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Family Service Functions ---

interface FamilyData {
    name: string;
    description?: string; // Added description to match model
}

// TODO: Define a more specific Family type based on backend model
// type Family = any; // Removed, using imported type

// Interface for creating a family (matches backend expectations)
interface CreateFamilyResponse {
    message: string;
    family: Family;
}

// Define the correct response type for getMyFamilies inline
interface ApiGetFamiliesResponse {
    families: Family[];
}

// Interface for adding a member response
interface AddMemberResponse {
    message: string;
    family: Family; // Assuming backend returns the updated family
}

// Interface for updating family details response
interface UpdateFamilyResponse {
    message: string;
    family: Family; // Assuming backend returns the updated family
}

// Interface for deleting a family response
interface DeleteFamilyResponse {
    message: string;
    familyId?: string; // Backend might just send a success message
}

// Interface for sending an invitation
interface SendInvitePayload {
    email: string;
    role: string;
}

// Interface for Invite Details Response (adjust based on backend)
interface InviteDetailsResponse {
    // Example fields - define based on what backend returns
    email: string;
    role: string;
    familyName: string; // Name of the family being invited to
    invitedBy: string; // Name or email of the inviter
    // Add other fields as needed
}

// Interface for removing a member response
interface RemoveMemberResponse {
    message: string;
    family: Family;
}

// Interface for changing a member's role response
interface ChangeMemberRoleResponse {
    message: string;
    family: Family;
}

// Create family function
const createFamily = async (familyData: CreateFamilyPayload): Promise<CreateFamilyResponse> => {
    try {
        const response = await apiClient.post<CreateFamilyResponse>('/families', familyData);
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to create family';
        throw new Error(message);
    }
};

// Get details for a specific family by ID
const getFamilyById = async (familyId: string): Promise<{ family: Family }> => {
    try {
        const response = await apiClient.get<{ family: Family }>(`/families/${familyId}`);
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to fetch family details';
        throw new Error(message);
    }
};

// Add a member to a family
const addMember = async (familyId: string, payload: { email: string; role: string }): Promise<AddMemberResponse> => {
    try {
        const response = await apiClient.post<AddMemberResponse>(`/families/${familyId}/members`, payload);
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to add member';
        throw new Error(message);
    }
};

// Update family details
const updateFamily = async (familyId: string, payload: { name?: string; description?: string }): Promise<UpdateFamilyResponse> => {
    if (Object.keys(payload).length === 0) {
        throw new Error("No update data provided");
    }
    try {
        const response = await apiClient.put<UpdateFamilyResponse>(`/families/${familyId}`, payload);
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to update family';
        throw new Error(message);
    }
};

// Delete a family
const deleteFamily = async (familyId: string): Promise<DeleteFamilyResponse> => {
    try {
        const response = await apiClient.delete<DeleteFamilyResponse>(`/families/${familyId}`);
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to delete family';
        throw new Error(message);
    }
};

// Function to send an invitation
const sendInvite = async (
    familyId: string,
    inviteData: SendInvitePayload
): Promise<{ message: string; invitationId: string }> => {
    if (!familyId) {
        throw new Error('Family ID is required to send an invitation');
    }
    try {
        const response = await apiClient.post<{ message: string; invitationId: string }>(
            `/families/${familyId}/invites`,
            inviteData
        );
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to send invitation';
        throw new Error(message);
    }
};

// Function for a logged-in user to accept an invitation
const acceptInvite = async (token: string): Promise<{ message: string; family: Family }> => {
    if (!token) {
        throw new Error('Invitation token is required to accept');
    }
    try {
        // The backend endpoint expects the token in the URL
        // The logged-in user's auth token is sent automatically by apiClient
        const response = await apiClient.post<{ message: string; family: Family }>(
            `/invites/${token}/accept`
            // No request body needed
        );
        return response.data; // Should contain success message and updated family
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to accept invitation';
        throw new Error(message);
    }
};

// Function to get invitation details by token
const getInviteDetails = async (token: string): Promise<InviteDetailsResponse> => {
    if (!token) {
        throw new Error('Invitation token is required to get details');
    }
    try {
        // Assuming a backend endpoint exists: GET /api/v1/invites/:token/details
        const response = await apiClient.get<InviteDetailsResponse>(`/invites/${token}/details`);
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to fetch invitation details';
        throw new Error(message);
    }
};

// Function to remove a member from a family
const removeMember = async (familyId: string, memberId: string): Promise<RemoveMemberResponse> => {
    // Use the RemoveMemberResponse type defined in apiSlice (or redefine here if needed)
    const response = await apiClient.delete<RemoveMemberResponse>(`/families/${familyId}/members/${memberId}`);
    return response.data; // Should contain { message, family }
};

// Function to change a member's role
const changeMemberRole = async (familyId: string, memberId: string, newRole: string): Promise<ChangeMemberRoleResponse> => {
    const response = await apiClient.put<ChangeMemberRoleResponse>(
        `/families/${familyId}/members/${memberId}/role`,
        { role: newRole } // Send the new role in the request body
    );
    return response.data; // Should contain { message, family }
};

// TODO: Add functions for addMember etc.

const familyService = {
    createFamily,
    getFamilyById,
    addMember,
    updateFamily,
    deleteFamily,
    sendInvite,
    acceptInvite,
    getInviteDetails,
    removeMember,
    changeMemberRole
};

export default familyService; 
import apiClient from './apiClient';
// Import needed types from the central models or apiSlice definitions
import { User, LoginResponse, RegisterRequest } from '../types/models'; 
// Assuming RegisterAcceptRequest is suitable for invite payload
import { RegisterAcceptRequest } from '../features/api/apiSlice'; 

// Base URL for the backend API - adjust if your backend runs elsewhere
// When running with docker-compose, the frontend might need to call the backend
// via its service name or through a proxy, depending on setup.
// For local dev outside Docker, it might be localhost:5000.
// Let's use a relative path for now, assuming a proxy is set up in package.json (like CRA default)
// OR configure Nginx in the frontend container later to proxy /api requests.
// Adjust path relative to baseURL in apiClient.ts (which is /api/v1)
const API_URL = '/auth/'; // Path relative to /api/v1

// Update function signature to use imported RegisterRequest
const registerUser = async (userData: RegisterRequest): Promise<LoginResponse> => {
    console.warn('Standard registerUser service called, ensure backend endpoint exists if needed.');
    // Replace AuthResponse with LoginResponse
    // const response = await apiClient.post<LoginResponse>('/auth/register', userData);
    throw new Error('Standard registration endpoint not implemented in this flow.'); 
};

// Update function signature to use imported RegisterAcceptRequest and LoginResponse
// NOTE: Backend endpoint /auth/register-invite might expect different payload/response
// than the /families/invitations/accept-register endpoint used by registerAndAcceptInvite mutation.
// Adjust RegisterAcceptRequest or backend if needed.
const registerViaInvite = async (payload: RegisterAcceptRequest): Promise<LoginResponse> => {
    try {
        // Ensure this endpoint exists and returns LoginResponse structure
        const response = await apiClient.post<LoginResponse>(`${API_URL}register-invite`, payload);
        if (response.data.token) {
            // Store the token as a JSON string
            localStorage.setItem('userToken', JSON.stringify(response.data.token)); 
        }
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Registration via invitation failed';
        throw new Error(message);
    }
};

const logoutUser = () => {
    localStorage.removeItem('userToken');
};

const authService = {
    registerUser, 
    logoutUser,
    registerViaInvite, 
};

export default authService;

// REMOVE the problematic export type line
// export type { RegisterUserData, RegisterInvitedUserPayload, AuthResponse, RegisterDataBase }; 
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService from '../../services/authService';
import { User as FullUserType, LoginResponse, RegisterRequest } from '../../types/models';
import { RegisterAcceptRequest, apiSlice } from '../api/apiSlice';
import { AlertColor } from '@mui/material/Alert';
import { RootState } from '../../store/store';

// Define the user type stored in the auth state (matches ReturnedUser from apiSlice/backend)
interface AuthStateUser {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isVerified: boolean;
    // Add other fields if needed by the app based on login/register response
}

interface AuthState {
    user: AuthStateUser | null;
    token: string | null;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    message: string | null;
    snackbarMessage: string | null;
    snackbarSeverity: AlertColor | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

// Get token from localStorage (initial state)
// Note: Parsing might fail if token is not valid JSON, add try-catch
let userToken: string | null = null;
try {
    const storedToken = localStorage.getItem('userToken');
    userToken = storedToken ? JSON.parse(storedToken) : null;
} catch (e) {
    console.error("Failed to parse userToken from localStorage", e);
    localStorage.removeItem('userToken'); // Clear invalid token
}

const initialState: AuthState = {
    user: null, // We'll fetch user details separately or get from register/login response
    token: userToken,
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: null,
    snackbarMessage: null,
    snackbarSeverity: null,
    status: 'idle',
};

// Async thunk for standard registration - NOW uses RTK Query Mutation
export const register = createAsyncThunk<
    LoginResponse, 
    RegisterRequest,
    { rejectValue: string }
>('auth/register', async (userData: RegisterRequest, thunkAPI) => {
    try {
        // Dispatch the registerUser mutation and unwrap the result
        const result = await thunkAPI.dispatch(
            apiSlice.endpoints.registerUser.initiate(userData)
        ).unwrap(); // .unwrap() will return data on success or throw on error
        
        // If unwrap succeeded, result is LoginResponse
        return result; 
    } catch (error: any) {
        // Catch errors thrown by unwrap (including API errors)
        console.error('Error during registration thunk:', error);
        // Extract message from RTK Query error structure if possible
        const message = error?.data?.message || error.message || 'Registration failed';
        return thunkAPI.rejectWithValue(message);
    }
});

// New async thunk for registering via invite
// This might ALSO be refactored to use its RTK Query mutation directly
// For now, keep it calling the service, assuming it works
export const registerWithInvite = createAsyncThunk<
    LoginResponse, 
    RegisterAcceptRequest, 
    { rejectValue: string }
>('auth/registerInvite', async (payload, thunkAPI) => {
    try {
        // OPTIONALLY: Refactor this like register thunk using 
        // apiSlice.endpoints.registerAndAcceptInvite.initiate(payload)
        return await authService.registerViaInvite(payload); // Keep service call for now
    } catch (error: any) {
        const message =
            (error.response &&
                error.response.data &&
                error.response.data.message) ||
            error.message ||
            error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Async thunk for login - NOW uses RTK Query Mutation
export const login = createAsyncThunk<
    LoginResponse, 
    Pick<RegisterRequest, 'email' | 'password'>, 
    { rejectValue: string }
>('auth/login', async (userData, thunkAPI) => {
    console.log('[login Thunk] Thunk started for user:', userData.email); // Log at start
    try {
        console.log('[login Thunk] Attempting to dispatch initiate/unwrap...'); // Log before dispatch
        // Dispatch the loginUser mutation and unwrap the result
        const result = await thunkAPI.dispatch(
            apiSlice.endpoints.loginUser.initiate(userData)
        ).unwrap(); // .unwrap() returns data or throws error

        // Store token in localStorage upon successful login via RTK mutation
        if (result.token) {
            localStorage.setItem('userToken', JSON.stringify(result.token));
            console.log('[login Thunk] Token stored in localStorage.');
        }
        
        return result; // Return LoginResponse
    } catch (error: any) {
        console.error('[login Thunk] Error:', error);
        const message = error?.data?.message || error.message || 'Login failed';
        return thunkAPI.rejectWithValue(message);
    }
});

// Async thunk for logout (simple example, might not need async)
export const logout = createAsyncThunk('auth/logout', async () => {
    authService.logoutUser();
});

// Async thunk to load user data if token exists on app load
export const loadUser = createAsyncThunk<
    User, // Return the User object on success
    void, // No argument needed
    { state: RootState; rejectValue: string }
>('auth/loadUser', async (_, thunkAPI) => {
    const token = thunkAPI.getState().auth.token;
    console.log('[loadUser Thunk] Checking for token...', token ? 'Token found' : 'No token');
    if (!token) {
        // No token, no need to load user, reject silently or return null/specific value
        // Rejecting helps distinguish between "no attempt needed" and "API failed"
        return thunkAPI.rejectWithValue('No token found');
    }

    try {
        console.log('[loadUser Thunk] Token found, dispatching getUser query...');
        // Use the existing getUser query from apiSlice
        const result = await thunkAPI.dispatch(
            apiSlice.endpoints.getUser.initiate()
        ).unwrap();
        console.log('[loadUser Thunk] getUser query successful:', result);
        return result; // Return the fetched User object
    } catch (error: any) {
        console.error('[loadUser Thunk] Failed to fetch user profile:', error);
        const message = error?.data?.message || error.message || 'Failed to load user profile';
        // If profile fetch fails, the token is likely invalid/expired
        localStorage.removeItem('userToken'); // Clear bad token
        return thunkAPI.rejectWithValue(message);
    }
});


const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        reset: (state) => {
            state.user = null;
            state.token = null;
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = false;
            state.message = null;
            state.snackbarMessage = null;
            state.snackbarSeverity = null;
            state.status = 'idle';
        },
        clearSnackbar: (state) => {
            state.snackbarMessage = null;
            state.snackbarSeverity = null;
        },
        setCredentials: (
            state,
            action: PayloadAction<{ user: AuthStateUser; token: string }>
        ) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isSuccess = true;
            state.isError = false;
            state.isLoading = false;
            state.message = null;
            state.snackbarMessage = `Welcome ${action.payload.user.firstName || 'User'}!`;
            state.snackbarSeverity = 'success';
        },
        setAuthSnackbar: (
            state,
            action: PayloadAction<{ message: string; severity: AlertColor }>
        ) => {
            state.snackbarMessage = action.payload.message;
            state.snackbarSeverity = action.payload.severity;
        },
    },
    extraReducers: (builder) => {
        builder
            // Standard Register cases
            .addCase(register.pending, (state) => {
                 state.status = 'loading'; // Use the shared status
                 state.isLoading = true;
                 state.isError = false;
                 state.isSuccess = false;
                 state.message = null; // Clear previous message
            })
            .addCase(register.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
                state.status = 'succeeded';
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.message = action.payload.message ?? null;
                // state.snackbarMessage = `Registration successful! Welcome ${action.payload.user.firstName || 'User'}.`;
                // state.snackbarSeverity = 'success';
            })
            .addCase(register.rejected, (state, action) => {
                state.status = 'failed';
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string;
                state.user = null;
                state.token = null;
                // state.snackbarMessage = action.payload as string;
                // state.snackbarSeverity = 'error';
            })
            // Register via Invite cases (Keep existing)
            .addCase(registerWithInvite.pending, (state) => {
                 state.status = 'loading';
                 state.isLoading = true;
                 state.isError = false;
                 state.isSuccess = false;
                 state.message = null; // Clear previous message
            })
            .addCase(registerWithInvite.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
                state.status = 'succeeded';
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.message = action.payload.message ?? null;
                 // state.snackbarMessage = `Invitation accepted! Welcome ${action.payload.user.firstName || 'User'}.`;
                 // state.snackbarSeverity = 'success';
            })
            .addCase(registerWithInvite.rejected, (state, action) => {
                state.status = 'failed';
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string;
                state.user = null;
                state.token = null;
                 // state.snackbarMessage = action.payload as string;
                 // state.snackbarSeverity = 'error';
            })
            // Login cases
            .addCase(login.pending, (state) => {
                state.status = 'loading';
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = null; // Clear previous message
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
                state.status = 'succeeded';
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.message = action.payload.message ?? null;
                 // state.snackbarMessage = `Welcome back ${action.payload.user.firstName || 'User'}!`;
                 // state.snackbarSeverity = 'success';
            })
            .addCase(login.rejected, (state, action) => {
                state.status = 'failed';
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string;
                state.user = null;
                state.token = null;
                 // state.snackbarMessage = action.payload as string;
                 // state.snackbarSeverity = 'error';
            })
            // Logout cases
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isSuccess = false;
                state.isError = false;
                state.message = null;
                state.status = 'idle'; // Reset status on logout
                // Optionally set snackbar on logout
                // state.snackbarMessage = 'You have been logged out.';
                // state.snackbarSeverity = 'info';
            })
            // Load User cases
            .addCase(loadUser.pending, (state) => {
                state.status = 'loading';
                state.isLoading = true; // Keep isLoading consistent if used elsewhere
            })
            .addCase(loadUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.status = 'succeeded';
                state.isLoading = false;
                state.user = action.payload; // Set the user from payload
                state.isError = false;
                state.message = 'User loaded successfully';
            })
            .addCase(loadUser.rejected, (state, action) => {
                state.status = 'failed';
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string; // Error message from rejectWithValue
                state.user = null; // Clear user
                state.token = null; // Clear token as it was invalid
            });
    },
});

export const { reset, clearSnackbar, setCredentials, setAuthSnackbar } = authSlice.actions;

// Correctly check for user and token to determine authentication status
export const selectIsAuthenticated = (state: RootState): boolean => !!state.auth.user && !!state.auth.token;
export const selectCurrentUser = (state: RootState): AuthStateUser | null => state.auth.user;
export const selectAuthStatus = (state: RootState): 'idle' | 'loading' | 'succeeded' | 'failed' => state.auth.status;

export default authSlice.reducer; 

// Ensure User type is available - might need import if not global
import { User } from '../../types/models';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
// Remove service import if thunks are removed
// import taskService, { UpdateTaskPayload, FetchTasksOptions } from '../../services/taskService';
import { Task, TaskStatus, PaginatedTasksResponse } from '../../types/models';
import { AlertColor } from '@mui/material/Alert'; // Import severity type
import { RootState } from '../../store/store';

interface TaskState {
    // Snackbar state (Keep for now)
    snackbarMessage: string | null;
    snackbarSeverity: AlertColor | null; // 'success' | 'error' | 'info' | 'warning'
}

const initialState: TaskState = {
    snackbarMessage: null, // Initialize snackbar state
    snackbarSeverity: null,
};

// REMOVE Async thunks (createTask, fetchTasksByFamily, fetchTaskById, updateTask, deleteTask, updateTaskStatusAsync)
/*
export const createTask = ...
export const fetchTasksByFamily = ...
export const fetchTaskById = ...
export const updateTask = ...
export const deleteTask = ...
export const updateTaskStatusAsync = ...
*/

export const taskSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        // Renamed for clarity, only handles Snackbar now
        resetTaskSnackbar: (state) => {
            state.snackbarMessage = null;
            state.snackbarSeverity = null;
        },
        // Reducer to clear snackbar state after it's displayed
        clearSnackbar: (state) => {
            state.snackbarMessage = null;
            state.snackbarSeverity = null;
        },
        // Add a reducer to manually set snackbar (can be called from components after mutations)
        setTaskSnackbar: (state, action: PayloadAction<{ message: string; severity: AlertColor }>) => {
            state.snackbarMessage = action.payload.message;
            state.snackbarSeverity = action.payload.severity;
        },
    },
    // Remove extraReducers as thunks are removed
});

export const { resetTaskSnackbar, clearSnackbar, setTaskSnackbar } = taskSlice.actions;

// Selectors - Remove selectors related to removed state fields
// Keep only snackbar selector for NotificationSnackbar component
export const selectSnackbar = (state: RootState) => ({
    message: state.tasks.snackbarMessage,
    severity: state.tasks.snackbarSeverity,
});

export default taskSlice.reducer; 
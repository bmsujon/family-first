import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlertColor } from '@mui/material/Alert';

interface NotificationState {
    open: boolean;
    message: string;
    severity: AlertColor; // 'success' | 'info' | 'warning' | 'error'
}

interface NotificationPayload {
    message: string;
    severity: AlertColor;
}

const initialState: NotificationState = {
    open: false,
    message: '',
    severity: 'info', // Default severity
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        setNotification(state, action: PayloadAction<NotificationPayload>) {
            state.open = true;
            state.message = action.payload.message;
            state.severity = action.payload.severity;
        },
        clearNotification(state) {
            state.open = false;
            // Optionally reset message/severity after closing animation
            // state.message = '';
            // state.severity = 'info';
        },
    },
});

export const { setNotification, clearNotification } = notificationSlice.actions;
export default notificationSlice.reducer; 
import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store'; 
import { useAppDispatch } from '../store/hooks'; // Use typed dispatch hook
// Import actions and state selector from the generic notification slice
import { clearNotification } from '../store/notificationSlice';

const NotificationSnackbar: React.FC = () => {
    const dispatch = useAppDispatch();
    // Select state from the notification slice
    const { open, message, severity } = useSelector((state: RootState) => state.notification);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        // Dispatch action to clear the generic notification state
        dispatch(clearNotification()); 
    };

    return (
        <Snackbar
            open={open} // Use open state directly from the slice
            autoHideDuration={6000} 
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} 
        >
            {/* Pass Alert as the direct child. Snackbar controls visibility via 'open' prop. */}
            <Alert 
                onClose={handleClose} 
                severity={severity} // Severity comes directly from the slice
                variant="filled" 
                sx={{ width: '100%' }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

export default NotificationSnackbar; 
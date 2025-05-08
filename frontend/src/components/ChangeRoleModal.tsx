import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    CircularProgress,
    Alert,
    Box,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { changeMemberRole } from '../features/family/familySlice'; // Import the thunk
// Assuming AppDispatch is correctly typed in your store setup
import { AppDispatch } from '../store/store'; 

// Define the assignable roles (must match backend enum, excluding 'Primary User')
const ASSIGNABLE_ROLES = ['Admin', 'Member'];

interface ChangeRoleModalProps {
    open: boolean;
    onClose: () => void;
    memberId: string | null;
    memberName: string | null;
    currentRole: string | null;
    familyId: string | null;
}

const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({ 
    open, 
    onClose, 
    memberId, 
    memberName, 
    currentRole,
    familyId
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const [newRole, setNewRole] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when the selected member changes or modal opens/closes
    useEffect(() => {
        if (open && currentRole) {
            setNewRole(ASSIGNABLE_ROLES.includes(currentRole) ? currentRole : ''); // Pre-select current role if assignable
            setError(null);
            setIsLoading(false);
        } else {
            // Reset when closed
            setNewRole('');
            setError(null);
            setIsLoading(false);
        }
    }, [open, currentRole]);

    const handleRoleChange = (event: SelectChangeEvent<string>) => {
        setNewRole(event.target.value as string);
        setError(null); // Clear error when changing selection
    };

    const handleSubmit = async () => {
        if (!newRole || !familyId || !memberId) {
            setError('Invalid data provided for role change.');
            return;
        }

        if (newRole === currentRole) {
            setError('Please select a different role.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await dispatch(changeMemberRole({ 
                familyId, 
                memberId, 
                newRole 
            })).unwrap(); // Use unwrap to catch potential rejections
            
            onClose(); // Close modal on success
            // Success snackbar is handled by familySlice extraReducer

        } catch (rejectedValueOrSerializedError) {
            console.error('Failed to change role:', rejectedValueOrSerializedError);
            // Extract message - might be string directly or in an object
            let message = 'Failed to update role.';
            if (typeof rejectedValueOrSerializedError === 'string') {
                message = rejectedValueOrSerializedError;
            } else if (typeof (rejectedValueOrSerializedError as any)?.message === 'string') {
                 message = (rejectedValueOrSerializedError as any).message;
            }
            setError(message);
            // Error snackbar is handled by familySlice extraReducer
        } finally {
            setIsLoading(false);
        }
    };

    // Prevent rendering if essential data is missing when open
    if (open && (!memberId || !memberName || !currentRole || !familyId)) {
        console.error('ChangeRoleModal opened with missing props');
        return (
             <Dialog open={open} onClose={onClose}>
                <DialogTitle>Error</DialogTitle>
                <DialogContent>
                    <Alert severity="error">Cannot change role: Member details are incomplete.</Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Change Role for {memberName}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth error={!!error}>
                        <InputLabel id="change-role-select-label">New Role</InputLabel>
                        <Select
                            labelId="change-role-select-label"
                            id="change-role-select"
                            value={newRole}
                            label="New Role"
                            onChange={handleRoleChange}
                            disabled={isLoading}
                        >
                            <MenuItem value="" disabled><em>Select a role</em></MenuItem>
                            {ASSIGNABLE_ROLES.map((role) => (
                                <MenuItem key={role} value={role}>{role}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                 </Box>
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px'}}>
                <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    disabled={isLoading || !newRole || newRole === currentRole}
                    startIcon={isLoading ? <CircularProgress size="1rem" /> : null}
                >
                    {isLoading ? 'Saving...' : 'Save Role'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChangeRoleModal; 
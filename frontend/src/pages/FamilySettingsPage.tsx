import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import {
    Container, Typography, Box, Divider, Paper, Button,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Alert, CircularProgress
} from '@mui/material';
import UpdateFamilyForm from '../features/family/UpdateFamilyForm';
import { deleteFamily, resetFamilyState, selectCurrentFamily, selectFamilyStatus, selectFamilyError } from '../features/family/familySlice';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../features/auth/authSlice';
import FamilyMembersList from '../components/FamilyMembersList';

const FamilySettingsPage: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const currentFamily = useSelector(selectCurrentFamily);
    const currentUser = useSelector(selectCurrentUser);
    const familyStatus = useSelector(selectFamilyStatus);
    const familyError = useSelector(selectFamilyError);
    
    // State for confirmation dialog
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    // State to track deletion outcome for navigation
    const [deletionAttempted, setDeletionAttempted] = useState(false);

    // Determine if the current user is the family creator
    const isCreator = useMemo(() => {
        if (!currentUser || !currentFamily || !currentFamily.createdBy) {
            return false;
        }
        // Check if createdBy is a populated User object or just an ID string
        if (typeof currentFamily.createdBy === 'object' && currentFamily.createdBy !== null) {
            return currentFamily.createdBy._id === currentUser._id;
        } else if (typeof currentFamily.createdBy === 'string') {
            return currentFamily.createdBy === currentUser._id;
        }
        return false;
    }, [currentUser, currentFamily]);

    // Effect to navigate away if currentFamily becomes null after deletion attempt
    useEffect(() => {
        if (deletionAttempted && !currentFamily) {
            // If deletion succeeded and currentFamily is now null, navigate to dashboard/create
            // Optional: Show a success message via Snackbar before navigating
            navigate('/'); // Navigate to home/dashboard
        }
        // Reset attempt flag if component re-renders for other reasons
        setDeletionAttempted(false); 
    }, [currentFamily, deletionAttempted, navigate]);

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
    };

    const handleConfirmDelete = () => {
        if (!currentFamily?._id || !isCreator) return;
        setDeletionAttempted(true); // Mark that we are attempting deletion
        dispatch(deleteFamily(currentFamily._id))
            .unwrap()
            .then(() => {
                // Navigation is handled by the useEffect hook
                handleCloseDeleteDialog();
            })
            .catch((err) => {
                // Error message is stored in the slice state
                console.error("Failed to delete family:", err);
                // Keep dialog open to show error? Or close and show Alert?
                 handleCloseDeleteDialog(); // Close dialog even on error for now
            });
    };

    // Loading/Error/No Family checks (remain the same)
    if (familyStatus === 'loading' && !currentFamily) {
        return <Container><Typography>Loading family details...</Typography></Container>;
    }
    if (familyError && !currentFamily && !deletionAttempted) { // Don't show initial load error if deletion failed
        return <Container><Typography color="error">Error loading family: {familyError}</Typography></Container>;
    }
    if (!currentFamily && !deletionAttempted) {
        return <Container><Typography>Please select or create a family first.</Typography></Container>;
    }
    // Handle case where family is gone after attempted delete but before navigation effect runs
     if (!currentFamily && deletionAttempted) {
        return <Container><Typography>Family deleted. Redirecting...</Typography></Container>;
    }
    // Render normally if currentFamily exists
    if (currentFamily) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h4" gutterBottom>
                        Family Settings: {currentFamily.name}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    
                    {/* --- Update Family Form --- */}
                    <UpdateFamilyForm />
    
                    <Divider sx={{ my: 4 }} />
    
                    {/* --- Manage Members --- */}
                    <Typography variant="h6" gutterBottom>
                        Manage Members
                    </Typography>
                    <FamilyMembersList 
                        members={currentFamily.members || []} 
                        currentUserId={currentUser?._id}
                        familyId={currentFamily._id}
                    />
    
                    <Divider sx={{ my: 4 }} />
    
                    {/* --- Danger Zone --- */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
                         <Typography variant="h6" color="error" gutterBottom>
                             Danger Zone
                         </Typography>
                         <Typography variant="body2">
                             Deleting the family is permanent and cannot be undone.
                             Ensure all members are aware and tasks are handled.
                         </Typography>
                         {/* Display specific error related to deletion attempt */}
                         {familyError && familyError.toLowerCase().includes('delete') && (
                              <Alert severity="error" sx={{ mt: 2 }}>{familyError}</Alert>
                         )}
                         <Button 
                             variant="contained" 
                             color="error" 
                             sx={{ mt: 2 }} 
                             disabled={!isCreator || familyStatus === 'loading'} // Disable if not creator or loading
                             onClick={handleDeleteClick} // Open confirmation dialog
                         >
                              {familyStatus === 'loading' ? <CircularProgress size={24} color="inherit"/> : 'Delete Family'}
                         </Button>
                    </Box>
                </Paper>
    
                {/* Confirmation Dialog */}
                <Dialog
                    open={openDeleteDialog}
                    onClose={handleCloseDeleteDialog}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Confirm Family Deletion"}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            Are you sure you want to delete the family "{currentFamily.name}"? 
                            This action cannot be undone. Ensure all associated tasks are resolved.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog} disabled={familyStatus === 'loading'}>Cancel</Button>
                        <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={familyStatus === 'loading'}>
                            {familyStatus === 'loading' ? <CircularProgress size={24} color="inherit" /> : 'Confirm Delete'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        );
    }

    // Fallback if currentFamily became null unexpectedly
    return <Container><Typography>An unexpected error occurred.</Typography></Container>;

};

export default FamilySettingsPage; 
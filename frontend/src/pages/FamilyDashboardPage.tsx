import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    Container, 
    Typography, 
    Box, 
    CircularProgress, 
    Alert, 
    Button, 
    List, 
    ListItem, 
    ListItemText, 
    ListItemSecondaryAction,
    IconButton,
    Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; // For Add Member button
import EditIcon from '@mui/icons-material/Edit'; // For Edit Role
import DeleteIcon from '@mui/icons-material/Delete'; // For Remove Member
// Remove imports related to old family slice state
// import { selectCurrentFamily } from '../features/family/familySlice'; 
// import { useAppSelector } from '../store/hooks';
// Import the RTK Query hook for fetching family details
import { useGetFamilyByIdQuery, useRemoveMemberMutation } from '../features/api/apiSlice';
import TaskList from '../features/tasks/components/TaskList';
import CreateTaskModal from '../features/tasks/components/CreateTaskModal';
import FamilyCalendar from '../features/events/components/FamilyCalendar'; // Import calendar
import { useAppSelector, useAppDispatch } from '../store/hooks'; // UseAppSelector for current user
import { selectCurrentUser } from '../features/auth/authSlice'; // Selector for current user
import AddMemberModal from '../features/family/components/AddMemberModal'; // Import the new modal
import { setNotification } from '../store/notificationSlice'; // Import notification action
import ChangeRoleModal from '../features/family/components/ChangeRoleModal'; // Import the new modal
import { FamilyMember } from '../types/models'; // Import FamilyMember

const FamilyDashboardPage: React.FC = () => {
    const { familyId } = useParams<{ familyId: string }>();
    const dispatch = useAppDispatch(); // Initialize dispatch
    const [isCreateTaskModalOpen, setCreateTaskModalOpen] = useState(false);
    const [isAddMemberModalOpen, setAddMemberModalOpen] = useState(false); // State for Add Member modal
    const [isChangeRoleModalOpen, setChangeRoleModalOpen] = useState(false); // State for Change Role modal
    const [memberToEditRole, setMemberToEditRole] = useState<FamilyMember | null>(null); // State for member being edited

    // Fetch family details using RTK Query
    const { 
        data: currentFamily, // Rename data to currentFamily for clarity
        isLoading,
        isError,
        error 
    } = useGetFamilyByIdQuery({ familyId: familyId! }, { skip: !familyId }); // Pass argument as object { familyId: ... }
    const [removeMember, { isLoading: isRemovingMember }] = useRemoveMemberMutation(); // Use the hook

    // Get the currently logged-in user for comparison
    const currentUser = useAppSelector(selectCurrentUser);

    // --- Loading State --- 
    if (isLoading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    // --- Error State --- 
    if (isError || !currentFamily) { // Also handle case where data is missing after loading
        const errorMessage = (error as any)?.data?.message || (error as any)?.error || 'Failed to load family details.';
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">
                    Error loading family dashboard: {errorMessage}
                </Alert>
            </Container>
        );
    }

    // --- Success State --- 
    // Helper function to get member name
    const getMemberName = (member: any): string => {
        if (!member?.userId) return 'Unknown User';
        if (typeof member.userId === 'string') return `User (ID: ${member.userId.substring(0, 6)}...)`;
        return `${member.userId.firstName || ''} ${member.userId.lastName || ''} (${member.userId.email || 'No email'})`;
    };

    const getShortMemberName = (member: any): string => {
         if (!member?.userId) return 'this member';
         if (typeof member.userId === 'string') return `User ID ${member.userId.substring(0,6)}...`;
         return member.userId.firstName || member.userId.email || 'this member';
    };

    const handleOpenAddMemberModal = () => {
        setAddMemberModalOpen(true);
    };

    const handleCloseAddMemberModal = () => {
        setAddMemberModalOpen(false);
    };

    const handleOpenChangeRoleModal = (member: FamilyMember) => {
        setMemberToEditRole(member);
        setChangeRoleModalOpen(true);
    };
    const handleCloseChangeRoleModal = () => {
        setChangeRoleModalOpen(false);
        setMemberToEditRole(null); // Clear selected member on close
    };

    // Handler for removing a member
    const handleRemoveMember = async (memberIdToRemove: string, memberName: string) => {
        if (!familyId) return;
        
        // Simple confirmation dialog
        if (window.confirm(`Are you sure you want to remove ${memberName} from the family?`)) {
            try {
                await removeMember({ familyId, memberId: memberIdToRemove }).unwrap();
                dispatch(setNotification({ message: `${memberName} removed successfully.`, severity: 'success' }));
                // No need to manually close modals, list will refresh due to cache invalidation
            } catch (err) {
                console.error("Failed to remove member:", err);
                const errorMsg = (err as any)?.data?.message || 'Failed to remove member.';
                dispatch(setNotification({ message: errorMsg, severity: 'error' }));
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                {currentFamily.name} Dashboard
            </Typography>
            {currentFamily.description && (
                <Typography variant="body1" color="text.secondary" paragraph>
                    {currentFamily.description}
                </Typography>
            )}

            {/* Calendar Section */}
            <Box sx={{ my: 3 }}>
                <Typography variant="h5" gutterBottom>Family Calendar</Typography>
                <FamilyCalendar familyId={familyId!} />
            </Box>

            {/* Tasks Section */}
            <Box sx={{ my: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Tasks</Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => setCreateTaskModalOpen(true)}
                    >
                        Add New Task
                    </Button>
                </Box>
                {/* Pass familyId which is guaranteed to exist here */}
                <TaskList familyId={familyId!} /> 
            </Box>

            {/* Manage Members Section - ADDED */}
            <Box sx={{ my: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Manage Members</Typography>
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />} 
                        onClick={handleOpenAddMemberModal} // Connect button to open modal
                    >
                        Add Member
                    </Button>
                </Box>
                <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {currentFamily.members && currentFamily.members.length > 0 ? (
                        currentFamily.members.map((member, index) => {
                            const memberId = typeof member.userId === 'object' && member.userId !== null 
                                                ? member.userId._id 
                                                : member.userId;
                            const memberKey = memberId || index;
                            const isCurrentUser = currentUser?._id === memberId;
                            const shortName = getShortMemberName(member);

                            return (
                                <React.Fragment key={memberKey}>
                                    <ListItem>
                                        <ListItemText 
                                            primary={getMemberName(member)} 
                                            secondary={`Role: ${member.role || 'N/A'}`}
                                        />
                                        <ListItemSecondaryAction>
                                            {!isCurrentUser && (
                                                <>
                                                    <IconButton 
                                                        edge="end" 
                                                        aria-label="edit-role" 
                                                        onClick={() => handleOpenChangeRoleModal(member)} // Call handler
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton 
                                                        edge="end" 
                                                        aria-label="delete" 
                                                        onClick={() => handleRemoveMember(memberId, shortName)} // Call handler
                                                        disabled={isRemovingMember} // Disable while removing
                                                    >
                                                        {isRemovingMember ? <CircularProgress size={20}/> : <DeleteIcon />} 
                                                    </IconButton>
                                                </>
                                            )}
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    {index < currentFamily.members.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <ListItem>
                            <ListItemText primary="No members found in this family." />
                        </ListItem>
                    )}
                </List>
            </Box>
            {/* End Manage Members Section */}

            {/* Add Task Modal */}
            {familyId && (
                <CreateTaskModal
                    open={isCreateTaskModalOpen}
                    onClose={() => setCreateTaskModalOpen(false)}
                    familyId={familyId}
                />
            )}

            {/* Add Member Modal Component - ADDED */}
            {familyId && (
                <AddMemberModal 
                    open={isAddMemberModalOpen} 
                    onClose={handleCloseAddMemberModal} 
                    familyId={familyId} 
                />
            )}

            {/* Change Role Modal Component - ADDED */}
            {familyId && (
                <ChangeRoleModal 
                    open={isChangeRoleModalOpen}
                    onClose={handleCloseChangeRoleModal}
                    familyId={familyId}
                    member={memberToEditRole} // Pass the selected member
                />
            )}
            
        </Container>
    );
};

export default FamilyDashboardPage; 
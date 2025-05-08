import React, { useState } from 'react';
import { 
    List, 
    ListItem, 
    ListItemAvatar, 
    ListItemText, 
    Avatar, 
    Typography, 
    Box, 
    IconButton,
    Tooltip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person'; // Default icon
import { FamilyMember, User } from '../types/models'; // Import relevant types
import { useDispatch } from 'react-redux';
import { removeMember as removeMemberThunk } from '../features/family/familySlice';
import ChangeRoleModal from './ChangeRoleModal'; // Added
// TODO: Import function to check user permissions (e.g., can current user remove/edit members?)
// import { useCurrentUserPermissions } from '../hooks/useCurrentUserPermissions';

interface FamilyMembersListProps {
    members: FamilyMember[];
    currentUserId?: string | null; // Pass the logged-in user's ID
    familyId: string; // ID of the current family is required
}

// Helper function to check if userId is populated User object
function isUserPopulated(userId: User | string): userId is User {
    return typeof userId === 'object' && userId !== null && '_id' in userId;
}

const FamilyMembersList: React.FC<FamilyMembersListProps> = ({ members, currentUserId, familyId }) => {
    const dispatch = useDispatch<any>();

    // State for confirmation dialog
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

    // State for Change Role Modal
    const [openChangeRoleModal, setOpenChangeRoleModal] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<{ id: string; name: string; currentRole: string; } | null>(null);

    // TODO: Hook to get current user's permissions within this family
    // const { canManageMembers } = useCurrentUserPermissions(); 
    const canManageMembers = true; // Placeholder: Assume user can manage for now

    const handleOpenConfirmDialog = (memberId: string, memberName: string) => {
        setMemberToRemove({ id: memberId, name: memberName });
        setOpenConfirmDialog(true);
    };

    const handleCloseConfirmDialog = () => {
        setOpenConfirmDialog(false);
        setMemberToRemove(null);
    };

    const handleConfirmRemove = () => {
        if (!memberToRemove) return;
        
        // Use the familyId passed via props
        if (!familyId) {
            console.error("Family ID prop is missing in FamilyMembersList");
            alert("Error: Could not determine the current family ID.");
            handleCloseConfirmDialog();
            return;
        }

        console.log(`Dispatching removeMember for family ${familyId}, member ${memberToRemove.id}`);
        dispatch(removeMemberThunk({ familyId: familyId, memberId: memberToRemove.id }));
        handleCloseConfirmDialog();
    };

    const handleOpenChangeRoleModal = (memberId: string, memberName: string, currentRole: string) => {
        setMemberToEdit({ id: memberId, name: memberName, currentRole });
        setOpenChangeRoleModal(true);
    };

    const handleCloseChangeRoleModal = () => {
        setOpenChangeRoleModal(false);
        setMemberToEdit(null);
    };

    if (!members || members.length === 0) {
        return <Typography>No members found in this family.</Typography>;
    }

    return (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {members.map((member) => {
                const userData = isUserPopulated(member.userId) ? member.userId : null;
                const memberId = userData ? userData._id : (typeof member.userId === 'string' ? member.userId : 'unknown');
                const memberName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 'Unknown User';
                const memberEmail = userData ? userData.email : 'No email available';
                const memberAvatar = userData?.profilePicture;
                const memberRole = member.role; // Get current role
                const isCurrentUser = currentUserId === memberId;

                return (
                    <ListItem 
                        key={memberId} 
                        divider
                        secondaryAction={
                            // Only show actions if user has permissions AND it's not themselves
                            canManageMembers && !isCurrentUser ? (
                                <Box>
                                    <Tooltip title="Change Role">
                                        <IconButton 
                                            edge="end" 
                                            aria-label="edit role" 
                                            onClick={() => handleOpenChangeRoleModal(memberId, memberName, memberRole)}
                                            sx={{ mr: 1 }}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove Member">
                                        <IconButton 
                                            edge="end" 
                                            aria-label="delete" 
                                            onClick={() => handleOpenConfirmDialog(memberId, memberName)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ) : null
                        }
                    >
                        <ListItemAvatar>
                            <Avatar src={memberAvatar}>
                                {!memberAvatar && <PersonIcon />} { /* Fallback icon */}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                            primary={`${memberName} ${isCurrentUser ? '(You)' : ''}`}
                            secondary={
                                <React.Fragment>
                                    <Typography
                                        sx={{ display: 'block' }}
                                        component="span"
                                        variant="body2"
                                        color="text.primary"
                                    >
                                        {member.role}
                                    </Typography>
                                    {memberEmail}
                                </React.Fragment>
                            }
                        />
                    </ListItem>
                );
            })}
            {/* Confirmation Dialog */}
            <Dialog
                open={openConfirmDialog}
                onClose={handleCloseConfirmDialog}
            >
                <DialogTitle>Confirm Member Removal</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to remove 
                        <strong> {memberToRemove?.name || 'this member'} </strong> 
                        from the family?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog}>Cancel</Button>
                    <Button onClick={handleConfirmRemove} color="error" autoFocus>
                        Remove Member
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Change Role Modal */}
            <ChangeRoleModal 
                open={openChangeRoleModal}
                onClose={handleCloseChangeRoleModal}
                memberId={memberToEdit?.id || null}
                memberName={memberToEdit?.name || null}
                currentRole={memberToEdit?.currentRole || null}
                familyId={familyId} // Pass familyId down
            />
        </List>
    );
};

export default FamilyMembersList; 
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography,
    CircularProgress,
    Alert,
    Box,
    SelectChangeEvent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FamilyMember } from '../../../types/models'; // Import FamilyMember type
import { useChangeMemberRoleMutation } from '../../api/apiSlice';
import { useAppDispatch } from '../../../store/hooks';
import { setNotification } from '../../../store/notificationSlice';

// Roles (should match the ones used elsewhere, e.g., AddMemberForm)
const MEMBER_ROLES = ['Primary User', 'Secondary User', 'Member', 'Viewer'];

// Props interface for the modal
interface ChangeRoleModalProps {
    open: boolean;
    onClose: () => void;
    familyId: string;
    member: FamilyMember | null; // The member whose role is being changed
}

// Helper to get member name (handles populated/unpopulated state)
const getMemberName = (member: FamilyMember | null): string => {
    if (!member?.userId) return 'Selected User';
    if (typeof member.userId === 'string') return `User (ID: ${member.userId.substring(0, 6)}...)`;
    return `${member.userId.firstName || ''} ${member.userId.lastName || ''} (${member.userId.email || 'No email'})`;
};

// Helper to get member ID (handles populated/unpopulated state)
const getMemberId = (member: FamilyMember | null): string | null => {
    if (!member?.userId) return null;
    if (typeof member.userId === 'object' && member.userId !== null) return member.userId._id;
    return member.userId; // It's a string ID
};

const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({ 
    open, 
    onClose, 
    familyId, 
    member, 
}) => {
    const dispatch = useAppDispatch();
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [changeMemberRole, { isLoading, error, reset }] = useChangeMemberRoleMutation();

    const memberId = getMemberId(member);
    const memberName = getMemberName(member);

    // Reset state when modal opens or member changes
    useEffect(() => {
        if (open && member) {
            setSelectedRole(member.role || '');
            reset(); // Clear previous mutation error state
        } else if (!open) {
            // Optionally reset when closing too, though opening handles it
            setSelectedRole('');
            reset();
        }
    }, [open, member, reset]);

    const handleRoleChange = (event: SelectChangeEvent<string>) => {
        setSelectedRole(event.target.value as string);
    };

    const handleSaveChanges = async () => {
        if (!memberId || !selectedRole || selectedRole === member?.role) {
            // Basic validation or no change detected
            if (selectedRole === member?.role) {
                 dispatch(setNotification({ message: 'No changes made to the role.', severity: 'info' }));
                 onClose();
            } else {
                 dispatch(setNotification({ message: 'Invalid member data or role.', severity: 'error' }));
            }
            return;
        }

        try {
            await changeMemberRole({ 
                familyId,
                memberId: memberId,
                role: selectedRole 
            }).unwrap();
            dispatch(setNotification({ 
                message: `${memberName}'s role updated successfully to ${selectedRole}!`, 
                severity: 'success' 
            }));
            onClose(); // Close modal on success
        } catch (err) {
            console.error('Failed to change member role:', err);
            const errorMsg = (err as any)?.data?.message || 'Failed to change member role';
             dispatch(setNotification({ message: errorMsg, severity: 'error' }));
            // Keep modal open on error
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                Change Member Role
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                    disabled={isLoading}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers> 
                {error && (
                     <Alert severity="error" sx={{ mb: 2 }}>
                         {(error as any)?.data?.message || 'An error occurred.'}
                     </Alert>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body1">
                        Select a new role for: <strong>{memberName}</strong>
                    </Typography>
                    <FormControl fullWidth disabled={isLoading}>
                        <InputLabel id="change-role-select-label">Role</InputLabel>
                        <Select
                            labelId="change-role-select-label"
                            value={selectedRole}
                            label="Role"
                            onChange={handleRoleChange}
                        >
                            {MEMBER_ROLES.map((roleOption) => (
                                <MenuItem key={roleOption} value={roleOption}>
                                    {roleOption}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                 <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                 <Button 
                     onClick={handleSaveChanges} 
                     variant="contained" 
                     disabled={isLoading || !selectedRole || selectedRole === member?.role}
                     startIcon={isLoading ? <CircularProgress size={20} /> : null}
                 >
                     Save Changes
                 </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChangeRoleModal; 
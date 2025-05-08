import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddMemberForm from './AddMemberForm'; // Import the form

// Props interface for the modal
interface AddMemberModalProps {
    open: boolean;
    onClose: () => void;
    familyId: string;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ 
    open, 
    onClose, 
    familyId, 
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Invite New Member
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers> 
                {/* Render the form inside the modal content */}
                <AddMemberForm 
                    familyId={familyId} 
                    onClose={onClose} // Pass onClose to the form so it can close the modal
                />
            </DialogContent>
        </Dialog>
    );
};

export default AddMemberModal; 
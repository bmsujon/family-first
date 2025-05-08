import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CreateTaskForm from '../CreateTaskForm'; // Assuming CreateTaskForm is in the parent directory

interface CreateTaskModalProps {
    open: boolean;
    onClose: () => void;
    familyId: string | null | undefined;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ open, onClose, familyId }) => {

    if (!familyId) {
        // Don't render the modal if familyId is not available (though TaskList button should prevent opening)
        return null; 
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Create New Task
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
            <DialogContent dividers> { /* Add dividers for better visual separation */}
                {/* Pass familyId and a callback to close the modal on success */}
                <CreateTaskForm familyId={familyId} onTaskCreated={onClose} />
            </DialogContent>
            {/* Removed DialogActions as form likely has its own submit/cancel */}
            {/* If CreateTaskForm needs external buttons, add DialogActions back */}
        </Dialog>
    );
};

export default CreateTaskModal; 
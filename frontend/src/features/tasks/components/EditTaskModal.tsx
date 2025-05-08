import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditTaskForm from './EditTaskForm'; // Assuming EditTaskForm will be in the same directory
import { Task } from '../../../types/models';

interface EditTaskModalProps {
    open: boolean;
    onClose: () => void;
    familyId: string; // Assume familyId is always present when modal is open
    task: Task; // The task object to edit
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ open, onClose, familyId, task }) => {

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Edit Task
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
                {/* Pass task data, familyId, and close handler to the form */}
                <EditTaskForm 
                    task={task} 
                    familyId={familyId} 
                    onTaskUpdated={onClose} 
                />
            </DialogContent>
        </Dialog>
    );
};

export default EditTaskModal; 
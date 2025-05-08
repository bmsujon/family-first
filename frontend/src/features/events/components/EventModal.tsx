import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EventForm from './EventForm';
import { IEvent } from '../../../types/models'; // Import IEvent

// Define props for the modal (now handles create and edit)
interface EventModalProps {
    open: boolean;
    onClose: () => void;
    familyId: string;
    eventToEdit?: IEvent | null; // Event data for editing
    // Add props for initial values when creating from calendar click
    initialStartTime?: string;
    initialEndTime?: string;
    initialAllDay?: boolean;
}

const EventModal: React.FC<EventModalProps> = ({ 
    open, 
    onClose, 
    familyId, 
    eventToEdit, 
    // Destructure new props
    initialStartTime,
    initialEndTime,
    initialAllDay,
}) => {
    const isEditing = !!eventToEdit;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEditing ? 'Edit Event' : 'Create New Event'} {/* Dynamic Title */}
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
                {/* Pass the eventToEdit prop and initial values to the form */}
                <EventForm 
                    familyId={familyId} 
                    onClose={onClose} 
                    eventToEdit={eventToEdit} // Pass event data for editing
                    // Pass initial values down
                    initialStartTime={initialStartTime} 
                    initialEndTime={initialEndTime}
                    initialAllDay={initialAllDay}
                />
            </DialogContent>
        </Dialog>
    );
};

export default EventModal; // Export renamed component 
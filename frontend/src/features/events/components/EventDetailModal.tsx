import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { IEvent } from '../../../types/models';
import { useGetEventByIdQuery } from '../../api/apiSlice';

// Helper function to format dates (consider moving to a utils file)
const formatDisplayDate = (dateString: string, allDay: boolean): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: allDay ? undefined : 'numeric',
        minute: allDay ? undefined : '2-digit',
        hour12: !allDay, // Use 12-hour format if time is shown
    };
    // Adjust for allDay - might need timezone handling depending on requirements
    // For simplicity, we'll show the date part for allDay events
    if (allDay) {
       // For all-day events from FullCalendar, end date is exclusive. Adjust display logic if needed.
       // Displaying just the start date for simplicity here.
       return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return date.toLocaleString(undefined, options);
};


interface EventDetailModalProps {
    open: boolean;
    onClose: () => void;
    familyId: string | null;
    eventId: string | null;
    onEdit: (event: IEvent) => void;
    onDelete: (eventId: string) => void;
    isDeleting?: boolean;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
    open, 
    onClose, 
    familyId,
    eventId, 
    onEdit,
    onDelete,
    isDeleting 
}) => {
    // Fetch the event data using RTK Query
    const { 
        data: event,
        isLoading: isLoadingEvent, 
        isError: isEventError, 
        error: eventError 
    } = useGetEventByIdQuery(
        { familyId: familyId || '', eventId: eventId || '' }, 
        { skip: !familyId || !eventId } 
    );

    // Don't render the Dialog shell if the modal is not open
    if (!open) return null;

    // --- Event Handlers (use fetched event data) ---
    const handleEditClick = () => {
        if (event) {
            onEdit(event); 
        }
    };

    const handleDeleteClick = () => {
        if (eventId) {
            onDelete(eventId); 
        }
    };

    // --- Content Rendering --- 
    let content;
    if (isLoadingEvent) {
        content = (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
                <CircularProgress />
            </Box>
        );
    } else if (isEventError) {
         let errorMsg = 'Failed to load event details.';
         if (typeof eventError === 'object' && eventError !== null && 'data' in eventError) {
            errorMsg = (eventError as any).data?.message || errorMsg;
         }
        content = <Alert severity="error" sx={{ m: 2 }}>{errorMsg}</Alert>;
    } else if (event) {
        content = (
            <>
                <Box sx={{ mb: 2 }}>
                    {event.allDay && <Chip label="All Day Event" size="small" sx={{ mb: 1 }}/>}
                    <Typography variant="body1" gutterBottom>
                        <strong>Start:</strong> {formatDisplayDate(event.startTime, event.allDay)}
                    </Typography>
                    {(!event.allDay || (event.endTime && new Date(event.endTime).toDateString() !== new Date(event.startTime).toDateString())) && (
                         <Typography variant="body1" gutterBottom>
                             <strong>End:</strong> {formatDisplayDate(event.endTime, event.allDay)}
                         </Typography>
                    )}
                </Box>
                {event.description && (
                     <Box sx={{ mb: 2 }}>
                         <Typography variant="subtitle2" gutterBottom>Description:</Typography>
                         <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{event.description}</Typography>
                     </Box>
                )}
                 {/* TODO: Display Location, Category, Participants later */}
            </>
        );
    } else {
        content = <Alert severity="warning" sx={{ m: 2 }}>Event data not available.</Alert>;
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {event?.title || (isLoadingEvent ? 'Loading...' : 'Event Details')}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ color: (theme) => theme.palette.grey[500] }}
                    disabled={isDeleting || isLoadingEvent}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {content}
            </DialogContent>
            {event && !isLoadingEvent && !isEventError && (
                 <DialogActions sx={{ p: '16px 24px' }}>
                     <Button 
                        onClick={handleDeleteClick} 
                        color="error" 
                        startIcon={isDeleting ? <CircularProgress size={20} color="inherit"/> : <DeleteIcon />}
                        disabled={isDeleting || isLoadingEvent} 
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button 
                        onClick={handleEditClick} 
                        variant="contained" 
                        startIcon={<EditIcon />}
                        disabled={isDeleting || isLoadingEvent} 
                    >
                        Edit
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    );
};

export default EventDetailModal; 
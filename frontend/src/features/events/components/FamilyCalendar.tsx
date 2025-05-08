import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // needed for dayClick and select
import { DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core'; // Import EventInput
import { useGetEventsByFamilyQuery, useDeleteEventMutation } from '../../api/apiSlice'; // Import the query and delete mutation hooks
import EventModal from './EventModal';
import EventDetailModal from './EventDetailModal'; // Import the detail modal
import { IEvent } from '../../../types/models'; // Import IEvent if needed for mapping
import { useAppDispatch } from '../../../store/hooks'; // Import dispatch
import { setNotification } from '../../../store/notificationSlice'; // Import notification action

interface FamilyCalendarProps {
    familyId: string;
}

interface InitialEventData {
    startStr: string;
    endStr: string;
    allDay: boolean;
}

const FamilyCalendar: React.FC<FamilyCalendarProps> = ({ familyId }) => {
    const dispatch = useAppDispatch(); // Get dispatch function

    // State for Create/Edit Modal
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [modalInitialData, setModalInitialData] = useState<InitialEventData | null>(null);
    const [eventToEdit, setEventToEdit] = useState<IEvent | null>(null); // State to hold event for editing

    // State for Detail Modal
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Fetch events using the RTK Query hook
    const {
        data: eventsData,
        isLoading,
        isError,
        error,
    } = useGetEventsByFamilyQuery({ familyId });

    const [deleteEvent, { isLoading: isDeleting, error: deleteError }] = useDeleteEventMutation();

    // Map fetched events to FullCalendar's format
    const formattedEvents: EventInput[] = React.useMemo(() => {
        if (!eventsData) return [];
        // Assuming eventsData is IEvent[] and matches EventInput closely
        // Adjust mapping if backend structure differs significantly from FullCalendar's needs
        return eventsData.map((event: IEvent) => ({
            id: event._id, // Pass the event ID
            title: event.title,
            start: event.startTime, // Ensure these are ISO strings or Date objects
            end: event.endTime,
            allDay: event.allDay,
            // You can add extendedProps for custom data if needed
            extendedProps: {
                description: event.description,
                location: event.location,
                // Add any other relevant event properties
            },
        }));
    }, [eventsData]);

    // --- Calendar Interaction Handlers ---
    const handleDateClick = (arg: { dateStr: string; allDay: boolean }) => {
        setEventToEdit(null); // Ensure we are in create mode
        setModalInitialData({ startStr: arg.dateStr, endStr: arg.dateStr, allDay: arg.allDay });
        setIsEventModalOpen(true);
    };

    const handleSelect = (selectInfo: DateSelectArg) => {
        setEventToEdit(null); // Ensure we are in create mode
        setModalInitialData({ startStr: selectInfo.startStr, endStr: selectInfo.endStr, allDay: selectInfo.allDay });
        setIsEventModalOpen(true);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        // Open the Detail Modal when an event is clicked
        const eventId = clickInfo.event.id;
        if (eventId) {
            setSelectedEventId(eventId);
            setIsDetailModalOpen(true);
        } else {
            console.error("Clicked event is missing an ID:", clickInfo.event);
            dispatch(setNotification({ message: 'Cannot view event details: Event ID missing.', severity: 'error' }));
        }
    };

    // --- Modal Close Handlers ---
    const handleCloseEventModal = () => {
        setIsEventModalOpen(false);
        setModalInitialData(null);
        setEventToEdit(null); // Clear edit state when closing
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedEventId(null);
    };

    // --- Detail Modal Action Handlers ---
    // Called from EventDetailModal when Edit button is clicked
    const handleEditRequest = (eventData: IEvent) => {
        handleCloseDetailModal(); // Close detail modal
        setEventToEdit(eventData); // Set the event data for the main modal
        setModalInitialData(null); // Clear any calendar click initial data
        setIsEventModalOpen(true); // Open the main modal in edit mode
    };

    // Called from EventDetailModal when Delete button is clicked
    const handleDeleteRequest = async (eventIdToDelete: string) => {
        if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
        }
        try {
            await deleteEvent({ familyId, eventId: eventIdToDelete }).unwrap();
            dispatch(setNotification({ message: 'Event deleted successfully', severity: 'success' }));
            handleCloseDetailModal(); // Close detail modal on success
        } catch (err) {
            console.error("Failed to delete event:", err);
            const errorMsg = (err as any)?.data?.message || 'Failed to delete event.';
            dispatch(setNotification({ message: errorMsg, severity: 'error' }));
            // Keep detail modal open on error?
        }
    };

    if (isLoading) {
        return <Box display="flex" justifyContent="center" alignItems="center" height="400px"><CircularProgress /></Box>;
    }

    if (isError) {
        // Attempt to provide a more specific error message
        const errorMessage = (error as any)?.data?.message || (error as any)?.error || 'Failed to load events.';
        return <Alert severity="error">Error loading events: {errorMessage}</Alert>;
    }

    return (
        <Box sx={{ p: 2 }}>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                initialView="dayGridMonth"
                editable={false} // Set to true if you want drag-and-drop editing
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                events={formattedEvents} // Pass the fetched and formatted events
                dateClick={handleDateClick} // Use the updated handler
                select={handleSelect} // Use the updated handler
                eventClick={handleEventClick} // Handle clicks on existing events
            />

            {/* Main Create/Edit Modal */}
            {isEventModalOpen && (
                <EventModal
                    open={isEventModalOpen}
                    onClose={handleCloseEventModal}
                    familyId={familyId}
                    // Pass eventToEdit to enable edit mode in EventModal/EventForm
                    eventToEdit={eventToEdit} 
                    // Pass initial data only if NOT editing
                    initialStartTime={!eventToEdit ? modalInitialData?.startStr : undefined}
                    initialEndTime={!eventToEdit ? modalInitialData?.endStr : undefined}
                    initialAllDay={!eventToEdit ? modalInitialData?.allDay : undefined}
                />
            )}

            {/* Event Detail Modal */}
            {isDetailModalOpen && selectedEventId && (
                 <EventDetailModal
                    open={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    familyId={familyId}
                    eventId={selectedEventId}
                    onEdit={handleEditRequest} // Pass the edit handler
                    onDelete={handleDeleteRequest} // Pass the delete handler
                    isDeleting={isDeleting} // Pass loading state for delete button
                 />
            )}
        </Box>
    );
};

export default FamilyCalendar;
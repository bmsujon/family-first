import React, { useEffect } from 'react';
import { useFormik, FormikErrors } from 'formik';
import * as Yup from 'yup';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import {
    Box,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Grid,
    FormControlLabel,
    Checkbox,
    TextFieldProps,
    Autocomplete,
    Chip,
} from '@mui/material';
import { useCreateEventMutation, useUpdateEventMutation, UpdateEventRequest, CreateEventRequest } from '../../api/apiSlice';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { IEvent, FamilyMember, User } from '../../../types/models'; // Import IEvent for initialValues type
import { setNotification } from '../../../store/notificationSlice';
import dayjs from 'dayjs';
import { selectCurrentFamily } from '../../family/familySlice'; // Import selector for current family

// Validation Schema
const validationSchema = Yup.object({
    title: Yup.string().required('Title is required'),
    startTime: Yup.date().required('Start time is required').nullable(),
    // End time validation depends on allDay
    endTime: Yup.date()
        .nullable()
        .when('allDay', {
            is: false,
            then: schema => schema.required('End time is required for timed events')
                                  .min(Yup.ref('startTime'), "End time can't be before start time"),
            otherwise: schema => schema.optional(), // Optional if allDay is true
        }),
    description: Yup.string().optional(),
    allDay: Yup.boolean(),
    location: Yup.string().optional(),
    category: Yup.string().optional(),
    participants: Yup.array().of(Yup.string()).optional(), // Optional array of strings (IDs)
});

// Form values interface
interface EventFormValues {
    title: string;
    description: string;
    startTime: Date | null;
    endTime: Date | null;
    allDay: boolean;
    location: string;
    category: string;
    participants: string[]; // Array of user IDs
}

// Props interface
interface EventFormProps {
    familyId: string;
    onClose: () => void;
    eventToEdit?: IEvent | null; // Make event optional for creating/editing
    initialStartTime?: string;
    initialEndTime?: string;
    initialAllDay?: boolean;
}

// Helper to format date for datetime-local input
// YYYY-MM-DDTHH:mm
const formatDateTimeForInput = (date?: Date | string): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '';
        // Pad month, day, hour, minute with leading zeros if needed
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
        console.error("Error formatting date for input:", e);
        return '';
    }
};

// Helper to get member name (handles populated/unpopulated state)
const getMemberName = (member: FamilyMember): string => {
    if (typeof member.userId === 'string') {
        return `User (ID: ${member.userId.substring(0, 6)}...)`; // Fallback if not populated
    }
    return `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim() || member.userId.email;
};

const EventForm: React.FC<EventFormProps> = ({ 
    familyId, 
    onClose, 
    eventToEdit, 
    initialStartTime,
    initialEndTime,
    initialAllDay,
}) => {
    const dispatch = useAppDispatch();
    const isEditing = !!eventToEdit;
    
    const currentFamily = useAppSelector(selectCurrentFamily);
    // Get the overall loading status for family data (might be from getMyFamilies or getFamilyDetails)
    const familyLoadingStatus = useAppSelector((state) => state.family.status); 
    const familyMembers = currentFamily?.members || [];

    const [createEvent, { isLoading: isCreating, error: createError }] = useCreateEventMutation();
    const [updateEvent, { isLoading: isUpdating, error: updateError }] = useUpdateEventMutation();
    
    const isMutatingEvent = isCreating || isUpdating; // Renamed for clarity
    const mutationError = createError || updateError;

    // Calculate initial values based on mode (edit vs create) and props
    const calculatedInitialValues = React.useMemo(() => {
        if (isEditing && eventToEdit) {
            // Use eventToEdit for initial values
            return {
                title: eventToEdit.title || '',
                description: eventToEdit.description || '',
                startTime: eventToEdit.startTime ? new Date(eventToEdit.startTime) : null,
                endTime: eventToEdit.endTime ? new Date(eventToEdit.endTime) : null,
                allDay: eventToEdit.allDay ?? false,
                location: eventToEdit.location || '',
                category: eventToEdit.category || '',
                participants: eventToEdit.participants?.map(p => typeof p === 'string' ? p : p._id) || [],
            };
        } else {
            // Use initial props for creating a new event
            const start = initialStartTime ? new Date(initialStartTime) : new Date();
            // Default end time to 1 hour after start if not provided or if allDay
            const end = initialEndTime && !initialAllDay 
                        ? new Date(initialEndTime) 
                        : new Date(start.getTime() + 60 * 60 * 1000); 
            return {
                title: '',
                description: '',
                startTime: start,
                endTime: end,
                allDay: initialAllDay ?? false,
                location: '',
                category: '',
                participants: [],
            };
        }
    }, [eventToEdit, isEditing, initialStartTime, initialEndTime, initialAllDay]);

    const formik = useFormik<EventFormValues>({
        initialValues: calculatedInitialValues,
        validationSchema: validationSchema,
        enableReinitialize: true, // Important to reinitialize when calculatedInitialValues change
        onSubmit: async (values) => {
            if (!values.startTime || (!values.allDay && !values.endTime)) {
                dispatch(setNotification({ message: 'Error: Start time is missing, or End time is missing for timed event.', severity: 'error' }));
                return;
            }
            const commonPayload = {
                title: values.title, 
                description: values.description || undefined, 
                location: values.location || undefined,
                category: values.category || undefined,
                allDay: values.allDay,
                startTime: values.startTime.toISOString(), 
                endTime: values.allDay 
                            ? values.startTime.toISOString() 
                            : (values.endTime as Date).toISOString(),
                participants: values.participants, 
            };
            try {
                if (isEditing && eventToEdit) {
                    const updatePayload: UpdateEventRequest = {
                        familyId,
                        eventId: eventToEdit._id,
                        ...commonPayload,
                    };
                    await updateEvent(updatePayload).unwrap();
                    dispatch(setNotification({ message: 'Event updated successfully!', severity: 'success' })); 
                } else {
                    const createPayload: CreateEventRequest = {
                        familyId, 
                        ...commonPayload 
                    };
                    await createEvent(createPayload).unwrap();
                     dispatch(setNotification({ message: 'Event created successfully!', severity: 'success' }));
                }
                onClose(); 
            } catch (err) {
                console.error(isEditing ? 'Failed to update event:' : 'Failed to create event:', err);
                const errorMsg = (err as any)?.data?.message || (isEditing ? 'Failed to update event' : 'Failed to create event');
                dispatch(setNotification({ message: errorMsg, severity: 'error' }));
            }
        },
    });

    const memberOptions = familyMembers.map(member => ({
        id: typeof member.userId === 'string' ? member.userId : member.userId._id,
        label: getMemberName(member),
    }));
    
    // Determine loading state for Autocomplete
    const isLoadingParticipants = familyLoadingStatus === 'loading' || !currentFamily;

    return (
        <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2} sx={{ pt: 1 }}>
                {mutationError && (
                    <Grid item xs={12}>
                        <Alert severity="error">
                            {(mutationError as any)?.data?.message || (isEditing ? 'Failed to update event' : 'Failed to create event')}
                        </Alert>
                    </Grid>
                )}
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="title"
                        name="title"
                        label="Event Title"
                        value={formik.values.title}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.title && Boolean(formik.errors.title)}
                        helperText={formik.touched.title && formik.errors.title}
                        required
                        autoFocus={!isEditing} 
                        disabled={isMutatingEvent}
                    />
                </Grid>
                <Grid item xs={12}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={formik.values.allDay}
                                onChange={formik.handleChange}
                                name="allDay"
                                id="allDay"
                                disabled={isMutatingEvent}
                            />
                        }
                        label="All Day Event"
                    />
                </Grid>
                <Grid item xs={12} sm={formik.values.allDay ? 12 : 6}>
                    <DateTimePicker
                        label="Start Time"
                        value={formik.values.startTime ? dayjs(formik.values.startTime) : null}
                        onChange={(newValue) => formik.setFieldValue('startTime', newValue ? newValue.toDate() : null)}
                        disabled={isMutatingEvent}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                required: true,
                                name: "startTime",
                                onBlur: formik.handleBlur,
                                error: formik.touched.startTime && Boolean(formik.errors.startTime),
                                helperText: formik.touched.startTime && formik.errors.startTime ? String(formik.errors.startTime) : ''
                            }
                        }}
                    />
                </Grid>
                {!formik.values.allDay && (
                    <Grid item xs={12} sm={6}>
                        <DateTimePicker
                            label="End Time"
                            value={formik.values.endTime ? dayjs(formik.values.endTime) : null}
                            onChange={(newValue) => formik.setFieldValue('endTime', newValue ? newValue.toDate() : null)}
                            minDateTime={formik.values.startTime ? dayjs(formik.values.startTime) : undefined}
                            disabled={isMutatingEvent}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: !formik.values.allDay,
                                    name: "endTime",
                                    onBlur: formik.handleBlur,
                                    error: formik.touched.endTime && Boolean(formik.errors.endTime),
                                    helperText: formik.touched.endTime && formik.errors.endTime ? String(formik.errors.endTime) : ''
                                }
                            }}
                        />
                    </Grid>
                )}
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        id="description"
                        name="description"
                        label="Description (Optional)"
                        multiline
                        rows={3}
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description ? String(formik.errors.description) : ''}
                        disabled={isMutatingEvent}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Autocomplete
                        multiple
                        id="participants"
                        options={memberOptions}
                        loading={isLoadingParticipants}
                        getOptionLabel={(option) => option.label}
                        value={memberOptions.filter(option => formik.values.participants.includes(option.id))}
                        onChange={(event, newValue) => {
                            const selectedIds = newValue.map(option => option.id);
                            formik.setFieldValue('participants', selectedIds);
                        }}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="outlined"
                                label="Participants (Optional)"
                                placeholder={isLoadingParticipants ? "Loading members..." : "Select members..."}
                                error={formik.touched.participants && Boolean(formik.errors.participants)}
                                helperText={formik.touched.participants && formik.errors.participants ? String(formik.errors.participants) : ''}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {isLoadingParticipants ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    variant="outlined"
                                    label={option.label}
                                    {...getTagProps({ index })}
                                    key={option.id}
                                />
                            ))
                        }
                        disabled={isMutatingEvent || isLoadingParticipants}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        id="location"
                        name="location"
                        label="Location (Optional)"
                        value={formik.values.location}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.location && Boolean(formik.errors.location)}
                        helperText={formik.touched.location && formik.errors.location ? String(formik.errors.location) : ''}
                        disabled={isMutatingEvent}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        id="category"
                        name="category"
                        label="Category (Optional)"
                        value={formik.values.category}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.category && Boolean(formik.errors.category)}
                        helperText={formik.touched.category && formik.errors.category ? String(formik.errors.category) : ''}
                        disabled={isMutatingEvent}
                    />
                </Grid>
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                    <Button onClick={onClose} color="secondary" disabled={isMutatingEvent}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={isMutatingEvent || (!formik.dirty && isEditing)}>
                        {isMutatingEvent ? <CircularProgress size={24} /> : (isEditing ? 'Update Event' : 'Create Event')}
                    </Button>
                </Grid>
            </Grid>
        </form>
    );
};

export default EventForm; 
import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
    Box,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    SelectChangeEvent
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { FamilyMember, User, Task, TaskPriority, TaskStatus } from '../../../types/models';
import { useUpdateTaskMutation, UpdateTaskRequest } from '../../api/apiSlice'; // Corrected path
import { setTaskSnackbar } from '../taskSlice';
import { useAppDispatch } from '../../../store/hooks';

// Reuse types/constants (ensure alignment with models.ts)
const TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Blocked'];
const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Validation Schema
const EditTaskSchema = Yup.object().shape({
    title: Yup.string()
        .min(2, 'Too Short!')
        .max(100, 'Too Long!')
        .required('Title is required'),
    description: Yup.string()
        .max(500, 'Description is too long')
        .nullable(),
    category: Yup.string()
        .max(50, 'Category is too long')
        .nullable(),
    status: Yup.string()
        .oneOf(TASK_STATUSES, 'Invalid status')
        .required('Status is required'),
    priority: Yup.string()
        .oneOf([...TASK_PRIORITIES, ''], 'Invalid priority') // Allow empty string
        .nullable(),
    dueDate: Yup.string()
        .matches(dateRegex, { message: 'Invalid date format (YYYY-MM-DD)', excludeEmptyString: true })
        .nullable(),
    assignedTo: Yup.string().nullable(),
});

// Form values interface
interface EditTaskFormValues {
    title: string;
    description: string;
    category: string;
    status: TaskStatus;
    priority: TaskPriority | '';
    dueDate: string;
    assignedTo: string;
}

// Props interface - THIS MUST INCLUDE 'task'
interface EditTaskFormProps {
    task: Task;
    familyId: string;
    onTaskUpdated?: () => void;
}

const EditTaskForm: React.FC<EditTaskFormProps> = ({ task, familyId, onTaskUpdated }) => {
    const dispatch = useAppDispatch();
    const [updateTaskMutation, { isLoading, error, isError }] = useUpdateTaskMutation();
    const familyMembers = useSelector((state: RootState) => state.family.currentFamily?.members || []);

     // Helper to extract error message
    const getErrorMessage = (error: any): string | null => {
        if (!error) return null;
        if (typeof error === 'object' && error !== null) {
            if ('data' in error && typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
                return String(error.data.message);
            }
             if ('error' in error) return String(error.error);
             if ('message' in error) return String(error.message);
        }
        return 'An unknown error occurred';
    };

    const handleUpdateTask = async (values: EditTaskFormValues, { setSubmitting }: any) => {
        const payload: UpdateTaskRequest = {
            familyId: familyId,
            taskId: task._id,
            title: values.title,
            // Send undefined for empty optional strings, null for date/assignee if cleared
            description: values.description || undefined,
            category: values.category || undefined,
            status: values.status,
            priority: values.priority || undefined,
            dueDate: values.dueDate || null,
            assignedTo: values.assignedTo ? [values.assignedTo] : null,
        };

        setSubmitting(true);
        try {
            await updateTaskMutation(payload).unwrap();
            dispatch(setTaskSnackbar({ message: 'Task updated successfully!', severity: 'success' }));
            onTaskUpdated?.();
        } catch (err) {
            console.error("Failed to update task:", err);
            const errorMsg = getErrorMessage(err) || 'Failed to update task.';
            dispatch(setTaskSnackbar({ message: errorMsg, severity: 'error' }));
        } finally {
            setSubmitting(false);
        }
    };

    const errorMessage = getErrorMessage(error);

    // Format date for input type="date"
    const formatDateForInput = (dateValue?: string | Date): string => {
        if (!dateValue) return '';
        try {
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
            if (isNaN(date.getTime())) {
                 return '';
            }
            return date.toISOString().split('T')[0];
        } catch (e) {
            console.error("Error formatting date for input:", e);
            return '';
        }
    };

    return (
        <Box sx={{ mt: 1 }}>
            {isError && errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
            <Formik
                initialValues={{
                    title: task.title || '',
                    description: task.description || '',
                    category: task.category || '',
                    status: task.status || 'Pending', // Default if somehow missing
                    priority: task.priority || '', // Default to empty string
                    dueDate: formatDateForInput(task.dueDate),
                    // Ensure assignedTo is handled correctly (take first if array, otherwise empty)
                    assignedTo: task.assignedTo && task.assignedTo.length > 0
                                    ? (typeof task.assignedTo[0] === 'object' ? task.assignedTo[0]._id : task.assignedTo[0])
                                    : '',
                } as EditTaskFormValues}
                validationSchema={EditTaskSchema}
                onSubmit={handleUpdateTask}
                enableReinitialize // Reinitialize form if task prop changes
            >
                {({ errors, touched, isSubmitting, values, setFieldValue }) => (
                    <Form>
                        <Grid container spacing={2}>
                            {/* Title */}
                            <Grid item xs={12}>
                                <Field as={TextField} name="title" label="Title" fullWidth required error={touched.title && Boolean(errors.title)} helperText={touched.title && errors.title} disabled={isLoading || isSubmitting} />
                            </Grid>
                            {/* Description */}
                            <Grid item xs={12}>
                                <Field as={TextField} name="description" label="Description" multiline rows={3} fullWidth error={touched.description && Boolean(errors.description)} helperText={touched.description && errors.description} disabled={isLoading || isSubmitting} />
                            </Grid>
                            {/* Category */}
                            <Grid item xs={12} sm={6}>
                                <Field as={TextField} name="category" label="Category" fullWidth error={touched.category && Boolean(errors.category)} helperText={touched.category && errors.category} disabled={isLoading || isSubmitting} />
                            </Grid>
                             {/* Status */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required error={touched.status && Boolean(errors.status)} disabled={isLoading || isSubmitting}>
                                    <InputLabel id="status-label">Status</InputLabel>
                                    <Field as={Select} name="status" labelId="status-label" label="Status">
                                        {TASK_STATUSES.map((status) => (
                                            <MenuItem key={status} value={status}>{status}</MenuItem>
                                        ))}
                                    </Field>
                                    {touched.status && errors.status && <Typography color="error" variant="caption">{errors.status}</Typography>}
                                </FormControl>
                            </Grid>
                            {/* Priority */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth error={touched.priority && Boolean(errors.priority)} disabled={isLoading || isSubmitting}>
                                    <InputLabel id="priority-label">Priority</InputLabel>
                                    <Field as={Select} name="priority" labelId="priority-label" label="Priority" value={values.priority || ''}>
                                         <MenuItem value=""><em>None</em></MenuItem> {/* Allow unsetting */}
                                        {TASK_PRIORITIES.map((priority) => (
                                            <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                                        ))}
                                    </Field>
                                    {touched.priority && errors.priority && <Typography color="error" variant="caption">{errors.priority}</Typography>}
                                </FormControl>
                            </Grid>
                            {/* Due Date */}
                            <Grid item xs={12} sm={6}>
                                <Field as={TextField} name="dueDate" label="Due Date" type="date" fullWidth InputLabelProps={{ shrink: true }} error={touched.dueDate && Boolean(errors.dueDate)} helperText={touched.dueDate && errors.dueDate} disabled={isLoading || isSubmitting} />
                            </Grid>
                            {/* Assignee */}
                            <Grid item xs={12}>
                                <FormControl fullWidth error={touched.assignedTo && Boolean(errors.assignedTo)} disabled={isLoading || isSubmitting}>
                                    <InputLabel id="assignee-label">Assignee (Optional)</InputLabel>
                                    <Field
                                        as={Select}
                                        name="assignedTo"
                                        labelId="assignee-label"
                                        label="Assignee (Optional)"
                                        value={values.assignedTo || ''} // Controlled component value
                                        onChange={(e: SelectChangeEvent<string>) => setFieldValue('assignedTo', e.target.value)}
                                    >
                                        <MenuItem value=""><em>Unassigned</em></MenuItem>
                                        {familyMembers.map((member) => {
                                            const userData = typeof member.userId === 'object' ? member.userId : null;
                                            if (userData) {
                                                return (
                                                    <MenuItem key={userData._id} value={userData._id}>
                                                        {userData.firstName || userData.email}
                                                    </MenuItem>
                                                );
                                            }
                                            return null; // Don't render if userId isn't populated
                                        })}
                                    </Field>
                                    {touched.assignedTo && errors.assignedTo && <Typography color="error" variant="caption">{errors.assignedTo}</Typography>}
                                </FormControl>
                            </Grid>
                        </Grid>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit" variant="contained" disabled={isLoading || isSubmitting}>
                                {isLoading || isSubmitting ? <CircularProgress size={24} /> : 'Save Changes'}
                            </Button>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    );
};

export default EditTaskForm;

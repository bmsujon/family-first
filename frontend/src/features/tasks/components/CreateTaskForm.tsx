import React from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
    Box,
    Button,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import { FamilyMember, User, TaskPriority, TaskStatus } from '../../../types/models';
import { useCreateTaskMutation, CreateTaskRequest } from '../../api/apiSlice';
import { setTaskSnackbar } from '../taskSlice';
import { useAppDispatch } from '../../../store/hooks';

// Define constants (ensure these match models.ts or import from there)
const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
// NOTE: models.ts uses 'Pending', 'In Progress', 'Completed', 'Blocked'. Align if necessary.
const TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Blocked'];

// Simple date validation (YYYY-MM-DD format)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Validation Schema
const CreateTaskSchema = Yup.object().shape({
    title: Yup.string()
        .min(2, 'Too Short!')
        .max(100, 'Too Long!')
        .required('Title is required'),
    description: Yup.string()
        .max(500, 'Description is too long'),
    category: Yup.string()
        .max(50, 'Category is too long'),
    priority: Yup.string()
        .oneOf([...TASK_PRIORITIES, ''], 'Invalid priority'), // Include empty string for default
    dueDate: Yup.string()
        .matches(dateRegex, { message: 'Invalid date format (YYYY-MM-DD)', excludeEmptyString: true })
        .nullable(),
    assignedTo: Yup.string().nullable(), // Allow empty string or null for unassigned
});

// Form values interface
interface CreateTaskFormValues {
    title: string;
    description: string;
    category: string;
    priority: TaskPriority | ''; // Allow empty string for default/unselected
    dueDate: string; // Store as YYYY-MM-DD string
    assignedTo: string; // Store as single User ID string or empty string
}

// Define props interface
interface CreateTaskFormProps {
    familyId: string;
    onTaskCreated?: () => void; // Callback on success
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ familyId, onTaskCreated }) => {
    const dispatch = useAppDispatch();
    const [createTaskMutation, { isLoading, error, isError }] = useCreateTaskMutation();
    const familyMembers = useSelector((state: RootState) => state.family.currentFamily?.members || []);

    // Helper to extract error message from RTK Query error object
    const getErrorMessage = (error: any): string | null => {
        if (!error) return null;
        if (typeof error === 'object' && error !== null) {
            if ('data' in error && typeof error.data === 'object' && error.data !== null && 'message' in error.data) {
                return String(error.data.message);
            }
            if ('error' in error) {
                return String(error.error);
            }
            if ('message' in error) {
                return String(error.message);
            }
        }
        return 'An unknown error occurred';
    };

    const handleCreateTask = async (values: CreateTaskFormValues, { setSubmitting, resetForm }: any) => {
        if (!familyId) {
            console.error("Family ID is missing!");
            setSubmitting(false);
            return;
        }

        const payload: CreateTaskRequest = {
            familyId: familyId,
            title: values.title,
            // Conditionally add optional fields
            ...(values.description && { description: values.description }),
            ...(values.category && { category: values.category }),
            ...(values.priority && { priority: values.priority as TaskPriority }), // Cast priority
            ...(values.dueDate && { dueDate: values.dueDate }),
            ...(values.assignedTo && { assignedTo: [values.assignedTo] }),
            // Status defaults on backend
        };

        setSubmitting(true);
        try {
            await createTaskMutation(payload).unwrap();
            resetForm();
            dispatch(setTaskSnackbar({ message: 'Task created successfully!', severity: 'success' }));
            onTaskCreated?.();
        } catch (err: any) {
             console.error("Failed to create task:", err);
             const errorMsg = getErrorMessage(err) || 'Failed to create task.';
             dispatch(setTaskSnackbar({ message: errorMsg, severity: 'error' }));
        } finally {
            setSubmitting(false);
        }
    };

    const errorMessage = getErrorMessage(error);

    return (
        <Box sx={{ mt: 1 }}>
            {isError && errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
            <Formik
                initialValues={{
                    title: '',
                    description: '',
                    category: '',
                    priority: 'Medium', // Default priority
                    dueDate: '',
                    assignedTo: '',
                } as CreateTaskFormValues}
                validationSchema={CreateTaskSchema}
                onSubmit={handleCreateTask}
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
                            {/* Priority */}
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth error={touched.priority && Boolean(errors.priority)} disabled={isLoading || isSubmitting}>
                                    <InputLabel id="priority-label">Priority</InputLabel>
                                    <Field as={Select} name="priority" labelId="priority-label" label="Priority" value={values.priority || ''}>
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
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth error={touched.assignedTo && Boolean(errors.assignedTo)} disabled={isLoading || isSubmitting}>
                                    <InputLabel id="assignee-label">Assignee (Optional)</InputLabel>
                                    <Field as={Select} name="assignedTo" labelId="assignee-label" label="Assignee (Optional)" value={values.assignedTo || ''} onChange={(e: SelectChangeEvent<string>) => setFieldValue('assignedTo', e.target.value)}>
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
                                            return null; // Or handle string IDs if needed
                                        })}
                                    </Field>
                                     {touched.assignedTo && errors.assignedTo && <Typography color="error" variant="caption">{errors.assignedTo}</Typography>}
                                </FormControl>
                             </Grid>
                        </Grid>
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button type="submit" variant="contained" disabled={isLoading || isSubmitting}>
                                {isLoading || isSubmitting ? <CircularProgress size={24} /> : 'Create Task'}
                            </Button>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    );
};

export default CreateTaskForm;
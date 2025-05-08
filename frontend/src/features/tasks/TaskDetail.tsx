import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
    Container, Typography, Box, Divider, Paper, Button, CircularProgress, Alert, Grid, Chip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Task, User, TaskPriority, TaskStatus, FamilyMember } from '../../types/models';
import { RootState } from '../../store/store';
import EditTaskForm from './components/EditTaskForm';
import { useGetTaskByIdQuery, useDeleteTaskMutation } from '../../features/api/apiSlice';
import { setTaskSnackbar } from '../tasks/taskSlice';
import { useAppDispatch } from '../../store/hooks';

// Helper function for status color (Aligned with models.ts TaskStatus)
const getStatusColor = (status: TaskStatus | undefined): "success" | "warning" | "info" | "default" | "error" => {
    if (!status) return 'default'; // Handle undefined case
    switch (status) {
        case 'Completed': return 'success'; // Use 'Completed'
        case 'In Progress': return 'warning';
        case 'Pending': return 'info'; // Use 'Pending'
        case 'Blocked': return 'default'; // Use 'Blocked'
        default:
             // This should not happen if status is of type TaskStatus
             // const exhaustiveCheck: never = status;
             console.warn("Unknown task status:", status);
            return 'default'; 
    }
};

// Helper function for priority color (keep as is or adapt)
const getPriorityColor = (priority: TaskPriority | undefined): "error" | "warning" | "info" | "default" => {
    switch (priority) {
        case 'High': return 'error';
        case 'Medium': return 'warning';
        case 'Low': return 'info';
        default: return 'default';
    }
};

const TaskDetail: React.FC = () => {
    const { familyId, taskId } = useParams<{ familyId: string; taskId: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    // --- RTK Query Hooks --- 
    const {
        data: currentTask,
        isLoading: isLoadingTask,
        isError: isTaskError,
        error: taskError,
        refetch, // Function to refetch task data
    } = useGetTaskByIdQuery(
        { familyId: familyId!, taskId: taskId! },
        { skip: !familyId || !taskId } // Skip if IDs are missing
    );

    const [deleteTaskMutation, { isLoading: isDeleting, error: deleteError }] = useDeleteTaskMutation();

    // --- State for UI --- 
    const [isEditing, setIsEditing] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    // --- Selectors --- 
    // Keep selector for family members for assignee lookup
    const familyMembers = useSelector((state: RootState) => state.family.currentFamily?.members || []);

    // --- Memoized Assignee Map --- (Helper for displaying names)
    const memberMap = useMemo(() => {
        const map = new Map<string, string>();
        familyMembers.forEach(member => {
            const user = (typeof member.userId === 'object' ? member.userId : null) as User | null;
            if (user) {
                map.set(user._id, user.firstName || user.email || 'Unknown User');
            } else if (typeof member.userId === 'string') {
                map.set(member.userId, `User (${member.userId.substring(0, 6)}...)`);
            }
        });
        return map;
    }, [familyMembers]);

    // Helper to get assignee name (handles the specific (User | string)[] type)
    const getAssigneeName = (assignees?: (User | string)[]): string => {
        if (!assignees || assignees.length === 0) return 'Unassigned';
        
        return assignees
            .map(assignee => {
                let id: string | undefined;
                let name: string | undefined;

                if (typeof assignee === 'object' && assignee !== null) {
                    // It's a User object
                    id = assignee._id;
                    name = assignee.firstName || assignee.email;
                } else {
                    // It's a string ID
                    id = assignee;
                    // Look up name in the memoized map
                    name = memberMap.get(id);
                }
                
                // Fallback display logic
                if (name) return name;
                if (id) return `ID (${id.substring(0, 6)}...)`;
                return 'Invalid Assignee';
            })
            .join(', ');
    };

    // --- Helper to extract error message --- 
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

    // --- Effects --- 
    // No longer need useEffect to dispatch fetchTaskById, RTK Query handles it.
    // Add effect to navigate away if task is not found after loading?
    useEffect(() => {
        if (!isLoadingTask && !currentTask && isTaskError) {
            console.error("Task not found or error loading task:", taskError);
            navigate(`/`); // Navigate back to dashboard if task fails to load
        }
    }, [isLoadingTask, currentTask, isTaskError, taskError, familyId, navigate, dispatch]);

    // --- Handlers --- 
    const handleToggleEdit = () => {
        setIsEditing(!isEditing);
    };

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
    };

    const handleConfirmDelete = async () => {
        if (!familyId || !taskId) return;
        
        try {
            await deleteTaskMutation({ familyId, taskId }).unwrap();
            handleCloseDeleteDialog();
            dispatch(setTaskSnackbar({ message: 'Task deleted successfully!', severity: 'success' }));
            navigate(`/`); // Navigate to home/dashboard after delete
        } catch (error) {
            console.error("Failed to delete task:", error);
            const errorMsg = getErrorMessage(error) || 'Failed to delete task.';
            dispatch(setTaskSnackbar({ message: errorMsg, severity: 'error' }));
        }
    };

    // --- Loading and Error States --- 
    if (isLoadingTask) {
        return <Container><Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box></Container>;
    }

    if (isTaskError || !currentTask) {
        // Display specific error message from backend if available
        const loadErrorMsg = getErrorMessage(taskError) || 'Error loading task details. It might have been deleted or there was a network issue.';
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Alert severity="error">{loadErrorMsg}</Alert>
                <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>Go Back</Button>
            </Container>
        );
    }

    // --- Date Formatting --- 
    const formatDate = (dateValue?: string | Date): string => {
        if (!dateValue) return 'Not set';
        try {
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { 
            return 'Invalid Date';
        }
    };
    const formatDateTime = (dateValue?: string | Date): string => {
         if (!dateValue) return 'N/A';
        try {
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleString();
        } catch { 
            return 'Invalid Date';
        }
    }

    // --- Render Logic --- 
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                {isEditing ? (
                    // --- Edit Form View ---
                    <>
                        <Typography variant="h5" component="h1" gutterBottom>
                            Edit Task
                        </Typography>
                        <EditTaskForm 
                            task={currentTask} 
                            familyId={familyId!} // Should be present here
                            onTaskUpdated={() => {
                                setIsEditing(false); // Close edit form on success
                                refetch(); // Refetch task data after update
                                // TODO: Add success snackbar
                            }} 
                        />
                         <Button onClick={handleToggleEdit} sx={{ mt: 2 }}>
                             Cancel Edit
                         </Button>
                    </>
                ) : (
                    // --- Detail View ---
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h4" component="h1">{currentTask.title}</Typography>
                            <Box>
                                <IconButton onClick={handleToggleEdit} sx={{ mr: 1 }}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton onClick={handleDeleteClick} color="error" disabled={isDeleting}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        </Box>
                        
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                             {/* Left Column: Core Details */}
                            <Grid item xs={12} md={7}>
                                <Typography variant="h6" gutterBottom>Details</Typography>
                                <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                                    {currentTask.description || 'No description provided.'}
                                </Typography>
                            </Grid>

                            {/* Right Column: Meta Info */}
                            <Grid item xs={12} md={5}>
                                <Typography variant="h6" gutterBottom>Info</Typography>
                                <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Status:</Typography>
                                     <Chip label={currentTask.status || 'N/A'} color={getStatusColor(currentTask.status)} size="small" />
                                </Box>
                                 <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Priority:</Typography>
                                     <Chip label={currentTask.priority || 'N/A'} color={getPriorityColor(currentTask.priority)} size="small" />
                                 </Box>
                                <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Category:</Typography>
                                     <Typography component="span" variant="body2">{currentTask.category || 'N/A'}</Typography>
                                 </Box>
                                <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Assigned To:</Typography>
                                     <Typography component="span" variant="body2">{getAssigneeName(currentTask.assignedTo)}</Typography>
                                 </Box>
                                 <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Due Date:</Typography>
                                     <Typography component="span" variant="body2">{formatDate(currentTask.dueDate)}</Typography>
                                 </Box>
                                 <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Created By:</Typography>
                                     <Typography component="span" variant="body2">{getAssigneeName(currentTask.createdBy ? [currentTask.createdBy] : undefined)}</Typography>
                                 </Box>
                                 <Box sx={{ mb: 1.5 }}>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Created At:</Typography>
                                     <Typography component="span" variant="body2">{formatDateTime(currentTask.createdAt)}</Typography>
                                 </Box>
                                 <Box>
                                     <Typography variant="subtitle2" component="span" sx={{ fontWeight: 'bold', mr: 1 }}>Last Updated:</Typography>
                                     <Typography component="span" variant="body2">{formatDateTime(currentTask.updatedAt)}</Typography>
                                 </Box>
                            </Grid>
                        </Grid>
                    </>
                )}
            </Paper>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Task Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the task "{currentTask?.title || 'this task'}"?
                        This action cannot be undone.
                    </DialogContentText>
                     {deleteError && (
                         <Alert severity="error" sx={{ mt: 2 }}>
                             {getErrorMessage(deleteError) || 'Failed to delete task.'}
                         </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default TaskDetail;

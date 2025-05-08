import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Alert, List, ListItem, ListItemText, IconButton, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Chip, Grid, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, FormControlLabel, Switch, ChipProps, Pagination, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import { io, Socket } from "socket.io-client"; // Import socket.io-client

import { useGetTasksByFamilyQuery, useDeleteTaskMutation, GetTasksRequest } from '../../api/apiSlice';
import { RootState } from '../../../store/store';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import { Task, User, FamilyMember, TaskStatus, TaskPriority } from '../../../types/models';
import { setTaskSnackbar } from '../taskSlice';
import { useAppDispatch } from '../../../store/hooks';
import { useDebounce } from 'use-debounce';

// Constants for Filters and Sorting
const TASK_STATUS_OPTIONS: (TaskStatus | 'All')[] = ['All', 'Pending', 'In Progress', 'Completed', 'Blocked'];
const TASK_PRIORITY_OPTIONS: (TaskPriority | 'All')[] = ['All', 'Low', 'Medium', 'High', 'Urgent'];
const SORT_BY_OPTIONS = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'title', label: 'Title' },
    { value: 'priority', label: 'Priority' },
    { value: 'status', label: 'Status' },
];
type SortOrderType = 'asc' | 'desc';

// Define props interface
interface TaskListProps {
    familyId: string | null | undefined; // Accept null or undefined
}

// Assume currentFamilyId is available in the Redux state (e.g., familySlice)
// You might need to adjust the selector based on your actual state structure
// REMOVE: const selectCurrentFamilyId = (state: RootState) => state.family.currentFamily?._id; // Example selector

// --- Color Helper Functions --- (Moved here for clarity)
const getStatusColor = (status: TaskStatus | undefined): ChipProps['color'] => {
    if (!status) return 'default';
    switch (status) {
        case 'Completed': return 'success';
        case 'In Progress': return 'warning';
        case 'Pending': return 'info';
        case 'Blocked': return 'default';
        default:
             console.warn("Unknown task status:", status);
            return 'default'; 
    }
};

const getPriorityColor = (priority: TaskPriority | undefined): ChipProps['color'] => {
    if (!priority) return 'default';
    switch (priority) {
        case 'High':
        case 'Urgent': // Group Urgent with High for color
             return 'error';
        case 'Medium': return 'warning';
        case 'Low': return 'info';
        default:
             console.warn("Unknown task priority:", priority);
            return 'default';
    }
};

const DEFAULT_SORT_BY = 'createdAt';
const DEFAULT_SORT_ORDER: SortOrderType = 'desc';
const DEFAULT_PAGE = 1;
const DEFAULT_STATUS_FILTER: TaskStatus | 'All' = 'All';
const DEFAULT_PRIORITY_FILTER: TaskPriority | 'All' = 'All';
const DEFAULT_ASSIGNEE_FILTER = 'All';
const DEFAULT_CATEGORY_FILTER = '';

const TaskList: React.FC<TaskListProps> = ({ familyId }) => {
    // Log the received familyId prop on initial render and re-renders
    console.log(`<<< TaskList rendered/re-rendered with familyId prop: ${familyId} >>>`);
    
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    // REMOVE: const currentFamilyId = useSelector(selectCurrentFamilyId);

    // State for Delete Confirmation Dialog
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    // State for Edit Confirmation Dialog
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    // --- State for Filters ---
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>(DEFAULT_STATUS_FILTER);
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>(DEFAULT_PRIORITY_FILTER);
    const [assigneeFilter, setAssigneeFilter] = useState<string>(DEFAULT_ASSIGNEE_FILTER);
    const [categoryFilterInput, setCategoryFilterInput] = useState<string>(DEFAULT_CATEGORY_FILTER);
    const [debouncedCategoryFilter, setDebouncedCategoryFilter] = useState<string>(DEFAULT_CATEGORY_FILTER);

    // --- State for Sorting ---
    const [sortBy, setSortBy] = useState<string>(DEFAULT_SORT_BY);
    const [sortOrder, setSortOrder] = useState<SortOrderType>(DEFAULT_SORT_ORDER);

    // --- State for Pagination ---
    const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);

    // --- Debounce Effect for Category Filter --- 
    useEffect(() => {
        const handler = setTimeout(() => {
            if (categoryFilterInput !== debouncedCategoryFilter) { 
                setDebouncedCategoryFilter(categoryFilterInput);
                setCurrentPage(DEFAULT_PAGE);
            }
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [categoryFilterInput, debouncedCategoryFilter]);

    // Construct query options object
    const queryOptions: GetTasksRequest = useMemo(() => ({
        familyId: familyId!,
        status: statusFilter === 'All' ? undefined : statusFilter,
        priority: priorityFilter === 'All' ? undefined : priorityFilter,
        assignedToUserId: assigneeFilter === 'All' ? undefined : assigneeFilter,
        filterByCategory: debouncedCategoryFilter.trim() || undefined,
        sortBy: sortBy,
        sortOrder: sortOrder,
        page: currentPage,
    }), [familyId, statusFilter, priorityFilter, assigneeFilter, debouncedCategoryFilter, sortBy, sortOrder, currentPage]);

    // Fetch tasks using the RTK Query hook
    const { 
        data: paginatedData, 
        isLoading: isLoadingTasks, 
        isFetching: isFetchingTasks, 
        isError: isTasksError, 
        error: tasksError,
        refetch // Get refetch function
    } = useGetTasksByFamilyQuery(queryOptions, { skip: !familyId });
    const [deleteTaskMutation, { isLoading: isDeleting, error: deleteError }] = useDeleteTaskMutation();

    // Extract data for rendering from paginatedData
    const tasks = paginatedData?.tasks;
    const totalPages = paginatedData?.totalPages || 1;

    // Get family members from state to map assignee IDs to names
    const familyMembers = useSelector((state: RootState) => state.family.currentFamily?.members || []);

    // Create a memoized map for quick lookup of member names
    const memberMap = useMemo(() => {
        // Log when memberMap recalculates (should only happen if familyMembers change)
        console.log('<<< TaskList recalculating memberMap >>>');
        const map = new Map<string, string>();
        familyMembers.forEach(member => {
            if (typeof member.userId === 'object' && member.userId !== null) {
                const user = member.userId as User;
                map.set(user._id, user.firstName || user.email || 'Unknown User');
            } else if (typeof member.userId === 'string') {
                // Explicitly handle string ID case
                const userIdStr = member.userId as string;
                map.set(userIdStr, `User (${userIdStr.substring(0, 6)}...)`);
            }
        });
        return map;
    }, [familyMembers]);

    // --- Handlers for Filters --- 
    const handleStatusFilterChange = (event: SelectChangeEvent<TaskStatus | 'All'>) => {
        setStatusFilter(event.target.value as TaskStatus | 'All');
        setCurrentPage(DEFAULT_PAGE);
    };

    const handlePriorityFilterChange = (event: SelectChangeEvent<TaskPriority | 'All'>) => {
        setPriorityFilter(event.target.value as TaskPriority | 'All');
        setCurrentPage(DEFAULT_PAGE);
    };

    const handleAssigneeFilterChange = (event: SelectChangeEvent<string>) => {
        setAssigneeFilter(event.target.value);
        setCurrentPage(DEFAULT_PAGE);
    };

    const handleCategoryFilterInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCategoryFilterInput(event.target.value);
    };

    // --- Handlers for Sorting --- 
    const handleSortByChange = (event: SelectChangeEvent<string>) => {
        setSortBy(event.target.value);
        setCurrentPage(DEFAULT_PAGE);
    };
    const handleSortOrderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSortOrder(event.target.checked ? 'asc' : 'desc');
        setCurrentPage(DEFAULT_PAGE);
    };

    // --- Handler to Clear Filters/Sort --- 
    const handleClearFiltersAndSort = () => {
        setStatusFilter(DEFAULT_STATUS_FILTER);
        setPriorityFilter(DEFAULT_PRIORITY_FILTER);
        setAssigneeFilter(DEFAULT_ASSIGNEE_FILTER);
        setCategoryFilterInput(DEFAULT_CATEGORY_FILTER);
        setDebouncedCategoryFilter(DEFAULT_CATEGORY_FILTER);
        setSortBy(DEFAULT_SORT_BY);
        setSortOrder(DEFAULT_SORT_ORDER);
        setCurrentPage(DEFAULT_PAGE);
    };

    // Determine if filters/sort are at default values
    const isDefaultState = 
        statusFilter === DEFAULT_STATUS_FILTER &&
        priorityFilter === DEFAULT_PRIORITY_FILTER &&
        assigneeFilter === DEFAULT_ASSIGNEE_FILTER &&
        debouncedCategoryFilter === DEFAULT_CATEGORY_FILTER &&
        sortBy === DEFAULT_SORT_BY &&
        sortOrder === DEFAULT_SORT_ORDER &&
        currentPage === DEFAULT_PAGE;

    const handleCreateTask = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
    };

    // --- Handlers for Delete Dialog --- 
    const handleOpenDeleteDialog = (task: Task) => {
        setTaskToDelete(task);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setTaskToDelete(null);
    };

    // --- Helper to extract error message --- (Can reuse from forms or define locally)
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

    const handleConfirmDelete = async () => { 
        if (!taskToDelete || !familyId) return;
        
        try {
            await deleteTaskMutation({ familyId: familyId, taskId: taskToDelete._id }).unwrap();
            handleCloseDeleteDialog();
            // Dispatch success snackbar
            dispatch(setTaskSnackbar({ message: 'Task deleted successfully!', severity: 'success' }));
        } catch (err) { 
            console.error('Failed to delete task:', err);
            // Dispatch error snackbar
            const errorMsg = getErrorMessage(err) || 'Failed to delete task.';
            dispatch(setTaskSnackbar({ message: errorMsg, severity: 'error' }));
            // Keep dialog open on error to show message within dialog's Alert
        }
    };

    // --- Handlers for Edit Dialog ---
    const handleOpenEditModal = (task: Task) => {
        setTaskToEdit(task);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setTaskToEdit(null);
    };

    // --- Helper Function to format Date --- 
    const formatDueDate = (dateValue?: string | Date): string | null => {
        if (!dateValue) return null;
        try {
            // Ensure we have a Date object
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
            // Check if date is valid after conversion
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", e);
            return 'Invalid Date';
        }
    };

    // --- Handler for Pagination Change --- 
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setCurrentPage(value);
    };

    // --- Navigation Handler --- 
    const handleNavigateToTask = (taskId: string) => {
        if (familyId) {
            navigate(`/families/${familyId}/tasks/${taskId}`);
        } else {
            console.warn('Cannot navigate to task, familyId is missing.');
            // Optionally show a user message
        }
    };

    // --- Socket.IO Effect --- 
    useEffect(() => {
        if (!familyId) return; // Don't connect if familyId isn't available
        
        // Log the familyId being used for socket connection
        console.log(`<<< TaskList socket useEffect attempting connection for family: ${familyId} >>>`);

        // Use environment variable for backend URL
        const socketEndpoint = process.env.REACT_APP_SOCKET_ENDPOINT || 'http://localhost:5001';
        const socket: Socket = io(socketEndpoint, {
            // Add authentication if needed, e.g., using query params or auth object
            // query: { token: /* get token */ },
            reconnectionAttempts: 5, 
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log(`<<< TaskList Socket connected: ${socket.id}, joining room: family_${familyId} >>>`);
            socket.emit('join_family_room', familyId);
        });

        socket.on('connect_error', (err) => {
            console.error(`<<< TaskList Socket connection error for family ${familyId}:`, err);
        });

        // Listen for task updates
        socket.on('task_update', (updatedTask: Task) => {
            console.log('<<< TaskList received task_update:', updatedTask);
            // Invalidate RTK Query cache to refetch tasks
            // Requires apiSlice to be imported and `invalidateTags` setup
            // dispatch(apiSlice.util.invalidateTags([{ type: 'Task', id: `LIST-${familyId}` }])); 
            // OR manually update the cache (more complex)
            dispatch(setTaskSnackbar({ message: `Task '${updatedTask.title}' updated.`, severity: 'info' }));
            refetch(); // Refetch the query data
        });
        
        const handleTaskUpdate = (data: any) => {
            // Placeholder if using a generic update event
            console.log('Received generic update', data);
            refetch(); 
        };
        socket.on('update', handleTaskUpdate);


        // Cleanup on component unmount or when familyId changes
        return () => {
            console.log(`<<< TaskList socket useEffect disconnecting for family: ${familyId} >>>`);
            socket.off('connect');
            socket.off('connect_error');
            socket.off('task_update');
            socket.off('update', handleTaskUpdate);
            socket.disconnect();
        };
    }, [familyId, dispatch, refetch]); // Add refetch to dependencies

    // --- Content Rendering --- 
    let listContent;
    // ... (loading/error/no family logic remains the same) ...
    if (isLoadingTasks || isFetchingTasks) {
        listContent = (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                <CircularProgress />
            </Box>
        );
    } else if (isTasksError) {
        let errorMessage = getErrorMessage(tasksError) || 'Failed to load tasks.';
        listContent = <Alert severity="error">{errorMessage}</Alert>;
    } else if (!familyId) {
         listContent = <Alert severity="info">No family selected to display tasks.</Alert>;
    } else if (tasks && tasks.length > 0) {
        listContent = (
            <List dense>
                {tasks.map((task) => { /* ... list item rendering as before ... */ 
                     const assigneeNames = task.assignedTo
                        ?.map(id => {
                            const stringId = String(id);
                            return memberMap.get(stringId) || `ID: ${stringId.substring(0, 6)}...`;
                        })
                        .join(', ');
                    const formattedDueDate = formatDueDate(task.dueDate);
                    const statusColor = getStatusColor(task.status);
                    const priorityColor = getPriorityColor(task.priority);
                    return (
                         <ListItem 
                             key={task._id} 
                             divider
                             button
                             onClick={() => handleNavigateToTask(task._id)}
                             secondaryAction={
                                 <>
                                      <Tooltip title="Edit Task"> 
                                          <IconButton 
                                                edge="end" 
                                                aria-label="edit task" 
                                                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(task); }} 
                                                sx={{ mr: 1 }}
                                          >
                                              <EditIcon />
                                          </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete Task">
                                          <IconButton 
                                                edge="end" 
                                                aria-label="delete task" 
                                                onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(task); }} 
                                                disabled={isDeleting}
                                           >
                                              <DeleteIcon />
                                          </IconButton>
                                      </Tooltip>
                                  </>
                             }
                             sx={{ alignItems: 'flex-start', py: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
                         >
                             <ListItemText 
                                 primary={<Typography variant="subtitle1">{task.title}</Typography>}
                                 secondary={
                                     <Box component="span" sx={{ display: 'flex', flexDirection: 'column', mt: 0.5, gap: 0.8 }}>
                                         {task.description && (
                                             <Typography component="span" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                 {task.description}
                                             </Typography>
                                         )}
                                         <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                                             <Tooltip title={`Status: ${task.status || 'N/A'}`}>
                                                 <Chip label={task.status || 'N/A'} color={statusColor} size="small" />
                                             </Tooltip>
                                             {task.priority && (
                                                 <Tooltip title={`Priority: ${task.priority}`}>
                                                      <Chip label={task.priority} color={priorityColor} size="small" variant="outlined" />
                                                 </Tooltip>
                                             )} 
                                             {formattedDueDate && (
                                                 <Tooltip title="Due Date">
                                                     <Chip icon={<CalendarTodayIcon sx={{ fontSize: '1rem' }} />} label={formattedDueDate} size="small" variant="outlined" />
                                                 </Tooltip>
                                             )}
                                             {assigneeNames && (
                                                 <Tooltip title="Assignee(s)">
                                                     <Chip icon={<PersonIcon sx={{ fontSize: '1rem' }} />} label={assigneeNames} size="small" variant="outlined" />
                                                 </Tooltip>
                                             )}
                                         </Box>
                                     </Box>
                                 }
                             />
                         </ListItem>
                    );
                 })}
            </List>
        );
    } else {
         if (statusFilter !== 'All' || priorityFilter !== 'All' || assigneeFilter !== 'All' || debouncedCategoryFilter !== '' || currentPage > 1) {
             listContent = <Typography variant="body1">No tasks match the current filters or page.</Typography>;
         } else {
            listContent = <Typography variant="body1">No tasks found for this family yet.</Typography>;
         }
    }

    // --- Component Return --- 
    return (
        <Box sx={{ mt: 2 }}>
            {/* Header Box (Title & Create Button) */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">Tasks</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={handleCreateTask}
                    disabled={!familyId || isLoadingTasks || isFetchingTasks} 
                >
                    Create Task
                </Button>
            </Box>

             {/* Filter and Sort Controls Box - Enhanced Styling */}
             <Box sx={{
                 mb: 2.5, // Increased margin bottom
                 p: 2, 
                 border: (theme) => `1px solid ${theme.palette.divider}`, 
                 borderRadius: 1, 
                 bgcolor: 'background.paper', // Subtle background
                 boxShadow: 1 // Add subtle elevation
             }}>
                 <Typography variant="overline" display="block" gutterBottom sx={{ mb: 1.5 }}>
                     View Options
                 </Typography>
                 <Grid container spacing={2} alignItems="center">
                      {/* Filter/Sort Grid Items remain the same */}
                      {/* Status Filter */}
                     <Grid item xs={12} sm={6} md={4} lg={2}>
                         <FormControl fullWidth size="small">
                             <InputLabel id="status-filter-label">Filter by Status</InputLabel>
                             <Select labelId="status-filter-label" value={statusFilter} label="Filter by Status" onChange={handleStatusFilterChange} disabled={isLoadingTasks || isFetchingTasks} >
                                 {TASK_STATUS_OPTIONS.map(status => (
                                     <MenuItem key={status} value={status}>{status}</MenuItem>
                                 ))}
                             </Select>
                         </FormControl>
                     </Grid>
                     {/* Priority Filter */}
                     <Grid item xs={12} sm={6} md={4} lg={2}>
                         <FormControl fullWidth size="small">
                             <InputLabel id="priority-filter-label">Filter by Priority</InputLabel>
                             <Select labelId="priority-filter-label" value={priorityFilter} label="Filter by Priority" onChange={handlePriorityFilterChange} disabled={isLoadingTasks || isFetchingTasks} >
                                 {TASK_PRIORITY_OPTIONS.map(priority => (
                                     <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                                 ))}
                             </Select>
                         </FormControl>
                     </Grid>
                     {/* Category Filter */}
                     <Grid item xs={12} sm={6} md={4} lg={2}>
                         <TextField
                             fullWidth
                             size="small"
                             label="Filter by Category"
                             variant="outlined"
                             value={categoryFilterInput}
                             onChange={handleCategoryFilterInputChange}
                             disabled={isLoadingTasks || isFetchingTasks}
                         />
                     </Grid>
                     {/* Assignee Filter */}
                     <Grid item xs={12} sm={6} md={4} lg={3}>
                          <FormControl fullWidth size="small">
                             <InputLabel id="assignee-filter-label">Filter by Assignee</InputLabel>
                             <Select labelId="assignee-filter-label" value={assigneeFilter} label="Filter by Assignee" onChange={handleAssigneeFilterChange} disabled={isLoadingTasks || isFetchingTasks} >
                                 <MenuItem value="All">All Members</MenuItem>
                                 {familyMembers.map(member => {
                                     const user = typeof member.userId === 'object' ? member.userId : null;
                                     if (!user) return null;
                                     return (
                                        <MenuItem key={user._id} value={user._id}>
                                            {user.firstName || user.email}
                                        </MenuItem>
                                     );
                                 })}
                             </Select>
                         </FormControl>
                     </Grid>
                     {/* Sort By */}
                     <Grid item xs={12} sm={4} md={3} lg={2}>
                          <FormControl fullWidth size="small">
                             <InputLabel id="sort-by-label">Sort By</InputLabel>
                             <Select labelId="sort-by-label" value={sortBy} label="Sort By" onChange={handleSortByChange} disabled={isLoadingTasks || isFetchingTasks} >
                                 {SORT_BY_OPTIONS.map(option => (
                                     <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                 ))}
                             </Select>
                         </FormControl>
                     </Grid>
                     {/* Sort Order Toggle */}
                     <Grid item xs={6} sm={4} md={2} lg={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FormControlLabel control={ <Switch checked={sortOrder === 'asc'} onChange={handleSortOrderChange} disabled={isLoadingTasks || isFetchingTasks} /> } label={sortOrder === 'asc' ? "Asc" : "Desc"} labelPlacement="start" />
                     </Grid>
                     {/* Clear Button */}
                      <Grid item xs={6} sm={4} md={1} lg={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                         <Button 
                             variant="outlined" 
                             size="small"
                             onClick={handleClearFiltersAndSort}
                             disabled={isDefaultState || isLoadingTasks || isFetchingTasks}
                         >
                             Clear
                         </Button>
                     </Grid>
                 </Grid>
             </Box>

            {/* Task List Content */}
            {listContent}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination 
                        count={totalPages} 
                        page={currentPage}
                        onChange={handlePageChange} 
                        color="primary"
                        disabled={isLoadingTasks || isFetchingTasks}
                    />
                </Box>
            )}

            {/* Create Task Modal */}
            {familyId && (
                <CreateTaskModal
                    open={isCreateModalOpen}
                    onClose={handleCloseCreateModal}
                    familyId={familyId}
                />
            )}

            {/* Edit Task Modal */}
            {taskToEdit && familyId && (
                <EditTaskModal
                    open={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    task={taskToEdit} // Pass the task to edit
                    familyId={familyId} // Pass familyId
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="delete-task-dialog-title"
            >
                <DialogTitle id="delete-task-dialog-title">
                    Confirm Task Deletion
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the task "{taskToDelete?.title}"? 
                        This action cannot be undone.
                    </DialogContentText>
                    {/* Show delete error message within dialog if exists */}
                    {getErrorMessage(deleteError) && (
                        <Alert severity="error" sx={{ mt: 2 }}>{getErrorMessage(deleteError)}</Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" disabled={isDeleting} autoFocus>
                         {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TaskList; 
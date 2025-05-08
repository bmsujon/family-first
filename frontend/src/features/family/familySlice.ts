import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Family, FamilyMember, User, CreateFamilyPayload, AddMemberPayload, UpdateFamilyPayload } from '../../types/models';
import familyService from '../../services/familyService';
import { AlertColor } from '@mui/material/Alert';
import { RootState } from '../../store/store';
import { logout } from '../auth/authSlice';

interface FamilyState {
    currentFamily: Family | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    inviteLoading: boolean;
    inviteError: string | null;
}

const initialState: FamilyState = {
    currentFamily: null,
    status: 'idle',
    error: null,
    inviteLoading: false,
    inviteError: null,
};

// Define expected response type for createFamily service
interface CreateFamilyResponse {
    message: string;
    family: Family;
}

// Define expected response type for acceptInvite service
interface AcceptInviteResponse {
    message: string;
    family: Family;
}

export const createFamily = createAsyncThunk<
    Family, // Keep the final return type as Family for the slice state
    { name: string },
    { rejectValue: string }
>('family/createFamily', async (familyData, thunkAPI) => {
    try {
        // Pass the correct payload object
        const response = await familyService.createFamily({ name: familyData.name });
        // Return only the family object from the response
        return response.family; 
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message || 'Failed to create family');
    }
});

export const getFamilyDetails = createAsyncThunk<
    Family,
    string,
    { rejectValue: string }
>('family/getDetails', async (familyId, thunkAPI) => {
    try {
        const response = await familyService.getFamilyById(familyId);
        return response.family;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

export const addMember = createAsyncThunk<
    Family,
    AddMemberPayload,
    { rejectValue: string }
>('family/addMember', async (payload, thunkAPI) => {
    try {
        const memberData = { email: payload.email, role: payload.role };
        const response = await familyService.addMember(payload.familyId, memberData);
        return response.family;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

export const updateFamily = createAsyncThunk<
    Family,
    UpdateFamilyPayload,
    { rejectValue: string }
>('family/update', async (payload, thunkAPI) => {
    try {
        const response = await familyService.updateFamily(payload.familyId, payload.updateData);
        return response.family;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

export const deleteFamily = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>('family/delete', async (familyId, thunkAPI) => {
    try {
        await familyService.deleteFamily(familyId);
        return familyId;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

interface SendInvitationArgs {
    familyId: string;
    email: string;
    role: string;
}

export const sendInvitation = createAsyncThunk<
    { message: string; invitationId: string },
    SendInvitationArgs,
    { rejectValue: string }
>('family/sendInvite', async (inviteData, thunkAPI) => {
    const { familyId, email, role } = inviteData;
    try {
        const response = await familyService.sendInvite(familyId, { email, role });
        return response;
    } catch (error: any) {
        const message = error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

export const acceptInvitation = createAsyncThunk<
    Family, // Keep the final return type as Family for the slice state
    string,
    { rejectValue: string }
>('family/acceptInvitation', async (token, thunkAPI) => {
    try {
        const response = await familyService.acceptInvite(token);
        // Return only the family object from the response
        return response.family; 
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message || 'Failed to accept invitation');
    }
});

interface InviteDetails {
    email: string;
    role: string;
    familyName: string;
    invitedBy: string;
}

export const fetchInviteDetails = createAsyncThunk<
    InviteDetails,
    string,
    { rejectValue: string }
>('family/fetchInviteDetails', async (token, thunkAPI) => {
    try {
        return await familyService.getInviteDetails(token);
    } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message || 'Failed to load invitation details');
    }
});

interface RemoveMemberArgs {
    familyId: string;
    memberId: string;
}

export const removeMember = createAsyncThunk<
    { family: Family; message: string },
    RemoveMemberArgs,
    { rejectValue: string; state: RootState }
>('family/removeMember', async (args, thunkAPI) => {
    const { familyId, memberId } = args;
    try {
        const response = await familyService.removeMember(familyId, memberId);
        return response;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to remove member';
        return thunkAPI.rejectWithValue(message);
    }
});

interface ChangeMemberRoleArgs {
    familyId: string;
    memberId: string;
    newRole: string;
}

export const changeMemberRole = createAsyncThunk<
    { family: Family; message: string },
    ChangeMemberRoleArgs,
    { rejectValue: string; state: RootState }
>('family/changeMemberRole', async (args, thunkAPI) => {
    const { familyId, memberId, newRole } = args;
    try {
        const response = await familyService.changeMemberRole(familyId, memberId, newRole);
        return response;
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Failed to change member role';
        return thunkAPI.rejectWithValue(message);
    }
});

export const familySlice = createSlice({
    name: 'family',
    initialState,
    reducers: {
        resetFamilyState: (state) => {
            state.currentFamily = null;
            state.status = 'idle';
            state.error = null;
        },
        setCurrentFamily: (state, action: PayloadAction<Family | null>) => {
            state.currentFamily = action.payload;
            state.status = 'idle';
            state.error = null;
        },
        clearSnackbar: (state) => {
            // Remove references to non-existent state
            // state.snackbarMessage = null;
            // state.snackbarSeverity = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(createFamily.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(createFamily.fulfilled, (state, action: PayloadAction<Family>) => {
                state.status = 'succeeded';
                state.currentFamily = action.payload;
                state.error = null;
            })
            .addCase(createFamily.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(getFamilyDetails.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(getFamilyDetails.fulfilled, (state, action: PayloadAction<Family>) => {
                state.status = 'succeeded';
                state.currentFamily = action.payload;
                state.error = null;
            })
            .addCase(getFamilyDetails.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(addMember.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(addMember.fulfilled, (state, action: PayloadAction<Family>) => {
                state.status = 'succeeded';
                state.currentFamily = action.payload;
                state.error = null;
            })
            .addCase(addMember.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(updateFamily.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(updateFamily.fulfilled, (state, action: PayloadAction<Family>) => {
                state.status = 'succeeded';
                state.currentFamily = action.payload;
                state.error = null;
            })
            .addCase(updateFamily.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(deleteFamily.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(deleteFamily.fulfilled, (state, action: PayloadAction<string>) => {
                state.status = 'succeeded';
                state.error = null;
                const deletedId = action.payload;
                if (state.currentFamily?._id === deletedId) {
                    state.currentFamily = null;
                }
            })
            .addCase(deleteFamily.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(sendInvitation.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(sendInvitation.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.error = null;
            })
            .addCase(sendInvitation.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(acceptInvitation.pending, (state) => {
                state.inviteLoading = true;
                state.inviteError = null;
                state.status = 'loading';
                state.error = null;
            })
            .addCase(acceptInvitation.fulfilled, (state, action: PayloadAction<Family>) => {
                state.inviteLoading = false;
                state.currentFamily = action.payload;
                state.status = 'succeeded';
                state.error = null;
            })
            .addCase(acceptInvitation.rejected, (state, action) => {
                state.inviteLoading = false;
                state.inviteError = action.payload ?? null;
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(removeMember.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(removeMember.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.error = null;
                if (state.currentFamily?._id === action.payload.family._id) {
                    state.currentFamily = action.payload.family;
                }
            })
            .addCase(removeMember.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(changeMemberRole.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(changeMemberRole.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.error = null;
                if (state.currentFamily?._id === action.payload.family._id) {
                    state.currentFamily = action.payload.family;
                }
            })
            .addCase(changeMemberRole.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(fetchInviteDetails.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchInviteDetails.fulfilled, (state, action: PayloadAction<InviteDetails>) => {
                state.status = 'succeeded';
                state.error = null;
            })
            .addCase(fetchInviteDetails.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? null;
            })
            .addCase(logout.fulfilled, (state) => {
                Object.assign(state, initialState);
            });
    },
});

export const { resetFamilyState, setCurrentFamily } = familySlice.actions;

export const selectCurrentFamily = (state: RootState) => state.family.currentFamily;
export const selectFamilyStatus = (state: RootState) => state.family.status;
export const selectFamilyError = (state: RootState) => state.family.error;
export const selectInviteLoading = (state: RootState) => state.family.inviteLoading;
export const selectInviteError = (state: RootState) => state.family.inviteError;

export default familySlice.reducer; 
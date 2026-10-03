import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workspaceService } from '../services/workspace.service';

export const fetchMyWorkspaces = createAsyncThunk('workspace/fetchMine', async (_, thunkAPI) => {
  try {
    const res = await workspaceService.getMine();
    return res.data.workspaces;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to load workspaces.');
  }
});

export const fetchWorkspaceDashboard = createAsyncThunk(
  'workspace/fetchDashboard',
  async (workspaceId, thunkAPI) => {
    try {
      const res = await workspaceService.getDashboard(workspaceId);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to load dashboard.');
    }
  }
);

const initialState = {
  list: [],
  activeWorkspace: null,
  dashboard: null,
  status: 'idle',
  error: null,
};

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setActiveWorkspace: (state, action) => {
      state.activeWorkspace = action.payload;
      if (action.payload) {
        const index = state.list.findIndex((workspace) => workspace._id === action.payload._id);
        if (index < 0) state.list.push(action.payload);
        else state.list[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyWorkspaces.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyWorkspaces.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        if (state.activeWorkspace) {
          state.activeWorkspace = action.payload.find((workspace) => workspace._id === state.activeWorkspace._id) || null;
        } else if (action.payload.length > 0) {
          state.activeWorkspace = action.payload[0];
        }
      })
      .addCase(fetchMyWorkspaces.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchWorkspaceDashboard.fulfilled, (state, action) => {
        state.dashboard = action.payload;
      });
  },
});

export const { setActiveWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;

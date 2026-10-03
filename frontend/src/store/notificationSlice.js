import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService } from '../services/notification.service';

export const fetchNotifications = createAsyncThunk(
  'notification/fetchAll',
  async (params, thunkAPI) => {
    try {
      const res = await notificationService.getAll(params);
      return res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || 'Failed to load notifications.');
    }
  }
);

const initialState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    receiveNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    markReadLocally: (state, action) => {
      const notif = state.items.find((n) => n._id === action.payload);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllReadLocally: (state) => {
      state.items.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchNotifications.rejected, (state) => { state.status = 'failed'; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
      state.items = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
      state.status = 'succeeded';
    });
  },
});

export const { receiveNotification, markReadLocally, markAllReadLocally } = notificationSlice.actions;
export default notificationSlice.reducer;

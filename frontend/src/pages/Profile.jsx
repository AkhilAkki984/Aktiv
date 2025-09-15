import React, { useState, useContext } from 'react';
import {
  Box,
  Typography,
  Switch,
  Button,
  Avatar,
  Paper,
  Divider,
} from '@mui/material';
import { userAPI } from '../utils/api';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const [pauseMatches, setPauseMatches] = useState(user?.pauseMatches || false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const togglePause = async () => {
    try {
      await userAPI.updateProfile({ pauseMatches: !pauseMatches });
      setPauseMatches(!pauseMatches);
      login({ ...user, pauseMatches: !pauseMatches });
      enqueueSnackbar('Match settings updated ✅', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update settings', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Paper
        elevation={3}
        sx={{ p: 4, borderRadius: 3, textAlign: 'center', mb: 3 }}
      >
        {/* Profile Header */}
        <Avatar
          src={`/assets/${user?.avatar}`}
          sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
        />
        <Typography variant="h5" fontWeight="bold">
          {user?.username}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {user?.bio || 'No bio yet'}
        </Typography>

        {/* Quick Actions */}
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/onboarding')}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
        >
          Edit Profile
        </Button>
      </Paper>

      {/* Profile Details */}
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Details
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Typography>
          <strong>Goals:</strong> {user?.goals?.join(', ') || 'None set'}
        </Typography>
        <Typography>
          <strong>Preferences:</strong>{' '}
          {user?.preferences?.join(', ') || 'None set'}
        </Typography>
        <Typography>
          <strong>Location:</strong> {user?.location || 'Not provided'}
        </Typography>
        <Typography>
          <strong>Gender:</strong> {user?.gender || 'Not specified'}
        </Typography>
        <Typography>
          <strong>Looking For:</strong>{' '}
          {user?.genderPreference || 'Not specified'}
        </Typography>

        {/* Pause Matches Toggle */}
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography>Pause Matches</Typography>
          <Switch checked={pauseMatches} onChange={togglePause} />
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile;
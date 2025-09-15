import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import { partnerAPI, matchAPI } from '../utils/api';
import { useSnackbar } from 'notistack';

const Partners = () => {
  const [goal, setGoal] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    matchAPI
      .getMatches({})
      .then((res) => setPartners(res.data))
      .catch(() =>
        enqueueSnackbar('Failed to fetch partners', { variant: 'error' })
      );
  }, [enqueueSnackbar]);

  const handleGoal = async () => {
    if (!selectedPartner)
      return enqueueSnackbar('Select a partner first', { variant: 'warning' });

    try {
      await partnerAPI.setGoal({ goal, partnerId: selectedPartner });
      setGoal('');
      enqueueSnackbar('Goal set successfully 🎯', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to set goal', { variant: 'error' });
    }
  };

  const handleCheckIn = async () => {
    try {
      await partnerAPI.checkIn({ message: checkIn });
      setCheckIn('');
      enqueueSnackbar('Check-in recorded ✅', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to check in', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Partner Hub
      </Typography>

      {/* Partner Selection */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom>
          Choose a Partner
        </Typography>
        <Select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          fullWidth
        >
          <MenuItem value="">-- Select Partner --</MenuItem>
          {partners.map((p) => (
            <MenuItem key={p._id} value={p._id}>
              {p.username}
            </MenuItem>
          ))}
        </Select>
      </Paper>

      {/* Shared Goal Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom>
          Shared Goal
        </Typography>
        <TextField
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="E.g., Run 5K together"
          fullWidth
        />
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleGoal}
        >
          Set Goal
        </Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Daily Check-in */}
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom>
          Daily Check-in
        </Typography>
        <TextField
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          placeholder="Share your progress or mood..."
          multiline
          rows={3}
          fullWidth
        />
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleCheckIn}
        >
          Check In
        </Button>
      </Paper>
    </Box>
  );
};

export default Partners;

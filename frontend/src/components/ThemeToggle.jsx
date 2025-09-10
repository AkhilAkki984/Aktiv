import React, { useContext } from 'react';
import { ToggleButton } from '@mui/material';
import { ThemeContext } from '../context/ThemeContext.jsx';

const ThemeToggle = () => {
  const { mode, toggleMode } = useContext(ThemeContext);
  return (
    <ToggleButton value="mode" selected={mode === 'dark'} onChange={toggleMode}>
      {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
    </ToggleButton>
  );
};

export default ThemeToggle;
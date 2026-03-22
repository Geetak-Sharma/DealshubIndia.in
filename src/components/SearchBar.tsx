import React, { useState, useEffect } from 'react';
import { TextField, InputAdornment, IconButton, ThemeProvider, createTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

// Material UI mapping to the custom CSS variable system defined in base.css
const theme = createTheme({
  palette: {
    mode: 'dark', // Native dark mode layout handling
  },
  typography: {
    fontFamily: 'inherit',
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: 'var(--text-primary)',
          backgroundColor: 'var(--surface-color)',
          borderRadius: '50px', // Pill-style standard
          transition: 'all 0.2s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--border-color)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--text-secondary)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary-color)',
          },
        },
      },
    },
  },
});

export default function SearchBar() {
  const [query, setQuery] = useState('');

  // 300ms Native Debounce mechanism emitting to Window for decoupled DOM logic
  useEffect(() => {
    const handler = setTimeout(() => {
      const event = new CustomEvent('deals-search', {
        detail: { query: query.trim() }
      });
      window.dispatchEvent(event);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  return (
    <ThemeProvider theme={theme}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search deals (Amazon, Flipkart...)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'var(--text-muted)' }} />
            </InputAdornment>
          ),
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={() => setQuery('')}
                edge="end"
                size="small"
                sx={{ color: 'var(--text-muted)' }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
        sx={{
          maxWidth: '400px', // Expand organically in header grid
          width: '100%',
        }}
      />
    </ThemeProvider>
  );
}

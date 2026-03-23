import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '@/theme';
import App from '@/App';

describe('App', () => {
  it('shows catalog login prompt when not authenticated', async () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    );
    expect(await screen.findByText(/Bitte melden Sie sich an/)).toBeInTheDocument();
  });
});

import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignOut from './signout';
import { useAuth } from '../auth/authHelpers';
import { useNavigate } from 'react-router-dom';

// Mock the auth context
vi.mock('../auth/authHelpers', () => ({
  useAuth: vi.fn(() => ({
    logout: vi.fn(),
  })),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SignOut baseline test', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    // Mock the return value of useAuth
    useAuth.mockReturnValue({
      logout: mockLogout,
    });

    // Reset mocks
    mockLogout.mockReset();
    mockNavigate.mockReset();

    // Render popup
    render(<SignOut />);
  });

  // Sign out confirmed SUCCESS
  it('calls logout and navigates to /home when confirmed', async () => {
    const confirmButton = screen.getByRole('button', {
      name: /yes, sign out/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/home', { replace: true }); // Verify redirect after logout
    });
  });

  // Sign out cancel
  it('navigates back when cancel is clicked', () => {
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1); // Verify back navigation
  });

  // Sign out modal background click
  it('navigates back when clicking outside modal', () => {
    const background = document.querySelector('.SignOut');
    fireEvent.click(background);

    expect(mockNavigate).toHaveBeenCalledWith(-1); // Verify back navigation
  });

  // Sign out confirmed FAILURE
  it('does not navigate to /home if logout fails', async () => {
    // Simulate logout failure
    mockLogout.mockRejectedValueOnce(new Error('Logout failed'));

    const confirmButton = screen.getByRole('button', {
      name: /yes, sign out/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalledWith('/home', { replace: true }); // Should NOT navigate to home
    });
  });
});

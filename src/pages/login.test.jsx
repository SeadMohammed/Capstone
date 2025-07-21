import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './login';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../auth/authHelpers';
import { signInWithPopup } from 'firebase/auth';

// Mock the auth context
vi.mock('../auth/authHelpers', () => ({
  useAuth: vi.fn(() => ({
    login: vi.fn(),
    currentUser: null,
  })),
}));

// Mock signInWithPopup
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    signInWithPopup: vi.fn(() => Promise.resolve({ user: { uid: '123' } })),
  };
});

describe('Login baseline test', () => {
  const mockLogin = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    // Mock the return value of useAuth
    useAuth.mockReturnValue({
      login: mockLogin,
      currentUser: null,
    });

    // Reset mocks
    mockLogin.mockReset();
    mockClose.mockReset();

    // Render popup
    render(
      <BrowserRouter>
        <Login onClose={mockClose} />
      </BrowserRouter>
    );
  });

  // Normal email/password login SUCCESS
  it('logs in with email and password', async () => {
    // Simulate user input
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    });

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'mypassword' },
    });

    const loginButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent.toLowerCase().includes('log'));
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'mypassword');
      expect(mockClose).toHaveBeenCalled(); // Verify modal closes
    });
  });

  // Normal email/password login FAILURE
  it('shows error when email/password login fails', async () => {
    // Simulate login failure
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'wrong@example.com' },
    });

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'wrongpassword' },
    });

    const loginButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent.toLowerCase().includes('log'));
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled(); // Should NOT close modal
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  // Google login SUCCESS
  it('logs in with Google when button is clicked', async () => {
    // Simulate signInWithPopup success
    signInWithPopup.mockResolvedValueOnce({});

    // Click the Google button
    fireEvent.click(screen.getByText(/continue with google/i));

    // Expect it was called with the correct values
    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled(); // Verify modal closes
    });
  });

  // Google login FAILURE
  it('shows error when Google sign-in fails', async () => {
    // Simulate signInWithPopup failure
    signInWithPopup.mockRejectedValueOnce(
      new Error('Failed to Login with Google.')
    );

    fireEvent.click(screen.getByText(/continue with google/i));

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled(); // Should NOT close modal
      expect(
        screen.getByText(/Failed to Login with Google./i)
      ).toBeInTheDocument();
    });
  });
});

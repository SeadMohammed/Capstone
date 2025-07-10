import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUp from './signup';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../auth/authHelpers';
import { signInWithPopup } from 'firebase/auth';

// Mock the auth context
vi.mock('../auth/authHelpers', () => ({
  useAuth: vi.fn(() => ({
    signup: vi.fn(),
    currentUser: null,
  })),
}));

// Mock signInWithPopup from firebase
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    signInWithPopup: vi.fn(() => Promise.resolve({ user: { uid: '123' } })),
  };
});

describe('SignUp baseline test', () => {
  const mockSignup = vi.fn();
  const mockClose = vi.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({
      signup: mockSignup,
      currentUser: null,
    });

    mockSignup.mockReset();
    mockClose.mockReset();
    signInWithPopup.mockClear();

    render(
      <BrowserRouter>
        <SignUp onClose={mockClose} />
      </BrowserRouter>
    );
  });

  // Username/email/password signup success
  it('signs up with username, email, and password', async () => {
    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'pooper' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'testpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        'pooper',
        'test@example.com',
        'testpass'
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });

  // Username/email/password signup failure
  it('shows error on signup failure', async () => {
    mockSignup.mockRejectedValueOnce(new Error('Failed to signup'));

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'pooper' },
    });
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'testpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled();
      expect(screen.getByText(/Failed to signup/i)).toBeInTheDocument();
    });
  });

  // Google signup success
  it('signs up with Google', async () => {
    signInWithPopup.mockResolvedValueOnce({ user: { uid: '123' } });

    fireEvent.click(screen.getByText(/sign up with google/i));

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  // Google signup failure
  it('shows error on Google signup failure', async () => {
    signInWithPopup.mockRejectedValueOnce(
      new Error('Failed to signup with Google')
    );

    fireEvent.click(screen.getByText(/sign up with google/i));

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled();
      expect(
        screen.getByText(/failed to signup with google/i)
      ).toBeInTheDocument();
    });
  });
});


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
            currentUser: null
        });

        // Reset mocks
        mockLogin.mockReset();
        mockClose.mockReset();

        signInWithPopup.mockResolvedValueOnce({});

        // Render popup
        render(
        <BrowserRouter>
            <Login onClose={mockClose} />
        </BrowserRouter>
        );
    });

    // Normal email/password login
    it('logs in with email and password', async () => {
        // Simulate user input
        fireEvent.change(screen.getByPlaceholderText(/email/i), {
            target: { value: 'test@example.com' }
        });

        fireEvent.change(screen.getByPlaceholderText(/password/i), {
            target: { value: 'mypassword' }
        });

        const loginButton = screen.getAllByRole('button').find(btn =>
            btn.textContent.toLowerCase().includes('log')
        );
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'mypassword');
            expect(mockClose).toHaveBeenCalled(); // Verify modal closes
        });
    });

    // Google login
    it('logs in with Google when button is clicked', async () => {
        // Click the Google button
        fireEvent.click(screen.getByText(/continue with google/i));

        // Expect it was called with the correct values
        await waitFor(() => {
            expect(signInWithPopup).toHaveBeenCalled();
            expect(mockClose).toHaveBeenCalled(); // Verify modal closes
        });
    });

});

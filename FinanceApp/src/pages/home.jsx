import { useAuth } from '../auth/authHelpers'
export default function Home() {
    const {currentUser} = useAuth();

    if (!currentUser) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <h1>LOGGEDOUT HOMEPAGE</h1>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Welcome back, {currentUser.displayName }!</h1>
        </div>
    );
}

import { useAuth } from '../auth/authHelpers'
import { useState, useEffect } from 'react'
import { getGoals } from '../firebase/goalsService'

export default function Home() {
    const {currentUser} = useAuth();
    const [goals, setGoals] = useState([]);

    const fetchGoals = async () => {
        try {
            if (!currentUser?.uid) return;
            const fetchedGoals = await getGoals(currentUser.uid);
            console.log('Fetched goals:', fetchedGoals);
            setGoals(fetchedGoals);
        } catch (error) {
            console.error('Error fetching goals:', error);
        }
    };

    // Get upcoming goals (due within 30 days, including overdue)
    const getUpcomingGoals = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)); // Include overdue goals from last 7 days
        
        return goals
            .filter(goal => {
                if (!goal.dueDate) return false;
                const dueDate = new Date(goal.dueDate);
                dueDate.setHours(0, 0, 0, 0); // Reset time to start of day
                // Include goals from 7 days ago to 30 days in the future
                return dueDate >= sevenDaysAgo && dueDate <= thirtyDaysFromNow;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 6); // Show max 6 upcoming goals
    };

    // Get days until due
    const getDaysUntil = (dueDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'tomorrow';
        if (diffDays < 7) return `in ${diffDays} days`;
        return `${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    // Get progress percentage
    const getProgress = (current, target) => {
        if (!target || target === 0) return 0;
        return Math.round((current / target) * 100);
    };

    // Get priority icon
    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high': return '🔥';
            case 'medium': return '⚡';
            case 'low': return '🌱';
            default: return '📋';
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchGoals();
        }
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div>
                <h1>Please log in to view your goals</h1>
            </div>
        );
    }

    const upcomingGoals = getUpcomingGoals();
    console.log('All goals:', goals);
    console.log('Upcoming goals:', upcomingGoals);

    return (
        <div className="home-dashboard">
            <div className="welcome-section">
                <h1>Welcome back, {currentUser.displayName}!</h1>
                <p>Here's what's coming up for your goals</p>
            </div>

            {upcomingGoals.length > 0 && (
                <div className="upcoming-section">
                    <h2 className="section-title">Upcoming Goals</h2>
                    <div className="upcoming-goals-container">
                        {upcomingGoals.map((goal) => {
                            const progress = getProgress(goal.currentAmount, goal.targetAmount);
                            const daysUntil = getDaysUntil(goal.dueDate);
                            
                            return (
                                <div key={goal.id} className="upcoming-goal-card">
                                    <div className="goal-timeline">
                                        <span className="goal-due-date">{daysUntil}</span>
                                        <div className="goal-priority">
                                            {getPriorityIcon(goal.priority)}
                                        </div>
                                    </div>
                                    
                                    <div className="goal-content">
                                        <h3 className="goal-title">{goal.title}</h3>
                                        <div className="goal-amount">
                                            ${goal.currentAmount?.toLocaleString() || 0}
                                        </div>
                                        <div className="goal-progress-bar">
                                            <div 
                                                className="goal-progress-fill" 
                                                style={{ 
                                                    width: `${Math.min(progress, 100)}%`,
                                                    backgroundColor: progress >= 80 ? '#10b981' : 
                                                                   progress >= 60 ? '#f59e0b' : 
                                                                   progress >= 40 ? '#f97316' : '#ef4444'
                                                }}
                                            ></div>
                                        </div>
                                        <span className="goal-progress-text">{progress}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {upcomingGoals.length === 0 && (
                <div className="no-upcoming">
                    <h2>No upcoming goals</h2>
                    <p>You're all caught up! Consider setting some new goals to track your progress.</p>
                </div>
            )}
        </div>
    );
}

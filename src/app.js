// Main Application Entry Point
// Initializes all modules and manages app state

import { AuthManager } from './auth/authManager.js';
import { DatabaseClient } from './api/databaseClient.js';
import { BidScorer } from './scoring/bidScorer.js';

class BidIntellApp {
    constructor() {
        this.supabase = null;
        this.auth = null;
        this.db = null;
        this.scorer = null;
        this.currentUser = null;
        this.userSettings = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize Supabase
            const SUPABASE_URL = 'https://szifhqmrddmdkgschkkw.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aWZocW1yZGRtZGtnc2Noa2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTkyMDUsImV4cCI6MjA4NDY3NTIwNX0.XSStBZABbfJRMkGqwG-uh2X6nco7GqtiIxUg_0HHlZE';

            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Initialize managers
            this.auth = new AuthManager(this.supabase);
            this.db = new DatabaseClient(this.supabase);

            // Setup auth listener
            this.auth.onAuthChange(async (data) => {
                await this.handleAuthChange(data);
            });

            // Check for existing session
            const user = await this.auth.init();

            if (user) {
                await this.onUserAuthenticated(user);
            } else {
                this.showAuthScreen();
            }

        } catch (error) {
            console.error('App initialization error:', error);
            if (window.toast) {
                toast.error('Failed to initialize app. Please refresh.');
            }
        }
    }

    /**
     * Handle authentication state changes
     */
    async handleAuthChange(data) {
        console.log('Auth change:', data.type);

        switch (data.type) {
            case 'SIGNED_IN':
                await this.onUserAuthenticated(data.user);
                break;
            case 'SIGNED_OUT':
                this.onUserSignedOut();
                break;
            case 'TOKEN_REFRESHED':
                console.log('Session refreshed');
                break;
        }
    }

    /**
     * User authenticated successfully
     */
    async onUserAuthenticated(user) {
        this.currentUser = user;

        // Initialize API client with user ID
        if (window.apiClient) {
            window.apiClient.setUserId(user.id);
        }

        try {
            // Load user settings
            this.userSettings = await this.db.getUserSettings(user.id);

            // Initialize scorer
            this.scorer = new BidScorer(this.userSettings);

            // Check if onboarding is complete
            if (!this.userSettings.onboarding_completed) {
                this.showOnboarding();
            } else {
                this.showMainApp();
            }

        } catch (error) {
            console.error('Error loading user data:', error);

            // If settings don't exist, show onboarding
            if (error.message?.includes('No rows found')) {
                this.showOnboarding();
            } else {
                if (window.toast) {
                    toast.error('Failed to load user settings');
                }
            }
        }
    }

    /**
     * User signed out
     */
    onUserSignedOut() {
        this.currentUser = null;
        this.userSettings = null;
        this.scorer = null;

        // Clear any cached data
        this.showAuthScreen();

        if (window.toast) {
            toast.info('Signed out successfully');
        }
    }

    /**
     * Show authentication screen
     */
    showAuthScreen() {
        // Hide all screens
        document.querySelectorAll('[data-screen]').forEach(screen => {
            screen.style.display = 'none';
        });

        // Show auth screen
        const authScreen = document.querySelector('[data-screen="auth"]');
        if (authScreen) {
            authScreen.style.display = 'flex';
        }
    }

    /**
     * Show onboarding flow
     */
    showOnboarding() {
        document.querySelectorAll('[data-screen]').forEach(screen => {
            screen.style.display = 'none';
        });

        const onboardingScreen = document.querySelector('[data-screen="onboarding"]');
        if (onboardingScreen) {
            onboardingScreen.style.display = 'block';
        }
    }

    /**
     * Show main application
     */
    showMainApp() {
        document.querySelectorAll('[data-screen]').forEach(screen => {
            screen.style.display = 'none';
        });

        const appScreen = document.querySelector('[data-screen="app"]');
        if (appScreen) {
            appScreen.style.display = 'flex';
        }

        // Load initial data
        this.loadDashboardData();
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            // Load projects, GCs, keywords in parallel
            const [projects, gcs, keywords] = await Promise.all([
                this.db.getProjects(this.currentUser.id, { limit: 50 }),
                this.db.getGCs(this.currentUser.id),
                this.db.getKeywords(this.currentUser.id)
            ]);

            // Store in app state
            this.projects = projects;
            this.gcs = gcs;
            this.keywords = keywords;

            // Update UI (this would call UI update functions)
            if (window.updateDashboard) {
                window.updateDashboard({ projects, gcs, keywords });
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            if (window.toast) {
                toast.error('Failed to load dashboard data');
            }
        }
    }

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Get user settings
     */
    getSettings() {
        return this.userSettings;
    }

    /**
     * Get scorer instance
     */
    getScorer() {
        return this.scorer;
    }
}

// Create global app instance
window.app = new BidIntellApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.app.init());
} else {
    window.app.init();
}

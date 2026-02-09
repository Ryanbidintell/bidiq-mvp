// Authentication Manager
// Handles Supabase auth, session management, and user state

export class AuthManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.onAuthChangeCallbacks = [];
    }

    /**
     * Initialize auth and check for existing session
     */
    async init() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) throw error;

            if (session) {
                this.currentUser = session.user;
                this.notifyAuthChange({ type: 'SIGNED_IN', user: session.user });
                return session.user;
            }

            return null;
        } catch (error) {
            console.error('Auth init error:', error);
            throw error;
        }
    }

    /**
     * Listen for auth state changes
     */
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);

        // Setup Supabase auth listener
        this.supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.notifyAuthChange({ type: event, user: session?.user, session });
        });
    }

    /**
     * Notify all listeners of auth changes
     */
    notifyAuthChange(data) {
        this.onAuthChangeCallbacks.forEach(callback => callback(data));
    }

    /**
     * Sign up new user
     */
    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });

            if (error) throw error;

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in existing user
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();

            if (error) throw error;

            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password'
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user password
     */
    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Password update error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Get user ID
     */
    getUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * Get user email
     */
    getUserEmail() {
        return this.currentUser?.email || null;
    }
}

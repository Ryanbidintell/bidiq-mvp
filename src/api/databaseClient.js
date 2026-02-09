// Database Client
// Supabase CRUD operations for all tables

export class DatabaseClient {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    // ==================== USER SETTINGS ====================

    async getUserSettings(userId) {
        const { data, error } = await this.supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    async upsertUserSettings(userId, settings) {
        const { data, error } = await this.supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                ...settings,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ==================== PROJECTS ====================

    async getProjects(userId, filters = {}) {
        let query = this.supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (filters.outcome) {
            query = query.eq('outcome', filters.outcome);
        }

        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    async getProject(projectId) {
        const { data, error } = await this.supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) throw error;
        return data;
    }

    async createProject(userId, project) {
        const { data, error } = await this.supabase
            .from('projects')
            .insert({
                user_id: userId,
                ...project
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateProject(projectId, updates) {
        const { data, error } = await this.supabase
            .from('projects')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteProject(projectId) {
        const { error } = await this.supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;
    }

    // ==================== GENERAL CONTRACTORS ====================

    async getGCs(userId) {
        const { data, error } = await this.supabase
            .from('general_contractors')
            .select('*')
            .eq('user_id', userId)
            .order('name');

        if (error) throw error;
        return data || [];
    }

    async createGC(userId, gc) {
        const { data, error } = await this.supabase
            .from('general_contractors')
            .insert({
                user_id: userId,
                ...gc
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateGC(gcId, updates) {
        const { data, error } = await this.supabase
            .from('general_contractors')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', gcId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteGC(gcId) {
        const { error } = await this.supabase
            .from('general_contractors')
            .delete()
            .eq('id', gcId);

        if (error) throw error;
    }

    // ==================== KEYWORDS ====================

    async getKeywords(userId) {
        const { data, error } = await this.supabase
            .from('keywords')
            .select('*')
            .eq('user_id', userId)
            .order('keyword');

        if (error) throw error;
        return data || [];
    }

    async createKeyword(userId, keyword, type) {
        const { data, error } = await this.supabase
            .from('keywords')
            .insert({
                user_id: userId,
                keyword,
                type
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteKeyword(keywordId) {
        const { error } = await this.supabase
            .from('keywords')
            .delete()
            .eq('id', keywordId);

        if (error) throw error;
    }

    // ==================== BETA FEEDBACK ====================

    async submitFeedback(userId, feedback) {
        const { data, error } = await this.supabase
            .from('beta_feedback')
            .insert({
                user_id: userId,
                ...feedback
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getFeedback(userId, filters = {}) {
        let query = this.supabase
            .from('beta_feedback')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (filters.type) {
            query = query.eq('feedback_type', filters.type);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    }

    // ==================== API USAGE TRACKING ====================

    async logAPIUsage(userId, usage) {
        const { error } = await this.supabase
            .from('api_usage')
            .insert({
                user_id: userId,
                ...usage
            });

        if (error) console.error('Failed to log API usage:', error);
    }
}

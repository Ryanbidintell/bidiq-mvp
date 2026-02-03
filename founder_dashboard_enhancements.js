// ============================================
// FOUNDER DASHBOARD ENHANCEMENTS
// Add these functions to BidIQ_Founder_Dashboard.html
// ============================================

// ============================================
// 1. BETA INVITE SYSTEM
// ============================================

// Replace the existing login() function with this:
async function login() {
    const code = document.getElementById('inviteCode').value.trim().toUpperCase();
    const email = document.getElementById('adminEmail').value.trim();

    if (!code || !email) {
        document.getElementById('loginError').textContent = 'Please enter both email and invite code';
        document.getElementById('loginError').style.display = 'block';
        return;
    }

    try {
        const { data: invite, error } = await supabaseClient
            .from('beta_invites')
            .select('*')
            .eq('invite_code', code)
            .eq('is_active', true)
            .single();

        if (error || !invite) {
            document.getElementById('loginError').textContent = 'Invalid or inactive invite code';
            document.getElementById('loginError').style.display = 'block';
            return;
        }

        const now = new Date().toISOString();
        await supabaseClient
            .from('beta_invites')
            .update({
                email: email,
                first_used_at: invite.first_used_at || now,
                last_active_at: now,
                usage_count: (invite.usage_count || 0) + 1
            })
            .eq('invite_code', code);

        sessionStorage.setItem('bidiq_admin', 'true');
        sessionStorage.setItem('bidiq_invite_code', code);
        sessionStorage.setItem('bidiq_admin_email', email);

        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        refreshData();
    } catch (e) {
        console.error('Login error:', e);
        document.getElementById('loginError').textContent = 'Login failed: ' + e.message;
        document.getElementById('loginError').style.display = 'block';
    }
}

// ============================================
// 2. AI SCORE ACCURACY ANALYSIS
// ============================================

async function loadScoreAccuracy() {
    try {
        const { data: projects } = await supabaseClient
            .from('projects')
            .select('*')
            .neq('outcome', 'pending');

        if (!projects || projects.length === 0) {
            document.getElementById('scoreAccuracyContent').innerHTML =
                '<p style="text-align:center;color:var(--text-muted);padding:40px;">No completed projects yet</p>';
            return;
        }

        const falsePositives = [];
        const falseNegatives = [];
        const userDisagreements = [];

        projects.forEach(p => {
            const score = p.scores?.final || 0;
            const recommendation = score >= 80 ? 'GO' : score >= 60 ? 'REVIEW' : 'PASS';
            const outcome = p.outcome;
            const userAgreement = p.user_agreement;

            // False Positives: AI said GO but user lost/declined
            if (recommendation === 'GO' && (outcome === 'lost' || outcome === 'declined')) {
                falsePositives.push(p);
            }

            // False Negatives: AI said PASS but user won
            if (recommendation === 'PASS' && outcome === 'won') {
                falseNegatives.push(p);
            }

            // User Disagreements
            if (userAgreement && userAgreement !== 'agree') {
                userDisagreements.push({
                    ...p,
                    disagreementType: userAgreement
                });
            }
        });

        let html = `
            <div class="stats-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
                <div class="stat-box" style="padding:20px;background:var(--bg-tertiary);border-radius:8px;">
                    <div style="font-size:32px;font-weight:700;color:var(--danger);">${falsePositives.length}</div>
                    <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">False Positives</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">AI said GO, but lost/declined</div>
                </div>
                <div class="stat-box" style="padding:20px;background:var(--bg-tertiary);border-radius:8px;">
                    <div style="font-size:32px;font-weight:700;color:var(--warning);">${falseNegatives.length}</div>
                    <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">False Negatives</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">AI said PASS, but won</div>
                </div>
                <div class="stat-box" style="padding:20px;background:var(--bg-tertiary);border-radius:8px;">
                    <div style="font-size:32px;font-weight:700;color:var(--accent);">${userDisagreements.length}</div>
                    <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">User Disagreements</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">User marked score wrong</div>
                </div>
            </div>
        `;

        // Show false positives
        if (falsePositives.length > 0) {
            html += `<h4 style="margin:24px 0 12px;color:var(--danger);">⚠️ False Positives (${falsePositives.length})</h4>`;
            falsePositives.slice(0, 5).forEach(p => {
                const data = typeof p.extracted_data === 'string' ? JSON.parse(p.extracted_data) : p.extracted_data;
                html += `
                    <div style="padding:16px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:12px;border-left:4px solid var(--danger);">
                        <div style="font-weight:600;">${data?.project_name || 'Unnamed Project'} - Score: ${p.scores?.final || 'N/A'}</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Outcome: ${p.outcome} |
                        ${p.outcome_data?.reasons ? 'Reasons: ' + JSON.parse(p.outcome_data).reasons.join(', ') : ''}</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;font-style:italic;">
                            💡 Suggestion: Algorithm may be too optimistic for these conditions
                        </div>
                    </div>
                `;
            });
        }

        // Show false negatives
        if (falseNegatives.length > 0) {
            html += `<h4 style="margin:24px 0 12px;color:var(--warning);">📈 False Negatives (${falseNegatives.length})</h4>`;
            falseNegatives.slice(0, 5).forEach(p => {
                const data = typeof p.extracted_data === 'string' ? JSON.parse(p.extracted_data) : p.extracted_data;
                html += `
                    <div style="padding:16px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:12px;border-left:4px solid var(--warning);">
                        <div style="font-weight:600;">${data?.project_name || 'Unnamed Project'} - Score: ${p.scores?.final || 'N/A'}</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Won this bid despite low score</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;font-style:italic;">
                            💡 Suggestion: Algorithm may be too conservative - missing opportunities
                        </div>
                    </div>
                `;
            });
        }

        document.getElementById('scoreAccuracyContent').innerHTML = html;
    } catch (e) {
        console.error('Score accuracy error:', e);
        document.getElementById('scoreAccuracyContent').innerHTML = '<p>Error loading data</p>';
    }
}

// ============================================
// 3. USER COHORT ANALYSIS
// ============================================

async function loadCohortAnalysis() {
    try {
        const { data: users } = await supabaseClient
            .from('user_settings')
            .select('user_id, created_at');

        const { data: projects } = await supabaseClient
            .from('projects')
            .select('user_id, created_at');

        if (!users || users.length === 0) {
            document.getElementById('cohortContent').innerHTML =
                '<p style="text-align:center;color:var(--text-muted);padding:40px;">No users yet</p>';
            return;
        }

        // Group users by week
        const cohorts = {};
        const now = new Date();

        users.forEach(u => {
            const created = new Date(u.created_at);
            const weeksDiff = Math.floor((now - created) / (7 * 24 * 60 * 60 * 1000));
            const cohortKey = weeksDiff === 0 ? 'This Week' : weeksDiff === 1 ? 'Last Week' : `${weeksDiff} weeks ago`;

            if (!cohorts[cohortKey]) {
                cohorts[cohortKey] = {
                    users: [],
                    weeksDiff
                };
            }
            cohorts[cohortKey].users.push(u.user_id);
        });

        // Calculate metrics for each cohort
        let html = '';
        Object.entries(cohorts)
            .sort((a, b) => a[1].weeksDiff - b[1].weeksDiff)
            .forEach(([cohortName, cohort]) => {
                const userIds = cohort.users;
                const totalUsers = userIds.length;

                // Count active users (with at least 1 project)
                const activeUsers = userIds.filter(uid =>
                    projects.some(p => p.user_id === uid)
                ).length;

                // Count bids per user
                const bidsPerUser = userIds.map(uid =>
                    projects.filter(p => p.user_id === uid).length
                );
                const avgBids = bidsPerUser.length > 0
                    ? (bidsPerUser.reduce((a, b) => a + b, 0) / bidsPerUser.length).toFixed(1)
                    : 0;

                const retentionRate = ((activeUsers / totalUsers) * 100).toFixed(0);

                html += `
                    <div style="padding:20px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <h4 style="font-size:16px;font-weight:600;">${cohortName}</h4>
                            <span style="font-size:24px;font-weight:700;color:var(--accent);">${retentionRate}%</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:13px;">
                            <div>
                                <div style="color:var(--text-muted);">Total Users</div>
                                <div style="font-size:20px;font-weight:600;margin-top:4px;">${totalUsers}</div>
                            </div>
                            <div>
                                <div style="color:var(--text-muted);">Active Users</div>
                                <div style="font-size:20px;font-weight:600;margin-top:4px;">${activeUsers}</div>
                            </div>
                            <div>
                                <div style="color:var(--text-muted);">Avg Bids/User</div>
                                <div style="font-size:20px;font-weight:600;margin-top:4px;">${avgBids}</div>
                            </div>
                        </div>
                        <div style="margin-top:12px;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;">
                            <div style="width:${retentionRate}%;height:100%;background:var(--accent);"></div>
                        </div>
                    </div>
                `;
            });

        document.getElementById('cohortContent').innerHTML = html;
    } catch (e) {
        console.error('Cohort analysis error:', e);
        document.getElementById('cohortContent').innerHTML = '<p>Error loading data</p>';
    }
}

// ============================================
// 4. FEATURE USAGE HEATMAP
// ============================================

async function loadFeatureUsage() {
    try {
        const { data: projects } = await supabaseClient
            .from('projects')
            .select('*');

        const { data: gcs } = await supabaseClient
            .from('general_contractors')
            .select('risk_tags');

        if (!projects || projects.length === 0) {
            document.getElementById('featureUsageContent').innerHTML =
                '<p style="text-align:center;color:var(--text-muted);padding:40px;">No data yet</p>';
            return;
        }

        const totalProjects = projects.length;

        // Calculate feature usage
        const withFeedback = projects.filter(p => p.user_agreement && p.user_agreement !== 'agree').length;
        const withOutcome = projects.filter(p => p.outcome && p.outcome !== 'pending').length;
        const withDeclineReasons = projects.filter(p => {
            if (p.outcome !== 'declined') return false;
            const data = typeof p.outcome_data === 'string' ? JSON.parse(p.outcome_data) : p.outcome_data;
            return data?.reasons && data.reasons.length > 0;
        }).length;

        const gcsWithRiskTags = gcs ? gcs.filter(gc => gc.risk_tags && gc.risk_tags.length > 0).length : 0;
        const totalGCs = gcs ? gcs.length : 0;

        const features = [
            { name: 'Score Feedback', count: withFeedback, total: totalProjects, description: 'Users marked score as too high/low' },
            { name: 'Outcomes Recorded', count: withOutcome, total: totalProjects, description: 'Projects with won/lost/ghosted/declined' },
            { name: 'Decline Reasons', count: withDeclineReasons, total: totalProjects, description: 'Structured reasons for passing' },
            { name: 'GC Risk Tags', count: gcsWithRiskTags, total: totalGCs, description: 'GCs tagged with risk factors' }
        ];

        let html = '';
        features.forEach(f => {
            const percent = f.total > 0 ? ((f.count / f.total) * 100).toFixed(0) : 0;
            const color = percent > 70 ? 'var(--success)' : percent > 40 ? 'var(--warning)' : 'var(--danger)';

            html += `
                <div style="margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div>
                            <div style="font-weight:600;">${f.name}</div>
                            <div style="font-size:12px;color:var(--text-muted);">${f.description}</div>
                        </div>
                        <div style="font-size:24px;font-weight:700;color:${color};">${percent}%</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="flex:1;height:12px;background:var(--bg-tertiary);border-radius:6px;overflow:hidden;">
                            <div style="width:${percent}%;height:100%;background:${color};transition:width 0.3s;"></div>
                        </div>
                        <div style="font-size:13px;color:var(--text-muted);min-width:80px;text-align:right;">
                            ${f.count} / ${f.total}
                        </div>
                    </div>
                </div>
            `;
        });

        // Data Moat Health Score
        const avgUsage = features.reduce((sum, f) => sum + (f.total > 0 ? (f.count / f.total) * 100 : 0), 0) / features.length;
        const healthColor = avgUsage > 70 ? 'var(--success)' : avgUsage > 40 ? 'var(--warning)' : 'var(--danger)';
        const healthStatus = avgUsage > 70 ? 'Excellent' : avgUsage > 40 ? 'Good' : 'Needs Improvement';

        html += `
            <div style="margin-top:32px;padding:20px;background:var(--bg-tertiary);border-radius:8px;border-left:4px solid ${healthColor};">
                <div style="font-weight:600;margin-bottom:8px;">📊 Data Moat Health Score</div>
                <div style="font-size:32px;font-weight:700;color:${healthColor};">${avgUsage.toFixed(0)}%</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Status: ${healthStatus}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:12px;font-style:italic;">
                    ${avgUsage > 70 ? '✅ Users are actively building the data moat!' :
                      avgUsage > 40 ? '⚠️ Moderate engagement - encourage more feature usage' :
                      '🚨 Low engagement - users not using key features'}
                </div>
            </div>
        `;

        document.getElementById('featureUsageContent').innerHTML = html;
    } catch (e) {
        console.error('Feature usage error:', e);
        document.getElementById('featureUsageContent').innerHTML = '<p>Error loading data</p>';
    }
}

// ============================================
// UPDATE REFRESH FUNCTION
// ============================================

// Add to the existing refreshData() function:
// await Promise.all([
//     loadCoreMetrics(),
//     loadScoringValidation(),
//     loadOutcomes(),
//     loadDeclineReasons(),
//     loadGCIntelligence(),
//     loadRecentActivity(),
//     loadUserActivity(),
//     loadScoreAccuracy(),      // NEW
//     loadCohortAnalysis(),     // NEW
//     loadFeatureUsage()        // NEW
// ]);

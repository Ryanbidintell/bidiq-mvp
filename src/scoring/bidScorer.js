// Bid Scoring Algorithm
// Calculates BidIndex score based on location, keywords, GC, and trades

export class BidScorer {
    constructor(userSettings) {
        this.settings = userSettings;
        this.weights = userSettings.weights || {
            location: 25,
            keywords: 30,
            gc: 25,
            trade: 20
        };
    }

    /**
     * Calculate comprehensive bid score
     */
    calculateScore(project, userGCs, userKeywords) {
        const components = {
            location: this.scoreLocation(project),
            keywords: this.scoreKeywords(project, userKeywords),
            gc: this.scoreGC(project, userGCs),
            trade: this.scoreTrade(project)
        };

        // Calculate weighted final score
        const finalScore = Math.round(
            (components.location.score * this.weights.location / 100) +
            (components.keywords.score * this.weights.keywords / 100) +
            (components.gc.score * this.weights.gc / 100) +
            (components.trade.score * this.weights.trade / 100)
        );

        // Determine recommendation
        let recommendation;
        if (finalScore >= 80) recommendation = 'GO';
        else if (finalScore >= 60) recommendation = 'REVIEW';
        else recommendation = 'PASS';

        return {
            final: finalScore,
            recommendation,
            components,
            weights: this.weights
        };
    }

    /**
     * Score based on location/distance
     */
    scoreLocation(project) {
        const distance = project.distance || 999;
        const maxDistance = this.settings.search_radius || 50;

        let score, reason;

        if (distance <= maxDistance * 0.3) {
            score = 100;
            reason = `Very close (${Math.round(distance)} mi) - minimal travel costs`;
        } else if (distance <= maxDistance * 0.6) {
            score = 85;
            reason = `Close (${Math.round(distance)} mi) - reasonable travel`;
        } else if (distance <= maxDistance) {
            score = 70;
            reason = `Within range (${Math.round(distance)} mi)`;
        } else if (distance <= maxDistance * 1.5) {
            score = 50;
            reason = `Outside preferred range (${Math.round(distance)} mi)`;
        } else {
            score = 20;
            reason = `Too far (${Math.round(distance)} mi) - high travel costs`;
        }

        return {
            score,
            reason,
            distance: Math.round(distance),
            maxDistance
        };
    }

    /**
     * Score based on keyword matches
     */
    scoreKeywords(project, userKeywords) {
        const goodKeywords = userKeywords.filter(k => k.type === 'good');
        const riskKeywords = userKeywords.filter(k => k.type === 'risk');

        const projectText = (project.full_text || '').toLowerCase();

        const goodMatches = goodKeywords.filter(k =>
            projectText.includes(k.keyword.toLowerCase())
        );

        const riskMatches = riskKeywords.filter(k =>
            projectText.includes(k.keyword.toLowerCase())
        );

        let score = 50; // Base score

        // Add points for good matches (up to +40)
        const goodBonus = Math.min(goodMatches.length * 10, 40);
        score += goodBonus;

        // Subtract points for risk matches (up to -30)
        const riskPenalty = Math.min(riskMatches.length * 10, 30);
        score -= riskPenalty;

        // Clamp to 0-100
        score = Math.max(0, Math.min(100, score));

        let reason;
        if (goodMatches.length > 2 && riskMatches.length === 0) {
            reason = `Excellent match - ${goodMatches.length} preferred keywords found`;
        } else if (goodMatches.length > 0 && riskMatches.length === 0) {
            reason = `Good match - ${goodMatches.length} preferred keywords`;
        } else if (riskMatches.length > 0 && goodMatches.length === 0) {
            reason = `Contains ${riskMatches.length} risk keywords`;
        } else if (riskMatches.length > 0 && goodMatches.length > 0) {
            reason = `Mixed - ${goodMatches.length} good, ${riskMatches.length} risk keywords`;
        } else {
            reason = 'No keyword matches';
        }

        return {
            score,
            reason,
            goodMatches: goodMatches.map(k => k.keyword),
            riskMatches: riskMatches.map(k => k.keyword)
        };
    }

    /**
     * Score based on GC relationship
     */
    scoreGC(project, userGCs) {
        const projectGC = project.extracted_data?.general_contractor;

        if (!projectGC) {
            return {
                score: 50,
                reason: 'GC not identified',
                gcName: null,
                relationship: null
            };
        }

        // Find matching GC (case-insensitive)
        const matchingGC = userGCs.find(gc =>
            gc.name.toLowerCase() === projectGC.toLowerCase()
        );

        if (!matchingGC) {
            return {
                score: 50,
                reason: `New GC: ${projectGC}`,
                gcName: projectGC,
                relationship: 'unknown'
            };
        }

        // Score based on rating and win rate
        const ratingScore = (matchingGC.rating / 5) * 100;
        const winRate = matchingGC.bids > 0
            ? (matchingGC.wins / matchingGC.bids) * 100
            : 50;

        const score = Math.round((ratingScore * 0.6) + (winRate * 0.4));

        let reason;
        if (matchingGC.rating >= 4 && winRate >= 50) {
            reason = `Strong relationship - ${matchingGC.rating}★ rating, ${Math.round(winRate)}% win rate`;
        } else if (matchingGC.rating >= 3) {
            reason = `Known GC - ${matchingGC.rating}★ rating`;
        } else {
            reason = `Challenging GC - ${matchingGC.rating}★ rating`;
        }

        return {
            score,
            reason,
            gcName: matchingGC.name,
            rating: matchingGC.rating,
            winRate: Math.round(winRate),
            relationship: 'known'
        };
    }

    /**
     * Score based on trade match
     */
    scoreTrade(project) {
        const userTrades = this.settings.trades || [];
        const projectTrades = project.extracted_data?.trades || [];

        if (projectTrades.length === 0) {
            return {
                score: 50,
                reason: 'Trade scope unclear',
                matches: []
            };
        }

        const matches = projectTrades.filter(pt =>
            userTrades.some(ut => ut.toLowerCase() === pt.toLowerCase())
        );

        let score;
        if (matches.length >= 2) {
            score = 100;
        } else if (matches.length === 1) {
            score = 85;
        } else if (projectTrades.length > 0) {
            score = 40;
        } else {
            score = 50;
        }

        const reason = matches.length > 0
            ? `Matches ${matches.length} of your trades`
            : `No trade match - requires: ${projectTrades.join(', ')}`;

        return {
            score,
            reason,
            matches,
            projectTrades
        };
    }

    /**
     * Update scoring weights
     */
    updateWeights(newWeights) {
        // Ensure weights sum to 100
        const total = Object.values(newWeights).reduce((a, b) => a + b, 0);

        if (Math.abs(total - 100) > 0.1) {
            throw new Error(`Weights must sum to 100 (current: ${total})`);
        }

        this.weights = newWeights;
    }

    /**
     * Get current weights
     */
    getWeights() {
        return { ...this.weights };
    }
}

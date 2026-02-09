// Client-side API wrapper for calling secure backend
// Replaces direct Claude/OpenAI calls in app.html

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://beta.bidintell.ai';

class APIClient {
    constructor() {
        this.userId = null;
        this.maxRetries = 2;
        this.retryDelay = 1000; // 1 second
    }

    setUserId(userId) {
        this.userId = userId;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async callAI(operation, text, systemPrompt, options = {}) {
        if (!this.userId) {
            const error = 'User not authenticated. Please log in.';
            if (window.toast) toast.error(error);
            throw new Error(error);
        }

        const {
            showToast = true,
            showLoading = true,
            retries = this.maxRetries
        } = options;

        let loadingToast = null;

        if (showLoading && window.toast) {
            const messages = {
                extract_project_details: 'Analyzing document...',
                detect_contract_risks: 'Detecting contract risks...',
                generate_advisor_response: 'Generating recommendations...'
            };
            loadingToast = toast.loading(messages[operation] || 'Processing...');
        }

        let lastError = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: this.userId,
                        operation,
                        text,
                        systemPrompt
                    })
                });

                if (!response.ok) {
                    const error = await response.json();

                    // Rate limited - don't retry
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please wait a few minutes.');
                    }

                    throw new Error(error.error || `API error: ${response.status}`);
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'API request failed');
                }

                // Parse JSON response
                let parsedResult;
                try {
                    parsedResult = JSON.parse(data.result);
                } catch (parseError) {
                    console.warn('Could not parse AI response as JSON:', parseError);
                    parsedResult = { raw: data.result };
                }

                // Success!
                if (loadingToast && window.toast) {
                    toast.remove(loadingToast);
                    if (showToast) {
                        toast.success('Analysis complete!', 2000);
                    }
                }

                return {
                    success: true,
                    data: parsedResult,
                    provider: data.provider,
                    model: data.model,
                    usage: data.usage
                };

            } catch (error) {
                lastError = error;
                console.error(`[${operation}] Attempt ${attempt + 1}/${retries + 1} failed:`, error);

                // If not last attempt, wait and retry
                if (attempt < retries && error.message !== 'Rate limit exceeded. Please wait a few minutes.') {
                    console.log(`Retrying in ${this.retryDelay}ms...`);
                    await this.sleep(this.retryDelay);
                    continue;
                }

                // All retries failed
                break;
            }
        }

        // Failed after all retries
        if (loadingToast && window.toast) {
            toast.remove(loadingToast);
        }

        if (showToast && window.toast) {
            toast.error(lastError.message || 'Operation failed. Please try again.');
        }

        return {
            success: false,
            error: lastError.message
        };
    }

    /**
     * Extract project details from PDF text
     */
    async extractProjectDetails(pdfText) {
        const systemPrompt = `You are an expert at analyzing construction bid documents. Extract structured data from the provided text.

Return a JSON object with these fields:
- project_name: string
- city: string
- state: string (2-letter code)
- general_contractor: string (company name)
- building_type: string (hospital, office, multifamily, retail, industrial, education, other)
- trades: array of strings (detected trades/divisions)
- bid_due_date: string (ISO date if found)
- project_value: number (estimated value if mentioned)
- scope_description: string (brief description)

Be precise. If a field is not found, use null.`;

        return await this.callAI('extract_project_details', pdfText, systemPrompt);
    }

    /**
     * Detect contract risks
     */
    async detectContractRisks(pdfText) {
        const systemPrompt = `You are a construction contract analyst. Identify risky contract clauses.

Detect these risk types:
- pay_if_paid: Payment contingent on GC getting paid
- liquidated_damages: Financial penalties for delays
- indemnification: Broad liability clauses
- no_damages_delay: Can't claim damages for delays
- high_retainage: Retainage >10%
- slow_payment: Payment terms >60 days
- termination_convenience: Can terminate without cause
- excessive_warranty: Warranty >2 years
- insurance_requirements: Unusually high insurance

Return JSON:
{
  "risksDetected": [
    {
      "type": "risk_type_above",
      "severity": "high|medium|low",
      "confidence": 0.0-1.0,
      "context": "relevant clause text"
    }
  ]
}`;

        return await this.callAI('detect_contract_risks', pdfText, systemPrompt);
    }

    /**
     * Generate AI advisor response
     */
    async generateAdvisorResponse(projectData, scoreData, tone = 'supportive') {
        const tonePrompts = {
            supportive: 'You are a supportive mentor who encourages decision-making.',
            straight_shooter: 'You are direct and data-focused, no sugar-coating.',
            data_nerd: 'You are analytical and love diving into metrics.'
        };

        const systemPrompt = `${tonePrompts[tone] || tonePrompts.supportive}

Analyze this bid opportunity and provide insights:
- Key strengths
- Potential concerns
- Recommendation (Go/Review/Pass)
- Action items

Be concise (2-3 paragraphs). Use the user's name if provided.`;

        const context = JSON.stringify({ project: projectData, score: scoreData });
        return await this.callAI('generate_advisor_response', context, systemPrompt);
    }
}

// Export singleton instance
window.apiClient = new APIClient();

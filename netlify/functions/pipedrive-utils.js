// Pipedrive CRM utility — shared by prospect-apollo-pull, prospect-sequence, stripe-webhook
//
// Pipeline: "BidIntell Outbound" (ID 3) — BidIntell-specific; never touches other pipelines.
//
// Stage IDs (pipeline 3):
//   14 Prospect Identified — Apollo pull, pre-email
//   15 Outreach Active     — Steps 1–2 sent
//   16 Offer Sent          — Steps 3–5 sent (founding-member offer + break-up)
//   17 Engaged             — Reply or click detected (manual trigger today)
//   18 Trial Signup        — Account created at bidintell.ai
//   19 Active Customer     — First successful Stripe payment
//   20 At Risk             — 14-day login gap (paying customer only)
//   21 Churned             — Cancellation / sustained payment failure

const PIPEDRIVE_BASE = 'https://api.pipedrive.com/v1';
const PIPELINE_ID = 3;

const STAGE = {
    prospectIdentified: 14,
    outreachActive: 15,
    offerSent: 16,
    engaged: 17,
    trialSignup: 18,
    activeCustomer: 19,
    atRisk: 20,
    churned: 21,
};

// Organization custom field keys
const ORG_FIELD = {
    tradeType: '3b3288de4329af5a102533331059337e2348bf71',
    revenueBand: 'dbe70493352b9a5e922f82bf56aea6327642f9ff',
    geography: '126d19db15dc153af292eb559aea83fbcb68bc92',
    planRoomSource: '3f191d1e80d81e3c211d275f12fa4d9b485b6feb',
};

// Deal custom field keys
const DEAL_FIELD = {
    leadSource: '305a15ed20aae4072050c1efe41ea467a4ddf652',
    apolloConfidenceScore: '4f449887ffec8f4febf4507cff27b563d09efa55',
    outreachStepCompleted: 'e10a9b7733eee114196defaabcb9df2afc5ff491',
    emailOptOut: '6fe1f1474e0c205246d4334d9f40a3ffd6a6a53b',
    bidintellAccountEmail: '23b68089431452af35c70c18958c4e58848a3d18',
    accountCreatedDate: '9139071b7bd1ada459fa88fbda2d96748f8ed723',
    planType: 'e09809930e9d3234ee0bac4e7bd64ff3cc92c1e4',
    mrr: '57607af2e16e83d640d95116954010f36e5efd14',
    trialStartDate: '7ef81bf119c6d128f4da54e0e5a04c06dbb40ddd',
    paidConversionDate: '5c43f86984fd011fdca6f68e155e683eadb48776',
    churnDate: '8d8cc35df15105da1305584bd78cc2875959434e',
    winBackEligibleAfter: '46fe2504c7f0c0dc4c949710826bb96c38d8bf4e',
};

// Enum option IDs — Lead Source (deal field)
const LEAD_SOURCE = {
    apolloOutbound: 65,
    founderReferral: 66,
    inboundWeb: 67,
    linkedinOrganic: 68,
    wordOfMouth: 69,
    associationEvent: 70,
    unknown: 71,
};

// Enum option IDs — Trade Type (org field)
const TRADE_TYPE = {
    'Division 10 / Specialty': 44,
    'HVAC': 45,
    'Electrical': 46,
    'Mechanical / Plumbing': 47,
    'Plumbing': 47,
    'Concrete / Masonry': 48,
    'Steel / Structural': 49,
    'Structural Steel': 49,
    'Roofing': 50,
    'Painting': 51,
    'General': 52,
};

// Enum option IDs — Revenue Band (org field)
const REVENUE_BAND = {
    '<$2M': 54,
    '$2-5M': 55,
    '$5-10M': 56,
    '$10-20M': 57,
    '>$20M': 58,
};

function getToken() {
    return process.env.PIPEDRIVE_API_TOKEN || process.env.PIPEDRIVE_API_KEY;
}

async function pipedriveGet(path) {
    const token = getToken();
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${PIPEDRIVE_BASE}${path}${sep}api_token=${token}`);
    if (!res.ok) throw new Error(`Pipedrive GET ${path} → ${res.status}`);
    return res.json();
}

async function pipedrivePost(path, body) {
    const token = getToken();
    const res = await fetch(`${PIPEDRIVE_BASE}${path}?api_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pipedrive POST ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
}

async function pipedrivePut(path, body) {
    const token = getToken();
    const res = await fetch(`${PIPEDRIVE_BASE}${path}?api_token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pipedrive PUT ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
}

// Find organization by name; returns org ID or null
async function findOrgByName(name) {
    const data = await pipedriveGet(`/organizations/search?term=${encodeURIComponent(name)}&exact_match=true`);
    const items = data?.data?.items || [];
    return items.length > 0 ? items[0].item.id : null;
}

// Create organization with custom fields; returns org ID
async function createOrg(name, trade, geography) {
    const stateOnly = geography ? geography.split(',').pop().trim() : null;
    const tradeId = TRADE_TYPE[trade] || null;

    const payload = {
        name,
        [ORG_FIELD.tradeType]: tradeId || undefined,
        [ORG_FIELD.geography]: stateOnly || undefined,
    };
    const data = await pipedrivePost('/organizations', payload);
    if (!data.success) throw new Error(`Create org failed: ${JSON.stringify(data)}`);
    return data.data.id;
}

// Find or create organization; returns org ID
async function findOrCreateOrg(name, trade, geography) {
    if (!name) return null;
    const existing = await findOrgByName(name);
    if (existing) return existing;
    return createOrg(name, trade, geography);
}

// Find person by email; returns person ID or null
async function findPersonByEmail(email) {
    const data = await pipedriveGet(`/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true`);
    const items = data?.data?.items || [];
    return items.length > 0 ? items[0].item.id : null;
}

// Create person linked to org; returns person ID
async function createPerson(email, name, orgId) {
    const data = await pipedrivePost('/persons', {
        name: name || email,
        email: [{ value: email, primary: true }],
        org_id: orgId || undefined,
    });
    if (!data.success) throw new Error(`Create person failed: ${JSON.stringify(data)}`);
    return data.data.id;
}

// Find or create person; returns { personId, isNew }
async function findOrCreatePerson(email, name, orgId) {
    const existing = await findPersonByEmail(email);
    if (existing) return { personId: existing, isNew: false };
    const personId = await createPerson(email, name, orgId);
    return { personId, isNew: true };
}

// Find the first open deal for a person in the BidIntell pipeline
async function findDealForPerson(personId) {
    const data = await pipedriveGet(`/persons/${personId}/deals?status=open`);
    const deals = data?.data || [];
    const ours = deals.find(d => d.pipeline_id === PIPELINE_ID);
    return ours ? ours.id : null;
}

// Find deal by prospect email
async function findDealByEmail(email) {
    const personId = await findPersonByEmail(email);
    if (!personId) return null;
    return findDealForPerson(personId);
}

// Create a deal in BidIntell Outbound pipeline; returns deal ID
async function createDeal(personId, title, stageId, dealFields) {
    const payload = {
        title,
        person_id: personId,
        pipeline_id: PIPELINE_ID,
        stage_id: stageId,
        status: 'open',
        ...dealFields,
    };
    const data = await pipedrivePost('/deals', payload);
    if (!data.success) throw new Error(`Create deal failed: ${JSON.stringify(data)}`);
    return data.data.id;
}

// Move deal to a new stage and optionally update deal fields
async function moveDealToStage(dealId, stageId, dealFields) {
    const payload = { stage_id: stageId, ...dealFields };
    const data = await pipedrivePut(`/deals/${dealId}`, payload);
    if (!data.success) throw new Error(`Move deal failed: ${JSON.stringify(data)}`);
}

// Add a note to a deal
async function addNote(dealId, content) {
    await pipedrivePost('/notes', { content, deal_id: dealId });
}

// Add a completed activity to a deal
async function addActivity(dealId, subject, type = 'email') {
    await pipedrivePost('/activities', { subject, type, deal_id: dealId, done: 1 });
}

// Sync Apollo prospect to Pipedrive:
// 1. Find or create org (with trade + geography)
// 2. Find or create person
// 3. Find or create deal in "Prospect Identified" stage
// Returns { personId, dealId }
async function syncProspectToPipedrive(email, name, orgName, trade, geography) {
    const orgId = await findOrCreateOrg(orgName, trade, geography);
    const { personId } = await findOrCreatePerson(email, name, orgId);

    let dealId = await findDealForPerson(personId);
    if (!dealId) {
        const title = orgName ? `${orgName} — Outbound` : `${email} — Outbound`;
        dealId = await createDeal(personId, title, STAGE.prospectIdentified, {
            [DEAL_FIELD.leadSource]: LEAD_SOURCE.apolloOutbound,
            [DEAL_FIELD.outreachStepCompleted]: 0,
        });
    }
    return { personId, dealId };
}

// Map email sequence step to stage ID
function stepToStage(step) {
    if (step <= 2) return STAGE.outreachActive;   // Steps 1–2: initial + tribal
    return STAGE.offerSent;                        // Steps 3–5: offer, reminder, break-up
}

// Sync email sequence step to Pipedrive:
// Moves deal stage and logs activity. Returns dealId or null if not found.
async function syncEmailStepToPipedrive(email, step, subject) {
    const dealId = await findDealByEmail(email);
    if (!dealId) {
        console.log(`Pipedrive: no deal for ${email} (step ${step}), skipping`);
        return null;
    }
    const stageId = stepToStage(step);
    await moveDealToStage(dealId, stageId, {
        [DEAL_FIELD.outreachStepCompleted]: step,
    });
    await addActivity(dealId, `Email step ${step} sent: ${subject}`);
    return dealId;
}

// Convert prospect to Trial or Customer in Pipedrive.
// subscriptionStatus: 'trialing' → Trial Signup stage; 'active' → Active Customer stage
// Returns dealId
async function convertToCustomer(email, { subscriptionStatus = 'active', planType, mrr, accountEmail } = {}) {
    const isTrial = subscriptionStatus === 'trialing';
    const stageId = isTrial ? STAGE.trialSignup : STAGE.activeCustomer;
    const now = new Date().toISOString().slice(0, 10);

    const dealFields = {
        [DEAL_FIELD.bidintellAccountEmail]: accountEmail || email,
        [DEAL_FIELD.accountCreatedDate]: now,
        ...(isTrial
            ? { [DEAL_FIELD.trialStartDate]: now }
            : { [DEAL_FIELD.paidConversionDate]: now }),
        ...(planType ? { [DEAL_FIELD.planType]: planType } : {}),
        ...(mrr != null ? { [DEAL_FIELD.mrr]: mrr } : {}),
    };

    // Try to find an existing prospect deal first
    let personId = await findPersonByEmail(email);
    if (!personId) {
        // Net-new signup with no prior outbound — create person and deal from scratch
        personId = await createPerson(email, email, null);
        const dealId = await createDeal(personId, `${email} — Self-serve Signup`, stageId, {
            [DEAL_FIELD.leadSource]: LEAD_SOURCE.inboundWeb,
            ...dealFields,
        });
        await addActivity(dealId, isTrial ? 'Trial signup' : 'Paid subscription started');
        return dealId;
    }

    let dealId = await findDealForPerson(personId);
    if (!dealId) {
        dealId = await createDeal(personId, `${email} — Self-serve Signup`, stageId, {
            [DEAL_FIELD.leadSource]: LEAD_SOURCE.inboundWeb,
            ...dealFields,
        });
    } else {
        await moveDealToStage(dealId, stageId, dealFields);
    }
    await addActivity(dealId, isTrial ? 'Trial signup' : 'Paid subscription started');
    return dealId;
}

// Mark deal as opted out (sets Email Opt-Out field; does not change stage)
async function markOptedOut(email) {
    const dealId = await findDealByEmail(email);
    if (!dealId) return null;
    await pipedrivePut(`/deals/${dealId}`, { [DEAL_FIELD.emailOptOut]: 'Yes' });
    await addActivity(dealId, 'Unsubscribed — opted out of outreach');
    return dealId;
}

module.exports = {
    STAGE,
    PIPELINE_ID,
    DEAL_FIELD,
    ORG_FIELD,
    LEAD_SOURCE,
    findPersonByEmail,
    findDealByEmail,
    syncProspectToPipedrive,
    syncEmailStepToPipedrive,
    convertToCustomer,
    markOptedOut,
    addNote,
    addActivity,
};

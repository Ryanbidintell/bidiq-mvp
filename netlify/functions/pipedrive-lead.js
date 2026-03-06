const PIPEDRIVE_BASE = 'https://api.pipedrive.com/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) {
    console.error('PIPEDRIVE_API_TOKEN not set');
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request body' }) };
  }

  const { firstName, lastName, email, phone, company, trade, bidsPerMonth, currentProcess, frustration } = body;

  if (!firstName || !lastName || !email || !company || !trade || !bidsPerMonth || !currentProcess) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
  }

  const fullName = `${firstName} ${lastName}`;

  try {
    // Step 1: Search for existing person by email
    let personId;
    const searchUrl = `${PIPEDRIVE_BASE}/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&api_token=${token}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.items && searchData.data.items.length > 0) {
      personId = searchData.data.items[0].item.id;
    } else {
      // Step 2: Create new person
      const createPersonRes = await fetch(`${PIPEDRIVE_BASE}/persons?api_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: [{ value: email, primary: true }],
          phone: phone ? [{ value: phone, primary: true }] : undefined,
          org_name: company,
        }),
      });
      const createPersonData = await createPersonRes.json();
      if (!createPersonData.success) {
        throw new Error(`Failed to create person: ${JSON.stringify(createPersonData)}`);
      }
      personId = createPersonData.data.id;
    }

    // Step 3: Create lead
    const leadTitle = `${company} — Demo Request`;
    const createLeadRes = await fetch(`${PIPEDRIVE_BASE}/leads?api_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: leadTitle,
        person_id: personId,
      }),
    });
    const createLeadData = await createLeadRes.json();
    if (!createLeadData.success) {
      throw new Error(`Failed to create lead: ${JSON.stringify(createLeadData)}`);
    }
    const leadId = createLeadData.data.id;

    // Step 4: Add note to lead
    const noteContent = [
      'Demo Request — BidIQ / BidIntell',
      `Trade: ${trade}`,
      `Bids per month: ${bidsPerMonth}`,
      `Current process: ${currentProcess}`,
      `Biggest frustration: ${frustration || 'Not provided'}`,
    ].join('\n');

    const noteRes = await fetch(`${PIPEDRIVE_BASE}/notes?api_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: noteContent,
        lead_id: leadId,
      }),
    });
    const noteData = await noteRes.json();
    if (!noteData.success) {
      // Non-fatal — lead was created, just log the note failure
      console.warn('Note creation failed:', JSON.stringify(noteData));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('pipedrive-lead error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Failed to submit request. Please try again.' }),
    };
  }
};

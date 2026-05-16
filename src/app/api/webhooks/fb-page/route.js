export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
 
    if (!VERIFY_TOKEN) {
      console.error('VERIFY_TOKEN is not defined in environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    if (mode && token) {
      // Verify the token matches
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully!');
        return new Response(challenge, { status: 200 }); // Return the challenge to confirm
      } else {
        console.log('Webhook verification failed: Invalid token');
        return new Response('Invalid token', { status: 403 }); // Forbidden if token doesn't match
      }
    } else {
      console.log('Webhook verification failed: Missing parameters');
      return new Response('Missing parameters', { status: 400 }); // Bad request if parameters are missing
    }
  }
  
  export async function POST(req) {
    try {
      const body = await req.json();
      console.log(body, "received");
  
      // Load the Page Access Token from environment variables
      const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
      if (!ACCESS_TOKEN) {
        console.error('ACCESS_TOKEN is not defined in environment variables');
        return new Response('Server configuration error', { status: 500 });
      }
  
      // Function to fetch lead data from Graph API
      async function fetchLeadData(leadgenId) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${ACCESS_TOKEN}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        //   console.log(re);
          
        //   if (!response.ok) {
        //     throw new Error(`Graph API error: ${response.statusText}`);
        //   }
  
          const leadData = await response.json();
          console.log('Fetched Lead Data:', JSON.stringify(leadData, null, 2));
          return leadData;
        } catch (error) {
          console.error(`Error fetching lead data for leadgen_id ${leadgenId}:`, error);
          return null;
        }
      }
  
      // Check if the payload is a leadgen event
      if (body.field === 'leadgen' && body.value) {
        const leadData = body.value;
        console.log('New lead received:');
        console.log(`Page ID: ${leadData.page_id}`);
        console.log(`Form ID: ${leadData.form_id}`);
        console.log(`Lead ID: ${leadData.leadgen_id}`);
        console.log(`Created Time: ${leadData.created_time}`);
        console.log('Webhook Lead Data:', JSON.stringify(leadData, null, 2));
  
        // Fetch detailed lead data from Graph API
        const detailedLeadData = await fetchLeadData(leadData.leadgen_id);
        if (detailedLeadData) {
          console.log('Detailed Lead Information:', detailedLeadData);
          // Example: Access field_data (e.g., email, name)
          if (detailedLeadData.field_data) {
            detailedLeadData.field_data.forEach(field => {
              console.log(`${field.name}: ${field.values[0]}`);
            });
          }
        }
  
        // Respond with 200 to acknowledge receipt
        return new Response('EVENT_RECEIVED', { status: 200 });
      } else if (body.object === 'page') {
        // Handle page events
        body.entry.forEach(entry => {
          const pageId = entry.id;
          const changes = entry.changes;
  
          changes.forEach(async change => {
            if (change.field === 'leadgen') {
              const leadData = change.value;
              console.log('New lead received:');
              console.log(`Page ID: ${pageId}`);
              console.log(`Form ID: ${leadData.form_id}`);
              console.log(`Lead ID: ${leadData.leadgen_id}`);
              console.log(`Created Time: ${leadData.created_time}`);
              console.log('Webhook Lead Data:', JSON.stringify(leadData, null, 2));
  
              // Fetch detailed lead data from Graph API
              const detailedLeadData = await fetchLeadData(leadData.leadgen_id);
              if (detailedLeadData) {
                console.log('Detailed Lead Information:', detailedLeadData);
                // Example: Access field_data (e.g., email, name)
                if (detailedLeadData.field_data) {
                  detailedLeadData.field_data.forEach(field => {
                    console.log(`${field.name}: ${field.values[0]}`);
                  });
                }
              }
            }
          });
        });
  
        return new Response('EVENT_RECEIVED', { status: 200 });
      } else {
        console.log('Invalid payload received:', body);
        return new Response('Invalid payload', { status: 404 });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Error processing webhook', { status: 500 });
    }
  }
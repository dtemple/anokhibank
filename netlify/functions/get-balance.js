// =====================================================
// GET BALANCE FUNCTION
// =====================================================
// Returns the current balance from the database
// Endpoint: /.netlify/functions/get-balance

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client using environment variables
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
    // Set CORS headers for browser requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Query the balance from Supabase
        const { data, error } = await supabase
            .from('balance')
            .select('amount, updated_at')
            .eq('id', 1)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to get balance' })
            };
        }

        // Return the balance
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                balance: parseFloat(data.amount),
                updatedAt: data.updated_at
            })
        };

    } catch (err) {
        console.error('Error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};


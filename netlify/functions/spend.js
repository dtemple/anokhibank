// =====================================================
// SPEND FUNCTION
// =====================================================
// Deducts money from balance and logs a withdrawal transaction
// Endpoint: /.netlify/functions/spend
// Method: POST
// Body: { amount: number, description: string }

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

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse the request body
        const { amount, description } = JSON.parse(event.body || '{}');

        // Validate the amount
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Please enter a valid amount' })
            };
        }

        // Round to 2 decimal places
        const spendAmount = Math.round(amount * 100) / 100;

        // Get current balance
        const { data: balanceData, error: balanceError } = await supabase
            .from('balance')
            .select('amount')
            .eq('id', 1)
            .single();

        if (balanceError) {
            console.error('Error getting balance:', balanceError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to get current balance' })
            };
        }

        const currentBalance = parseFloat(balanceData.amount);

        // Check if there's enough money
        if (spendAmount > currentBalance) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Not enough money in bank',
                    currentBalance: currentBalance
                })
            };
        }

        // Calculate new balance
        const newBalance = Math.round((currentBalance - spendAmount) * 100) / 100;

        // Update the balance
        const { error: updateError } = await supabase
            .from('balance')
            .update({ 
                amount: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', 1);

        if (updateError) {
            console.error('Error updating balance:', updateError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to update balance' })
            };
        }

        // Log the transaction
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                type: 'withdrawal',
                amount: spendAmount,
                description: description || 'Spent money',
                balance_after: newBalance
            });

        if (transactionError) {
            console.error('Error logging transaction:', transactionError);
            // Note: Balance was already updated, so we continue
        }

        // Return success with new balance
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                newBalance: newBalance,
                amountSpent: spendAmount
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


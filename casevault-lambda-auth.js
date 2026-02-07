/**
 * CaseVault Lambda Function - Submit Case & Generate Access Token
 *
 * This function:
 * 1. Validates submission data
 * 2. Stores settlement case in DynamoDB
 * 3. Generates time-limited access token
 * 4. Returns token for 10-minute dashboard access
 *
 * Deploy to AWS Lambda and connect to API Gateway
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const SETTLEMENTS_TABLE = 'casevault-settlements';
const TOKENS_TABLE = 'casevault-access-tokens';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body);

        // Validate required fields
        if (!body.email || !body.state || !body.amount || !body.caseType) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: 'Missing required fields: email, state, amount, caseType'
                })
            };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid email format' })
            };
        }

        // Validate state
        const validStates = ['MA', 'CT', 'RI', 'NH'];
        if (!validStates.includes(body.state)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid state. Must be MA, CT, RI, or NH' })
            };
        }

        // Validate amount
        const amount = parseFloat(body.amount);
        if (isNaN(amount) || amount <= 0 || amount > 100000000) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid settlement amount' })
            };
        }

        const timestamp = new Date().toISOString();
        const settlementId = crypto.randomUUID();
        const accessToken = crypto.randomBytes(32).toString('hex');

        // Store settlement case
        await dynamodb.put({
            TableName: SETTLEMENTS_TABLE,
            Item: {
                id: settlementId,
                email: body.email.toLowerCase(),
                state: body.state,
                amount: amount,
                caseType: body.caseType,
                details: body.details || '',
                timestamp: timestamp,
                source: 'web_submission',
                verified: false
            }
        }).promise();

        // Generate access token (expires in 10 minutes)
        const expiresAt = Date.now() + (10 * 60 * 1000);
        await dynamodb.put({
            TableName: TOKENS_TABLE,
            Item: {
                token: accessToken,
                email: body.email.toLowerCase(),
                expiresAt: expiresAt,
                createdAt: timestamp,
                settlementId: settlementId
            },
            // DynamoDB TTL (24 hours from now)
            ExpirationTime: Math.floor(Date.now() / 1000) + 86400
        }).promise();

        // Success response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                accessToken: accessToken,
                expiresAt: expiresAt,
                message: 'Settlement submitted successfully. Dashboard access granted for 10 minutes.'
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

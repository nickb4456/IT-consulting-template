/**
 * CaseVault Lambda Function - Verify Access Token
 *
 * This function verifies dashboard access tokens
 * Called by dashboard to check if user has valid access
 *
 * Optional: Can be used to secure API endpoints
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TOKENS_TABLE = 'casevault-access-tokens';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Get token from header or body
        const token = event.headers.Authorization?.replace('Bearer ', '') ||
                     JSON.parse(event.body || '{}').token;

        if (!token) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    valid: false,
                    error: 'No access token provided'
                })
            };
        }

        // Look up token in DynamoDB
        const result = await dynamodb.get({
            TableName: TOKENS_TABLE,
            Key: { token: token }
        }).promise();

        if (!result.Item) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    valid: false,
                    error: 'Invalid access token'
                })
            };
        }

        const tokenData = result.Item;
        const now = Date.now();

        // Check if expired
        if (now > tokenData.expiresAt) {
            // Delete expired token
            await dynamodb.delete({
                TableName: TOKENS_TABLE,
                Key: { token: token }
            }).promise();

            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    valid: false,
                    error: 'Access token has expired',
                    expired: true
                })
            };
        }

        // Token is valid
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                valid: true,
                expiresAt: tokenData.expiresAt,
                timeRemaining: tokenData.expiresAt - now,
                email: tokenData.email
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

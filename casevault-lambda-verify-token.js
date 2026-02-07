/**
 * CaseVault Lambda - Verify Access Token
 *
 * Validates access tokens for dashboard access
 * Returns user access status and time remaining
 *
 * API Gateway endpoint: GET /verify-access?token=xxx
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TOKENS_TABLE = 'casevault-access-tokens';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

exports.handler = async (event) => {
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const token = event.queryStringParameters?.token;

        if (!token) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    valid: false,
                    error: 'No token provided'
                })
            };
        }

        // Look up token in DynamoDB
        const result = await dynamodb.get({
            TableName: TOKENS_TABLE,
            Key: { token }
        }).promise();

        if (!result.Item) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    valid: false,
                    error: 'Invalid token'
                })
            };
        }

        const tokenData = result.Item;
        const now = Date.now();

        // Check if token is expired
        if (now > tokenData.expiresAt) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    valid: false,
                    error: 'Token expired',
                    expiredAt: tokenData.expiresAt
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
                valid: false,
                error: 'Internal server error'
            })
        };
    }
};

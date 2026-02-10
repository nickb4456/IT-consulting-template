/**
 * YouTube Trends API Endpoint (Vercel Serverless Function)
 *
 * Serves research data from DynamoDB for the trending topics dashboard.
 * Deploy to Vercel with the aibridges site.
 *
 * Endpoint: /api/youtube-trends
 */

const { DynamoDBClient, ScanCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'Agent_Research';

// Catholic keywords for categorization
const catholicKeywords = ['catholic', 'rosary', 'prayer', 'eucharist', 'mass', 'saint', 'mary', 'divine', 'confession', 'baptism', 'chaplet', 'stations', 'adoration', 'angelus', 'compline', 'lectio', 'examen', 'mystic'];

function isCatholicTopic(topic) {
    const lower = topic.toLowerCase();
    return catholicKeywords.some(kw => lower.includes(kw));
}

async function getMetaStats() {
    try {
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND sk = :sk',
            ExpressionAttributeValues: {
                ':pk': { S: 'META#stats' },
                ':sk': { S: 'latest' }
            }
        });
        const response = await client.send(command);
        if (response.Items && response.Items.length > 0) {
            return unmarshall(response.Items[0]);
        }
        return null;
    } catch (err) {
        console.error('Error fetching meta:', err);
        return null;
    }
}

async function getTopVideos(limit = 50) {
    try {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix)',
            ExpressionAttributeValues: {
                ':prefix': { S: 'VIDEO#' }
            },
            Limit: 1000 // Scan limit
        });
        const response = await client.send(command);

        if (!response.Items) return [];

        const videos = response.Items.map(item => unmarshall(item));

        // Sort by views descending
        videos.sort((a, b) => (b.views || 0) - (a.views || 0));

        return videos.slice(0, limit);
    } catch (err) {
        console.error('Error fetching videos:', err);
        return [];
    }
}

async function getTopics() {
    try {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'begins_with(pk, :prefix)',
            ExpressionAttributeValues: {
                ':prefix': { S: 'TOPIC#' }
            }
        });
        const response = await client.send(command);

        if (!response.Items) return [];

        return response.Items.map(item => unmarshall(item));
    } catch (err) {
        console.error('Error fetching topics:', err);
        return [];
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Fetch all data in parallel
        const [meta, videos, topics] = await Promise.all([
            getMetaStats(),
            getTopVideos(50),
            getTopics()
        ]);

        // Build response matching dashboard format
        const response = {
            last_updated: meta?.last_sync || Date.now(),
            total_videos: meta?.total_videos || videos.length,
            topics_researched: meta?.topics_researched || topics.map(t => t.topic),
            top_performers: videos.map(v => ({
                video_id: v.video_id,
                title: v.title,
                channel: v.channel,
                views: v.views,
                likes: v.likes,
                engagement_rate: v.engagement_rate,
                topic: v.topic,
                viral_score: v.viral_score || Math.round((v.views / 1000000) * 10 + (v.engagement_rate * 10)),
                discovered_at: v.discovered_at
            })),
            by_topic: topics.reduce((acc, t) => {
                acc[t.topic] = {
                    video_count: t.video_count,
                    top_views: t.top_views,
                    avg_engagement: t.avg_engagement,
                    is_catholic: isCatholicTopic(t.topic)
                };
                return acc;
            }, {}),
            // Summary stats
            summary: {
                catholic_topics: topics.filter(t => isCatholicTopic(t.topic)).length,
                secular_topics: topics.filter(t => !isCatholicTopic(t.topic)).length,
                total_views: videos.reduce((sum, v) => sum + (v.views || 0), 0),
                avg_engagement: videos.length > 0
                    ? videos.reduce((sum, v) => sum + (v.engagement_rate || 0), 0) / videos.length
                    : 0
            }
        };

        // Cache for 5 minutes
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

        return res.status(200).json(response);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch research data',
            message: error.message
        });
    }
};

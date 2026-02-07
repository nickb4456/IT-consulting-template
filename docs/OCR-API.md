# DraftBridge OCR API

> AWS Textract-powered OCR for making scanned PDFs searchable

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  DraftBridge │────▶│   API GW    │────▶│   Lambda    │
│  (Word Add-in)│     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
              ┌─────────┐              ┌─────────────┐            ┌─────────────┐
              │   S3    │              │  Textract   │            │   S3        │
              │ (input) │              │  (OCR)      │            │  (output)   │
              └─────────┘              └─────────────┘            └─────────────┘
```

## API Endpoints

### POST /ocr/presign

Get presigned URL for uploading PDF to S3.

**Request:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf",
  "firm": "morrison"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "key": "ocr/morrison/abc123/document.pdf"
}
```

### POST /ocr/process

Start Textract processing on uploaded PDF.

**Request:**
```json
{
  "key": "ocr/morrison/abc123/document.pdf",
  "firm": "morrison"
}
```

**Response:**
```json
{
  "jobId": "textract-job-xyz789"
}
```

### GET /ocr/status

Check processing status.

**Request:**
```
GET /ocr/status?jobId=textract-job-xyz789&firm=morrison
```

**Response:**
```json
{
  "status": "IN_PROGRESS",  // or "SUCCEEDED", "FAILED"
  "progress": 45
}
```

### GET /ocr/result

Get download URL for searchable PDF.

**Request:**
```
GET /ocr/result?jobId=textract-job-xyz789&firm=morrison
```

**Response:**
```json
{
  "downloadUrl": "https://s3.amazonaws.com/...",
  "pageCount": 12,
  "textExtracted": true
}
```

## Lambda Implementation

### ocr-presign.js

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET = 'draftbridge-ocr';

exports.handler = async (event) => {
  const { filename, contentType, firm } = JSON.parse(event.body);
  
  const key = `ocr/${firm}/${uuidv4()}/${filename}`;
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType
  });
  
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ uploadUrl, key })
  };
};
```

### ocr-process.js

```javascript
const { TextractClient, StartDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const textract = new TextractClient({ region: 'us-east-1' });
const BUCKET = 'draftbridge-ocr';

exports.handler = async (event) => {
  const { key, firm } = JSON.parse(event.body);
  
  const command = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: BUCKET,
        Name: key
      }
    },
    NotificationChannel: {
      SNSTopicArn: process.env.SNS_TOPIC_ARN,
      RoleArn: process.env.TEXTRACT_ROLE_ARN
    }
  });
  
  const response = await textract.send(command);
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ jobId: response.JobId })
  };
};
```

### ocr-status.js

```javascript
const { TextractClient, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const textract = new TextractClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const { jobId } = event.queryStringParameters;
  
  const command = new GetDocumentTextDetectionCommand({ JobId: jobId });
  const response = await textract.send(command);
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      status: response.JobStatus,
      progress: response.JobStatus === 'IN_PROGRESS' ? 50 : 100
    })
  };
};
```

## S3 Bucket Structure

```
draftbridge-ocr/
├── ocr/
│   └── {firm}/
│       └── {uuid}/
│           ├── input.pdf        # Original scanned PDF
│           └── output.pdf       # Searchable PDF with text layer
```

## IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:StartDocumentTextDetection",
        "textract:GetDocumentTextDetection"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::draftbridge-ocr/*"
    }
  ]
}
```

## Cost Estimate

- **Textract DetectText**: $1.50 per 1,000 pages
- **S3 Storage**: ~$0.023 per GB/month
- **Lambda**: Negligible (free tier covers it)

**Example**: 100-page document = $0.15

## Future Enhancements

1. **PDF overlay generation** - Add text layer to original PDF (preserves layout)
2. **Batch processing** - Upload multiple PDFs at once
3. **Confidence scores** - Show OCR confidence per page
4. **Manual correction** - UI to fix OCR errors

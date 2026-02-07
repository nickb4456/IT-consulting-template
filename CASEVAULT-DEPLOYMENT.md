# CaseVault Deployment Guide

## ✅ What's Included

This integration adds CaseVault (PI settlement calculator + dashboard) to your AIBridges website with:

- **Calculator Page** (`casevault-calculator.html`) - Free settlement estimator with contribution form
- **Dashboard Page** (`casevault-dashboard.html`) - Protected benchmark data (1,756 settlements)
- **10-Minute Access** - Contributors get time-limited dashboard access
- **Lambda Functions** - Auth system + token management

---

## 🚀 Quick Deploy Steps

### 1. Update Calculator API Endpoint

Edit `casevault-calculator.html` line ~303:

```javascript
const response = await fetch('https://YOUR_API_GATEWAY_URL/submit-case', {
```

Replace `YOUR_API_GATEWAY_URL` with your actual API Gateway endpoint (see step 3).

---

### 2. Create DynamoDB Tables

You already have `casevault-settlements` table. Add one more:

#### Table: `casevault-access-tokens`
```bash
aws dynamodb create-table \
  --table-name casevault-access-tokens \
  --attribute-definitions \
    AttributeName=token,AttributeType=S \
  --key-schema \
    AttributeName=token,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Enable TTL** (auto-delete expired tokens):
```bash
aws dynamodb update-time-to-live \
  --table-name casevault-access-tokens \
  --time-to-live-specification "Enabled=true, AttributeName=ExpirationTime" \
  --region us-east-1
```

---

### 3. Deploy Lambda Functions

#### A. Create IAM Role (if you don't have one)
```bash
aws iam create-role \
  --role-name CaseVaultLambdaRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach DynamoDB policy
aws iam attach-role-policy \
  --role-name CaseVaultLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# Attach CloudWatch logs policy
aws iam attach-role-policy \
  --role-name CaseVaultLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

#### B. Package and Deploy Lambda Functions

**Submit Case Function:**
```bash
# Create deployment package
zip casevault-auth.zip casevault-lambda-auth.js

# Deploy
aws lambda create-function \
  --function-name casevault-submit-case \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/CaseVaultLambdaRole \
  --handler casevault-lambda-auth.handler \
  --zip-file fileb://casevault-auth.zip \
  --timeout 10 \
  --memory-size 256 \
  --region us-east-1
```

**Verify Token Function (optional):**
```bash
zip casevault-verify.zip casevault-lambda-verify.js

aws lambda create-function \
  --function-name casevault-verify-token \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/CaseVaultLambdaRole \
  --handler casevault-lambda-verify.handler \
  --zip-file fileb://casevault-verify.zip \
  --timeout 10 \
  --memory-size 128 \
  --region us-east-1
```

---

### 4. Create API Gateway Endpoints

#### A. Create REST API
```bash
aws apigateway create-rest-api \
  --name "CaseVault API" \
  --description "CaseVault submission and auth endpoints" \
  --region us-east-1
```

Note the `id` returned (e.g., `abc123def4`)

#### B. Get Root Resource ID
```bash
aws apigateway get-resources \
  --rest-api-id YOUR_API_ID \
  --region us-east-1
```

#### C. Create `/submit-case` Resource
```bash
aws apigateway create-resource \
  --rest-api-id YOUR_API_ID \
  --parent-id YOUR_ROOT_RESOURCE_ID \
  --path-part submit-case \
  --region us-east-1
```

#### D. Add POST Method
```bash
aws apigateway put-method \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_SUBMIT_CASE_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --region us-east-1
```

#### E. Connect Lambda to API Gateway
```bash
aws apigateway put-integration \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_SUBMIT_CASE_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:casevault-submit-case/invocations \
  --region us-east-1
```

#### F. Grant API Gateway Permission to Invoke Lambda
```bash
aws lambda add-permission \
  --function-name casevault-submit-case \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:YOUR_ACCOUNT_ID:YOUR_API_ID/*/*/*" \
  --region us-east-1
```

#### G. Deploy API
```bash
aws apigateway create-deployment \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --region us-east-1
```

**Your endpoint will be:**
```
https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/submit-case
```

---

### 5. Update Frontend with Real API URL

Edit `casevault-calculator.html` line ~303:

```javascript
const response = await fetch('https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/submit-case', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
});
```

---

### 6. Add Links to Your Site

#### Update `index.html` navigation:
```html
<a href="/casevault-calculator.html">Settlement Calculator</a>
```

#### Add to sitemap.xml:
```xml
<url>
  <loc>https://aibridges.org/casevault-calculator</loc>
  <changefreq>weekly</changefreq>
  <priority>0.9</priority>
</url>
```

---

## 🧪 Testing

### Test the Calculator
1. Go to `https://aibridges.org/casevault-calculator.html`
2. Fill out the calculator form
3. Click "Calculate Settlement Range"
4. Should see estimated range

### Test Contribution Flow
1. Click "Contribute a Case & Unlock Dashboard"
2. Fill out contribution form with email
3. Submit
4. Should redirect to dashboard with 10-minute timer

### Test Dashboard Access
1. Direct visit to `/casevault-dashboard.html` without token → blocked
2. After submitting case → redirected with access
3. Timer counts down from 10:00
4. After 10 minutes → access revoked, shown lock screen

---

## 🔒 Security Notes

- ✅ Dashboard uses `sessionStorage` (cleared on browser close)
- ✅ Access tokens expire after 10 minutes
- ✅ DynamoDB TTL auto-deletes old tokens after 24 hours
- ✅ Email validation on backend
- ✅ State validation (MA, CT, RI, NH only)
- ✅ Amount validation ($0 - $100M range)
- ⚠️ Add rate limiting to API Gateway if you get spam
- ⚠️ Consider adding reCAPTCHA to contribution form

---

## 💰 Upgrade to Paid Access (Future)

To offer paid API access ($2,500/mo for funders):

1. Add Stripe integration to calculator page
2. Generate long-lived API keys instead of 10-min tokens
3. Create `/api/settlements` endpoint with pagination
4. Add API key table in DynamoDB with usage tracking
5. Build funder-specific dashboard with advanced filters

---

## 📊 Analytics to Track

- Calculator submissions (Google Analytics event)
- Contribution form submissions
- Dashboard access grants
- Average time spent on dashboard
- Email capture rate

---

## 🐛 Troubleshooting

### "Access Denied" on dashboard
- Check `sessionStorage` in browser dev tools
- Verify token hasn't expired
- Check Lambda logs in CloudWatch

### Calculator not submitting
- Check browser console for CORS errors
- Verify API Gateway URL is correct
- Check Lambda logs for errors

### No email capture
- Verify DynamoDB table permissions
- Check Lambda IAM role has write access
- Review CloudWatch logs

---

## 🚀 Next Steps

1. **Deploy to GitHub** (see commit below)
2. **Test contribution flow end-to-end**
3. **Update API endpoint URL** in calculator
4. **Add to main navigation**
5. **Write blog post** about CaseVault launch
6. **Send funder outreach emails** (already drafted)

---

*Built by Supernova ✨ for AIBridges*
*February 7, 2026*

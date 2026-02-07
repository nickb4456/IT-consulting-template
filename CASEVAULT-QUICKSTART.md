# CaseVault Quick Start — 30 Minutes to Launch

**Status:** ✅ Pushed to GitHub
**What's Left:** Deploy 2 Lambda functions + 1 DynamoDB table + update 2 URLs

---

## ⚡ Fast Track (Copy-Paste These Commands)

### Step 1: Create DynamoDB Table (2 minutes)
```bash
aws dynamodb create-table \
  --table-name casevault-access-tokens \
  --attribute-definitions AttributeName=token,AttributeType=S \
  --key-schema AttributeName=token,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable auto-delete of expired tokens
aws dynamodb update-time-to-live \
  --table-name casevault-access-tokens \
  --time-to-live-specification "Enabled=true, AttributeName=ExpirationTime" \
  --region us-east-1
```

---

### Step 2: Deploy Lambda Functions (5 minutes)

**Get your IAM role ARN:**
```bash
aws iam get-role --role-name CaseVaultLambdaRole --query 'Role.Arn' --output text
```
(If that fails, you need to create the role first — see CASEVAULT-DEPLOYMENT.md section 3A)

**Package and deploy:**
```bash
cd /Users/nicholasbilodeau/Downloads/aibridges-repo

# Function 1: Submit case
zip casevault-auth.zip casevault-lambda-auth.js
aws lambda create-function \
  --function-name casevault-submit-case \
  --runtime nodejs18.x \
  --role YOUR_ROLE_ARN_HERE \
  --handler casevault-lambda-auth.handler \
  --zip-file fileb://casevault-auth.zip \
  --timeout 10 \
  --memory-size 256 \
  --region us-east-1

# Function 2: Verify token
zip casevault-verify.zip casevault-lambda-verify-token.js
aws lambda create-function \
  --function-name casevault-verify-token \
  --runtime nodejs18.x \
  --role YOUR_ROLE_ARN_HERE \
  --handler casevault-lambda-verify-token.handler \
  --zip-file fileb://casevault-verify.zip \
  --timeout 5 \
  --memory-size 128 \
  --region us-east-1
```

---

### Step 3: Create API Gateway Endpoints (10 minutes)

**Option A: Use AWS Console (Easier)**
1. Go to API Gateway console
2. Create REST API named "CaseVault API"
3. Create resource `/submit-case`
4. Add POST method → Lambda integration → `casevault-submit-case`
5. Enable CORS on the resource
6. Create resource `/verify-access`
7. Add GET method → Lambda integration → `casevault-verify-token`
8. Enable CORS
9. Deploy to stage `prod`
10. Copy the Invoke URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

**Option B: Use CLI (Full commands in CASEVAULT-DEPLOYMENT.md section 4)**

---

### Step 4: Update Frontend URLs (2 minutes)

**File 1: casevault-calculator.html**
Find line ~395:
```javascript
const API_ENDPOINT = 'https://YOUR_API_GATEWAY_URL/submit-case';
```
Replace with:
```javascript
const API_ENDPOINT = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/submit-case';
```

**File 2: casevault-dashboard.html**
Find line ~417:
```javascript
const VERIFY_API = 'https://YOUR_API_GATEWAY_URL/verify-access';
```
Replace with:
```javascript
const VERIFY_API = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/verify-access';
```

**Commit and push:**
```bash
git add casevault-*.html
git commit -m "Update CaseVault API endpoints with production URLs"
git push origin main
```

---

### Step 5: Test End-to-End (5 minutes)

1. **Visit calculator:** https://aibridges.org/casevault-calculator.html
2. **Fill form:** MA, Car Accident, $15K medical, Moderate injury
3. **Calculate:** Should see estimate like "$26K - $56K"
4. **Click "Contribute":** Fill contribution form with real email
5. **Submit:** Should redirect to dashboard
6. **Verify timer:** Should see "⏱️ Dashboard access expires in: 10:00"
7. **Test lock:** Open dashboard in private/incognito window → should see lock screen
8. **Wait 10 min:** Timer should expire → lock screen appears

---

## 🐛 If Something Breaks

### Lambda errors
```bash
# Check logs
aws logs tail /aws/lambda/casevault-submit-case --follow
aws logs tail /aws/lambda/casevault-verify-token --follow
```

### Calculator not submitting
- Open browser console (F12)
- Look for CORS errors
- Verify API Gateway URL is correct
- Check Network tab → look for failed POST request

### Dashboard shows lock screen immediately
- Check sessionStorage in dev tools (Application tab)
- Look for `casevault_access_token` and `casevault_access_expires`
- If missing, submission didn't work

---

## 💰 Revenue Tracking

Once live, track:
- **Email captures:** Check DynamoDB `casevault-settlements` table for submissions
- **Dashboard unlocks:** Check `casevault-access-tokens` table
- **Conversion rate:** Submissions / Calculator uses (add Google Analytics)

**Next milestone:** 100 email captures in 30 days → send funder outreach

---

## 🎯 After Launch (When You Have 5 Minutes)

1. **Add to homepage:** Link to calculator from main nav
2. **Write blog post:** "CaseVault: Free PI Settlement Intelligence"
3. **LinkedIn post:** "Just launched CaseVault - 1,756 real settlements"
4. **Email 6 funders:** Use outreach templates in `casevault-funder-outreach/`

---

## 🚨 Known Issues (Non-Blocking)

- No rate limiting yet (if you get spam, add API Gateway throttling)
- Email not verified (users can enter fake emails - but we get data anyway)
- No reCAPTCHA (add later if bots become an issue)

---

**Built by Supernova ✨ — February 7, 2026**

Questions? Check CASEVAULT-DEPLOYMENT.md for detailed instructions.

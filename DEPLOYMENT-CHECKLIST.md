# CaseVault Redesign — Deployment Checklist 🚀

**Status:** Ready for deployment
**Redesigned by:** Dot 🐥
**Date:** 2026-02-07

---

## Pre-Deployment Checklist

### 1. Local Testing
- [ ] Open `casevault-calculator-redesigned.html` in browser
- [ ] Verify all fonts load (DM Serif Display, DM Sans, JetBrains Mono)
- [ ] Test calculator form submission
- [ ] Verify result display animation
- [ ] Test timer countdown
- [ ] Verify paywall overlay states
- [ ] Open `casevault-dashboard-redesigned.html` in browser
- [ ] Test filter dropdowns
- [ ] Verify bar chart animations
- [ ] Test table hover states
- [ ] Verify all links work

### 2. Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Safari (desktop)
- [ ] Firefox (latest)
- [ ] Safari iOS (mobile)
- [ ] Chrome Android (mobile)

### 3. Responsive Testing
- [ ] Mobile (375px - iPhone SE)
- [ ] Mobile (390px - iPhone 12/13/14)
- [ ] Mobile (428px - iPhone 14 Pro Max)
- [ ] Tablet (768px - iPad)
- [ ] Desktop (1024px)
- [ ] Desktop (1440px)
- [ ] Desktop (1920px)

### 4. Accessibility Testing
- [ ] Tab through all interactive elements
- [ ] Verify focus states are visible
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify color contrast ratios
- [ ] Test keyboard-only navigation
- [ ] Verify form labels and error states

---

## Deployment Steps

### Option A: Quick Replace (Recommended for Testing)

```bash
# Backup current files
cd /Users/nicholasbilodeau/Downloads/aibridges-repo
cp casevault-calculator.html casevault-calculator-OLD.html
cp casevault-dashboard.html casevault-dashboard-OLD.html

# Replace with redesigned versions
mv casevault-calculator-redesigned.html casevault-calculator.html
mv casevault-dashboard-redesigned.html casevault-dashboard.html

# Commit and push
git add .
git commit -m "Deploy CaseVault redesign to production"
git push origin main
```

### Option B: Gradual Rollout

```bash
# Deploy redesigned version to a test subdomain first
# e.g., beta.aibridges.org/casevault-calculator

# Test with real users for 24-48 hours

# If no issues, replace production files
```

### Option C: A/B Test Setup

```bash
# Set up routing to show 50% of users the new design
# Track metrics: bounce rate, time on page, conversion rate
# Roll out to 100% after 1 week if metrics improve
```

---

## Post-Deployment Verification

### Immediate (within 5 minutes)
- [ ] Visit production URL
- [ ] Verify page loads without errors
- [ ] Check browser console for errors
- [ ] Verify fonts load correctly
- [ ] Test one calculator submission
- [ ] Verify timer works

### Within 24 Hours
- [ ] Check Google Search Console for errors
- [ ] Monitor error logs
- [ ] Review user feedback/support tickets
- [ ] Check analytics for bounce rate changes
- [ ] Verify mobile traffic renders correctly

### Within 1 Week
- [ ] Compare conversion rates (old vs new)
- [ ] Review user session recordings (if available)
- [ ] Check time-on-page metrics
- [ ] Gather user feedback
- [ ] Monitor Core Web Vitals

---

## Performance Optimization (After Initial Deployment)

### 1. Font Loading
```html
<!-- Add to <head> for faster font loading -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap">
```

### 2. CSS Minification
```bash
# Install cssnano
npm install -g cssnano-cli

# Minify CSS
cssnano casevault-insights/casevault.css casevault-insights/casevault.min.css

# Update HTML references
# Change: href="/casevault-insights/casevault.css"
# To: href="/casevault-insights/casevault.min.css"
```

### 3. Image Optimization (if images added later)
- Compress images with TinyPNG
- Use WebP format with JPEG fallback
- Lazy load images below fold

### 4. CDN Setup
- Move CSS to CDN (CloudFlare, AWS CloudFront)
- Enable Brotli compression
- Set cache headers (1 year for static assets)

---

## Rollback Plan (If Issues Arise)

```bash
# Quick rollback to old version
cd /Users/nicholasbilodeau/Downloads/aibridges-repo

# Restore backups
mv casevault-calculator-OLD.html casevault-calculator.html
mv casevault-dashboard-OLD.html casevault-dashboard.html

# Commit and push
git add .
git commit -m "Rollback: Restore previous CaseVault design"
git push origin main

# Or revert to previous commit
git revert HEAD
git push origin main
```

---

## Monitoring & Metrics

### Key Metrics to Track

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Bounce Rate | TBD | < 50% | — |
| Time on Page | TBD | > 2 min | — |
| Calculator Submissions | TBD | +20% | — |
| Mobile Bounce Rate | TBD | < 60% | — |
| Page Load Time (mobile) | TBD | < 3s | — |
| Conversion to Dashboard | TBD | +30% | — |

### Tools to Use
- Google Analytics 4 (traffic, behavior)
- Google Search Console (SEO, errors)
- PageSpeed Insights (performance)
- Hotjar/FullStory (session recordings)
- Sentry (error tracking)

---

## Known Issues & Limitations

### Current Limitations
1. **Filter dropdowns are placeholders** — they log to console but don't fetch data
2. **Calculator uses client-side mock data** — need to connect to real DynamoDB API
3. **Dashboard shows static data** — need live data fetching
4. **No error states** — form validation needs error messaging
5. **No loading states** — API calls need spinners/skeletons

### Future Enhancements
- Connect filters to real DynamoDB queries
- Add error boundaries and error messages
- Implement loading skeletons for data tables
- Add pagination for settlements table
- Create export functionality (CSV download)
- Build admin panel for data management
- Add chart.js for interactive visualizations
- Implement real-time updates via WebSocket

---

## Support & Troubleshooting

### Common Issues

**Issue:** Fonts not loading
**Fix:** Check CDN is reachable, verify CORS headers

**Issue:** CSS not applying
**Fix:** Clear browser cache, check file path

**Issue:** Animations janky on mobile
**Fix:** Add `will-change: transform` to animated elements

**Issue:** Forms not submitting
**Fix:** Check browser console for JS errors, verify API endpoints

**Issue:** Paywall not showing
**Fix:** Check localStorage keys, verify token expiration logic

---

## Next Steps After Deployment

### Week 1
- [ ] Monitor metrics daily
- [ ] Gather user feedback
- [ ] Fix any critical bugs
- [ ] Apply design system to intake/contribute pages

### Week 2-4
- [ ] Connect filters to real data
- [ ] Add error states and loading spinners
- [ ] Implement pagination
- [ ] Create marketing landing page with new design

### Month 2
- [ ] Build admin panel
- [ ] Add chart.js visualizations
- [ ] Implement CSV export
- [ ] Create API documentation

---

## Deployment Sign-Off

**Designer:** Dot 🐥 ✅
**Developer:** _______________ ☐
**QA Lead:** _______________ ☐
**Product Owner:** Nick ☐

**Deployment Date:** _______________
**Deployed By:** _______________
**Production URL:** https://aibridges.org/casevault-calculator

---

*Checklist created by Dot 🐥*
*Ship with confidence!* 🚀

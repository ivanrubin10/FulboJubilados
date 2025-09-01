# Email Authentication Setup Guide

This guide will help you configure SPF, DKIM, and DMARC records to improve email deliverability and prevent emails from going to spam.

## Step 1: Domain Verification in Resend

1. **Login to Resend Dashboard**: Go to https://resend.com/dashboard
2. **Add Your Domain**: 
   - Navigate to "Domains" section
   - Click "Add Domain"
   - Enter your domain (e.g., `fulbojubilados.com`)
3. **Verify Domain Ownership**:
   - Resend will provide a TXT record
   - Add this record to your DNS provider
   - Wait for verification (usually 5-15 minutes)

## Step 2: Configure SPF Record

Add this TXT record to your domain's DNS:

```
Name: @ (or leave blank for root domain)
Type: TXT
Value: v=spf1 include:_spf.resend.com ~all
```

**For subdomains** (if using mail.yourdomain.com):
```
Name: mail
Type: TXT
Value: v=spf1 include:_spf.resend.com ~all
```

## Step 3: Configure DKIM

After domain verification in Resend:

1. **Generate DKIM Keys**: Resend will automatically generate DKIM keys
2. **Add DKIM Records**: You'll receive 3 CNAME records to add:

```
Name: rs1._domainkey.yourdomain.com
Type: CNAME
Value: rs1.yourdomain.com._dkimkey.resend.com

Name: rs2._domainkey.yourdomain.com
Type: CNAME
Value: rs2.yourdomain.com._dkimkey.resend.com

Name: rs3._domainkey.yourdomain.com
Type: CNAME
Value: rs3.yourdomain.com._dkimkey.resend.com
```

## Step 4: Configure DMARC (Start with Monitoring)

Add this TXT record to start with a monitoring policy:

```
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; fo=1
```

### DMARC Policy Progression:

1. **Week 1-2**: `p=none` (monitoring only)
2. **Week 3-4**: `p=quarantine` (send to spam/junk)
3. **Week 5+**: `p=reject` (reject emails that fail)

### Advanced DMARC Record:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; fo=1; adkim=s; aspf=s; rf=afrf; pct=100; ri=86400
```

## Step 5: Additional DNS Records

### Return-Path Record:
```
Name: resend
Type: CNAME
Value: feedback.resend.com
```

### MX Record (if you want to receive emails):
```
Name: @ (or leave blank)
Type: MX
Priority: 10
Value: mx1.yourdomain.com
```

## Step 6: Verification

After adding all records:

1. **Wait for DNS Propagation**: Usually 15 minutes to 24 hours
2. **Test with Online Tools**:
   - https://mxtoolbox.com/spf.aspx
   - https://mxtoolbox.com/dkim.aspx
   - https://mxtoolbox.com/dmarc.aspx
3. **Check in Resend Dashboard**: All records should show as "Verified"

## Step 7: Update Environment Variables

Update your `.env.local` file:

```env
DOMAIN_VERIFIED=true
DKIM_ENABLED=true
SPF_CONFIGURED=true
DMARC_POLICY=none
```

## DNS Provider Specific Instructions

### Cloudflare:
- Name field should include full subdomain
- TTL can be "Auto" or 300 seconds
- Proxy status should be "DNS only" (gray cloud)

### GoDaddy:
- Use "@" for root domain records
- For CNAME records, don't include your domain in the Name field

### Namecheap:
- Use "@" for root domain
- CNAME records should not include the domain name in Value field

## Monitoring and Maintenance

1. **Monitor DMARC Reports**: Set up email parsing for DMARC reports
2. **Regular Testing**: Test email deliverability monthly
3. **Key Rotation**: Rotate DKIM keys annually
4. **Policy Updates**: Gradually increase DMARC policy strictness

## Common Issues and Solutions

### SPF Record Issues:
- **Too many lookups**: Keep DNS lookups under 10
- **Include mechanisms**: Use `include:` for third-party services
- **Syntax errors**: Validate SPF record syntax

### DKIM Issues:
- **Key length**: Use 2048-bit keys minimum
- **Selector rotation**: Rotate selectors regularly
- **Record format**: Ensure proper TXT record format

### DMARC Issues:
- **Alignment**: Ensure domain alignment for SPF and DKIM
- **Policy conflicts**: Don't set strict policies without testing
- **Report parsing**: Set up automated report analysis

## Success Metrics

After proper configuration, you should see:
- ✅ 95%+ inbox delivery rate
- ✅ Reduced spam complaints
- ✅ Improved sender reputation
- ✅ Better email engagement rates

## 2025 Compliance Note

Starting May 5, 2025, Microsoft requires DMARC for bulk senders (5000+ emails/day). Implement these changes now to ensure continued deliverability.
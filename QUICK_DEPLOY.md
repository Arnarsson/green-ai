# Quick Deploy to Coolify - TL;DR

Fast-track guide to deploy Green AI API to Coolify in under 5 minutes.

## Prerequisites

- [ ] Coolify instance running
- [ ] GitHub repository: https://github.com/Arnarsson/green-ai
- [ ] Domain name (optional)

## Deployment Steps

### 1. Create Resource in Coolify

```
Dashboard → + New → Resource → Public Repository
```

**Settings**:
- Repository: `https://github.com/Arnarsson/green-ai`
- Branch: `main`
- Build Pack: `Dockerfile`
- Port: `8000`

### 2. Configure Health Check

```
Health Check → Enable
Path: /health
Method: GET
Port: 8000
Interval: 30s
Timeout: 10s
Retries: 3
```

### 3. Deploy

Click **Deploy** button → Wait 2-5 minutes → Done! ✅

### 4. Test

```bash
# Replace YOUR_URL with your Coolify URL
curl https://YOUR_URL/health
curl https://YOUR_URL/v1/providers
```

### 5. Add Custom Domain (Optional)

```
Domains → Add Domain → api.green-ai.yourdomain.com
```

Update DNS:
```
Type: A
Name: api.green-ai
Value: <your-coolify-server-ip>
```

## That's It!

Your API is now live at: `https://your-coolify-url`

**API Docs**: `https://your-coolify-url/docs`

## Next Steps

- [ ] Monitor logs in Coolify dashboard
- [ ] Set up alerts (Settings → Notifications)
- [ ] Test all endpoints
- [ ] Share URL with beta users

## Need Help?

See full guide: [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)

## Estimated Costs

**Self-hosted on Hetzner CX21**: $5.50/month
- 2 vCPU
- 4GB RAM
- Can host 5-10 projects!

**Managed Coolify**: $20-50/month
- Fully managed
- Support included
- Less maintenance

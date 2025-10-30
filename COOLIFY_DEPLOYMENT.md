# Coolify Deployment Guide for Green AI API

Complete guide to deploying the Green AI API to Coolify.

## Prerequisites

- Coolify instance running (self-hosted or managed)
- GitHub repository connected to Coolify
- Domain name (optional, for custom domain)

## Deployment Methods

Coolify supports two deployment methods:
1. **Docker-based** (Recommended) - Uses Dockerfile
2. **Git-based** - Uses Nixpacks auto-detection

This guide covers the Docker-based method for production deployments.

---

## Method 1: Deploy via Coolify Dashboard (Recommended)

### Step 1: Create New Project

1. Log in to your Coolify dashboard
2. Click **"+ New"** → **"Resource"** → **"Public Repository"**
3. Fill in the details:
   - **Repository URL**: `https://github.com/Arnarsson/green-ai`
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Port**: `8000`

### Step 2: Configure Build Settings

In the **Build** tab:

```yaml
Build Command: (leave empty - using Dockerfile)
Start Command: (leave empty - using Dockerfile CMD)
Port: 8000
```

### Step 3: Environment Variables

In the **Environment** tab, add:

```bash
LOG_LEVEL=info
ENVIRONMENT=production
```

Optional (for future features):
```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

### Step 4: Configure Health Check

In the **Health Check** tab:

```yaml
Health Check Enabled: Yes
Health Check Path: /health
Health Check Method: GET
Health Check Port: 8000
Health Check Interval: 30s
Health Check Timeout: 10s
Health Check Retries: 3
```

### Step 5: Deploy

1. Click **"Deploy"** button
2. Monitor the build logs
3. Wait for deployment to complete (~2-5 minutes)
4. Access your API at the provided URL

---

## Method 2: Deploy via Docker Compose

If you prefer using Docker Compose on your Coolify server:

### Step 1: Create New Resource

1. In Coolify dashboard: **"+ New"** → **"Resource"** → **"Docker Compose"**
2. Paste the contents of `docker-compose.yml`

### Step 2: Configure

Update the compose file if needed for your environment.

### Step 3: Deploy

Click **"Deploy"** and monitor the logs.

---

## Post-Deployment Configuration

### 1. Custom Domain (Optional)

In the **Domains** tab:
1. Add your custom domain: `api.green-ai.yourdomain.com`
2. Coolify will automatically provision SSL certificate via Let's Encrypt
3. Update DNS records:
   ```
   Type: A
   Name: api.green-ai
   Value: <your-coolify-server-ip>
   TTL: 3600
   ```

### 2. Verify Deployment

Test the API endpoints:

```bash
# Health check
curl https://your-coolify-url/health

# List providers
curl https://your-coolify-url/v1/providers

# Test detection
curl -X POST https://your-coolify-url/v1/detect-and-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "api_endpoint": "https://api.openai.com/v1/chat/completions",
    "latency_ms": 2500,
    "power_watts": 400
  }'
```

### 3. Monitor Logs

In Coolify dashboard:
1. Go to your resource
2. Click **"Logs"** tab
3. View real-time application logs
4. Check for errors or warnings

### 4. Set Up Monitoring

Enable Coolify monitoring features:
- **Resource Usage**: CPU, Memory, Network
- **Uptime Monitoring**: Automatic health checks
- **Notifications**: Discord, Slack, Email alerts

---

## Troubleshooting

### Build Fails

**Problem**: Docker build fails
**Solution**:
1. Check build logs in Coolify
2. Verify Dockerfile syntax
3. Ensure all dependencies in `requirements.txt` are valid
4. Check Python version compatibility (3.12)

### Health Check Fails

**Problem**: Health check returns unhealthy
**Solution**:
1. Verify API is running on port 8000
2. Check `/health` endpoint returns 200 OK
3. Review application logs for startup errors
4. Ensure health check path is `/health` (not `/health/`)

### API Returns 502/503 Errors

**Problem**: Gateway errors when accessing API
**Solution**:
1. Check container logs: `docker logs <container-id>`
2. Verify port 8000 is exposed correctly
3. Check health check status in Coolify
4. Restart the resource in Coolify

### High Memory Usage

**Problem**: Container using too much memory
**Solution**:
1. Check for memory leaks in logs
2. Reduce number of workers in Dockerfile CMD (currently 2)
3. Add memory limits in Coolify settings
4. Monitor with Coolify resource usage graphs

### Rate Limiting Issues

**Problem**: Too many 429 errors
**Solution**:
1. Current limit: 100 requests/hour per IP
2. To increase: Add Redis and configure in `api/main.py`
3. Or deploy multiple instances behind a load balancer

---

## Scaling and Optimization

### Horizontal Scaling

Deploy multiple instances:
1. Create 2-3 replicas in Coolify
2. Use Coolify's built-in load balancing
3. Each instance handles 100 req/hour → 300 req/hour total

### Vertical Scaling

Increase resources per instance:
1. In Coolify: **Settings** → **Resources**
2. Increase CPU: 1-2 cores recommended
3. Increase Memory: 512MB-1GB recommended
4. Increase workers in Dockerfile: `--workers 4`

### Add Redis for Better Rate Limiting

1. Deploy Redis container in Coolify
2. Add environment variables:
   ```bash
   REDIS_HOST=redis-container-name
   REDIS_PORT=6379
   ```
3. Redis will be auto-detected by slowapi

### CDN Integration

For better global performance:
1. Use Cloudflare in front of Coolify
2. Cache static responses (providers, regions)
3. Rate limit at CDN level
4. DDoS protection included

---

## Backup and Recovery

### Automatic Backups (Coolify)

1. Enable in Coolify settings
2. Backup frequency: Daily
3. Retention: 7 days
4. Storage: S3 or local

### Manual Backup

Export current deployment:
```bash
# Via Coolify dashboard: Export → JSON
# Or via Docker:
docker exec <container-id> tar -czf /tmp/backup.tar.gz /app
docker cp <container-id>:/tmp/backup.tar.gz ./backup.tar.gz
```

### Disaster Recovery

1. Keep `Dockerfile` and `docker-compose.yml` in Git
2. Document all environment variables
3. Test deployment on staging first
4. Use Coolify's rollback feature for quick recovery

---

## Monitoring and Alerting

### Built-in Coolify Monitoring

- Resource usage graphs (CPU, Memory, Network)
- Uptime monitoring with health checks
- Deployment history and logs
- Real-time container logs

### Custom Monitoring (Optional)

Add to your stack:
1. **Prometheus** - Metrics collection
2. **Grafana** - Visualization dashboards
3. **Loki** - Log aggregation
4. **Alertmanager** - Alert routing

### Alerts to Set Up

1. **Health Check Failures**: Notify immediately
2. **High Memory Usage**: Alert at >80%
3. **High CPU Usage**: Alert at >90%
4. **High Error Rate**: Alert at >5% 5xx errors
5. **Deployment Failures**: Notify on failed deployments

---

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` files to Git
- Use Coolify's secret management
- Rotate secrets regularly
- Use different values for staging/production

### 2. HTTPS/SSL

- Coolify auto-provisions Let's Encrypt certificates
- Force HTTPS redirects enabled by default
- Verify SSL certificate is valid

### 3. Rate Limiting

- Current: 100 req/hour per IP
- Consider IP allowlist for known clients
- Use Cloudflare for additional protection

### 4. Updates

- Keep Python dependencies updated
- Monitor for security vulnerabilities
- Test updates in staging first
- Use automated dependency scanning

### 5. Access Control

- Limit Coolify dashboard access (VPN or IP allowlist)
- Use strong passwords and 2FA
- Audit deployment logs regularly
- Review API access logs for anomalies

---

## CI/CD Integration

### Automatic Deployments

Coolify watches your GitHub repository:
1. Push to `main` branch
2. Coolify detects changes
3. Automatically rebuilds and deploys
4. Zero-downtime deployment

### Manual Deployments

In Coolify dashboard:
1. Go to your resource
2. Click **"Redeploy"** button
3. Select branch/commit to deploy
4. Monitor build logs

### Deployment Workflow

```
Local Development
    ↓
Git Commit & Push
    ↓
Coolify Auto-Deploy
    ↓
Health Check Verification
    ↓
Live Production
```

---

## Cost Optimization

### Coolify Hosting Options

1. **Self-hosted** (Cheapest)
   - VPS: $5-10/month (Hetzner, DigitalOcean)
   - Install Coolify for free
   - Full control

2. **Managed Coolify** ($20-50/month)
   - Coolify Cloud or third-party managed
   - Less maintenance
   - Support included

### Resource Usage

For Green AI API:
- **CPU**: 0.5-1 core sufficient for MVP
- **Memory**: 512MB recommended minimum
- **Storage**: 1GB sufficient
- **Bandwidth**: ~1GB/month for 10K requests

### Estimated Monthly Cost

```
Self-hosted VPS (Hetzner CX21):  $5.50/month
  - 2 vCPU
  - 4GB RAM
  - 40GB SSD
  - 20TB traffic

Can host 5-10 projects on one VPS!
```

---

## Maintenance Checklist

### Daily
- [ ] Check health status in Coolify
- [ ] Review error logs for issues
- [ ] Monitor resource usage

### Weekly
- [ ] Review API usage metrics
- [ ] Check for dependency updates
- [ ] Verify backups are working
- [ ] Review security logs

### Monthly
- [ ] Update dependencies
- [ ] Review and optimize costs
- [ ] Test disaster recovery process
- [ ] Audit access logs

---

## Next Steps

After successful deployment:

1. **Week 3**: Create documentation site
   - Deploy docs to Coolify as separate resource
   - Link to API documentation
   - Add integration guides

2. **Week 4**: Beta testing
   - Share API URL with beta users
   - Collect feedback via GitHub Issues
   - Monitor usage and errors
   - Iterate based on feedback

3. **Phase 2** (Weeks 5-8): Improve detection to 85%+
   - Add ML-based detection
   - Partner with providers
   - Deploy updates via Coolify auto-deploy

---

## Support

- **Coolify Docs**: https://coolify.io/docs
- **GitHub Issues**: https://github.com/Arnarsson/green-ai/issues
- **API Docs**: https://your-api-url/docs

---

## Summary

✅ **Deployment Steps**:
1. Push code to GitHub
2. Create new resource in Coolify
3. Configure build settings (Dockerfile, port 8000)
4. Add environment variables
5. Set up health checks
6. Deploy and verify
7. Add custom domain (optional)
8. Monitor and maintain

✅ **Estimated Time**: 15-30 minutes for first deployment

✅ **Cost**: $5-10/month (self-hosted) or $20-50/month (managed)

---

**Status**: Ready to deploy! Follow the steps above to get your API live on Coolify.

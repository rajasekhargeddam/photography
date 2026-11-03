# GitHub deployment

The supported workflow is now **GitHub → Cloudflare Builds → manual version promotion in Cloudflare**.

Follow [Deployment setup](deployment.md). No GitHub Actions workflow or GitHub deployment secrets are required. Cloudflare build commands upload inactive versions; you decide when they become live.

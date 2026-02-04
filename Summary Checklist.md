Summary Checklist

- [ ] Create SMTP credentials ⬜
- [ ] Verify domain/email ⬜
- [ ] Request production access ⬜
- [ ] Update production .env ⬜
- [ ] Deploy to Lightsail ⬜
- [ ] Test email sending ⬜

- [ ] Add GitHub Secrets for SES
- [ ] Add these secrets in GitHub → Settings → Secrets and variables → Actions:

Secret Name Value

- [ ] SMTP_HOST email-smtp.us-east-1.amazonaws.com
- [ ] SMTP_PORT 587
- [ ] SMTP_SECURE false
- [ ] SMTP_USER Your SES SMTP username
- [ ] SMTP_PASS Your SES SMTP password
- [ ] SMTP_FROM noreply@iwantmymtg.net
- [ ] APP_URL https://iwantmymtg.net

Generate onboarding SQL + config for a new MAO Systems client: $ARGUMENTS

Format of $ARGUMENTS: "clinic name - specialty - district - palette"
Example: "Clínica Del Valle - medicina general - Miraflores - general"

Generate:
1. SQL INSERT for tenants table with:
   - Unique UUID (generate one)
   - Subdomain derived from clinic name (lowercase, no spaces, no accents)
   - theme_config JSON using the specified palette from CLAUDE.md
   - plan: "starter"
   - active: true

2. SQL INSERT for users table:
   - Admin user for the clinic
   - Email: admin@{subdomain}.maosystems.io
   - Temporary password: Mao2026! (will be changed on first login)
   - role: "admin"

3. Checklist of manual steps after running the SQL:
   - Upload client logo to S3/storage
   - Configure DNS subdomain
   - Set environment variables for Nubefact (client's real RUC)
   - Send welcome email with credentials

Output as: SQL file + markdown checklist
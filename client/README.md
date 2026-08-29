# E-commerce client

This Next.js application will serve every tenant storefront, tenant admin panel,
and the platform admin interface. Django remains authoritative for tenant
resolution, authorization, prices, stock, coupons, orders, and payments.

## Start locally

```bash
pnpm dev --hostname 0.0.0.0
```

From the repository root, the equivalent command is:

```bash
pnpm --dir client dev --hostname 0.0.0.0
```

Open <http://localhost:3000>. After hostname-based tenancy exists, use a tenant
hostname such as <http://demo.localhost:3000>.

## Quality checks

```bash
pnpm lint
pnpm build
```

## Deployment

The production client will run as a Railway service. Browser API calls should
use a same-origin `/api` route that is forwarded server-side to the private
Django service. Do not let browser input select the tenant by sending an
untrusted tenant ID header.

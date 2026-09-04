from rest_framework.throttling import SimpleRateThrottle


class TenantIPThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        tenant_slug = view.kwargs.get("tenant_slug", "unknown")
        return self.cache_format % {
            "scope": f"{self.scope}:{tenant_slug}",
            "ident": self.get_ident(request),
        }


class CustomerLoginThrottle(TenantIPThrottle):
    scope = "customer_login"


class CustomerSignupThrottle(TenantIPThrottle):
    scope = "customer_signup"

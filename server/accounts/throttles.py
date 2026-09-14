from rest_framework.throttling import SimpleRateThrottle


class TenantIPThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        tenant_slug = view.kwargs.get("tenant_slug", "unknown")
        return self.cache_format % {
            "scope": f"{self.scope}:{tenant_slug}",
            "ident": self.get_ident(request),
        }


class TenantLoginThrottle(TenantIPThrottle):
    scope = "tenant_login"


class CustomerSignupThrottle(TenantIPThrottle):
    scope = "customer_signup"


class EmailActionThrottle(SimpleRateThrottle):
    scope = "email_action"
    rate = "10/hour"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }

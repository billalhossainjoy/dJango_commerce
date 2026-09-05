import re
from ipaddress import ip_address

from tenancy.models import TenantHostname

_HOSTNAME_LABEL_PATTERN = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")


class InvalidHostname(ValueError):
    """Raised when a request hostname cannot be normalized."""


def normalize_hostname(value: str) -> str:
    """Normalize a domain name by removing its port and trailing dot."""
    if not value or value != value.strip():
        raise InvalidHostname("Hostname cannot be empty or contain outer whitespace.")

    if value.count(":") > 1:
        raise InvalidHostname("IP addresses cannot identify a tenant.")

    hostname, separator, port = value.rpartition(":")
    if separator:
        if not hostname or not port.isascii() or not port.isdecimal():
            raise InvalidHostname("Hostname port must be a number.")

        if not 1 <= int(port) <= 65_535:
            raise InvalidHostname("Hostname port must be between 1 and 65535.")
    else:
        hostname = value

    hostname = hostname.removesuffix(".").lower()
    if not hostname:
        raise InvalidHostname("Hostname cannot be empty.")

    try:
        ip_address(hostname)
    except ValueError:
        pass
    else:
        raise InvalidHostname("IP addresses cannot identify a tenant.")

    if len(hostname) > 253:
        raise InvalidHostname("Hostname cannot exceed 253 characters.")

    if any(
        _HOSTNAME_LABEL_PATTERN.fullmatch(label) is None
        for label in hostname.split(".")
    ):
        raise InvalidHostname("Hostname contains an invalid DNS label.")

    return hostname


def resolve_hostname(value: str) -> TenantHostname | None:
    """Return the exact active hostname record, or None when it is unknown."""
    hostname = normalize_hostname(value)

    return (
        TenantHostname.objects.select_related("tenant")
        .filter(hostname__iexact=hostname, is_active=True)
        .first()
    )

import re
from ipaddress import ip_address

from tenancy.models import TenantHostname

_HOSTNAME_LABEL_PATTERN = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")
_MAX_HOSTNAME_LENGTH = 253

_MAX_PORT = 65_535


class InvalidHostname(ValueError):
    """Raised when a hostname cannot be safely normalized."""


def normalize_hostname(value: str) -> str:
    """Return one normalized ASCII hostname or raise InvalidHostname."""
    if not isinstance(value, str) or not value or value != value.strip():
        raise InvalidHostname("Hostname must be a non-empty string without whitespace.")

    if value.count(":") > 1:
        raise InvalidHostname("IP address literals are not valid tenant hostnames.")

    hostname, separator, port = value.rpartition(":")
    if separator:
        if not hostname or not port.isascii() or not port.isdecimal():
            raise InvalidHostname("Hostname port must be a decimal number.")

        port_number = int(port)
        if not 1 <= port_number <= _MAX_PORT:
            raise InvalidHostname("Hostname port must be between 1 and 65535.")
    else:
        hostname = value

    hostname = hostname.removesuffix(".")
    if not hostname:
        raise InvalidHostname("Hostname cannot be empty.")

    try:
        hostname = hostname.encode("idna").decode("ascii").lower()
    except UnicodeError as error:
        raise InvalidHostname(
            "Hostname contains an invalid international label."
        ) from error

    try:
        ip_address(hostname)
    except ValueError:
        pass
    else:
        raise InvalidHostname("IP address literals are not valid tenant hostnames.")

    if len(hostname) > _MAX_HOSTNAME_LENGTH:
        raise InvalidHostname("Hostname cannot exceed 253 characters.")

    labels = hostname.split(".")
    if any(_HOSTNAME_LABEL_PATTERN.fullmatch(label) is None for label in labels):
        raise InvalidHostname("Hostname contains an invalid DNS label.")

    return hostname


def resolve_hostname(value: str) -> TenantHostname | None:
    """Resolve an exact active hostname record, or return None when unknown."""
    hostname = normalize_hostname(value)

    return (
        TenantHostname.objects.select_related("tenant")
        .filter(hostname__iexact=hostname, is_active=True)
        .first()
    )

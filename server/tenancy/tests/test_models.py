import pytest
from django.db import IntegrityError, transaction

from accounts.models import User
from tenancy.models import Tenant, TenantOwner


@pytest.mark.django_db
def test_owner_cannot_own_more_than_one_tenant():
    owner = User.objects.create_user(
        email="owner@example.com",
        password="strong-test-password-123",
        account_type=User.AccountType.PLATFORM,
    )
    TenantOwner.objects.create(
        user=owner,
        tenant=Tenant.objects.create(slug="first"),
    )

    with pytest.raises(IntegrityError), transaction.atomic():
        TenantOwner.objects.create(
            user=owner,
            tenant=Tenant.objects.create(slug="second"),
        )

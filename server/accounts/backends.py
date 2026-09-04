from django.contrib.auth.backends import ModelBackend

from accounts.models import User


class PlatformAuthenticationBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        email = username or kwargs.get("email")

        if not email or not password:
            return None

        user = User.objects.filter(
            email__iexact=email,
            account_type=User.AccountType.PLATFORM,
        ).first()

        if user is None:
            # Perform password hashing to reduce timing differences.
            User().set_password(password)
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

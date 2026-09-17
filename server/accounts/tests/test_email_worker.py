from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.db import OperationalError


def test_watch_recovers_from_a_temporary_database_outage():
    command = "accounts.management.commands.send_pending_emails"
    with (
        patch(f"{command}.close_old_connections"),
        patch(
            f"{command}.deliver_pending", side_effect=[OperationalError(), 1]
        ) as send,
        patch(f"{command}.time.sleep", side_effect=[None, KeyboardInterrupt]) as sleep,
        pytest.raises(KeyboardInterrupt),
    ):
        call_command("send_pending_emails", watch=True, interval=30, limit=20)
    assert send.call_count == 2
    send.assert_called_with(20)
    sleep.assert_called_with(30)


def test_one_shot_reports_database_failures():
    command = "accounts.management.commands.send_pending_emails"
    with (
        patch(f"{command}.close_old_connections"),
        patch(f"{command}.deliver_pending", side_effect=OperationalError()),
        pytest.raises(OperationalError),
    ):
        call_command("send_pending_emails")

from django.db import DatabaseError, connection
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["GET"])
def health(request: Request) -> Response:
    """Report that the Django process can serve API requests."""
    return Response({"status": "ok"})


@api_view(["GET"])
def readiness(request: Request) -> Response:
    """Report whether required services are ready to handle requests."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except DatabaseError:
        return Response({"status": "unavailable"}, status=503)

    return Response({"status": "ready"})

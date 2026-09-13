from django.urls import path

from customers.views import AdminCustomerDetailView, AdminCustomerListView

urlpatterns = [
    path("customers/", AdminCustomerListView.as_view(), name="admin-customer-list"),
    path(
        "customers/<uuid:pk>/",
        AdminCustomerDetailView.as_view(),
        name="admin-customer-detail",
    ),
]

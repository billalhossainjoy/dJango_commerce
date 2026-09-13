import { apiRequest } from "@/lib/api-client";

export type AdminCustomer = {
  id: string;
  email: string;
  is_active: boolean;
  date_joined: string;
};

export class CustomerService {
  list(
    tenantSlug: string,
    accessToken: string,
    signal?: AbortSignal,
    search = "",
  ): Promise<AdminCustomer[]> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const normalizedSearch = search.trim();
    const query = normalizedSearch
      ? `?search=${encodeURIComponent(normalizedSearch)}`
      : "";
    return apiRequest<AdminCustomer[]>(
      `/api/v1/tenants/${encodedSlug}/admin/customers/${query}`,
      { accessToken, signal },
    );
  }

  setActive(
    tenantSlug: string,
    customerId: string,
    isActive: boolean,
    accessToken: string,
  ): Promise<AdminCustomer> {
    const encodedSlug = encodeURIComponent(tenantSlug);
    const encodedId = encodeURIComponent(customerId);
    return apiRequest<AdminCustomer>(
      `/api/v1/tenants/${encodedSlug}/admin/customers/${encodedId}/`,
      {
        method: "PATCH",
        accessToken,
        body: { is_active: isActive },
      },
    );
  }
}

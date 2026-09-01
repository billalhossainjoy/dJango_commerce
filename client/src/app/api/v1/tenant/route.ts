const djangoApiUrl = process.env.DJANGO_API_URL;
const internalProxySecret = process.env.INTERNAL_PROXY_SECRET;

export async function GET(request: Request) {
  const publicHostname = request.headers.get("host");

  if (!djangoApiUrl || !internalProxySecret || !publicHostname) {
    return Response.json(
      { detail: "API proxy is not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(new URL("/api/v1/tenant/", djangoApiUrl), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Internal-Proxy-Secret": internalProxySecret,
      "X-Tenant-Hostname": publicHostname,
    },
  });

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
    status: response.status,
  });
}

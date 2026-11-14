export async function api(path, method = "GET", body) {
  const r = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(data.error || "Không thực hiện được yêu cầu");
  }
  return data;
}

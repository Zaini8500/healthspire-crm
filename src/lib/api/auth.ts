export const getAuthToken = () => {
  return localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token") || "";
};

export const getAuthHeaders = (extra: Record<string, string> = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

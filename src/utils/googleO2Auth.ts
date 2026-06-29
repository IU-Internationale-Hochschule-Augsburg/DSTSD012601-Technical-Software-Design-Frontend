const GOOGLE_OAUTH_DATA = {
  web: {
    client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
    project_id: "abotracker-oauth",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_secret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || "",
    javascript_origins: ["http://localhost:3000", "https://sparaw.de"]
  }
};

export default GOOGLE_OAUTH_DATA;

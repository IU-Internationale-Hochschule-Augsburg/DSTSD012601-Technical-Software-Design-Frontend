import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
// @ts-ignore
import { STANDALONE } from "../utils/constants";
import GOOGLE_OAUTH_DATA from "../utils/googleO2Auth";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
    accessToken: string;
    idToken?: string;
    expiresAt: number; // Unix-Timestamp in ms
}

export interface UseGoogleAuthReturn {
    user: GoogleUser | null;
    isLoading: boolean;
    error: string | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    isAuthenticated: boolean;
}

// ─── Konfiguration ────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = GOOGLE_OAUTH_DATA.web.client_id ?? "";
const GOOGLE_CLIENT_SECRET = GOOGLE_OAUTH_DATA.web.client_secret ?? "";
const GOOGLE_AUTH_URI = GOOGLE_OAUTH_DATA.web.auth_uri ?? "https://accounts.google.com/o/oauth2/auth";
const GOOGLE_TOKEN_URI = GOOGLE_OAUTH_DATA.web.token_uri ?? "https://oauth2.googleapis.com/token";

const REDIRECT_URI = 'https://sparaw.de'
const SCOPES = ["openid", "email", "profile"];
const STORAGE_KEY = "google_auth_user";

// ─── PKCE-Hilfsfunktionen ─────────────────────────────────────────────────────

async function generateCodeVerifier(): Promise<string> {
    const array = new Uint8Array(32);
    if (typeof crypto !== "undefined") {
        crypto.getRandomValues(array);
    } else {
        array.forEach((_, i) => (array[i] = Math.floor(Math.random() * 256)));
    }
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    if (typeof crypto === "undefined" || !crypto.subtle) {
        return verifier;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// ─── Token-Exchange ───────────────────────────────────────────────────────────

async function exchangeCodeForTokens(
    code: string,
    codeVerifier: string
): Promise<{ access_token: string; id_token?: string; expires_in: number }> {
    const response = await fetch(GOOGLE_TOKEN_URI, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
            code_verifier: codeVerifier,
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error_description ?? "Token-Austausch fehlgeschlagen");
    }

    return response.json();
}

async function fetchUserInfo(accessToken: string): Promise<Omit<GoogleUser, "accessToken" | "idToken" | "expiresAt">> {
    const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) throw new Error("Nutzerdaten konnten nicht geladen werden");

    const data = await response.json();
    return {
        id: data.sub,
        email: data.email,
        name: data.name,
        picture: data.picture,
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGoogleAuth(): UseGoogleAuthReturn {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                if (STANDALONE) {
                    setIsLoading(false);
                    return;
                }

                if (Platform.OS === "web") {
                    if (typeof window !== "undefined") {
                        const params = new URLSearchParams(window.location.search);
                        const code = params.get("code");
                        const state = params.get("state");
                        const oauthError = params.get("error");

                        if (oauthError) {
                            setError(`Google-Login abgebrochen: ${oauthError}`);
                            clearUrlParams();
                            setIsLoading(false);
                            return;
                        }

                        if (code && state) {
                            await handleOAuthCallbackWeb(code, state);
                            return;
                        }
                    }
                }

                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed: GoogleUser = JSON.parse(stored);
                    if (parsed.expiresAt > Date.now()) {
                        setUser(parsed);
                    } else {
                        await AsyncStorage.removeItem(STORAGE_KEY);
                    }
                }
            } catch (err) {
                console.error("Google Auth init error:", err);
                setError(err instanceof Error ? err.message : "Unbekannter Fehler");
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const handleOAuthCallbackWeb = async (code: string, state: string) => {
        const savedState = typeof localStorage !== "undefined" ? localStorage.getItem("oauth_state") : null;
        const codeVerifier = typeof localStorage !== "undefined" ? localStorage.getItem("oauth_code_verifier") : null;

        // Bereits verarbeitet (zweiter useEffect-Aufruf)
        if (!savedState || !codeVerifier) return;

        if (!savedState || state !== savedState) {
            throw new Error("Ungültiger OAuth-State – möglicher CSRF-Angriff");
        }
        if (!codeVerifier) {
            throw new Error("Code-Verifier nicht gefunden");
        }

        if (typeof localStorage !== "undefined") {
            localStorage.removeItem("oauth_state");
            localStorage.removeItem("oauth_code_verifier");
        }
        clearUrlParams();

        const tokens = await exchangeCodeForTokens(code, codeVerifier);
        const userInfo = await fetchUserInfo(tokens.access_token);

        const newUser: GoogleUser = {
            ...userInfo,
            accessToken: tokens.access_token,
            idToken: tokens.id_token,
            expiresAt: Date.now() + tokens.expires_in * 1000,
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        setUser(newUser);
        setIsLoading(false);
    };

    const handleOAuthCallbackNative = async (result: any) => {
        if (!result || !result.params || !result.params.code) {
            setError("Google-Login abgebrochen");
            setIsLoading(false);
            return;
        }

        try {
            const code = result.params.code;

            const response = await fetch(GOOGLE_TOKEN_URI, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    redirect_uri: REDIRECT_URI,
                    grant_type: "authorization_code",
                }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                setError(err.error_description ?? "Token-Austausch fehlgeschlagen");
                setIsLoading(false);
                return;
            }

            const tokens = await response.json();
            const userInfo = await fetchUserInfo(tokens.access_token);

            const newUser: GoogleUser = {
                ...userInfo,
                accessToken: tokens.access_token,
                idToken: tokens.id_token,
                expiresAt: Date.now() + tokens.expires_in * 1000,
            };

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
            setUser(newUser);
            setIsLoading(false);
        } catch (err) {
            console.error("OAuth callback error:", err);
            setError(err instanceof Error ? err.message : "Authentifizierung fehlgeschlagen");
            setIsLoading(false);
        }
    };

    const signIn = useCallback(async () => {
        if (!GOOGLE_CLIENT_ID) {
            setError("EXPO_PUBLIC_GOOGLE_CLIENT_ID ist nicht gesetzt");
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            if (Platform.OS === "web") {
                const codeVerifier = await generateCodeVerifier();
                const codeChallenge = await generateCodeChallenge(codeVerifier);
                const state = crypto.randomUUID?.() ?? Math.random().toString(36).substring(7);

                if (typeof sessionStorage !== "undefined") {
                    localStorage.setItem("oauth_code_verifier", codeVerifier);
                    localStorage.setItem("oauth_state", state);
                }

                const authUrl = new URL(GOOGLE_AUTH_URI);
                authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
                authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
                authUrl.searchParams.set("response_type", "code");
                authUrl.searchParams.set("scope", SCOPES.join(" "));
                authUrl.searchParams.set("state", state);
                authUrl.searchParams.set("code_challenge", codeChallenge);
                authUrl.searchParams.set("code_challenge_method", "S256");
                authUrl.searchParams.set("access_type", "offline");
                authUrl.searchParams.set("prompt", "select_account");

                if (typeof window !== "undefined") {
                    window.location.href = authUrl.toString();
                }
            } else {
                // Native: Öffne Browser für OAuth
                const codeVerifier = await generateCodeVerifier();
                const codeChallenge = await generateCodeChallenge(codeVerifier);
                const state = crypto.randomUUID?.() ?? Math.random().toString(36).substring(7);

                // PKCE-Daten sichern
                await AsyncStorage.setItem("oauth_code_verifier", codeVerifier);
                await AsyncStorage.setItem("oauth_state", state);

                const authUrl = new URL(GOOGLE_AUTH_URI);
                authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
                authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
                authUrl.searchParams.set("response_type", "code");
                authUrl.searchParams.set("scope", SCOPES.join(" "));
                authUrl.searchParams.set("state", state);
                authUrl.searchParams.set("code_challenge", codeChallenge);
                authUrl.searchParams.set("code_challenge_method", "S256");
                authUrl.searchParams.set("access_type", "offline");
                authUrl.searchParams.set("prompt", "select_account");

                await WebBrowser.openBrowserAsync(authUrl.toString());
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Sign in error:", err);
            setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
            setIsLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem("oauth_state");
                localStorage.removeItem("oauth_code_verifier");
            }
            setUser(null);
            setError(null);
        } catch (err) {
            console.error("Sign out error:", err);
        }
    }, []);

    return {
        user,
        isLoading,
        error,
        signIn,
        signOut,
        isAuthenticated: user !== null && user.expiresAt > Date.now(),
    };
}

function clearUrlParams() {
    if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.toString());
    }
}
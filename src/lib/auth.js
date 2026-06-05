import { supabase } from "@/utils/supabase";
import { deleteRowsByField, upsertRow, uploadProfilePhoto } from "@/lib/supabaseData";
import {
    hydrateBookingsFromSupabase,
    hydrateCareerAuxFromSupabase,
    hydrateCareerApplicationsFromSupabase,
    hydrateMarketplaceAuxFromSupabase,
    hydrateRescheduleUsageFromSupabase,
    hydrateSubscriptionsFromSupabase,
} from "@/lib/supabaseSync";

const AUTH_CURRENT_USER_KEY = "servify_current_user";
export const AUTH_CHANGE_EVENT = "servify-auth-changed";

const USER_LINKED_ARRAY_KEYS = [
    "servify_bookings",
    "servify_notifications",
    "servify_chats",
    "servify_reviews",
    "servify_subscriptions",
    "servify_career_applications",
    "servify_career_notifications",
];
const notifyAuthChange = () => {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

let authSyncInitialized = false;

const normalizeEmail = (value) =>
    String(value || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, "")
        .trim()
        .toLowerCase();

const setCurrentUser = (sessionUser) => {
    if (sessionUser) {
        localStorage.setItem(AUTH_CURRENT_USER_KEY, JSON.stringify(sessionUser));
    } else {
        localStorage.removeItem(AUTH_CURRENT_USER_KEY);
    }
    notifyAuthChange();
};

const buildSessionUser = (authUser, profile = null) => {
    if (!authUser) {
        return null;
    }

    const guessedName = authUser.email ? authUser.email.split("@")[0] : "User";
    const email = authUser.email || profile?.email || "";
    const isAdmin = email === "admin@servify.in";
    
    return {
        id: authUser.id,
            name: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || guessedName,
        email: email,
        avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || "",
        role: isAdmin ? "admin" : "user",
    };
};

const getProfileByUserId = async (userId) => {
    if (!userId) {
        return null;
    }

    const { data, error } = await supabase
        .from("profiles")
            .select("id, full_name, email, avatar_url")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.warn("Supabase profile fetch failed:", error.message);
        return null;
    }
    return data;
};

const upsertProfileRecord = async (sessionUser) => {
    if (!sessionUser?.id) {
        return;
    }

    await upsertRow("profiles", {
        id: sessionUser.id,
            full_name: sessionUser.name,
        email: sessionUser.email,
        avatar_url: sessionUser.avatarUrl || null,
        updated_at: new Date().toISOString(),
    });
};

const syncFromAuthUser = async (authUser) => {
    if (!authUser) {
        setCurrentUser(null);
        return null;
    }

    const profile = await getProfileByUserId(authUser.id);
    const sessionUser = buildSessionUser(authUser, profile);
    
    // Don't block auth on profile upsert - it may fail due to RLS
    void upsertProfileRecord(sessionUser);
    
    setCurrentUser(sessionUser);

    // Hydrate domain data from Supabase on each authenticated session bootstrap.
    void hydrateBookingsFromSupabase({ userId: sessionUser.id, userEmail: sessionUser.email });
    void hydrateSubscriptionsFromSupabase({ userId: sessionUser.id, userEmail: sessionUser.email });
    void hydrateCareerApplicationsFromSupabase({ userId: sessionUser.id, isAdmin: sessionUser.role === "admin" });
    void hydrateMarketplaceAuxFromSupabase({ userId: sessionUser.id, userEmail: sessionUser.email });
    void hydrateCareerAuxFromSupabase({ userId: sessionUser.id, userEmail: sessionUser.email, isAdmin: sessionUser.role === "admin" });
    void hydrateRescheduleUsageFromSupabase({ userId: sessionUser.id, userEmail: sessionUser.email });

    return sessionUser;
};

export const initializeAuthSync = () => {
    if (authSyncInitialized) {
        return;
    }
    authSyncInitialized = true;

    void supabase.auth.getSession().then(({ data }) => {
        void syncFromAuthUser(data.session?.user || null);
    });

    supabase.auth.onAuthStateChange((event, session) => {
        if (!session?.user && event !== "SIGNED_OUT") {
            return;
        }
        void syncFromAuthUser(session?.user || null);
    });
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem(AUTH_CURRENT_USER_KEY) || "null");
};
export const isAdmin = () => {
    const user = getCurrentUser();
    return user?.role === "admin";
};
export const isAuthenticated = () => !!getCurrentUser();
export const signupUser = async (name, email, password, options = {}) => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
            data: {
                name: name.trim(),
            },
        },
    });

    if (error) {
        throw new Error(error.message || "Unable to create account");
    }

    const authUser = data.user;
    let avatarUrl = "";
    if (authUser?.id && options.avatarFile) {
        avatarUrl = await uploadProfilePhoto(authUser.id, options.avatarFile);
    }

    const sessionUser = {
        id: authUser?.id || null,
        name: name.trim(),
        email: normalizedEmail,
        avatarUrl,
    };

    // Don't block signup on profile upsert - it may fail due to RLS
    void upsertProfileRecord(sessionUser);
    setCurrentUser(sessionUser);
    return sessionUser;
};

export const loginUser = async (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
    });

    if (error) {
        throw new Error(error.message || "Invalid email or password");
    }

    const authUser = data.user;
    const profile = await getProfileByUserId(authUser?.id);
    const sessionUser = buildSessionUser(authUser, profile);
    
    // Don't block login on profile upsert - it may fail due to RLS
    void upsertProfileRecord(sessionUser);
    setCurrentUser(sessionUser);
    return sessionUser;
};

export const logoutUser = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
};

const cleanupUserLinkedData = (email) => {
    USER_LINKED_ARRAY_KEYS.forEach((key) => {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "[]");
            if (!Array.isArray(parsed)) {
                return;
            }

            const filtered = parsed.filter((item) => {
                if (!item || typeof item !== "object") {
                    return true;
                }

                const linkedEmails = [
                    item.userEmail,
                    item.email,
                    item.senderEmail,
                    item.reviewerEmail,
                ].filter(Boolean);

                return !linkedEmails.includes(email);
            });

            localStorage.setItem(key, JSON.stringify(filtered));
        } catch {
            // Ignore malformed local data and continue cleanup.
        }
    });
};

export const deleteCurrentUserAccount = async () => {
    const user = getCurrentUser();
    if (!user?.email) {
        throw new Error("No active user session found");
    }

    await Promise.all([
        deleteRowsByField("bookings", "user_id", user.id),
        deleteRowsByField("user_subscriptions", "user_id", user.id),
        deleteRowsByField("career_applications", "user_id", user.id),
        deleteRowsByField("career_notifications", "user_id", user.id),
        deleteRowsByField("career_chats", "sender_id", user.id),
        deleteRowsByField("chat_messages", "sender_id", user.id),
            deleteRowsByField("notifications", "user_id", user.id),
            deleteRowsByField("metrics_events", "user_id", user.id),
    ]);
    if (user.id) {
        await deleteRowsByField("profiles", "id", user.id);
    }

    cleanupUserLinkedData(user.email);
    await supabase.auth.signOut();
    setCurrentUser(null);
    return true;
};

export const updateCurrentUserProfile = async ({ name, avatarFile }) => {
    const user = getCurrentUser();
    if (!user?.email) {
        throw new Error("Please login first");
    }

    let avatarUrl = user.avatarUrl || "";
    if (avatarFile && user.id) {
        avatarUrl = await uploadProfilePhoto(user.id, avatarFile);
    }

    const nextUser = {
        ...user,
        name: name?.trim() || user.name,
        avatarUrl,
    };

    await upsertProfileRecord(nextUser);
    setCurrentUser(nextUser);
    return nextUser;
};

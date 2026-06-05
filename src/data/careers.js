import { deleteRowsByField } from "@/lib/supabaseData";
import { getCurrentUser } from "@/lib/auth";
import {
    deleteCareerNotificationFromSupabase,
    persistCareerApplicationToSupabase,
    persistCareerChatToSupabase,
    persistCareerNotificationToSupabase,
} from "@/lib/supabaseSync";
import { logger } from "@/lib/debugLogger";
import { supabase } from "@/utils/supabase";

const APPLICATIONS_KEY = "servify_career_applications";
const NOTIFICATIONS_KEY = "servify_career_notifications";
const CAREER_CHATS_KEY = "servify_career_chats";
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const getActiveSupabaseUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        logger.career.warn("⚠️ AUTH CHECK - FAILED", { errorMessage: error.message });
        return null;
    }
    return data?.user || null;
};

const readApplications = () => JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || "[]");
const writeApplications = (applications) => {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
};
const readNotifications = () => JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
const writeNotifications = (notifications) => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};
const notifyCareerChange = () => {
    window.dispatchEvent(new Event("servify-career-changed"));
};
const readCareerChats = () => JSON.parse(localStorage.getItem(CAREER_CHATS_KEY) || "[]");
const writeCareerChats = (chats) => {
    localStorage.setItem(CAREER_CHATS_KEY, JSON.stringify(chats));
    notifyCareerChange();
};

export const careerChatEvent = "servify-career-changed";
export const getCareerApplications = () => readApplications();
export const getCareerApplicationsByEmail = (email) => {
    const target = normalizeEmail(email);
    return readApplications().filter((application) => normalizeEmail(application.userEmail) === target);
};
export const getPendingCareerApplications = () => readApplications().filter((application) => application.status === "pending");
export const getApprovedCareerApplications = () => readApplications().filter((application) => application.status === "approved");
export const getCareerNotificationsByEmail = (email) => {
    const target = normalizeEmail(email);
    return readNotifications().filter((notification) => normalizeEmail(notification.userEmail) === target);
};
export const getCareerChatMessagesByApplication = (applicationId) =>
    readCareerChats().filter((message) => message.applicationId === applicationId);

export const getAllCareerChats = () => readCareerChats();

export const deleteCareerChatConversationByApplication = (applicationId) => {
    if (!applicationId) return 0;

    const chats = readCareerChats();
    const removed = chats.filter((message) => message.applicationId === applicationId);
    if (!removed.length) return 0;

    const nextChats = chats.filter((message) => message.applicationId !== applicationId);
    writeCareerChats(nextChats);

    const sessionUser = getCurrentUser();
    if (sessionUser?.id) {
        removed.forEach((message) => {
            void deleteRowsByField("career_chats", "id", message.id);
        });

    }

    return removed.length;
};

export const sendCareerChatMessage = ({ applicationId, senderEmail, senderName, text }) => {
    const body = String(text || "").trim();
    if (!applicationId || !senderEmail || !senderName || !body) {
        return null;
    }

    const chats = readCareerChats();
    const next = {
        id: crypto.randomUUID(),
        applicationId,
        senderEmail,
        senderName,
        text: body,
        createdAt: new Date().toISOString(),
    };

    chats.push(next);
    writeCareerChats(chats);

    const sessionUser = getCurrentUser();
    if (sessionUser?.id) {
        void persistCareerChatToSupabase({ message: next, userId: sessionUser.id });
    }

    return next;
};

export const editCareerChatMessage = ({ messageId, requesterEmail, nextText }) => {
    const targetId = String(messageId || "").trim();
    const body = String(nextText || "").trim();
    if (!targetId || !body) {
        return null;
    }

    const chats = readCareerChats();
    const index = chats.findIndex((message) => message.id === targetId);
    if (index === -1) {
        return null;
    }

    if (normalizeEmail(chats[index].senderEmail) !== normalizeEmail(requesterEmail)) {
        return null;
    }

    const updated = {
        ...chats[index],
        text: body,
        editedAt: new Date().toISOString(),
    };
    chats[index] = updated;
    writeCareerChats(chats);

    const sessionUser = getCurrentUser();
    if (sessionUser?.id) {
        void persistCareerChatToSupabase({ message: updated, userId: sessionUser.id });
    }

    return updated;
};

export const deleteCareerChatMessage = async ({ messageId, requesterEmail }) => {
    const targetId = String(messageId || "").trim();
    if (!targetId) {
        return false;
    }

    const chats = readCareerChats();
    const target = chats.find((message) => message.id === targetId);
    if (!target) {
        return false;
    }

    if (normalizeEmail(target.senderEmail) !== normalizeEmail(requesterEmail)) {
        return false;
    }

    // Delete from localStorage
    const nextChats = chats.filter((message) => message.id !== targetId);
    writeCareerChats(nextChats);

    // Delete from Supabase
    const sessionUser = getCurrentUser();
    if (sessionUser?.id) {
        const { deleteCareerChatFromSupabase } = await import("@/lib/supabaseSync");
        await deleteCareerChatFromSupabase(messageId);
    }

    notifyCareerChange();
    return true;
};
export const submitCareerApplication = async (application) => {
    logger.career.info("🚀 SUBMIT START", { input: application });

    // First, verify the user has an active Supabase session
    logger.career.info("🔑 VERIFYING AUTH SESSION");
    const activeSupabaseUser = await getActiveSupabaseUser();
    
    if (!activeSupabaseUser?.id) {
        logger.career.error("❌ SUBMIT FAILED - NO ACTIVE AUTH SESSION", { 
            hasActiveUser: !!activeSupabaseUser,
            userId: activeSupabaseUser?.id
        });
        // Return with syncSuccess: false so UI can show "offline" or "login required" message
        const draftApplication = {
            ...application,
            userEmail: normalizeEmail(application.userEmail),
            userId: null,
            serviceSlug: String(application.serviceSlug || application.serviceId || "").trim().toLowerCase(),
            serviceTitle: String(application.serviceTitle || application.serviceId || "").trim(),
            id: crypto.randomUUID(),
            status: "pending",
            createdAt: new Date().toISOString(),
        };
        return { ...draftApplication, syncSuccess: false };
    }

    logger.career.success("✅ AUTH SESSION VERIFIED", { userId: activeSupabaseUser.id });

    const sessionUser = getCurrentUser();
    logger.career.info("Current User Retrieved", { sessionUser });

    const normalizedUserEmail = normalizeEmail(application.userEmail);
    const serviceSlug = String(application.serviceSlug || application.serviceId || "").trim().toLowerCase();
    const serviceTitle = String(application.serviceTitle || application.serviceId || "").trim();
    
    logger.career.debug("Normalized Values", { normalizedUserEmail, serviceSlug, serviceTitle });

    const nextApplication = {
        ...application,
        userEmail: normalizedUserEmail,
        userId: activeSupabaseUser.id,  // ✅ Use the ACTIVE Supabase user ID
        serviceSlug,
        serviceTitle,
        id: crypto.randomUUID(),
        status: "pending",
        createdAt: new Date().toISOString(),
    };
    
    logger.career.info("Application Object Built", { nextApplication });

    const applications = readApplications();
    logger.career.debug("Current Applications in Storage", { count: applications.length });

    applications.unshift(nextApplication);
    writeApplications(applications);
    logger.career.success("Application Written to Local Storage", { totalInStorage: applications.length });

    const notifications = readNotifications();
    const nextNotification = {
        id: crypto.randomUUID(),
        userEmail: normalizedUserEmail,
        applicationId: nextApplication.id,
        title: "Validation request submitted",
        message: `Your profile for ${serviceTitle || serviceSlug || application.serviceId} has been sent for validation. We'll notify you once it's reviewed.`,
        createdAt: new Date().toISOString(),
        read: false,
    };
    const adminAlertNotification = {
        id: crypto.randomUUID(),
        userEmail: "admin@servify.in",
        applicationId: nextApplication.id,
        title: "New provider application",
        message: `${application.userName} applied for ${serviceTitle || serviceSlug || application.serviceId}. Review this request in admin dashboard.`,
        createdAt: new Date().toISOString(),
        read: false,
    };
    notifications.unshift(nextNotification);
    notifications.unshift(adminAlertNotification);
    writeNotifications(notifications);
    logger.career.info("Notifications Created", { notificationCount: notifications.length });

    notifyCareerChange();

    logger.career.info("🔄 SYNC TO SUPABASE - START", { userId: activeSupabaseUser.id });
    const syncSuccess = await persistCareerApplicationToSupabase({ 
        application: nextApplication, 
        userId: activeSupabaseUser.id  // ✅ Pass the ACTIVE user ID
    });
    logger.career.info("🔄 SYNC TO SUPABASE - END", { syncSuccess });
    
    void persistCareerNotificationToSupabase({ notification: nextNotification, userId: activeSupabaseUser.id });

    logger.career.success("✅ SUBMIT COMPLETE", { syncSuccess, applicationId: nextApplication.id });

    return {
        ...nextApplication,
        syncSuccess,
    };
};
export const reviewCareerApplication = async (applicationId, status, reviewer = "Servify Validation Team") => {
    const applications = readApplications();
    const index = applications.findIndex((application) => application.id === applicationId);
    if (index === -1) {
        throw new Error("Application not found");
    }
    applications[index] = {
        ...applications[index],
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer,
    };
    writeApplications(applications);
    const application = applications[index];
    const notifications = readNotifications();
    const nextNotification = {
        id: crypto.randomUUID(),
        userEmail: application.userEmail,
        applicationId: application.id,
        title: status === "approved" ? "Profile approved" : "Profile review update",
        message: status === "approved"
            ? `Your Servify profile for ${application.serviceId} is now live and visible on the service page.`
            : `Your Servify profile for ${application.serviceId} was rejected. You can update and apply again.`,
        createdAt: new Date().toISOString(),
        read: false,
    };
    notifications.unshift(nextNotification);
    writeNotifications(notifications);
    notifyCareerChange();

    const sessionUser = getCurrentUser();
    let syncSuccess = true;
    if (sessionUser?.id) {
        syncSuccess = await persistCareerApplicationToSupabase({ application, userId: application.userId || sessionUser.id });
        void persistCareerNotificationToSupabase({ notification: nextNotification, userId: sessionUser.id });
    }

    return {
        ...application,
        syncSuccess,
    };
};
export const markCareerNotificationsRead = (email) => {
    const target = normalizeEmail(email);
    const notifications = readNotifications().map((notification) => normalizeEmail(notification.userEmail) === target ? { ...notification, read: true } : notification);
    writeNotifications(notifications);
    notifyCareerChange();

    const sessionUser = getCurrentUser();
    if (sessionUser?.id) {
        notifications
            .filter((notification) => normalizeEmail(notification.userEmail) === target)
            .forEach((notification) => {
                void persistCareerNotificationToSupabase({ notification, userId: sessionUser.id });
            });
    }
};

export const markCareerNotificationRead = (email, notificationId) => {
    const target = normalizeEmail(email);
    const notifications = readNotifications().map((notification) =>
        normalizeEmail(notification.userEmail) === target && notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
    );
    writeNotifications(notifications);
    notifyCareerChange();

    const sessionUser = getCurrentUser();
    const updated = notifications.find((notification) => normalizeEmail(notification.userEmail) === target && notification.id === notificationId);
    if (sessionUser?.id && updated) {
        void persistCareerNotificationToSupabase({ notification: updated, userId: sessionUser.id });
    }
};

export const deleteCareerNotification = (email, notificationId) => {
    const target = normalizeEmail(email);
    const notifications = readNotifications().filter(
        (notification) => !(normalizeEmail(notification.userEmail) === target && notification.id === notificationId),
    );
    writeNotifications(notifications);
    void deleteCareerNotificationFromSupabase(notificationId);
    notifyCareerChange();
};

export const deleteCareerApplication = (applicationId, userEmail) => {
    const applications = readApplications().filter(
        (application) => !(application.id === applicationId && application.userEmail === userEmail),
    );
    writeApplications(applications);
    void deleteRowsByField("career_applications", "id", applicationId);

    const notifications = readNotifications();
    notifications.unshift({
        id: crypto.randomUUID(),
        userEmail,
        title: "Profile removed",
        message: "Your career profile has been removed from Servify service listings.",
        createdAt: new Date().toISOString(),
        read: false,
    });
    writeNotifications(notifications);
    notifyCareerChange();
};

export const deleteCareerDataByEmail = (email) => {
    const applications = readApplications().filter((application) => application.userEmail !== email);
    const notifications = readNotifications().filter((notification) => notification.userEmail !== email);
    writeApplications(applications);
    writeNotifications(notifications);
    const sessionUser = getCurrentUser();
    if (sessionUser?.id) {
        void deleteRowsByField("career_applications", "user_id", sessionUser.id);
        void deleteRowsByField("career_notifications", "user_id", sessionUser.id);
        void deleteRowsByField("career_chats", "sender_id", sessionUser.id);
    }
    notifyCareerChange();
};

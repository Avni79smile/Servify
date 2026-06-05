import { getServiceById, resolveServiceId, services } from "@/data/services";
import { getApprovedCareerApplications } from "@/data/careers";

const profileTemplates = [
    {
        experienceYears: 4,
        rating: 4.8,
        jobsCompleted: 420,
        badges: ["KYC Verified", "Background Checked", "Fast Responder"],
        responseTimeMinutes: 12,
    },
    {
        experienceYears: 6,
        rating: 4.9,
        jobsCompleted: 560,
        badges: ["Top Rated", "KYC Verified", "Police Verified"],
        responseTimeMinutes: 9,
    },
    {
        experienceYears: 5,
        rating: 4.7,
        jobsCompleted: 378,
        badges: ["KYC Verified", "On-time Pro"],
        responseTimeMinutes: 16,
    },
    {
        experienceYears: 7,
        rating: 4.9,
        jobsCompleted: 690,
        badges: ["Elite Pro", "Background Checked", "Fast Responder"],
        responseTimeMinutes: 8,
    },
];

const maleFirstNames = [
    "Aarav", "Akash", "Arjun", "Deepak", "Farhan", "Harsh", "Ishaan", "Kabir", "Kiran", "Laksh", "Mihir", "Nikhil", "Pranav", "Ritvik", "Sarthak", "Uday", "Veer", "Vihaan", "Yash", "Rohan", "Aditya", "Manav", "Kunal", "Siddharth",
];

const femaleFirstNames = [
    "Aisha", "Anaya", "Bhavna", "Diya", "Gauri", "Ira", "Jiya", "Kavya", "Meera", "Naina", "Pari", "Rhea", "Saanvi", "Siya", "Tanya", "Vaishnavi", "Zoya", "Anika", "Ishita", "Myra", "Pooja", "Ritika", "Sneha", "Trisha",
];

const femaleNameSet = new Set(femaleFirstNames.map((name) => name.toLowerCase()));

const lastNames = [
    "Agarwal", "Bansal", "Chauhan", "Deshmukh", "Fernandes", "Ghosh", "Iyer", "Jain", "Kapoor", "Khanna", "Kulkarni", "Malhotra", "Menon", "Mehta", "Mishra", "Nair", "Pandey", "Patel", "Rao", "Reddy", "Saxena", "Shah", "Sharma", "Singh", "Srinivasan", "Tiwari", "Trivedi", "Varma", "Verma", "Yadav", "Pillai", "Bose", "Chatterjee", "Sood", "Gill", "Arora",
];
const defaultSlots = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"];
const toSlug = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const malePhotoPool = Array.from({ length: 99 }, (_, index) => `https://randomuser.me/api/portraits/men/${index + 1}.jpg`);
const femalePhotoPool = Array.from({ length: 99 }, (_, index) => `https://randomuser.me/api/portraits/women/${index + 1}.jpg`);
let malePhotoIndex = 0;
let femalePhotoIndex = 0;

const resetPhotoAllocation = () => {
    malePhotoIndex = 0;
    femalePhotoIndex = 0;
};

const inferGenderFromName = (fullName = "") => {
    const first = String(fullName || "").trim().split(/\s+/)[0]?.toLowerCase();
    if (!first) {
        return "male";
    }
    return femaleNameSet.has(first) ? "female" : "male";
};

const takeUniquePhoto = (gender, usedPhotos, preferredPhoto = "") => {
    const normalizedPreferred = String(preferredPhoto || "").trim();
    const canUsePreferred = normalizedPreferred
        && /^https?:\/\//i.test(normalizedPreferred)
        && !normalizedPreferred.startsWith("blob:")
        && !usedPhotos.has(normalizedPreferred);

    if (canUsePreferred) {
        usedPhotos.add(normalizedPreferred);
        return normalizedPreferred;
    }

    if (gender === "female") {
        while (femalePhotoIndex < femalePhotoPool.length) {
            const candidate = femalePhotoPool[femalePhotoIndex++];
            if (!usedPhotos.has(candidate)) {
                usedPhotos.add(candidate);
                return candidate;
            }
        }
    } else {
        while (malePhotoIndex < malePhotoPool.length) {
            const candidate = malePhotoPool[malePhotoIndex++];
            if (!usedPhotos.has(candidate)) {
                usedPhotos.add(candidate);
                return candidate;
            }
        }
    }

    // Fallback to any remaining photo URL if one gender pool is exhausted.
    const combinedPool = [...malePhotoPool, ...femalePhotoPool];
    for (const candidate of combinedPool) {
        if (!usedPhotos.has(candidate)) {
            usedPhotos.add(candidate);
            return candidate;
        }
    }

    return preferredPhoto || "";
};

const getProfileIdentity = (service, serviceIndex, profileIndex, usedPhotos) => {
    const seed = serviceIndex * 29 + profileIndex * 11;
    const gender = (serviceIndex + profileIndex) % 2 === 0 ? "male" : "female";
    const firstPool = gender === "female" ? femaleFirstNames : maleFirstNames;
    const first = firstPool[seed % firstPool.length];
    const last = lastNames[(seed * 7 + profileIndex) % lastNames.length];
    const name = `${first} ${last}`;
    const email = `${toSlug(name)}+${service.id}@servify.in`;
    const photo = takeUniquePhoto(gender, usedPhotos);
    return { name, email, photo, gender };
};

const buildBio = (service, years) => `${years}+ years of experience in ${service.title.toLowerCase()}, focused on quality, punctuality, and polite communication.`;

const applicationToProfessional = (application, usedPhotos) => {
    const service = getServiceById(application.serviceId);
    if (!service) {
        return null;
    }

    const normalizedGender = String(application.gender || "").toLowerCase().trim();
    const gender = normalizedGender === "female" || normalizedGender === "male"
        ? normalizedGender
        : inferGenderFromName(application.userName);
    return {
        id: application.id,
        serviceId: application.serviceId,
        name: application.userName,
        email: application.userEmail,
        photo: takeUniquePhoto(gender, usedPhotos, application.profilePhoto || ""),
        gender,
        experienceYears: application.experienceYears,
        rating: 4.9,
        jobsCompleted: 0,
        bio: `${application.experienceYears}+ years of hands-on experience. ${application.whyJoin}`,
        availableSlots: defaultSlots,
        badges: ["Validated Hire", "KYC Verified"],
        responseTimeMinutes: 20,
        origin: "career",
    };
};

const buildPlatformProfessionals = (usedPhotos) => services.flatMap((service, serviceIndex) => profileTemplates.map((template, profileIndex) => {
    const identity = getProfileIdentity(service, serviceIndex, profileIndex, usedPhotos);
    const experienceYears = template.experienceYears + (serviceIndex % 3);
    return {
        id: `${service.id}-${profileIndex + 1}`,
        serviceId: service.id,
        name: identity.name,
        email: identity.email,
        photo: identity.photo,
        gender: identity.gender,
        experienceYears,
        rating: Number((template.rating - (profileIndex % 2) * 0.1).toFixed(1)),
        jobsCompleted: template.jobsCompleted + serviceIndex * 8,
        bio: buildBio(service, experienceYears),
        availableSlots: defaultSlots,
        badges: template.badges,
        responseTimeMinutes: Math.max(5, template.responseTimeMinutes + (serviceIndex % 4)),
        origin: "platform",
    };
}));

const getBuiltProfessionals = () => {
    resetPhotoAllocation();
    const usedPhotos = new Set();
    const platformProfessionals = buildPlatformProfessionals(usedPhotos);
    const careerProfessionals = getApprovedCareerApplications()
        .map((application) => applicationToProfessional(application, usedPhotos))
        .filter((profile) => profile !== null);

    return {
        platformProfessionals,
        allProfessionals: [...platformProfessionals, ...careerProfessionals],
    };
};

export const professionals = getBuiltProfessionals().platformProfessionals;
export const getAllProfessionals = () => getBuiltProfessionals().allProfessionals;
export const getProfessionalsByService = (serviceId) => {
    const resolvedId = resolveServiceId(serviceId);
    return getAllProfessionals().filter((professional) => professional.serviceId === resolvedId);
};
export const getProfessionalById = (profileId) => getAllProfessionals().find((professional) => professional.id === profileId);
export const getProfessionalByEmail = (email) => {
    const normalizedEmail = String(email || "").toLowerCase().trim();
    return getAllProfessionals().find((professional) => 
        String(professional.email || "").toLowerCase().trim() === normalizedEmail
    );
};

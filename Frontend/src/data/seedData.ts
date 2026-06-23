import { UserRecord } from "../types";

/**
 * Default user record used as initial state before authentication data is available.
 * All fields are set to empty/zero values and will be overwritten upon login.
 */
export const defaultUser: UserRecord = {
    id: "", name: "", email: "", role: "user",
    unit: "", status: "active",
    storageUsed: 0, storageQuota: 10,
    lastLogin: "", avatar: "U", joined: ""
};

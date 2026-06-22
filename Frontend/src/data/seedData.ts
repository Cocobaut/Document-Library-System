import { UserRecord } from "../types";

export const defaultUser: UserRecord = {
  id: "", name: "", email: "", role: "user",
  unit: "", status: "active",
  storageUsed: 0, storageQuota: 10,
  lastLogin: "", avatar: "U", joined: ""
};

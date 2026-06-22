
export type Role = "user" | "manager" | "admin";
export type DocSection = "mine" | "shared" | "inherited";
export type DocStatus = "active" | "draft" | "archived";
export type UserStatus = "active" | "inactive" | "suspended";
export type FileType = "pdf" | "docx" | "xlsx" | "pptx" | "png" | "txt" | "csv" | "zip";
export type Modal =
  | { type: "share"; doc: Doc }
  | { type: "delete-doc"; id: string }
  | { type: "add-unit" }
  | { type: "edit-unit"; unit: Unit }
  | { type: "delete-unit"; id: string }
  | { type: "add-user" }
  | { type: "edit-user"; user: UserRecord }
  | { type: "delete-user"; id: string }
  | { type: "reset-pw"; user: UserRecord }
  | null;

export interface Doc {
  id: string; name: string; type: FileType; size: string;
  owner: string; ownerId: string; uploadDate: string;
  isPublic: boolean; section: DocSection;
  bookmarked: boolean; status: DocStatus;
  sharedWith?: string[];
}

export interface UserRecord {
  id: string; name: string; email: string; role: Role;
  unit: string; status: UserStatus;
  storageUsed: number; storageQuota: number;
  lastLogin: string; avatar: string; joined: string;
}

export interface Unit {
  id: string; name: string; manager: string;
  members: number; documents: number;
  storageUsed: number; storageQuota: number;
  description: string;
}

export interface QueueFile {
  id: string; name: string; rawSize: number;
  progress: number; status: "queued" | "uploading" | "done" | "error";
  type: string;
}

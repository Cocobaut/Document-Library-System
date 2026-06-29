/**
 * Core Type Definitions
 *
 * Centralized TypeScript types and interfaces used throughout the application.
 * Includes user roles, document models, UI state types, and queue structures.
 */

/** User authorization role determining access level and available features. */
export type Role = "admin" | "manager" | "user";

export interface Task {
    taskId: string;
    documentId: string;
    taskName: string;
    color: string;
}

/** Document ownership section, indicating how the user relates to the document. */
export type DocSection = "mine" | "shared" | "inherited";

/** Lifecycle status of a document. */
export type DocStatus = "active" | "draft" | "archived";

/** Account status for user records. */
export type UserStatus = "active" | "inactive" | "suspended";

/** Supported file types for document uploads and display. */
export type FileType = "pdf" | "docx" | "xlsx" | "pptx" | "png" | "txt" | "csv" | "zip";

/**
 * Discriminated union representing the currently active modal dialog.
 * Null indicates no modal is open.
 */
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
    | { type: "task"; doc: Doc }
    | null;

/** Frontend representation of a document entity. */
export interface Doc {
    id: string; name: string; type: FileType; size: string;
    owner: string; ownerId: string; uploadDate: string;
    isPublic: boolean; section: DocSection;
    bookmarked: boolean; status: DocStatus;
    sharedWith?: string[];
    unitId?: string;
    folderName?: string;
}

/** Frontend representation of a user account. */
export interface UserRecord {
    id: string; name: string; email: string; role: Role;
    unit: string; status: UserStatus;
    storageUsed: number; storageQuota: number;
    lastLogin: string; avatar: string; joined: string;
}

/** Frontend representation of an organizational unit (department). */
export interface Unit {
    id: string; name: string; manager: string;
    members: number; documents: number;
    storageUsed: number; storageQuota: number;
    description: string;
}

/** Represents a file in the upload queue with progress tracking. */
export interface QueueFile {
    id: string; name: string; rawSize: number;
    progress: number; status: "queued" | "uploading" | "done" | "error";
    type: string;
}

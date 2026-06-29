// src/services/taskApi.ts
// Frontend API wrapper for Task management endpoints

import { Task } from "../types";
import { API_BASE } from "./authApi";

export interface TaskPayload {
    document_id: string;
    task_name: string;
    color: string;
}

export interface TaskUpdatePayload {
    task_name?: string;
    color?: string;
}

/** 
 * Map backend response keys to frontend interface 
 */
function apiTaskToTask(data: any): Task {
    return {
        taskId: data.task_id,
        documentId: data.document_id,
        taskName: data.task_name,
        color: data.color
    };
}

/** Helper to get Auth Headers */
function getAuthHeaders() {
    const token = localStorage.getItem("access_token");
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
}

/**
 * Fetch all tasks created by the current user
 */
export async function fetchTasksApi(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`, { headers: getAuthHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to load tasks");
    }
    const data = await res.json();
    return data.map(apiTaskToTask);
}

/**
 * Create a new task (label) for a document
 */
export async function createTaskApi(payload: TaskPayload): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to create task");
    }
    const data = await res.json();
    return apiTaskToTask(data);
}

/**
 * Update an existing task
 */
export async function updateTaskApi(taskId: string, payload: TaskUpdatePayload): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to update task");
    }
    const data = await res.json();
    return apiTaskToTask(data);
}

/**
 * Delete a task
 */
export async function deleteTaskApi(taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to delete task");
    }
}

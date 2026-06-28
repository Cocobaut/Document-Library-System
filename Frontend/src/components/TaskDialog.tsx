// src/components/TaskDialog.tsx
import React, { useState, useEffect } from "react";
import { ModalShell } from "./Modal";
import { TextInput, Btn, Field } from "./DesignSystem";
import { Tag } from "lucide-react";
import { Task, Doc } from "../types";
import { createTaskApi, updateTaskApi } from "../services/taskApi";

interface TaskDialogProps {
    doc: Doc;
    existingTask?: Task;
    onClose: () => void;
    onSuccess: (task: Task) => void;
    onError: (msg: string) => void;
}

const COLORS = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Yellow
    "#22C55E", // Green
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#1F2937", // Gray
];

export function TaskDialog({ doc, existingTask, onClose, onSuccess, onError }: TaskDialogProps) {
    const [taskName, setTaskName] = useState(existingTask?.taskName || "");
    const [color, setColor] = useState(existingTask?.color || COLORS[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!taskName.trim()) {
            onError("Task name is required");
            return;
        }

        setLoading(true);
        try {
            let task: Task;
            if (existingTask) {
                task = await updateTaskApi(existingTask.taskId, {
                    task_name: taskName.trim(),
                    color,
                });
            } else {
                task = await createTaskApi({
                    document_id: doc.id,
                    task_name: taskName.trim(),
                    color,
                });
            }
            onSuccess(task);
            onClose();
        } catch (err: any) {
            onError(err.message || "Failed to save task");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell title={existingTask ? "Edit Task" : "Add Task"} subtitle={doc.name} onClose={onClose}>
            <div className="space-y-5">
                <Field label="Task Name">
                    <TextInput 
                        value={taskName} 
                        onChange={setTaskName} 
                        placeholder="Enter task name (e.g. Project A)..." 
                        icon={<Tag size={14}/>} 
                    />
                </Field>
                <Field label="Color">
                    <div className="flex gap-2 flex-wrap">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? "scale-110 border-slate-800" : "border-transparent hover:scale-105"}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Select color ${c}`}
                            />
                        ))}
                    </div>
                </Field>
                <div className="flex gap-3 justify-end pt-2">
                    <Btn variant="outline" onClick={onClose}>Cancel</Btn>
                    <Btn onClick={handleSubmit} disabled={loading}>
                        {loading ? "Saving..." : "Save"}
                    </Btn>
                </div>
            </div>
        </ModalShell>
    );
}

import mongoose from "mongoose";

const AssigneeSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    initials: { type: String, default: "" },
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectTitle: { type: String, default: "" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["backlog", "todo", "in-progress", "review", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    start: { type: Date },
    deadline: { type: Date },
    dueDate: { type: Date },
    assignees: { type: [AssigneeSchema], default: [] },
    comments: { type: Number, default: 0 },
    attachments: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Task", TaskSchema);

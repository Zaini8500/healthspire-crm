import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

const AssigneeSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    initials: { type: String, default: "" },
  },
  { _id: false }
);

const ChecklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SubTaskSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ReminderSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    when: { type: Date },
    repeat: { type: String, default: "" },
    priority: { type: String, default: "" },
  },
  { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
  {
    authorName: { type: String, default: "" },
    text: { type: String, default: "" },
    attachmentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ActivitySchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    message: { type: String, default: "" },
    authorName: { type: String, default: "" },
  },
  { timestamps: true }
);

const TaskSchema = new mongoose.Schema(
  {
    taskNo: { type: Number, unique: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    projectTitle: { type: String, default: "" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    points: { type: Number },
    status: { type: String, enum: ["backlog", "todo", "in-progress", "review", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    start: { type: Date },
    deadline: { type: Date },
    dueDate: { type: Date },
    assignees: { type: [AssigneeSchema], default: [] },
    collaborators: { type: [String], default: [] },
    comments: { type: Number, default: 0 },
    attachments: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] },
    subTasks: { type: [SubTaskSchema], default: [] },
    dependencies: {
      blockedBy: { type: [mongoose.Schema.Types.ObjectId], ref: "Task", default: [] },
      blocking: { type: [mongoose.Schema.Types.ObjectId], ref: "Task", default: [] },
    },
    reminders: { type: [ReminderSchema], default: [] },
    taskComments: { type: [CommentSchema], default: [] },
    activity: { type: [ActivitySchema], default: [] },
  },
  { timestamps: true }
);

TaskSchema.pre("save", async function preSave(next) {
  try {
    if (!this.isNew || this.taskNo) return next();
    const c = await Counter.findOneAndUpdate(
      { name: "task" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.taskNo = c.seq;
    return next();
  } catch (e) {
    return next(e);
  }
});

export default mongoose.model("Task", TaskSchema);

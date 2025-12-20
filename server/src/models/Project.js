import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    title: { type: String, default: "" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    price: { type: Number, default: 0 },
    start: { type: Date },
    deadline: { type: Date },
    status: { type: String, default: "Open" },
    // Added fields for richer project details
    description: { type: String, default: "" },
    labels: { type: String, default: "" }, // comma-separated string to match frontend
    progress: { type: Number, default: 0 }, // 0..100
    members: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Project", ProjectSchema);

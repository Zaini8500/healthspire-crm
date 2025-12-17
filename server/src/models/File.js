import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    name: { type: String, default: "" },
    path: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mime: { type: String, default: "" },
  },
  { timestamps: true }
);

FileSchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.model("File", FileSchema);

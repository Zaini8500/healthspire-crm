import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    avatar: { type: String, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, trim: true },
    passwordHash: { type: String, default: "" },
    role: { type: String, enum: ["admin", "client", "staff", "marketer"], default: "client" },
    permissions: [{ type: String, default: "" }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    failedLogins: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    createdBy: { type: String, default: "system" }, // e.g. self-signup
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);

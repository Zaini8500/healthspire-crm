import mongoose from "mongoose";
import Counter from "./Counter.js";

const ProposalSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    client: { type: String, default: "" },
    title: { type: String, default: "" },
    number: { type: Number, unique: true, index: true },
    amount: { type: Number, default: 0 },
    proposalDate: { type: Date },
    validUntil: { type: Date },
    status: { type: String, default: "draft" },
    tax1: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    note: { type: String, default: "" },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
  },
  { timestamps: true }
);

ProposalSchema.index({ leadId: 1, createdAt: -1 });

// Assign an auto-incrementing number if not set
ProposalSchema.pre("save", async function (next) {
  try {
    if (!this.isNew || typeof this.number === "number") return next();
    const ctr = await Counter.findOneAndUpdate(
      { key: "proposal" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    ).lean();
    this.number = ctr.value;
    next();
  } catch (e) {
    next(e);
  }
});

export default mongoose.model("Proposal", ProposalSchema);

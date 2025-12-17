import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    client: { type: String, default: "" },
    title: { type: String, default: "" },
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

export default mongoose.model("Proposal", ProposalSchema);

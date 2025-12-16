import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    client: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    status: { type: String, default: "Unpaid" },
    issueDate: { type: Date },
    dueDate: { type: Date },
    // Optional associations and meta
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    project: { type: String, default: "" },
    note: { type: String, default: "" },
    labels: { type: String, default: "" },
    advanceAmount: { type: Number, default: 0 },
    // Taxes percentages
    tax1: { type: Number, default: 0 },
    tax2: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    // Attachments uploaded via /api/files
    attachments: [
      {
        name: { type: String, default: "" },
        path: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", InvoiceSchema);

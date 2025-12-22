const mongoose = require("mongoose");

const projectRequestSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  budget: {
    type: String,
    trim: true,
  },
  deadline: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "in_progress"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

projectRequestSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("ProjectRequest", projectRequestSchema);

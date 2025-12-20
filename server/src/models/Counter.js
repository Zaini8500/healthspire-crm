import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export default mongoose.model("Counter", CounterSchema);

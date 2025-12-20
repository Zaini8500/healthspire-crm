import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: false }
);

// Reuse existing model if it was already compiled (fixes OverwriteModelError in dev reloads)
const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
export default Counter;

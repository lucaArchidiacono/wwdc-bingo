import mongoose from 'mongoose';

const catalogItemSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    label: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: 1, max: 24 },
    imageUrl: { type: String, default: '', trim: true },
    happened: { type: Boolean, default: false },
    occurredAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CatalogItem = mongoose.model('CatalogItem', catalogItemSchema);

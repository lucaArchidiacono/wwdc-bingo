import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true }],
    totalPoints: { type: Number, required: true },
    lockedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Card = mongoose.model('Card', cardSchema);

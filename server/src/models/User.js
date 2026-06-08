import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    isAdmin: { type: Boolean, default: false },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSchema.index(
  { roomId: 1, username: 1 },
  { unique: true, partialFilterExpression: { roomId: { $type: 'objectId' } } }
);
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { isAdmin: true } }
);

export const User = mongoose.model('User', userSchema);

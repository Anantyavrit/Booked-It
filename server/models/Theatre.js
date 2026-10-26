import mongoose from 'mongoose';

const screenSchema = new mongoose.Schema(
  {
    name:        { type: String, required: [true, 'Screen name is required'], trim: true },
    rows:        { type: Number, required: true, min: [1, 'Rows ≥ 1'], max: [26, 'Rows ≤ 26'] },
    seatsPerRow: { type: Number, required: true, min: [1, 'SeatsPerRow ≥ 1'], max: [40, 'SeatsPerRow ≤ 40'] },
  },
  { _id: false }
);

const theatreSchema = new mongoose.Schema(
  {
    name:    { type: String, required: [true, 'Theatre name is required'], trim: true },
    city:    { type: String, required: [true, 'City is required'], trim: true },
    address: { type: String, required: [true, 'Address is required'], trim: true },
    screens: {
      type: [screenSchema],
      validate: {
        validator: (screens) => {
          const names = screens.map((s) => s.name);
          return new Set(names).size === names.length;
        },
        message: 'Screen names must be unique within a theatre',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Efficient city-based filtering for public listings
theatreSchema.index({ city: 1, isActive: 1 });

const Theatre = mongoose.model('Theatre', theatreSchema);
export default Theatre;

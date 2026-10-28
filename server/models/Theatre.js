import mongoose from 'mongoose';

const screenSchema = new mongoose.Schema(
  {
    name:        { type: String, required: [true, 'Screen name is required'], trim: true },
    rows:        { type: Number, required: true, min: [1, 'Rows ≥ 1'], max: [26, 'Rows ≤ 26'] },
    seatsPerRow: { type: Number, required: true, min: [1, 'SeatsPerRow ≥ 1'], max: [40, 'SeatsPerRow ≤ 40'] },
    format:      { type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: '2D' },
    tier: {
      premiumRows:       { type: Number, default: 0 },
      premiumMultiplier: { type: Number, default: 1.25 },
    },
  },
  { _id: false }
);

const theatreSchema = new mongoose.Schema(
  {
    name:      { type: String, required: [true, 'Theatre name is required'], trim: true },
    city:      { type: String, required: [true, 'City is required'], trim: true },
    state:     { type: String, default: '', trim: true },
    area:      { type: String, default: '', trim: true },
    pincode:   { type: String, default: '', trim: true },
    address:   { type: String, required: [true, 'Address is required'], trim: true },
    chain:     { type: String, default: 'Independent', trim: true },
    amenities: { type: [String], default: ['Parking', 'F&B'] },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [72.8777, 19.0760], // [lng, lat] default to India center approx
      },
    },
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

// Indexes
theatreSchema.index({ city: 1, isActive: 1 });
theatreSchema.index({ location: '2dsphere' }, { sparse: true });
theatreSchema.index({ name: 1, city: 1, area: 1 });

const Theatre = mongoose.model('Theatre', theatreSchema);
export default Theatre;

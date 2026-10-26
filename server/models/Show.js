import mongoose from 'mongoose';

const showSchema = new mongoose.Schema(
  {
    movie:      { type: mongoose.Schema.Types.ObjectId, ref: 'Movie',   required: [true, 'Movie is required'] },
    theatre:    { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: [true, 'Theatre is required'] },
    screenName: { type: String, required: [true, 'Screen name is required'], trim: true },
    language:   { type: String, required: [true, 'Language is required'], trim: true },
    startTime:  { type: Date,   required: [true, 'Start time is required'] },
    endTime:    { type: Date,   required: [true, 'End time is required'] },
    price:      { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
  },
  { timestamps: true }
);

// Phase 3 compound indexes
showSchema.index({ theatre: 1, screenName: 1, startTime: 1 });
showSchema.index({ theatre: 1, startTime: 1 });
showSchema.index({ movie: 1, startTime: 1 });

// Phase 4: standalone startTime index for unfiltered upcoming-show queries
showSchema.index({ startTime: 1 });

const Show = mongoose.model('Show', showSchema);
export default Show;

import { Schema, model, Document } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

interface IWord extends Document {
  word: string;
  definition: string;
  createdAt: Date;
}

const wordSchema = new Schema<IWord>({
  word: { type: String, required: true, unique: true, trim: true },
  definition: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

wordSchema.plugin(mongoosePaginate);
export default model<IWord>("Word", wordSchema);
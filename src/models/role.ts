import { IRole } from "./../types/role";

import { Schema, model } from "mongoose";

const roleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
});

export default model<IRole>("Role", roleSchema);

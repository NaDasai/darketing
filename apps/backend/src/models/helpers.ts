import mongoose, { Model, Schema } from 'mongoose';

// Reuse already-registered models across hot reloads so tsx watch doesn't
// throw "OverwriteModelError" on every file change.
export function getOrCreateModel<T>(name: string, schema: Schema<T>): Model<T> {
  const existing = mongoose.models[name] as Model<T> | undefined;
  return existing ?? mongoose.model<T>(name, schema);
}

// Consistent JSON shape: expose `id` (string), hide `_id` and `__v`, and
// convert any ObjectId fields we explicitly pass in `objectIdFields`. Pass
// `extraTransform` to mutate the ret object after the base mapping runs —
// useful for nested ObjectId conversion (e.g. items[].contentItemId).
export function applyBaseToJSON<T>(
  schema: Schema<T>,
  objectIdFields: readonly string[] = [],
  extraTransform?: (ret: Record<string, unknown>) => void,
): void {
  schema.set('toJSON', {
    virtuals: false,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      for (const field of objectIdFields) {
        if (ret[field] != null) ret[field] = String(ret[field]);
      }
      extraTransform?.(ret);
      return ret;
    },
  });
}

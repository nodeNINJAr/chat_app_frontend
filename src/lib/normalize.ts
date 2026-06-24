// Mongoose docs serialize with `_id` (no `id` virtual enabled on these schemas).
// Every payload that crosses the wire — REST or Socket.IO — needs this applied
// before `.id` is read anywhere in the app.
export function withId<T extends { id?: string; _id?: string }>(
  doc: T,
): T & { id: string } {
  return { ...doc, id: doc.id ?? doc._id ?? "" };
}

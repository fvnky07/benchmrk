import { mutation } from './_generated/server';
import { v } from 'convex/values';

// Create a new task with the given text
// export const createTask = mutation({
//   args: { text: v.string() },
//   handler: async (ctx, args) => {
//     const newTaskId = await ctx.db.insert("tasks", { text: args.text });
//     return newTaskId;
//   },
// });
//
//
//

export const addEmailToWaitlist = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const newUserEmail = await ctx.db.insert('waitlist', { email: args.email });
    return newUserEmail;
  },
});

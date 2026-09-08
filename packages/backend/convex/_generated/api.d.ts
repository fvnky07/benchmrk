/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as exerciseComments from "../exerciseComments.js";
import type * as exercises from "../exercises.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as profile from "../profile.js";
import type * as sessionExercises from "../sessionExercises.js";
import type * as sessionSets from "../sessionSets.js";
import type * as userPreferences from "../userPreferences.js";
import type * as waitlist from "../waitlist.js";
import type * as workoutExercises from "../workoutExercises.js";
import type * as workoutSessions from "../workoutSessions.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  exerciseComments: typeof exerciseComments;
  exercises: typeof exercises;
  http: typeof http;
  init: typeof init;
  profile: typeof profile;
  sessionExercises: typeof sessionExercises;
  sessionSets: typeof sessionSets;
  userPreferences: typeof userPreferences;
  waitlist: typeof waitlist;
  workoutExercises: typeof workoutExercises;
  workoutSessions: typeof workoutSessions;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as auth from "../auth.js";
import type * as deletionRequests from "../deletionRequests.js";
import type * as domain_effort from "../domain/effort.js";
import type * as domain_overload from "../domain/overload.js";
import type * as domain_rounds from "../domain/rounds.js";
import type * as domain_units from "../domain/units.js";
import type * as exerciseComments from "../exerciseComments.js";
import type * as exercises from "../exercises.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as lib_appleRevocation from "../lib/appleRevocation.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_exerciseCatalog from "../lib/exerciseCatalog.js";
import type * as lib_exercises from "../lib/exercises.js";
import type * as lib_groupProgress from "../lib/groupProgress.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_magicLinkProof from "../lib/magicLinkProof.js";
import type * as lib_overload from "../lib/overload.js";
import type * as lib_rounds from "../lib/rounds.js";
import type * as lib_verifiedEmail from "../lib/verifiedEmail.js";
import type * as lib_webCrypto from "../lib/webCrypto.js";
import type * as lib_workoutData from "../lib/workoutData.js";
import type * as lib_workoutMutation from "../lib/workoutMutation.js";
import type * as memberSettings from "../memberSettings.js";
import type * as overload from "../overload.js";
import type * as profile from "../profile.js";
import type * as routines from "../routines.js";
import type * as waitlist from "../waitlist.js";
import type * as workoutStructure from "../workoutStructure.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletion: typeof accountDeletion;
  auth: typeof auth;
  deletionRequests: typeof deletionRequests;
  "domain/effort": typeof domain_effort;
  "domain/overload": typeof domain_overload;
  "domain/rounds": typeof domain_rounds;
  "domain/units": typeof domain_units;
  exerciseComments: typeof exerciseComments;
  exercises: typeof exercises;
  groups: typeof groups;
  http: typeof http;
  init: typeof init;
  "lib/appleRevocation": typeof lib_appleRevocation;
  "lib/email": typeof lib_email;
  "lib/exerciseCatalog": typeof lib_exerciseCatalog;
  "lib/exercises": typeof lib_exercises;
  "lib/groupProgress": typeof lib_groupProgress;
  "lib/identity": typeof lib_identity;
  "lib/magicLinkProof": typeof lib_magicLinkProof;
  "lib/overload": typeof lib_overload;
  "lib/rounds": typeof lib_rounds;
  "lib/verifiedEmail": typeof lib_verifiedEmail;
  "lib/webCrypto": typeof lib_webCrypto;
  "lib/workoutData": typeof lib_workoutData;
  "lib/workoutMutation": typeof lib_workoutMutation;
  memberSettings: typeof memberSettings;
  overload: typeof overload;
  profile: typeof profile;
  routines: typeof routines;
  waitlist: typeof waitlist;
  workoutStructure: typeof workoutStructure;
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

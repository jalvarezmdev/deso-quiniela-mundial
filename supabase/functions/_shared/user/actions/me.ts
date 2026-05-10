import {
  jsonOk,
  type ProfilesRow,
  toSessionUser,
} from "../helpers/users-helpers.ts";

export function handleMe(profile: ProfilesRow): Response {
  return jsonOk({ user: toSessionUser(profile) });
}

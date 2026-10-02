const GROUP_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/i;
const GROUP_LINK =
  /^(?:https:\/\/benchmrk\.app\/join\/|native:\/\/join\/)([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})\/?(?:\?[^\s#]*)?$/i;

/** Accept only a Group code or one of Benchmrk's Group join links. */
export function joinCodeFrom(scanned: string): string | null {
  const input = scanned.trim();
  if (GROUP_CODE.test(input)) return input.toUpperCase();
  const code = GROUP_LINK.exec(input)?.[1];
  return code ? code.toUpperCase() : null;
}

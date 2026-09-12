import { sanitizeUUID, sanitizePassword } from './sanitize'

/**
 * Parses a scanned QR payload of the form `smartdisc://pair?id=<uuid>&password=<password>`
 * (the same format the admin dashboard encodes into a disc's pairing QR code — see
 * DiscCrudController::buildPairingUri on the server) into `{ id, password }`.
 *
 * Both fields are run through the same sanitizers SdField applies on manual entry, so a
 * scanned payload can never carry more (or different) characters than typing it in by hand
 * would. Returns null for anything that isn't a recognizable pairing QR code.
 */
export function parsePairingPayload(text) {
  if (typeof text !== 'string' || !text) return null

  let url
  try {
    url = new URL(text)
  } catch {
    return null
  }

  if (url.protocol !== 'smartdisc:' || url.hostname !== 'pair') return null

  const id = sanitizeUUID(url.searchParams.get('id') ?? '')
  const password = sanitizePassword(url.searchParams.get('password') ?? '')
  if (!id || !password) return null

  return { id, password }
}

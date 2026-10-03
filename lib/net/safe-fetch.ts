import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import type { IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

/**
 * Fetching a link someone typed into the dashboard (a photo to import, an icon) without
 * letting it reach anything private: https only (port 443, no passwords in the link), every
 * address the name resolves to must be a public one (no loopback, private, link-local,
 * carrier-grade NAT, cloud metadata or other reserved ranges, IPv4 or IPv6), and that check
 * runs on the address the connection actually uses, so a name can't resolve one way for the
 * check and another for the request. Redirects are followed by hand (at most 3) and each hop
 * is checked again. The body is streamed with a byte cap and the whole thing has a deadline.
 * Errors are worded for the owner.
 */

export type SafeFetchOptions = {
  /** Largest body accepted, in bytes (after decompression). */
  maxBytes: number;
  /** Deadline for the whole fetch, redirects and body included. Default 8 s. */
  timeoutMs?: number;
  /** The response's media type ("image/png", without parameters) must match. */
  accept?: RegExp;
  /** Sent as the request's Accept header. Default: anything. */
  acceptHeader?: string;
};

export type SafeFetchResult = { body: Buffer; contentType: string; finalUrl: string };

/** A failure with a message that can be shown to the owner as it is. `status` is the HTTP status, if there was one. */
export class SafeFetchError extends Error {
  readonly status?: number;
  /** The media type the link answered with, when it was refused for it. */
  readonly contentType?: string;
  constructor(message: string, status?: number, contentType?: string) {
    super(message);
    this.name = "SafeFetchError";
    this.status = status;
    this.contentType = contentType;
  }
}

const MAX_REDIRECTS = 3;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const USER_AGENT = "SunrisePhotoStudio/1.0 (+https://sunrisedigitalphotostudio.com.np)";

// ---------------------------------------------------------------------------------------------
// Which addresses are public
// ---------------------------------------------------------------------------------------------

/** IPv4 ranges that are never a public website (RFC 6890 and friends). */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, incl. broadcast
];

function parseIPv4(text: string): number | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    value = value * 256 + byte;
  }
  return value;
}

function inV4Range(ip: number, base: number, bits: number): boolean {
  const size = 2 ** (32 - bits);
  return Math.floor(ip / size) === Math.floor(base / size);
}

const BLOCKED_V4_PARSED = BLOCKED_V4.map(([base, bits]) => [parseIPv4(base) as number, bits] as const);

function isPublicV4(ip: number): boolean {
  return !BLOCKED_V4_PARSED.some(([base, bits]) => inV4Range(ip, base, bits));
}

/** "2001:db8::1" or "::ffff:1.2.3.4" → its eight 16-bit groups. Zone ids ("%eth0") are refused. */
function parseIPv6(text: string): number[] | null {
  let ip = text.toLowerCase();
  if (ip.includes("%")) return null;
  const embedded = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (embedded) {
    const v4 = parseIPv4(embedded[2]);
    if (v4 === null) return null;
    ip = `${embedded[1]}${Math.floor(v4 / 65536).toString(16)}:${(v4 % 65536).toString(16)}`;
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (groups.length !== 8 || !groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => parseInt(group, 16));
}

function isPublicV6(groups: number[]): boolean {
  // IPv4-mapped (::ffff:a.b.c.d): judged as the IPv4 address it carries.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return isPublicV4(groups[6] * 65536 + groups[7]);
  }
  // Only global unicast (2000::/3) is public; everything outside it (loopback, unspecified,
  // IPv4-compatible, NAT64 64:ff9b::/96, unique local fc00::/7, link-local fe80::/10,
  // multicast ff00::/8…) is not.
  if ((groups[0] & 0xe000) !== 0x2000) return false;
  if (groups[0] === 0x2001 && groups[1] < 0x0200) return false; // 2001::/23: Teredo, benchmarking, ORCHID…
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return false; // documentation
  if (groups[0] === 0x2002) return false; // 6to4 (carries an IPv4 address)
  if (groups[0] === 0x3fff) return false; // documentation (3fff::/20)
  return true;
}

/** Whether an IP address (v4 or v6) belongs to the public internet. Anything unparseable is not. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const ip = parseIPv4(address);
    return ip !== null && isPublicV4(ip);
  }
  if (family === 6) {
    const groups = parseIPv6(address);
    return groups !== null && isPublicV6(groups);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Links and connections
// ---------------------------------------------------------------------------------------------

/** A link that may be fetched, or a SafeFetchError saying why not. */
function checkUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SafeFetchError("That doesn't look like a full link (https://…).");
  }
  if (url.protocol !== "https:") throw new SafeFetchError("Use a link that starts with https://");
  if (url.username || url.password) throw new SafeFetchError("Links with a user name or password can't be used.");
  if (url.port && url.port !== "443") throw new SafeFetchError("Links to unusual ports can't be used.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new SafeFetchError("That link points to a private network address, so it can't be used.");
  } else if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    throw new SafeFetchError("That link points to a private network address, so it can't be used.");
  }
  return url;
}

/** DNS lookup for the connection itself: refuses the whole name if any address it has isn't public. */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const list = addresses as LookupAddress[];
    if (list.length === 0) return callback(Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), "", 0);
    if (list.some((entry) => !isPublicAddress(entry.address))) {
      return callback(new SafeFetchError("That link points to a private network address, so it can't be used."), "", 0);
    }
    const family = options.family === "IPv4" ? 4 : options.family === "IPv6" ? 6 : options.family;
    const wanted = family === 4 || family === 6 ? list.filter((entry) => entry.family === family) : list;
    const usable = wanted.length > 0 ? wanted : list;
    if (options.all) return callback(null, usable);
    return callback(null, usable[0].address, usable[0].family);
  });
};

function get(url: URL, signal: AbortSignal, accept: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "GET",
        agent: false, // a fresh connection every time: nothing pooled from an earlier lookup
        lookup: publicOnlyLookup,
        signal,
        headers: { "user-agent": USER_AGENT, accept, "accept-encoding": "gzip, deflate, br" },
      },
      resolve,
    );
    request.on("error", reject);
    request.end();
  });
}

function tooBig(maxBytes: number): SafeFetchError {
  const mb = maxBytes / 1_000_000;
  const size = mb >= 1 ? `${Math.round(mb * 10) / 10} MB` : `${Math.round(maxBytes / 1000)} KB`;
  return new SafeFetchError(`That file is too large (over ${size}).`);
}

function decoded(response: IncomingMessage): Readable {
  const encoding = String(response.headers["content-encoding"] ?? "identity").trim().toLowerCase();
  const decoder =
    encoding === "gzip" || encoding === "x-gzip" ? createGunzip() : encoding === "deflate" ? createInflate() : encoding === "br" ? createBrotliDecompress() : null;
  if (encoding !== "identity" && encoding !== "" && !decoder) {
    response.destroy();
    throw new SafeFetchError("That link sent the file in a form that can't be read.");
  }
  if (!decoder) return response;
  response.on("error", (error) => decoder.destroy(error));
  return response.pipe(decoder);
}

async function readCapped(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += piece.length;
    if (total > maxBytes) {
      stream.destroy();
      throw tooBig(maxBytes);
    }
    chunks.push(piece);
  }
  return Buffer.concat(chunks, total);
}

function friendly(error: unknown): SafeFetchError {
  if (error instanceof SafeFetchError) return error;
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") return new SafeFetchError("Couldn't find that website. Check the link.");
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "EHOSTUNREACH" || code === "ENETUNREACH" || code === "EPIPE") {
    return new SafeFetchError("That website didn't answer. Try again, or use another link.");
  }
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code)) return new SafeFetchError("That website's security certificate isn't valid, so it wasn't used.");
  if (code === "Z_DATA_ERROR" || code === "ERR__ERROR_FORMAT_PADDING_1" || code.startsWith("ERR_BROTLI")) return new SafeFetchError("That link sent a damaged file.");
  return new SafeFetchError("Couldn't download that link.");
}

/**
 * GET a user-supplied https link safely (see the top of this file). Throws SafeFetchError,
 * whose message can be shown as it is.
 */
export async function safeFetch(input: string, { maxBytes, timeoutMs = 8000, accept, acceptHeader = "*/*" }: SafeFetchOptions): Promise<SafeFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let url = checkUrl(input);
    for (let hop = 0; ; hop++) {
      const response = await get(url, controller.signal, acceptHeader);
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (REDIRECTS.has(status) && location) {
        response.resume();
        if (hop >= MAX_REDIRECTS) throw new SafeFetchError("That link redirects too many times.");
        url = checkUrl(new URL(location, url).toString());
        continue;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        throw new SafeFetchError(status === 404 || status === 410 ? "Nothing was found at that link." : `That link answered with an error (${status}).`, status);
      }
      const contentType = String(response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      if (accept && !accept.test(contentType)) {
        response.resume();
        throw new SafeFetchError(
          contentType.startsWith("text/html") ? "That link is a web page, not the file itself." : "That link didn't return the right kind of file.",
          status,
          contentType,
        );
      }
      const declared = Number(response.headers["content-length"]);
      if (Number.isFinite(declared) && declared > maxBytes) {
        response.destroy();
        throw tooBig(maxBytes);
      }
      const body = await readCapped(decoded(response), maxBytes);
      return { body, contentType, finalUrl: url.toString() };
    }
  } catch (error) {
    if (controller.signal.aborted && !(error instanceof SafeFetchError)) throw new SafeFetchError("That link took too long to answer.");
    throw friendly(error);
  } finally {
    clearTimeout(timer);
  }
}

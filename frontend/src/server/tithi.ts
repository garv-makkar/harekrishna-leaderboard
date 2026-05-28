const DRIK_PANCHANG_BASE_URL = "https://www.drikpanchang.com/panchang/day-panchang.html";
const NEW_DELHI_GEONAME_ID = "1261481";

export type TithiPayload = {
  ok: boolean;
  source: string;
  name: string;
  paksha: string;
  lunarDate: string;
  note: string;
};

export async function fetchTodayTithi(): Promise<TithiPayload> {
  const source = drikPanchangUrlForToday();
  try {
    const response = await fetch(source, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (compatible; HareKrishnaLeaderboard/1.0)"
      },
      next: { revalidate: 60 * 60 }
    });

    if (!response.ok) {
      return unavailable(`Drik Panchang returned ${response.status}.`, source);
    }

    const html = await response.text();
    const parsed = parseDrikPanchang(html);
    if (!parsed) {
      return unavailable("Could not read today's tithi from Drik Panchang.", source);
    }

    return {
      ok: true,
      source,
      name: parsed.name,
      paksha: parsed.paksha,
      lunarDate: parsed.lunarDate,
      note: "Fetched from Drik Panchang for New Delhi, India."
    };
  } catch {
    return unavailable("Drik Panchang is not reachable right now.", source);
  }
}

function unavailable(reason: string, source = drikPanchangUrlForToday()): TithiPayload {
  return {
    ok: false,
    source,
    name: "Unavailable",
    paksha: "Drik Panchang service is down",
    lunarDate: "",
    note: `${reason} We cannot tell the tithi reliably right now.`
  };
}

function drikPanchangUrlForToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(new Date());
  const day = parts.find((part) => part.type === "day")?.value || "01";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const year = parts.find((part) => part.type === "year")?.value || "2026";
  const date = encodeURIComponent(`${day}/${month}/${year}`);
  return `${DRIK_PANCHANG_BASE_URL}?geoname-id=${NEW_DELHI_GEONAME_ID}&date=${date}`;
}

function parseDrikPanchang(html: string) {
  const headerMatch = html.match(
    /<div[^>]*class=["'][^"']*\bdpPHeaderLeftTitle\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!headerMatch) return null;

  const lunarDate = cleanText(headerMatch[1]);
  const lunarLine = cleanText(headerMatch[2]);
  const [pakshaPart, tithiPart] = lunarLine.split(",").map((part) => part.trim());
  const name = tithiPart || "";
  const paksha = pakshaPart || "";

  if (!name || !paksha) return null;
  return { name, paksha, lunarDate };
}

function cleanText(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

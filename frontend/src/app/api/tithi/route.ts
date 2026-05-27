import { NextResponse } from "next/server";

const DRIK_PANCHANG_URL = "https://www.drikpanchang.com/";

type TithiResponse = {
  ok: boolean;
  source: string;
  name: string;
  paksha: string;
  lunarDate: string;
  note: string;
};

export async function GET() {
  try {
    const response = await fetch(DRIK_PANCHANG_URL, {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "Mozilla/5.0 (compatible; HareKrishnaLeaderboard/1.0)"
      },
      next: { revalidate: 60 * 60 }
    });

    if (!response.ok) {
      return unavailable(`Drik Panchang returned ${response.status}.`);
    }

    const html = await response.text();
    const parsed = parseDrikPanchang(html);
    if (!parsed) {
      return unavailable("Could not read today's tithi from Drik Panchang.");
    }

    return NextResponse.json({
      ok: true,
      source: DRIK_PANCHANG_URL,
      name: parsed.name,
      paksha: parsed.paksha,
      lunarDate: parsed.lunarDate,
      note: "Fetched from Drik Panchang."
    } satisfies TithiResponse);
  } catch {
    return unavailable("Drik Panchang is not reachable right now.");
  }
}

function unavailable(reason: string) {
  return NextResponse.json(
    {
      ok: false,
      source: DRIK_PANCHANG_URL,
      name: "Unavailable",
      paksha: "Drik Panchang service is down",
      lunarDate: "",
      note: `${reason} We cannot tell the tithi reliably right now.`
    } satisfies TithiResponse,
    { status: 503 }
  );
}

function parseDrikPanchang(html: string) {
  const match = html.match(
    /<div[^>]*class=["'][^"']*\bdpPHeaderLeftTitle\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!match) return null;

  const lunarDate = cleanText(match[1]);
  const lunarLine = cleanText(match[2]);
  const [pakshaPart, tithiPart] = lunarLine.split(",").map((part) => part.trim());
  const name = tithiPart || pakshaPart || "";
  const paksha = tithiPart ? pakshaPart : "";

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

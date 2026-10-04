import type { Context, Config } from "@netlify/functions";
import sharp from "sharp";

const SOURCES = {
  smartphone: "https://commons.wikimedia.org/wiki/Special:Redirect/file/OnePlus_Nord_smartphone_displaying_Android_home_screen.jpg",
  pocketlab: "https://www.thepocketlab.com/hs-fs/hubfs/PocketLab_Voyager_Front_2_Large_550x367_Web-1.jpg?height=367&name=PocketLab_Voyager_Front_2_Large_550x367_Web-1.jpg&width=550",
  pixhawk: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pixhawk.png"
};

async function fetchImage(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "ME3310-course-image/1.0" }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function normalize(input: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .trim({ background: "#ffffff", threshold: 12 })
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toBuffer();
}

function arrowSvg(x: number, y: number): Buffer {
  return Buffer.from(`
    <svg width="130" height="90" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 35 H88 V15 L122 45 L88 75 V55 H8 Z"
            fill="#9fb3c8"/>
    </svg>`);
}

function textSvg(text: string, width: number, fontSize = 34, weight = 700): Buffer {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return Buffer.from(`
    <svg width="${width}" height="60" xmlns="http://www.w3.org/2000/svg">
      <style>
        .t { font-family: Arial, Helvetica, sans-serif; font-size: ${fontSize}px; font-weight: ${weight}; fill: #17365d; }
      </style>
      <text x="50%" y="42" text-anchor="middle" class="t">${escaped}</text>
    </svg>`);
}

function footerSvg(width: number): Buffer {
  return Buffer.from(`
    <svg width="${width}" height="55" xmlns="http://www.w3.org/2000/svg">
      <style>
        .t { font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 400; fill: #59636f; }
      </style>
      <text x="50%" y="36" text-anchor="middle" class="t">
        From consumer sensing to laboratory measurement to autonomous vehicle control
      </text>
    </svg>`);
}

export default async (_req: Request, _context: Context) => {
  try {
    const [phoneRaw, pocketRaw, pixRaw] = await Promise.all([
      fetchImage(SOURCES.smartphone),
      fetchImage(SOURCES.pocketlab),
      fetchImage(SOURCES.pixhawk)
    ]);

    const boxW = 360;
    const boxH = 290;
    const [phone, pocket, pix] = await Promise.all([
      normalize(phoneRaw, boxW, boxH),
      normalize(pocketRaw, boxW, boxH),
      normalize(pixRaw, boxW, boxH)
    ]);

    const W = 1600;
    const H = 560;

    const output = await sharp({
      create: {
        width: W,
        height: H,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([
        { input: phone, left: 70, top: 55 },
        { input: pocket, left: 620, top: 55 },
        { input: pix, left: 1170, top: 55 },

        { input: arrowSvg(0,0), left: 455, top: 150 },
        { input: arrowSvg(0,0), left: 1005, top: 150 },

        { input: textSvg("Smartphone", 360), left: 70, top: 350 },
        { input: textSvg("PocketLab Voyager 2", 420, 31), left: 590, top: 350 },
        { input: textSvg("Pixhawk Flight Controller", 420, 31), left: 1140, top: 350 },

        { input: footerSvg(W), left: 0, top: 455 }
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Image generation failed",
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: "/imu-progression.png"
};

import path from "path";
import { readFile } from "fs/promises";
import QRCode from "qrcode";
import sharp from "sharp";

const QR_SIZE = 600;
// Logo badge covers ~24% of the QR width; error correction "H" tolerates ~30% damage
const LOGO_BADGE_RATIO = 0.24;
const LOGO_PADDING_RATIO = 0.1;
const LOGO_PATH = path.join(process.cwd(), "public", "RMU-qrcode.png");

let logoSourceCache: Buffer | null = null;

async function getLogoSource(): Promise<Buffer> {
  if (!logoSourceCache) {
    logoSourceCache = await readFile(LOGO_PATH);
  }
  return logoSourceCache;
}

// Builds a white rounded badge with the logo centered on it
async function buildLogoBadge(badgeSize: number): Promise<Buffer> {
  const padding = Math.round(badgeSize * LOGO_PADDING_RATIO);
  const logoSize = badgeSize - padding * 2;
  const radius = Math.round(badgeSize * 0.18);

  const logo = await sharp(await getLogoSource())
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const background = Buffer.from(
    `<svg width="${badgeSize}" height="${badgeSize}"><rect width="${badgeSize}" height="${badgeSize}" rx="${radius}" ry="${radius}" fill="#ffffff"/></svg>`
  );

  return sharp(background)
    .composite([{ input: logo, top: padding, left: padding }])
    .png()
    .toBuffer();
}

export async function generateQRDataUrl(content: string, withLogo: boolean): Promise<string> {
  console.log("[QRLib][generateQRDataUrl] START", { contentLength: content.length, withLogo });

  const qrBuffer = await QRCode.toBuffer(content, {
    width: QR_SIZE,
    margin: 2,
    color: {
      dark: "#1a1a1a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });

  if (!withLogo) {
    console.log("[QRLib][generateQRDataUrl] END without logo", { bytes: qrBuffer.length });
    return `data:image/png;base64,${qrBuffer.toString("base64")}`;
  }

  const { width = QR_SIZE } = await sharp(qrBuffer).metadata();
  const badgeSize = Math.round(width * LOGO_BADGE_RATIO);
  const offset = Math.round((width - badgeSize) / 2);
  const badge = await buildLogoBadge(badgeSize);

  const output = await sharp(qrBuffer)
    .composite([{ input: badge, top: offset, left: offset }])
    .png()
    .toBuffer();

  console.log("[QRLib][generateQRDataUrl] END with logo", { width, badgeSize, bytes: output.length });
  return `data:image/png;base64,${output.toString("base64")}`;
}

import path from 'path';
import sharp from 'sharp';

const ouro = [212, 175, 55];

export async function gerarIcone(n) {
  const arq = path.join(process.cwd(), 'public', 'logo-mask.png');
  const box = Math.round(n * 0.62);
  const { data, info } = await sharp(arq).resize(box, box, { fit: 'inside' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const rgba = Buffer.alloc(total * 4);
  for (let i = 0; i < total; i++) {
    rgba[i * 4] = ouro[0];
    rgba[i * 4 + 1] = ouro[1];
    rgba[i * 4 + 2] = ouro[2];
    rgba[i * 4 + 3] = data[i * info.channels];
  }
  return sharp({ create: { width: n, height: n, channels: 3, background: { r: 11, g: 11, b: 11 } } })
    .composite([{ input: rgba, raw: { width: info.width, height: info.height, channels: 4 }, left: Math.round((n - info.width) / 2), top: Math.round((n - info.height) / 2) }])
    .png()
    .toBuffer();
}

export async function gerarLogo() {
  const arq = path.join(process.cwd(), 'public', 'logo-mask.png');
  const { data, info } = await sharp(arq).greyscale().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const rgba = Buffer.alloc(total * 4);
  for (let i = 0; i < total; i++) {
    rgba[i * 4] = ouro[0];
    rgba[i * 4 + 1] = ouro[1];
    rgba[i * 4 + 2] = ouro[2];
    rgba[i * 4 + 3] = data[i * info.channels];
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

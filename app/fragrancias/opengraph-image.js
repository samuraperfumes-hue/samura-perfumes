import { ImageResponse } from 'next/og';

// Imagem que aparece quando o link da página é compartilhado (WhatsApp, Instagram etc.).
export const alt = 'Samura Perfumes: nossas fragrâncias';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Imagem() {
  const ouro = '#D4AF37';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 40%, #2a2112 0%, #0b0b0b 70%)', color: ouro, fontFamily: 'serif' }}>
        <div style={{ display: 'flex', width: 1100, height: 560, border: '3px solid ' + ouro, borderRadius: 18, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 34, letterSpacing: 10, color: '#c5a059' }}>SAMURA PERFUMES</div>
          <div style={{ fontSize: 92, fontWeight: 700, marginTop: 18, color: '#f3e2b0' }}>Nossas fragrâncias</div>
          <div style={{ width: 220, height: 3, background: ouro, marginTop: 26, marginBottom: 26 }} />
          <div style={{ fontSize: 36, color: '#e0e0e0' }}>Notas, história e o melhor uso de cada uma</div>
          <div style={{ fontSize: 30, color: '#c5a059', marginTop: 22 }}>Masculinas · Femininas · Árabes</div>
        </div>
      </div>
    ),
    size
  );
}

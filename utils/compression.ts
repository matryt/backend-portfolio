import { gzip, brotliCompress } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

// Fonction de compression intelligente
async function compressResponse(data: any, acceptEncoding?: string) {
  const jsonData = JSON.stringify(data);
  const buffer = Buffer.from(jsonData, 'utf8');
  
  // Seuil minimum pour compresser (évite de compresser de petites réponses)
  if (buffer.length < 1024) {
    return { data: jsonData, encoding: null };
  }
  
  if (!acceptEncoding) {
    return { data: jsonData, encoding: null };
  }
  
  try {
    // Priorité : Brotli > Gzip
    if (acceptEncoding.includes('br')) {
      const compressed = await brotliAsync(buffer);
      return { data: compressed, encoding: 'br' };
    } else if (acceptEncoding.includes('gzip')) {
      const compressed = await gzipAsync(buffer);
      return { data: compressed, encoding: 'gzip' };
    }
  } catch (error) {
    console.error('Compression error:', error);
  }
  
  return { data: jsonData, encoding: null };
}

// Helper pour créer une réponse JSON compressée
export async function createCompressedResponse(data: any, request: Request) {
  const acceptEncoding = request.headers.get('accept-encoding');
  const { data: responseData, encoding } = await compressResponse(data, acceptEncoding || undefined);
  
  return new Response(responseData, {
    headers: {
      'Content-Type': 'application/json',
      ...(encoding && { 'Content-Encoding': encoding })
    }
  });
}

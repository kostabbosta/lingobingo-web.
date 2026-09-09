import { getCatalog } from '../../../lib/catalog';
export async function GET() {
  return Response.json(await getCatalog(), { headers: { 'Cache-Control': 'public, max-age=300' } });
}

import { getDashboardStats } from '../../../lib/db/queries/metrics';

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return Response.json(stats)
  } catch (err) {
    console.error('Stats error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

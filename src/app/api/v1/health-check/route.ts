import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { getAllProjectsHealthCheck } from '@/lib/services/health-check-assessment-engine.service';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const result = getAllProjectsHealthCheck();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

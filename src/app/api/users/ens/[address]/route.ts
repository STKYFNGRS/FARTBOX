import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    
    const result = await sql`
      SELECT ens_name, ens_avatar
      FROM players
      WHERE LOWER(wallet_address) = LOWER(${address})
      LIMIT 1
    `;

    if (result.length > 0) {
      return NextResponse.json({
        ens_name: result[0].ens_name,
        ens_avatar: result[0].ens_avatar,
      });
    } else {
      return NextResponse.json({
        ens_name: null,
        ens_avatar: null,
      });
    }
  } catch (error) {
    console.error('Error fetching ENS data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ENS data' },
      { status: 500 }
    );
  }
} 
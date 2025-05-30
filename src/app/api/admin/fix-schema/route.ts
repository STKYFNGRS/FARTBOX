import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';

export async function POST() {
  try {
    console.log('🔧 Adding missing created_at column to player_actions table...');
    
    // Add created_at column to player_actions if it doesn't exist
    await query(`
      ALTER TABLE player_actions 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
    `);
    
    // Update existing records to have a proper timestamp
    await query(`
      UPDATE player_actions 
      SET created_at = NOW() 
      WHERE created_at IS NULL
    `);
    
    console.log('✅ Schema fix completed');
    
    return NextResponse.json({
      success: true,
      message: 'Added created_at column to player_actions table'
    });
    
  } catch (error: any) {
    console.error('❌ Schema fix error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fix schema',
        message: error.message 
      },
      { status: 500 }
    );
  }
} 
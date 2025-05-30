import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/db';

// Force dynamic rendering for database operations
export const dynamic = 'force-dynamic';

// Get chat messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'lobby';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await query(`
      SELECT 
        cm.id,
        cm.message,
        cm.created_at as timestamp,
        p.username,
        p.wallet_address,
        p.ens_name,
        p.ens_avatar,
        p.is_bot
      FROM chat_messages cm
      JOIN players p ON cm.player_id = p.id
      WHERE cm.message_type = $1
      ORDER BY cm.created_at DESC
      LIMIT $2
    `, [type, limit]);
    
    // Process messages to include display names
    const messagesWithDisplayNames = result.rows.map(msg => ({
      ...msg,
      displayName: msg.ens_name || msg.username || 
        (msg.wallet_address ? `${msg.wallet_address.slice(0, 6)}...${msg.wallet_address.slice(-4)}` : 'Anonymous')
    }));
    
    return NextResponse.json({
      success: true,
      messages: messagesWithDisplayNames.reverse() // Reverse to show oldest first
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Send chat message
export async function POST(request: NextRequest) {
  try {
    const { playerId, message, type = 'lobby' } = await request.json();
    
    if (!playerId || !message) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Insert message
    await query(`
      INSERT INTO chat_messages (player_id, message, message_type)
      VALUES ($1, $2, $3)
    `, [playerId, message.trim(), type]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 
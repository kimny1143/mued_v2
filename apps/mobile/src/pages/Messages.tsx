import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search } from 'lucide-react';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Card } from '../components/ui/Card';

// モックデータ（基礎実装）
const mockConversations = [
  {
    id: '1',
    mentorName: '田中太郎',
    lastMessage: 'レッスンお疲れ様でした！次回も頑張りましょう。',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分前
    unreadCount: 2,
  },
  {
    id: '2',
    mentorName: '山田花子',
    lastMessage: '課題の楽譜を送りました。確認してください。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
    unreadCount: 0,
  },
  {
    id: '3',
    mentorName: '佐藤次郎',
    lastMessage: '了解です。それではまた来週お会いしましょう。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1日前
    unreadCount: 0,
  },
];

export const Messages: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
      });
    }
  };

  const filteredConversations = mockConversations.filter(conv =>
    conv.mentorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 50,
      }}>
        <div style={{ padding: '16px' }}>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 'bold' }}>
            メッセージ
          </h1>
          
          {/* 検索バー */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Search 
              size={20} 
              color="#6b7280" 
              style={{
                position: 'absolute',
                left: '12px',
              }}
            />
            <input
              type="text"
              placeholder="メッセージを検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </header>

      {/* メッセージリスト */}
      <div style={{ padding: '16px' }}>
        {filteredConversations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280',
          }}>
            <MessageCircle size={48} color="#e5e7eb" style={{ marginBottom: '16px' }} />
            <p>メッセージがありません</p>
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <Card
              key={conversation.id}
              onClick={() => navigate(`/messages/${conversation.id}`)}
              style={{ 
                marginBottom: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 'bold',
                    }}>
                      {conversation.mentorName}
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                    }}>
                      {formatTimestamp(conversation.timestamp)}
                    </span>
                  </div>
                  
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {conversation.lastMessage}
                  </p>
                </div>
                
                {conversation.unreadCount > 0 && (
                  <div style={{
                    marginLeft: '12px',
                    minWidth: '24px',
                    height: '24px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}>
                    {conversation.unreadCount}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
import React from 'react';
import { ExternalLink, Clock } from 'lucide-react';
import { Card } from './ui/Card';
import { Material } from '../types/materials';

interface MaterialCardProps {
  material: Material;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ material }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  const categoryColors = {
    '録音': { color: '#ef4444', bg: '#fee2e2' },
    '作曲': { color: '#3b82f6', bg: '#dbeafe' },
    '作詞': { color: '#10b981', bg: '#d1fae5' },
  };

  const colors = categoryColors[material.category as keyof typeof categoryColors] || 
    { color: '#6b7280', bg: '#f3f4f6' };

  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* サムネイル */}
      {material.thumbnail && (
        <div style={{
          width: '100%',
          height: '160px',
          overflow: 'hidden',
          borderRadius: '8px 8px 0 0',
          margin: '-16px -16px 16px -16px',
        }}>
          <img
            src={material.thumbnail}
            alt={material.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {/* カテゴリバッジ */}
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: colors.bg,
        color: colors.color,
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        marginBottom: '8px',
        alignSelf: 'flex-start',
      }}>
        {material.category}
      </span>

      {/* タイトル */}
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        lineHeight: '1.4',
      }}>
        {material.title}
      </h3>

      {/* メタ情報 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: 'auto',
        paddingTop: '12px',
      }}>
        <span style={{
          fontSize: '12px',
          color: '#6b7280',
        }}>
          {formatDate(material.pubDate)}
        </span>
        {material.readingTime && (
          <>
            <span style={{ color: '#e5e7eb' }}>•</span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#6b7280',
            }}>
              <Clock size={12} />
              {material.readingTime}
            </span>
          </>
        )}
      </div>

      {/* 外部リンクボタン */}
      <a
        href={material.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={16} />
        記事を読む
      </a>
    </Card>
  );
};
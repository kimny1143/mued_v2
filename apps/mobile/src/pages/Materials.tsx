import React, { useState, useEffect } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { MaterialCard } from '../components/MaterialCard';
import { apiClient } from '../services/api';
import { Material, magazines } from '../types/materials';

export const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // note-rss APIを呼び出し
      // 環境変数からAPIのベースURLを取得
      const baseUrl = process.env.REACT_APP_API_URL || '';
      if (!baseUrl) {
        throw new Error('API URLが設定されていません');
      }
      const response = await fetch(`${baseUrl}/api/note-rss`);
      if (!response.ok) {
        throw new Error('教材の取得に失敗しました');
      }
      
      const data = await response.json();
      setMaterials(data.items || []);
      setFilteredMaterials(data.items || []);
    } catch (err) {
      setError('教材情報の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredMaterials(materials);
    } else {
      setFilteredMaterials(materials.filter(m => m.category === selectedCategory));
    }
  }, [selectedCategory, materials]);

  const categories = [
    { id: 'all', name: '全て', color: '#6b7280', bgColor: '#f3f4f6' },
    ...magazines.map(m => ({
      id: m.category,
      name: m.category,
      color: m.color,
      bgColor: m.bgColor,
    }))
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ paddingTop: '100px' }}>
          <LoadingSpinner />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ paddingTop: '100px' }}>
          <ErrorMessage message={error} onRetry={fetchMaterials} />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        zIndex: 50,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            教材
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              style={{
                padding: '8px',
                backgroundColor: showFilter ? '#1e40af' : 'white',
                color: showFilter ? 'white' : '#6b7280',
                border: `1px solid ${showFilter ? '#1e40af' : '#e5e7eb'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Filter size={16} />
            </button>
            <button
              onClick={fetchMaterials}
              style={{
                padding: '8px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* フィルター */}
      {showFilter && (
        <div style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                padding: '6px 16px',
                backgroundColor: selectedCategory === category.id ? category.color : 'white',
                color: selectedCategory === category.id ? 'white' : category.color,
                border: `1px solid ${category.color}`,
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {category.name}
              {category.id === 'all' && materials.length > 0 && (
                <span style={{ marginLeft: '4px' }}>
                  ({materials.length})
                </span>
              )}
              {category.id !== 'all' && (
                <span style={{ marginLeft: '4px' }}>
                  ({materials.filter(m => m.category === category.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 教材リスト */}
      <div style={{ padding: '16px' }}>
        {filteredMaterials.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280',
          }}>
            <p>教材がありません</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {filteredMaterials.map(material => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
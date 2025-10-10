import { useState, useEffect } from 'react';

export interface Material {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  createdAt: string;
  content?: string;
}

export interface QuotaInfo {
  tier: string;
  used: number;
  limit: number;
  remaining: number;
}

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/materials');
      const data = await response.json();

      if (data.success) {
        setMaterials(data.materials);
        setQuota(data.quota);
        setError(null);
      } else {
        setError(data.error || 'Failed to load materials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const response = await fetch(`/api/ai/materials/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        return true;
      } else {
        throw new Error('Failed to delete material');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material');
      return false;
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  return { materials, quota, loading, error, refetch: fetchMaterials, deleteMaterial };
}

export function useMaterial(materialId: string) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/ai/materials/${materialId}`);
        const data = await response.json();

        if (data.success) {
          setMaterial(data.material);
          setError(null);
        } else {
          setError(data.error || 'Failed to load material');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    };

    if (materialId) {
      fetchMaterial();
    }
  }, [materialId]);

  return { material, loading, error };
}

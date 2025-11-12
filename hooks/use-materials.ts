import { useState } from 'react';
import { useApiFetch } from './use-api-fetch';
import { useApiClient, getErrorMessage } from '@/lib/api-client';

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

interface MaterialsResponse {
  success: boolean;
  materials: Material[];
  quota: QuotaInfo | null;
  error?: string;
}

interface MaterialResponse {
  success: boolean;
  material: Material;
  error?: string;
}

export function useMaterials() {
  const { data, error, isLoading, refetch } = useApiFetch<MaterialsResponse>('/api/ai/materials');
  const apiClient = useApiClient();
  const [localError, setLocalError] = useState<string | null>(null);

  const materials = data?.materials || [];
  const quota = data?.quota || null;
  const displayError = error || (data && !data.success ? data.error || null : null) || localError;

  const deleteMaterial = async (id: string) => {
    try {
      await apiClient.delete(`/api/ai/materials/${id}`);
      // Refetch to update the list
      refetch();
      return true;
    } catch (err) {
      setLocalError(getErrorMessage(err));
      return false;
    }
  };

  return { materials, quota, loading: isLoading, error: displayError, refetch, deleteMaterial };
}

export function useMaterial(materialId: string) {
  const { data, error, isLoading } = useApiFetch<MaterialResponse>(
    `/api/ai/materials/${materialId}`,
    {
      manual: !materialId, // Don't fetch if no materialId provided
      dependencies: [materialId],
    }
  );

  const material = data?.material || null;
  const displayError = error || (data && !data.success ? data.error || null : null);

  return { material, loading: isLoading, error: displayError };
}

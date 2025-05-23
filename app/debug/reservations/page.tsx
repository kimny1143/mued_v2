// app/debug/reservations/page.tsx (Client Component)
'use client'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

// APIレスポンスの型定義
type TeacherInfo = {
  id: string;
  name: string;
  image: string | null;
}

type LessonSlot = {
  id: string;
  startTime: string;
  endTime: string;
  teacher: TeacherInfo;
}

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
} | null;

type Reservation = {
  id: string;
  status: string;
  lessonSlot: LessonSlot;
  payment: Payment;
  createdAt: string;
  updatedAt: string;
}

export default function DebugReservations() {
  const [rows, setRows] = useState<Reservation[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    (async () => {
      // セッションから access_token を取得
      const { data } = await supabaseBrowser.auth.getSession()
      const token = data.session?.access_token

      const res = await fetch('/api/my-reservations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })

      if (!res.ok) {
        const { error } = await res.json()
        setError(error ?? `HTTP ${res.status}`)
        return
      }
      setRows(await res.json())
    })().catch(e => setError(String(e)))
  }, [])

  if (error) return <pre>{error}</pre>
  return <pre>{JSON.stringify(rows, null, 2)}</pre>
}

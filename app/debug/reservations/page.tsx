// app/debug/reservations/page.tsx (Client Component)
'use client'
import { useEffect, useState } from 'react'

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
    fetch('/api/my-reservations', { credentials: 'include' })
      .then(r => r.json())
      .then(setRows)
      .catch(e => setError(String(e)))
  }, [])
  if (error) return <pre>{error}</pre>
  return <pre>{JSON.stringify(rows, null, 2)}</pre>
}

// app/debug/reservations/page.tsx (Client Component)
'use client'
import { useEffect, useState } from 'react'
export default function DebugReservations() {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string>()
  useEffect(() => {
    fetch('/api/my-reservation', { credentials: 'include' })
      .then(r => r.json())
      .then(setRows)
      .catch(e => setError(String(e)))
  }, [])
  if (error) return <pre>{error}</pre>
  return <pre>{JSON.stringify(rows, null, 2)}</pre>
}

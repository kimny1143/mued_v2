/* eslint-env browser, es6, k6 */
/* eslint-disable import/no-anonymous-default-export */
/* global __ENV */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // ランプアップ
    { duration: '3m', target: 20 }, // 定常負荷
    { duration: '1m', target: 0 },  // ランプダウン
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95%のリクエストが2秒以内
    'errors': ['rate<0.1'],              // エラー率10%未満
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function runReservationFlow() {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_TOKEN}`,
    },
  };

  // 1. レッスン枠一覧の取得
  const slotsResponse = http.get(`${BASE_URL}/api/reservations`, params);
  check(slotsResponse, {
    'slots status is 200': (r) => r.status === 200,
    'slots has data': (r) => r.json().length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // 2. 予約の作成
  const slotId = slotsResponse.json()[0].id;
  const reservationPayload = JSON.stringify({
    slotId,
    teacherId: 'test-teacher-id',
    studentId: 'test-student-id',
  });

  const reservationResponse = http.post(
    `${BASE_URL}/api/reservations`,
    reservationPayload,
    params
  );

  check(reservationResponse, {
    'reservation status is 200': (r) => r.status === 200,
    'reservation has id': (r) => r.json().id !== undefined,
  }) || errorRate.add(1);

  sleep(2);
} 
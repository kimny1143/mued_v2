import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReservationStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Phase 4統合テスト用API
 * 予約承認フロー全体をテストするためのエンドポイント
 */

export async function POST(req: NextRequest) {
  try {
    const { action, reservationId, testData } = await req.json();

    console.log('🧪 Phase 4統合テスト開始:', { action, reservationId });

    switch (action) {
      case 'create_test_reservation':
        return await createTestReservation(testData);
      
      case 'simulate_mentor_approval':
        return await simulateMentorApproval(reservationId);
      
      case 'simulate_payment_success':
        return await simulatePaymentSuccess(reservationId);
      
      case 'get_reservation_status':
        return await getReservationStatus(reservationId);
      
      case 'cleanup_test_data':
        return await cleanupTestData();
      
      case 'full_flow_test':
        return await runFullFlowTest(testData);
      
      default:
        return NextResponse.json(
          { error: '無効なアクションです' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('統合テストエラー:', error);
    return NextResponse.json(
      { error: '統合テストの実行中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
}

// テスト用予約を作成
async function createTestReservation(testData: any) {
  const reservationId = uuidv4();
  const paymentId = uuidv4();
  
  // テスト用のレッスンスロットを取得または作成
  let lessonSlot = await prisma.lesson_slots.findFirst({
    where: {
      isAvailable: true,
      startTime: {
        gte: new Date()
      }
    },
    include: {
      users: true
    }
  });

  if (!lessonSlot) {
    // テスト用レッスンスロットを作成
    const mentorId = testData?.mentorId || 'test-mentor-id';
    const slotId = uuidv4();
    
    lessonSlot = await prisma.lesson_slots.create({
      data: {
        id: slotId,
        teacherId: mentorId,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // 25時間後
        isAvailable: true,
        capacity: 1,
        price: 5000,
      },
      include: {
        users: true
      }
    });
  }

  // テスト用予約を作成
  const reservation = await prisma.reservations.create({
    data: {
      id: reservationId,
      slotId: lessonSlot.id,
      studentId: testData?.studentId || 'test-student-id',
      status: ReservationStatus.PENDING_APPROVAL,
      bookedStartTime: lessonSlot.startTime,
      bookedEndTime: lessonSlot.endTime,
      totalAmount: lessonSlot.price || 5000,
      hoursBooked: 1,
    },
    include: {
      lesson_slots: {
        include: {
          users: true
        }
      }
    }
  });

  // テスト用決済レコードを作成
  const payment = await prisma.payments.create({
    data: {
      id: paymentId,
      reservationId: reservationId,
      userId: testData?.studentId || 'test-student-id',
      amount: lessonSlot.price || 5000,
      currency: 'jpy',
      status: 'PENDING',
      stripeSessionId: `test_session_${Date.now()}`,
    }
  });

  console.log('✅ テスト用予約作成完了:', {
    reservationId: reservation.id,
    paymentId: payment.id,
    status: reservation.status,
    mentorId: lessonSlot.teacherId,
    studentId: reservation.studentId
  });

  return NextResponse.json({
    success: true,
    message: 'テスト用予約が作成されました',
    data: {
      reservation,
      payment,
      lessonSlot
    }
  });
}

// メンター承認をシミュレート
async function simulateMentorApproval(reservationId: string) {
  const updatedReservation = await prisma.reservations.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: 'test-mentor-id',
    },
    include: {
      lesson_slots: {
        include: {
          users: true
        }
      }
    }
  });

  console.log('✅ メンター承認シミュレート完了:', {
    reservationId: updatedReservation.id,
    status: updatedReservation.status,
    approvedAt: updatedReservation.approvedAt
  });

  return NextResponse.json({
    success: true,
    message: 'メンター承認をシミュレートしました',
    data: updatedReservation
  });
}

// 決済成功をシミュレート
async function simulatePaymentSuccess(reservationId: string) {
  // 決済レコードを更新
  const payment = await prisma.payments.update({
    where: { reservationId: reservationId },
    data: {
      status: 'SUCCEEDED',
      stripePaymentId: `test_payment_${Date.now()}`,
    }
  });

  // 予約ステータスを更新
  const updatedReservation = await prisma.reservations.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.CONFIRMED,
    },
    include: {
      lesson_slots: {
        include: {
          users: true
        }
      }
    }
  });

  console.log('✅ 決済成功シミュレート完了:', {
    reservationId: updatedReservation.id,
    paymentId: payment.id,
    reservationStatus: updatedReservation.status,
    paymentStatus: payment.status
  });

  return NextResponse.json({
    success: true,
    message: '決済成功をシミュレートしました',
    data: {
      reservation: updatedReservation,
      payment
    }
  });
}

// 予約ステータスを取得
async function getReservationStatus(reservationId: string) {
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
    include: {
      lesson_slots: {
        include: {
          users: true
        }
      },
      payments: true
    }
  });

  if (!reservation) {
    return NextResponse.json(
      { error: '予約が見つかりません' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: reservation
  });
}

// テストデータをクリーンアップ
async function cleanupTestData() {
  try {
    // テスト用データを削除
    const deletedPayments = await prisma.payments.deleteMany({
      where: {
        stripeSessionId: {
          startsWith: 'test_session_'
        }
      }
    });

    const deletedReservations = await prisma.reservations.deleteMany({
      where: {
        studentId: 'test-student-id'
      }
    });

    const deletedSlots = await prisma.lesson_slots.deleteMany({
      where: {
        teacherId: 'test-mentor-id'
      }
    });

    console.log('✅ テストデータクリーンアップ完了:', {
      deletedPayments: deletedPayments.count,
      deletedReservations: deletedReservations.count,
      deletedSlots: deletedSlots.count
    });

    return NextResponse.json({
      success: true,
      message: 'テストデータをクリーンアップしました',
      data: {
        deletedPayments: deletedPayments.count,
        deletedReservations: deletedReservations.count,
        deletedSlots: deletedSlots.count
      }
    });
  } catch (error) {
    console.error('クリーンアップエラー:', error);
    return NextResponse.json(
      { error: 'クリーンアップ中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
}

// フルフローテストを実行
async function runFullFlowTest(testData: any) {
  const testResults = [];
  let currentReservationId: string;

  try {
    // Step 1: テスト用予約を作成
    console.log('🧪 Step 1: テスト用予約作成');
    const createResult = await createTestReservation(testData);
    const createData = await createResult.json();
    
    if (!createData.success) {
      throw new Error('予約作成に失敗しました');
    }
    
    currentReservationId = createData.data.reservation.id;
    testResults.push({
      step: 1,
      action: 'create_reservation',
      status: 'success',
      data: createData.data
    });

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: メンター承認をシミュレート
    console.log('🧪 Step 2: メンター承認シミュレート');
    const approvalResult = await simulateMentorApproval(currentReservationId);
    const approvalData = await approvalResult.json();
    
    if (!approvalData.success) {
      throw new Error('メンター承認に失敗しました');
    }
    
    testResults.push({
      step: 2,
      action: 'mentor_approval',
      status: 'success',
      data: approvalData.data
    });

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: 決済成功をシミュレート
    console.log('🧪 Step 3: 決済成功シミュレート');
    const paymentResult = await simulatePaymentSuccess(currentReservationId);
    const paymentData = await paymentResult.json();
    
    if (!paymentData.success) {
      throw new Error('決済成功シミュレートに失敗しました');
    }
    
    testResults.push({
      step: 3,
      action: 'payment_success',
      status: 'success',
      data: paymentData.data
    });

    // Step 4: 最終ステータス確認
    console.log('🧪 Step 4: 最終ステータス確認');
    const statusResult = await getReservationStatus(currentReservationId);
    const statusData = await statusResult.json();
    
    testResults.push({
      step: 4,
      action: 'final_status_check',
      status: 'success',
      data: statusData.data
    });

    console.log('✅ フルフローテスト完了');

    return NextResponse.json({
      success: true,
      message: 'フルフローテストが正常に完了しました',
      testResults,
      summary: {
        totalSteps: testResults.length,
        successfulSteps: testResults.filter(r => r.status === 'success').length,
        finalReservationStatus: statusData.data.status,
        testReservationId: currentReservationId
      }
    });

  } catch (error) {
    console.error('フルフローテストエラー:', error);
    
    testResults.push({
      step: testResults.length + 1,
      action: 'error',
      status: 'failed',
      error: String(error)
    });

    return NextResponse.json({
      success: false,
      message: 'フルフローテストでエラーが発生しました',
      error: String(error),
      testResults,
      partialReservationId: currentReservationId
    }, { status: 500 });
  }
}

// GET: テスト用エンドポイントの情報を取得
export async function GET() {
  return NextResponse.json({
    message: 'Phase 4統合テストAPI',
    availableActions: [
      'create_test_reservation',
      'simulate_mentor_approval', 
      'simulate_payment_success',
      'get_reservation_status',
      'cleanup_test_data',
      'full_flow_test'
    ],
    usage: {
      endpoint: '/api/test/reservation-flow',
      method: 'POST',
      body: {
        action: 'string (required)',
        reservationId: 'string (for specific actions)',
        testData: 'object (for create actions)'
      }
    },
    examples: {
      fullFlowTest: {
        action: 'full_flow_test',
        testData: {
          studentId: 'test-student-123',
          mentorId: 'test-mentor-456'
        }
      },
      cleanup: {
        action: 'cleanup_test_data'
      }
    }
  });
} 
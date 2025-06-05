/*
  Warnings:

  - You are about to drop the column `providerAccountId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `hourlyRate` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `maxDuration` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `maxHours` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `minDuration` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `minHours` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `lesson_slots` table. All the data in the column will be lost.
  - You are about to drop the column `senderId` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `bookedEndTime` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `bookedStartTime` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `hoursBooked` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `paymentId` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedAt` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `slotId` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `reservations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `stripe_customers` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `stripe_customers` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `stripe_customers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `stripe_customers` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `stripe_customers` table. All the data in the column will be lost.
  - You are about to drop the column `cancelAtPeriodEnd` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodEnd` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `currentPeriodStart` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethodBrand` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethodLast4` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `priceId` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `stripe_user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,provider_account_id]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[session_token]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_session_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_payment_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_id]` on the table `reservations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id]` on the table `stripe_customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customer_id]` on the table `stripe_customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subscription_id]` on the table `stripe_user_subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `provider_account_id` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_token` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `lesson_slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `lesson_slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacher_id` to the `lesson_slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `lesson_slots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripe_session_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booked_end_time` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booked_start_time` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slot_id` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_amount` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `stripe_customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `stripe_customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `stripe_customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customer_id` to the `stripe_user_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscription_id` to the `stripe_user_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `stripe_user_subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `stripe_user_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "lesson_slots" DROP CONSTRAINT "lesson_slots_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderId_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_slotId_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_studentId_fkey";

-- DropForeignKey
ALTER TABLE "stripe_customers" DROP CONSTRAINT "stripe_customers_userId_fkey";

-- DropForeignKey
ALTER TABLE "stripe_user_subscriptions" DROP CONSTRAINT "stripe_user_subscriptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- DropIndex
DROP INDEX "Account_provider_providerAccountId_key";

-- DropIndex
DROP INDEX "Session_sessionToken_key";

-- DropIndex
DROP INDEX "lesson_slots_startTime_endTime_idx";

-- DropIndex
DROP INDEX "lesson_slots_startTime_isAvailable_idx";

-- DropIndex
DROP INDEX "lesson_slots_teacherId_idx";

-- DropIndex
DROP INDEX "messages_senderId_idx";

-- DropIndex
DROP INDEX "payments_stripePaymentId_key";

-- DropIndex
DROP INDEX "payments_stripeSessionId_key";

-- DropIndex
DROP INDEX "payments_userId_idx";

-- DropIndex
DROP INDEX "permissions_roleId_idx";

-- DropIndex
DROP INDEX "reservations_paymentId_key";

-- DropIndex
DROP INDEX "reservations_slotId_idx";

-- DropIndex
DROP INDEX "reservations_studentId_idx";

-- DropIndex
DROP INDEX "stripe_customers_customerId_key";

-- DropIndex
DROP INDEX "stripe_customers_userId_key";

-- DropIndex
DROP INDEX "stripe_user_subscriptions_subscriptionId_key";

-- DropIndex
DROP INDEX "stripe_user_subscriptions_userId_idx";

-- DropIndex
DROP INDEX "users_roleId_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "providerAccountId",
DROP COLUMN "userId",
ADD COLUMN     "provider_account_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "sessionToken",
DROP COLUMN "userId",
ADD COLUMN     "session_token" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "lesson_slots" DROP COLUMN "createdAt",
DROP COLUMN "endTime",
DROP COLUMN "hourlyRate",
DROP COLUMN "isAvailable",
DROP COLUMN "maxDuration",
DROP COLUMN "maxHours",
DROP COLUMN "minDuration",
DROP COLUMN "minHours",
DROP COLUMN "startTime",
DROP COLUMN "teacherId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "hourly_rate" INTEGER NOT NULL DEFAULT 6000,
ADD COLUMN     "is_available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "max_duration" INTEGER DEFAULT 90,
ADD COLUMN     "max_hours" INTEGER,
ADD COLUMN     "min_duration" INTEGER DEFAULT 60,
ADD COLUMN     "min_hours" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "start_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "teacher_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "senderId",
ADD COLUMN     "sender_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "createdAt",
DROP COLUMN "stripePaymentId",
DROP COLUMN "stripeSessionId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "charge_executed_at" TIMESTAMP(6),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "refund_amount" INTEGER,
ADD COLUMN     "refund_reason" TEXT,
ADD COLUMN     "refunded_at" TIMESTAMP(6),
ADD COLUMN     "stripe_payment_id" TEXT,
ADD COLUMN     "stripe_session_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "createdAt",
DROP COLUMN "roleId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "role_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "reservations" DROP COLUMN "approvedAt",
DROP COLUMN "approvedBy",
DROP COLUMN "bookedEndTime",
DROP COLUMN "bookedStartTime",
DROP COLUMN "createdAt",
DROP COLUMN "durationMinutes",
DROP COLUMN "hoursBooked",
DROP COLUMN "paymentId",
DROP COLUMN "rejectedAt",
DROP COLUMN "rejectionReason",
DROP COLUMN "slotId",
DROP COLUMN "studentId",
DROP COLUMN "totalAmount",
DROP COLUMN "updatedAt",
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "booked_end_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "booked_start_time" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "canceled_at" TIMESTAMP(6),
ADD COLUMN     "canceled_by" VARCHAR(255),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "duration_minutes" INTEGER DEFAULT 60,
ADD COLUMN     "hours_booked" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "rescheduled_from" VARCHAR(255),
ADD COLUMN     "rescheduled_to" VARCHAR(255),
ADD COLUMN     "slot_id" TEXT NOT NULL,
ADD COLUMN     "student_id" TEXT NOT NULL,
ADD COLUMN     "total_amount" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "stripe_customers" DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "deletedAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "stripe_user_subscriptions" DROP COLUMN "cancelAtPeriodEnd",
DROP COLUMN "createdAt",
DROP COLUMN "currentPeriodEnd",
DROP COLUMN "currentPeriodStart",
DROP COLUMN "customerId",
DROP COLUMN "deletedAt",
DROP COLUMN "paymentMethodBrand",
DROP COLUMN "paymentMethodLast4",
DROP COLUMN "priceId",
DROP COLUMN "subscriptionId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "cancel_at_period_end" BOOLEAN,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current_period_end" BIGINT,
ADD COLUMN     "current_period_start" BIGINT,
ADD COLUMN     "customer_id" TEXT NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "payment_method_brand" TEXT,
ADD COLUMN     "payment_method_last4" TEXT,
ADD COLUMN     "price_id" TEXT,
ADD COLUMN     "subscription_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerified",
DROP COLUMN "roleId",
ADD COLUMN     "email_verified" TIMESTAMP(3),
ADD COLUMN     "role_id" TEXT NOT NULL DEFAULT 'student';

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_provider_account_id_key" ON "Account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- CreateIndex
CREATE INDEX "lesson_slots_start_time_end_time_idx" ON "lesson_slots"("start_time", "end_time");

-- CreateIndex
CREATE INDEX "lesson_slots_start_time_is_available_idx" ON "lesson_slots"("start_time", "is_available");

-- CreateIndex
CREATE INDEX "lesson_slots_teacher_id_idx" ON "lesson_slots"("teacher_id");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_id_key" ON "payments"("stripe_payment_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "permissions_role_id_idx" ON "permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_payment_id_key" ON "reservations"("payment_id");

-- CreateIndex
CREATE INDEX "reservations_slot_id_idx" ON "reservations"("slot_id");

-- CreateIndex
CREATE INDEX "reservations_student_id_idx" ON "reservations"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_user_id_key" ON "stripe_customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_customer_id_key" ON "stripe_customers"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_user_subscriptions_subscription_id_key" ON "stripe_user_subscriptions"("subscription_id");

-- CreateIndex
CREATE INDEX "stripe_user_subscriptions_user_id_idx" ON "stripe_user_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_slots" ADD CONSTRAINT "lesson_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "lesson_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_user_subscriptions" ADD CONSTRAINT "stripe_user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

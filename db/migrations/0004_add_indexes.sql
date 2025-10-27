-- Migration: Add database indexes for performance optimization
-- Created: 2025-10-27
-- Tracking ID: IMP-2025-10-27-001
-- Related: COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md

-- users テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);

-- lesson_slots テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_mentor_id ON lesson_slots(mentor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_start_time ON lesson_slots(start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_status ON lesson_slots(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_mentor_start ON lesson_slots(mentor_id, start_time);

-- reservations テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_slot_id ON reservations(slot_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_student_id ON reservations(student_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_mentor_id ON reservations(mentor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_payment_status ON reservations(payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservations_student_status ON reservations(student_id, status);

-- messages テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_reservation_id ON messages(reservation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- materials テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_creator_id ON materials(creator_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_difficulty ON materials(difficulty);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_is_public ON materials(is_public);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_quality_status ON materials(quality_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_creator_type ON materials(creator_id, type);

-- subscriptions テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

-- webhook_events テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_type ON webhook_events(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- learning_metrics テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_metrics_user_id ON learning_metrics(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_metrics_material_id ON learning_metrics(material_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_metrics_last_practiced ON learning_metrics(last_practiced_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_metrics_user_material ON learning_metrics(user_id, material_id);

-- JSONB indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_materials_tags ON materials USING gin(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_slots_tags ON lesson_slots USING gin(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_metrics_weak_spots ON learning_metrics USING gin(weak_spots);

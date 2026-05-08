-- Add hoo_pass value to dial_sub_tier enum
-- PostgreSQL enum values can be added but not removed; existing values (basic/pro/studio) remain for backward compat
ALTER TYPE "dial_sub_tier" ADD VALUE 'hoo_pass';

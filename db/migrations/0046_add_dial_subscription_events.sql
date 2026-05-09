CREATE TABLE dial_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES dial_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN,
  current_period_end TIMESTAMP,
  stripe_subscription_id TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dial_sub_events_stripe_event_id ON dial_subscription_events(stripe_event_id);
CREATE INDEX idx_dial_sub_events_user_id ON dial_subscription_events(user_id);
CREATE INDEX idx_dial_sub_events_sub_id ON dial_subscription_events(subscription_id);
CREATE INDEX idx_dial_sub_events_occurred_at ON dial_subscription_events(occurred_at);
CREATE INDEX idx_dial_sub_events_to_status ON dial_subscription_events(to_status);

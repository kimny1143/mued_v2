-- Hoo AI chat usage snapshot — read-only aggregate over public.hoo_conversations.
--
-- Runs as `funnel_collector_ro`, which holds SELECT on this one table (and nothing else that
-- matters here). Every statement below is a SELECT over that single table, and no statement
-- emits a user identifier: user_id appears only inside count(DISTINCT ...) and GROUP BY.
--
-- Why this file is fixed and committed rather than passed in at dispatch time: a workflow input
-- that accepted SQL would be an arbitrary-query hole into production. Reviewing this file once
-- is the whole point.
--
-- WHAT THIS CAN AND CANNOT ANSWER
--   CAN:    how much `POST /api/hoo/chat` has been used, by how many distinct users, and what
--           Anthropic usage it recorded (tokens + the USD its own pricing table computed).
--   CANNOT: total Anthropic spend. Three other paths reach the same provider and none of them
--           write here — `dial/chat` (dial_messages has no token/cost columns at all),
--           `hoo/poc/chat` (persists nothing), `lobe/commentary` (does not record), plus
--           conversation-title generation (updateTitle does not accumulate cost).
--           So the cost below is a LOWER BOUND for hoo/chat only, and an empty result does NOT
--           mean "the Anthropic API is unused".
--
-- Liveness thresholds were fixed before any number was seen, so that the data cannot pick them:
--   live = max(started_at) within 30 days | dormant = 30-90 days | stale = over 90 days
-- A stale/absent max(started_at) has at least four readings, and this file does not choose
-- between them: (a) genuinely unused, (b) writes are broken, (c) the calling app is unreleased
-- or not updated, (d) production is authenticating with a different account/key.

-- [0] Control. Establishes the two facts the rest of the file would otherwise assume, and
--     proves the connection can actually see rows. If `rows` is 0 the caller must treat this as
--     "could not read", not as "no usage" — the workflow enforces that.
SHOW TimeZone;

SELECT pg_typeof(started_at) AS started_at_type
FROM public.hoo_conversations
LIMIT 1;

SELECT count(*)                AS rows,
       min(started_at)         AS first_started,
       max(started_at)         AS last_started,   -- liveness is read here, NOT from the row count
       count(DISTINCT user_id) AS users_total
FROM public.hoo_conversations;

-- [1] Monthly volume, distinct users, recorded cost.
--     No `AT TIME ZONE`: started_at is `timestamp without time zone` (see migration
--     0007_many_magdalene.sql:12). Casting it to timestamptz would make date_trunc cut on the
--     session's TimeZone, i.e. the clause added to avoid a 9-hour shift would introduce one.
--     The column is named month_naive rather than month_utc because whether the stored values
--     are UTC has not been measured.
SELECT date_trunc('month', started_at) AS month_naive,
       count(*)                        AS conversations,
       sum(message_count)              AS turns,
       count(DISTINCT user_id)         AS distinct_users,
       sum(total_input_tokens)         AS in_tokens,
       sum(total_output_tokens)        AS out_tokens,
       round(sum(total_cost_usd), 6)   AS cost_usd
FROM public.hoo_conversations
GROUP BY 1
ORDER BY 1 DESC;

-- [2] Distribution. A mean alone cannot separate "one user did everything" from "many users did
--     a little", and those two imply opposite cap designs.
WITH per_user AS (
  SELECT user_id,
         sum(message_count)  AS turns,
         sum(total_cost_usd) AS cost
  FROM public.hoo_conversations
  GROUP BY 1
)
SELECT count(*)                                            AS users,
       sum(turns)                                          AS total_turns,
       round(avg(turns), 1)                                AS mean_turns,
       percentile_cont(0.5)  WITHIN GROUP (ORDER BY turns) AS median_turns,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY turns) AS p95_turns,
       max(turns)                                          AS top1_turns,
       round(100.0 * max(turns) / NULLIF(sum(turns), 0), 1) AS top1_pct_turns,
       round(100.0 * (SELECT sum(turns)
                      FROM (SELECT turns FROM per_user ORDER BY turns DESC LIMIT 10) t)
                   / NULLIF(sum(turns), 0), 1)              AS top10_pct_turns,
       round(100.0 * max(cost) / NULLIF(sum(cost), 0), 1)   AS top1_pct_cost
FROM per_user;

-- [3] provider x model. The pricing tables in lib/ are hardcoded literals, so "the unit price
--     matches the vendor's" only holds for whichever model is actually in use. This reads the
--     model off the rows instead of trusting the default in the schema.
SELECT provider,
       model,
       count(*)                      AS conversations,
       sum(total_input_tokens)       AS in_tokens,
       sum(total_output_tokens)      AS out_tokens,
       round(sum(total_cost_usd), 6) AS cost_usd
FROM public.hoo_conversations
GROUP BY 1, 2
ORDER BY cost_usd DESC;

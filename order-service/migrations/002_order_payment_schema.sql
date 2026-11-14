ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'requires_payment_method')
    ),
    ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS payment_idempotency_key VARCHAR(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session_id
    ON orders (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
    ON orders (stripe_payment_intent_id)
    WHERE stripe_payment_intent_id IS NOT NULL;

package repository

import (
	"context"
	"database/sql"
	"fmt"

	"example.com/go-commerce-platform/order-service/models"
	"github.com/aarondl/sqlboiler/v4/boil"
)

type OrderDraft struct {
	UserID      int64
	Subtotal    float64
	DeliveryFee float64
	TotalAmount float64
	Status      string
	Items       []OrderItemDraft
}

type OrderItemDraft struct {
	ProductID       int64
	ProductName     string
	SelectedWeightG int
	Qty             int
	UnitPricePerKg  float64
	LineTotal       float64
	Status          string
}

type OrderPaymentRecord struct {
	ID                    int64
	UserID                int64
	Status                string
	TotalAmount           float64
	PaymentStatus         string
	StripeCheckoutSessionID string
	StripePaymentIntentID   string
	PaymentIdempotencyKey   string
}

type OrderRepository struct {
	DB *sql.DB
}

type OrderItemSummary struct {
	ProductID       int64
	SelectedWeightG int
	Status          string
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{
		DB: db,
	}
}

func (r *OrderRepository) GetOrderItemsByOrderID(ctx context.Context, orderID int64) ([]OrderItemSummary, error) {
	rows, err := r.DB.QueryContext(
		ctx,
		`SELECT product_id, selected_weight_g, status FROM order_items WHERE order_id = $1`,
		orderID,
	)
	if err != nil {
		return nil, fmt.Errorf("query order items: %w", err)
	}
	defer rows.Close()

	items := make([]OrderItemSummary, 0)
	for rows.Next() {
		item := OrderItemSummary{}
		if err := rows.Scan(&item.ProductID, &item.SelectedWeightG, &item.Status); err != nil {
			return nil, fmt.Errorf("scan order item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate order items: %w", err)
	}

	return items, nil
}

func (r *OrderRepository) CreateOrderWithItems(ctx context.Context, draft *OrderDraft) (int64, error) {
	if draft == nil {
		return 0, fmt.Errorf("order draft is required")
	}
	if len(draft.Items) == 0 {
		return 0, fmt.Errorf("order must contain at least one item")
	}

	tx, err := r.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("begin order transaction: %w", err)
	}
	defer tx.Rollback()

	var orderID int64
	if err := tx.QueryRowContext(
		ctx,
		`INSERT INTO orders (user_id, status, subtotal, delivery_fee, total_amount, payment_status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW()) RETURNING id`,
		draft.UserID,
		draft.Status,
		draft.Subtotal,
		draft.DeliveryFee,
		draft.TotalAmount,
	).Scan(&orderID); err != nil {
		return 0, fmt.Errorf("insert order: %w", err)
	}

	for _, item := range draft.Items {
		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO order_items (order_id, product_id, product_name_snapshot, selected_weight_g, qty, unit_price_per_kg, line_total, status, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
			orderID,
			item.ProductID,
			item.ProductName,
			item.SelectedWeightG,
			item.Qty,
			item.UnitPricePerKg,
			item.LineTotal,
			item.Status,
		); err != nil {
			return 0, fmt.Errorf("insert order item for product %d: %w", item.ProductID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit order transaction: %w", err)
	}

	return orderID, nil
}

func (r *OrderRepository) CreateOrder(ctx context.Context, order *models.Order) error {
	err := order.Insert(ctx, r.DB, boil.Infer())
	if err != nil {
		return err
	}
	return nil
}

func (r *OrderRepository) GetPaymentStatus(ctx context.Context, orderID int64) (string, error) {
	var paymentStatus string
	if err := r.DB.QueryRowContext(
		ctx,
		`SELECT COALESCE(payment_status, 'pending') FROM orders WHERE id = $1`,
		orderID,
	).Scan(&paymentStatus); err != nil {
		return "", fmt.Errorf("get payment status: %w", err)
	}
	return paymentStatus, nil
}

func (r *OrderRepository) GetOrderPaymentRecord(ctx context.Context, orderID int64) (*OrderPaymentRecord, error) {
	rec := &OrderPaymentRecord{}
	if err := r.DB.QueryRowContext(
		ctx,
		`SELECT id, user_id, status, total_amount, COALESCE(payment_status, 'pending'),
		        COALESCE(stripe_checkout_session_id, ''), COALESCE(stripe_payment_intent_id, ''),
		        COALESCE(payment_idempotency_key, '')
		 FROM orders WHERE id = $1`,
		orderID,
	).Scan(
		&rec.ID,
		&rec.UserID,
		&rec.Status,
		&rec.TotalAmount,
		&rec.PaymentStatus,
		&rec.StripeCheckoutSessionID,
		&rec.StripePaymentIntentID,
		&rec.PaymentIdempotencyKey,
	); err != nil {
		return nil, fmt.Errorf("get order payment record: %w", err)
	}
	return rec, nil
}

func (r *OrderRepository) UpdateOrderPaymentRecord(
	ctx context.Context,
	orderID int64,
	paymentStatus string,
	checkoutSessionID string,
	paymentIntentID string,
	idempotencyKey string,
) error {
	_, err := r.DB.ExecContext(
		ctx,
		`UPDATE orders
		 SET payment_status = CASE
		         WHEN payment_status = 'paid' THEN payment_status
		         ELSE $1
		     END,
		     stripe_checkout_session_id = COALESCE(NULLIF($2, ''), stripe_checkout_session_id),
		     stripe_payment_intent_id = COALESCE(NULLIF($3, ''), stripe_payment_intent_id),
		     payment_idempotency_key = COALESCE(NULLIF($4, ''), payment_idempotency_key),
		     updated_at = NOW()
		 WHERE id = $5`,
		paymentStatus,
		checkoutSessionID,
		paymentIntentID,
		idempotencyKey,
		orderID,
	)
	if err != nil {
		return fmt.Errorf("update order payment record: %w", err)
	}
	return nil
}

func (r *OrderRepository) GetOrderByID(ctx context.Context, id int64) (*models.Order, error) {
	return models.FindOrder(ctx, r.DB, id)
}

func (r *OrderRepository) ListOrders(ctx context.Context) (models.OrderSlice, error) {
	return models.Orders().All(ctx, r.DB)
}

func (r *OrderRepository) UpdateOrder(ctx context.Context, order *models.Order) error {
	_, err := order.Update(
		ctx,
		r.DB,
		boil.Whitelist("product_name", "quantity", "unit_price", "status"),
	)
	return err
}

func (r *OrderRepository) DeleteOrder(ctx context.Context, id int64) error {
	order, err := models.FindOrder(ctx, r.DB, id)
	if err != nil {
		return err
	}

	_, err = order.Delete(ctx, r.DB)
	return err
}

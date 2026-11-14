package payment

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"

	"example.com/go-commerce-platform/order-service/repository"
	stripe "github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"
)

type Service struct {
	config *Config
	repo   *repository.OrderRepository
	client *stripe.Client
}

type WebhookResult struct {
	OrderID       int64
	PaymentStatus string
}

func NewService(cfg *Config, repo *repository.OrderRepository) *Service {
	return &Service{
		config: cfg,
		repo:   repo,
		client: stripe.NewClient(cfg.SecretKey, nil),
	}
}

func (s *Service) CreateCheckoutSession(
	ctx context.Context,
	orderID int64,
	successURL string,
	cancelURL string,
) (string, string, error) {
	if orderID <= 0 {
		return "", "", fmt.Errorf("invalid order id")
	}

	order, err := s.repo.GetOrderPaymentRecord(ctx, orderID)
	if err != nil {
		return "", "", fmt.Errorf("load order: %w", err)
	}
	if order.PaymentStatus == "paid" {
		return "", "", fmt.Errorf("order is already paid")
	}
	if order.PaymentStatus == "processing" {
		return "", "", fmt.Errorf("payment already in progress")
	}
	if order.TotalAmount <= 0 {
		return "", "", fmt.Errorf("order total must be greater than zero")
	}

	if successURL == "" {
		successURL = s.config.SuccessURL
	}
	if cancelURL == "" {
		cancelURL = s.config.CancelURL
	}
	if successURL == "" || cancelURL == "" {
		return "", "", fmt.Errorf("success_url and cancel_url are required")
	}

	amountInCents := int64(math.Round(order.TotalAmount * 100))
	idempotencyKey := fmt.Sprintf("order-%d-checkout", orderID)
	metadata := map[string]string{
		"order_id": strconv.FormatInt(orderID, 10),
		"idempotency_key": idempotencyKey,
	}

	params := &stripe.CheckoutSessionCreateParams{
		Mode:               stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:         stripe.String(successURL),
		CancelURL:          stripe.String(cancelURL),
		CustomerEmail:      stripe.String(""),
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Metadata:           metadata,
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionCreateLineItemPriceDataParams{
					Currency: stripe.String(string(stripe.CurrencyUSD)),
					UnitAmount: stripe.Int64(amountInCents),
					ProductData: &stripe.CheckoutSessionCreateLineItemPriceDataProductDataParams{
						Name: stripe.String(fmt.Sprintf("Chicken order #%d", orderID)),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		PaymentIntentData: &stripe.CheckoutSessionCreatePaymentIntentDataParams{
			Metadata: metadata,
		},
	}
	params.SetIdempotencyKey(idempotencyKey)

	session, err := s.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return "", "", fmt.Errorf("create stripe checkout session: %w", err)
	}

	paymentIntentID := ""
	if session.PaymentIntent != nil {
		paymentIntentID = session.PaymentIntent.ID
	}

	if err := s.repo.UpdateOrderPaymentRecord(ctx, orderID, "processing", session.ID, paymentIntentID, idempotencyKey); err != nil {
		return "", "", fmt.Errorf("persist stripe checkout session: %w", err)
	}

	return session.ID, session.URL, nil
}

func (s *Service) HandleWebhook(ctx context.Context, payload []byte, signature string) (*WebhookResult, error) {
	event, err := webhook.ConstructEvent(payload, signature, s.config.WebhookSecret)
	if err != nil {
		return nil, fmt.Errorf("verify webhook signature: %w", err)
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return nil, fmt.Errorf("decode checkout session event: %w", err)
		}
		if session.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
			return nil, nil
		}
		orderID, err := orderIDFromMetadata(session.Metadata)
		if err != nil {
			return nil, err
		}
		paymentIntentID := ""
		if session.PaymentIntent != nil {
			paymentIntentID = session.PaymentIntent.ID
		}
		if err := s.repo.UpdateOrderPaymentRecord(ctx, orderID, "paid", session.ID, paymentIntentID, session.Metadata["idempotency_key"]); err != nil {
			return nil, err
		}
		return &WebhookResult{OrderID: orderID, PaymentStatus: "paid"}, nil
	case "payment_intent.payment_failed":
		var intent stripe.PaymentIntent
		if err := json.Unmarshal(event.Data.Raw, &intent); err != nil {
			return nil, fmt.Errorf("decode payment intent failed event: %w", err)
		}
		orderID, err := orderIDFromMetadata(intent.Metadata)
		if err != nil {
			return nil, err
		}
		if err := s.repo.UpdateOrderPaymentRecord(ctx, orderID, "failed", "", intent.ID, intent.Metadata["idempotency_key"]); err != nil {
			return nil, err
		}
		return &WebhookResult{OrderID: orderID, PaymentStatus: "failed"}, nil
	case "checkout.session.expired", "checkout.session.cancelled":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return nil, fmt.Errorf("decode checkout session cancel event: %w", err)
		}
		orderID, err := orderIDFromMetadata(session.Metadata)
		if err != nil {
			return nil, err
		}
		if err := s.repo.UpdateOrderPaymentRecord(ctx, orderID, "cancelled", session.ID, "", session.Metadata["idempotency_key"]); err != nil {
			return nil, err
		}
		return &WebhookResult{OrderID: orderID, PaymentStatus: "cancelled"}, nil
	default:
		return nil, nil
	}
}

func orderIDFromMetadata(metadata map[string]string) (int64, error) {
	if metadata == nil {
		return 0, fmt.Errorf("missing webhook metadata")
	}
	orderIDValue, ok := metadata["order_id"]
	if !ok || orderIDValue == "" {
		return 0, fmt.Errorf("missing order_id in webhook metadata")
	}
	orderID, err := strconv.ParseInt(orderIDValue, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid order_id in webhook metadata: %w", err)
	}
	return orderID, nil
}

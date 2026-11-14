package service

import (
	"context"
	"fmt"
	"strings"

	"example.com/go-commerce-platform/order-service/kafka"
	"example.com/go-commerce-platform/order-service/models"
	"example.com/go-commerce-platform/order-service/payment"
	"example.com/go-commerce-platform/order-service/repository"
	"github.com/ericlagergren/decimal"
)

type CheckoutItem struct {
	ProductID      int64   `json:"product_id"`
	ProductName    string  `json:"product_name"`
	WeightGrams    int     `json:"weight_grams"`
	Quantity       int     `json:"quantity"`
	UnitPricePerKg float64 `json:"unit_price_per_kg"`
	AvailableStock int     `json:"available_stock"`
}

type CheckoutRequest struct {
	UserID      int64          `json:"user_id"`
	Items       []CheckoutItem `json:"items"`
	DeliveryFee float64        `json:"delivery_fee"`
}

type OrderService struct {
	Repo          *repository.OrderRepository
	Producer      *kafka.Producer
	PaymentService *payment.Service
}

func NewOrderService(
	repo *repository.OrderRepository,
	producer *kafka.Producer,
	paymentService *payment.Service,
) *OrderService {
	return &OrderService{
		Repo:           repo,
		Producer:       producer,
		PaymentService: paymentService,
	}
}

func (s *OrderService) CreateOrder(
	ctx context.Context,
	req *CheckoutRequest,
) (int64, error) {
	if req == nil {
		return 0, fmt.Errorf("request is required")
	}
	if req.UserID <= 0 {
		return 0, fmt.Errorf("invalid user id")
	}
	if len(req.Items) == 0 {
		return 0, fmt.Errorf("at least one order item is required")
	}
	if req.DeliveryFee < 0 {
		return 0, fmt.Errorf("delivery fee cannot be negative")
	}

	subtotal := 0.0
	items := make([]repository.OrderItemDraft, 0, len(req.Items))

	for _, item := range req.Items {
		if item.ProductID <= 0 {
			return 0, fmt.Errorf("valid product id is required")
		}
		if item.ProductName == "" {
			return 0, fmt.Errorf("product name is required")
		}
		if item.WeightGrams <= 0 {
			return 0, fmt.Errorf("weight in grams must be greater than 0")
		}
		if item.Quantity <= 0 {
			return 0, fmt.Errorf("quantity must be greater than 0")
		}
		if item.UnitPricePerKg <= 0 {
			return 0, fmt.Errorf("price must be greater than 0")
		}
		if item.AvailableStock < 0 || item.WeightGrams > item.AvailableStock {
			return 0, fmt.Errorf("insufficient stock: requested %d grams, available %d grams", item.WeightGrams, item.AvailableStock)
		}

		lineTotal, err := CalculateLineTotal(item.WeightGrams, item.UnitPricePerKg)
		if err != nil {
			return 0, err
		}
		subtotal += lineTotal

		items = append(items, repository.OrderItemDraft{
			ProductID:       item.ProductID,
			ProductName:     item.ProductName,
			SelectedWeightG: item.WeightGrams,
			Qty:             item.Quantity,
			UnitPricePerKg:  item.UnitPricePerKg,
			LineTotal:       lineTotal,
			Status:          "pending",
		})
	}

	total := subtotal + req.DeliveryFee
	orderID, err := s.Repo.CreateOrderWithItems(ctx, &repository.OrderDraft{
		UserID:      req.UserID,
		Subtotal:    subtotal,
		DeliveryFee: req.DeliveryFee,
		TotalAmount: total,
		Status:      "pending",
		Items:       items,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to create order: %w", err)
	}

	if s.Producer != nil {
		event := kafka.OrderCreatedEvent{
			Event:   "OrderCreated",
			OrderID: int(orderID),
			UserID:  int(req.UserID),
			Amount:  total,
			Items:   make([]kafka.OrderItem, 0, len(items)),
		}
		for _, item := range items {
			event.Items = append(event.Items, kafka.OrderItem{
				ProductID:   item.ProductID,
				Quantity:    item.Qty,
				WeightGrams: item.SelectedWeightG,
			})
		}

		if err := s.Producer.PublishOrderCreated(ctx, event); err != nil {
			return 0, fmt.Errorf("order saved but event publishing failed: %w", err)
		}
	}

	return orderID, nil
}

func (s *OrderService) GetOrderByID(
	ctx context.Context,
	id int64,
) (*models.Order, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid order id")
	}

	return s.Repo.GetOrderByID(ctx, id)
}

func (s *OrderService) ListOrders(
	ctx context.Context,
) (models.OrderSlice, error) {
	return s.Repo.ListOrders(ctx)
}

func IsValidOrderStatus(status string) bool {
	switch status {
	case "pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled":
		return true
	default:
		return false
	}
}

func IsValidPaymentStatus(status string) bool {
	switch strings.ToLower(status) {
	case "pending", "processing", "paid", "failed", "cancelled", "refunded", "requires_payment_method":
		return true
	default:
		return false
	}
}

func CanAdvanceOrderStatus(currentOrderStatus, paymentStatus, nextOrderStatus string) bool {
	if !IsValidOrderStatus(currentOrderStatus) || !IsValidOrderStatus(nextOrderStatus) || !IsValidPaymentStatus(paymentStatus) {
		return false
	}
	if currentOrderStatus == nextOrderStatus {
		return true
	}
	if nextOrderStatus == "confirmed" {
		return paymentStatus == "paid"
	}
	if nextOrderStatus == "cancelled" {
		return true
	}
	return IsValidOrderTransition(currentOrderStatus, nextOrderStatus)
}

func IsValidOrderTransition(currentStatus, nextStatus string) bool {
	if !IsValidOrderStatus(currentStatus) || !IsValidOrderStatus(nextStatus) {
		return false
	}
	if currentStatus == nextStatus {
		return true
	}

	switch currentStatus {
	case "pending":
		return nextStatus == "confirmed" || nextStatus == "cancelled"
	case "confirmed":
		return nextStatus == "preparing" || nextStatus == "cancelled"
	case "preparing":
		return nextStatus == "ready" || nextStatus == "cancelled"
	case "ready":
		return nextStatus == "out_for_delivery" || nextStatus == "cancelled"
	case "out_for_delivery":
		return nextStatus == "delivered" || nextStatus == "cancelled"
	case "delivered", "cancelled":
		return false
	default:
		return false
	}
}

func (s *OrderService) UpdateOrder(
	ctx context.Context,
	id int64,
	order *models.Order,
) error {
	if id <= 0 {
		return fmt.Errorf("invalid order id")
	}

	if order == nil {
		return fmt.Errorf("order is required")
	}

	if order.ProductName == "" {
		return fmt.Errorf("product name is required")
	}

	if order.Quantity <= 0 {
		return fmt.Errorf("quantity must be greater than 0")
	}

	if order.UnitPrice.Big == nil ||
		order.UnitPrice.Cmp(decimal.New(0, 0)) <= 0 {
		return fmt.Errorf("price must be greater than 0")
	}

	if !IsValidOrderStatus(order.Status) {
		return fmt.Errorf("invalid order status")
	}

	current, err := s.Repo.GetOrderByID(ctx, id)
	if err != nil {
		return fmt.Errorf("load current order: %w", err)
	}

	if !IsValidOrderTransition(current.Status, order.Status) {
		return fmt.Errorf("invalid order transition from %s to %s", current.Status, order.Status)
	}

	// Use the ID received from the URL.
	order.ID = id
	if err := s.Repo.UpdateOrder(ctx, order); err != nil {
		return err
	}

	if s.Producer != nil && current.Status != order.Status {
		items, err := s.Repo.GetOrderItemsByOrderID(ctx, id)
		if err != nil {
			return fmt.Errorf("load order items for status event: %w", err)
		}
		for _, item := range items {
			if item.ProductID <= 0 || item.SelectedWeightG <= 0 {
				continue
			}
			event := kafka.OrderStatusChangedEvent{
				Event:         "OrderStatusChanged",
				OrderID:       int(id),
				UserID:        int(current.UserID),
				ProductID:     item.ProductID,
				ReservedGrams: item.SelectedWeightG,
				Status:        order.Status,
			}
			if err := s.Producer.PublishOrderStatusChanged(ctx, event); err != nil {
				return fmt.Errorf("failed to publish status change event: %w", err)
			}
		}
	}

	return nil
}

func (s *OrderService) UpdateOrderStatus(
	ctx context.Context,
	id int64,
	status string,
) error {
	if id <= 0 {
		return fmt.Errorf("invalid order id")
	}
	if !IsValidOrderStatus(status) {
		return fmt.Errorf("invalid order status")
	}

	current, err := s.Repo.GetOrderByID(ctx, id)
	if err != nil {
		return fmt.Errorf("load current order: %w", err)
	}
	paymentStatus, err := s.Repo.GetPaymentStatus(ctx, id)
	if err != nil {
		return fmt.Errorf("load payment status: %w", err)
	}
	if !CanAdvanceOrderStatus(current.Status, paymentStatus, status) {
		if status == "confirmed" && paymentStatus != "paid" {
			return fmt.Errorf("order cannot be confirmed until payment is paid")
		}
		return fmt.Errorf("invalid order transition from %s to %s with payment status %s", current.Status, status, paymentStatus)
	}

	current.Status = status
	if err := s.Repo.UpdateOrder(ctx, current); err != nil {
		return err
	}

	if s.Producer != nil {
		items, err := s.Repo.GetOrderItemsByOrderID(ctx, id)
		if err != nil {
			return fmt.Errorf("load order items for status event: %w", err)
		}
		for _, item := range items {
			if item.ProductID <= 0 || item.SelectedWeightG <= 0 {
				continue
			}
			event := kafka.OrderStatusChangedEvent{
				Event:         "OrderStatusChanged",
				OrderID:       int(id),
				UserID:        int(current.UserID),
				ProductID:     item.ProductID,
				ReservedGrams: item.SelectedWeightG,
				Status:        status,
			}
			if err := s.Producer.PublishOrderStatusChanged(ctx, event); err != nil {
				return fmt.Errorf("failed to publish status change event: %w", err)
			}
		}
	}

	return nil
}

func (s *OrderService) CreateCheckoutSession(
	ctx context.Context,
	orderID int64,
	successURL string,
	cancelURL string,
) (string, string, error) {
	if s.PaymentService == nil {
		return "", "", fmt.Errorf("payment service is not configured")
	}
	return s.PaymentService.CreateCheckoutSession(ctx, orderID, successURL, cancelURL)
}

func (s *OrderService) HandleStripeWebhook(
	ctx context.Context,
	payload []byte,
	signature string,
) error {
	if s.PaymentService == nil {
		return fmt.Errorf("payment service is not configured")
	}
	result, err := s.PaymentService.HandleWebhook(ctx, payload, signature)
	if err != nil {
		return err
	}
	if result != nil && result.PaymentStatus == "paid" {
		if err := s.UpdateOrderStatus(ctx, result.OrderID, "confirmed"); err != nil {
			return fmt.Errorf("confirm paid order: %w", err)
		}
	}
	return nil
}

func (s *OrderService) DeleteOrder(
	ctx context.Context,
	id int64,
) error {
	if id <= 0 {
		return fmt.Errorf("invalid order id")
	}

	return s.Repo.DeleteOrder(ctx, id)
}

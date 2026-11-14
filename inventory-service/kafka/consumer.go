package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	inventoryService "example.com/go-commerce-platform/inventory-service/service"
	"example.com/go-commerce-platform/inventory-service/repository"
	"github.com/segmentio/kafka-go"
)

type OrderItem struct {
	ProductID   int64 `json:"product_id"`
	Quantity    int   `json:"quantity"`
	WeightGrams int   `json:"weight_grams"`
}

type OrderCreatedEvent struct {
	Event   string      `json:"event"`
	OrderID int         `json:"order_id"`
	UserID  int         `json:"user_id"`
	Amount  float64     `json:"amount"`
	Items   []OrderItem `json:"items"`
}

type OrderStatusChangedEvent struct {
	Event         string `json:"event"`
	OrderID       int    `json:"order_id"`
	UserID        int    `json:"user_id"`
	ProductID     int64  `json:"product_id"`
	ReservedGrams int    `json:"reserved_grams"`
	Status        string `json:"status"`
}

func StartOrderConsumer(ctx context.Context, repo *repository.InventoryRepository) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  []string{"localhost:9092"},
		Topic:    "order-events",
		GroupID:  "inventory-service-group",
		MinBytes: 10e3,
		MaxBytes: 10e6,
	})

	defer reader.Close()

	fmt.Println("Inventory Kafka consumer started")

	for {
		message, err := reader.ReadMessage(ctx)
		if err != nil {
			fmt.Println("Kafka read error:", err)
			return
		}

		var event map[string]any
		if err := json.Unmarshal(message.Value, &event); err != nil {
			fmt.Printf("Invalid order event: %v\n", err)
			continue
		}

		switch event["event"] {
		case "OrderCreated":
			var created OrderCreatedEvent
			if err := json.Unmarshal(message.Value, &created); err != nil {
				fmt.Printf("Invalid order-created event: %v\n", err)
				continue
			}
			for _, item := range created.Items {
				if item.ProductID <= 0 || item.WeightGrams <= 0 {
					continue
				}
				if _, err := repo.ChangeStock(ctx, item.ProductID, -item.WeightGrams); err != nil {
					fmt.Printf("Failed to reserve stock for product %d: %v\n", item.ProductID, err)
					continue
				}
				fmt.Printf("Reserved %d grams for product %d on order %d\n", item.WeightGrams, item.ProductID, created.OrderID)
			}
		case "OrderStatusChanged":
			var statusEvent OrderStatusChangedEvent
			if err := json.Unmarshal(message.Value, &statusEvent); err != nil {
				fmt.Printf("Invalid order-status event: %v\n", err)
				continue
			}
			if statusEvent.ProductID <= 0 || statusEvent.ReservedGrams <= 0 {
				continue
			}
			delta, err := inventoryService.ReservationDeltaForOrderStatus(statusEvent.Status, statusEvent.ReservedGrams)
			if err != nil {
				fmt.Printf("Ignoring invalid reservation status update: %v\n", err)
				continue
			}
			if delta == 0 {
				continue
			}
			if _, err := repo.ChangeStock(ctx, statusEvent.ProductID, delta); err != nil {
				fmt.Printf("Failed to apply order status stock change for product %d: %v\n", statusEvent.ProductID, err)
				continue
			}
			fmt.Printf("Applied stock delta %d for product %d on order %d status %s\n", delta, statusEvent.ProductID, statusEvent.OrderID, statusEvent.Status)
		}
	}
}

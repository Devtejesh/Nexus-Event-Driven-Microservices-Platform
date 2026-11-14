package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	kafkago "github.com/segmentio/kafka-go"
)

type Producer struct {
	writer *kafkago.Writer
}

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

func NewProducer() *Producer {
	writer := &kafkago.Writer{
		Addr:     kafkago.TCP("localhost:9092"),
		Topic:    "order-events",
		Balancer: &kafkago.Hash{},
	}

	return &Producer{
		writer: writer,
	}
}

func (p *Producer) PublishOrderCreated(
	ctx context.Context,
	event OrderCreatedEvent,
) error {
	message, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to encode order event: %w", err)
	}

	err = p.writer.WriteMessages(ctx, kafkago.Message{
		Key:   []byte(fmt.Sprint(event.OrderID)),
		Value: message,
	})
	if err != nil {
		return fmt.Errorf("failed to publish order event: %w", err)
	}

	return nil
}

func (p *Producer) PublishOrderStatusChanged(
	ctx context.Context,
	event OrderStatusChangedEvent,
) error {
	message, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to encode status change event: %w", err)
	}

	err = p.writer.WriteMessages(ctx, kafkago.Message{
		Key:   []byte(fmt.Sprint(event.OrderID)),
		Value: message,
	})
	if err != nil {
		return fmt.Errorf("failed to publish status change event: %w", err)
	}

	return nil
}

func (p *Producer) Close() error {
	return p.writer.Close()
}

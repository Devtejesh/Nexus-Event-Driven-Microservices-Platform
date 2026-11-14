package payment

import (
	"fmt"
	"os"
)

type Config struct {
	SecretKey     string
	PublishableKey string
	WebhookSecret string
	SuccessURL    string
	CancelURL     string
}

func LoadConfig() (*Config, error) {
	cfg := &Config{
		SecretKey:      os.Getenv("STRIPE_SECRET_KEY"),
		PublishableKey: os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		WebhookSecret:  os.Getenv("STRIPE_WEBHOOK_SECRET"),
		SuccessURL:     os.Getenv("STRIPE_SUCCESS_URL"),
		CancelURL:      os.Getenv("STRIPE_CANCEL_URL"),
	}

	if cfg.SecretKey == "" {
		return nil, fmt.Errorf("missing STRIPE_SECRET_KEY environment variable")
	}
	if cfg.WebhookSecret == "" {
		return nil, fmt.Errorf("missing STRIPE_WEBHOOK_SECRET environment variable")
	}
	if cfg.PublishableKey == "" {
		return nil, fmt.Errorf("missing STRIPE_PUBLISHABLE_KEY environment variable")
	}

	return cfg, nil
}

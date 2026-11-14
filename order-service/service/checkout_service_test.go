package service

import "testing"

func TestValidateCheckoutInput(t *testing.T) {
	total, err := ValidateCheckoutInput(1500, 180, 2000)
	if err != nil {
		t.Fatalf("expected checkout to pass, got %v", err)
	}
	if total != 270 {
		t.Fatalf("expected 270.00, got %.2f", total)
	}
}

func TestValidateCheckoutInputRejectsInsufficientStock(t *testing.T) {
	if _, err := ValidateCheckoutInput(1500, 180, 1000); err == nil {
		t.Fatal("expected insufficient stock to be rejected")
	}
}

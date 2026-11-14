package service

import "testing"

func TestCalculateOrderTotal(t *testing.T) {
	total, err := CalculateOrderTotal(1500, 180, 35)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if total != 305 {
		t.Fatalf("expected 305.00, got %.2f", total)
	}
}

func TestCalculateOrderTotalRejectsInvalidInputs(t *testing.T) {
	if _, err := CalculateOrderTotal(0, 180, 35); err == nil {
		t.Fatal("expected invalid weight to be rejected")
	}
	if _, err := CalculateOrderTotal(1500, -1, 35); err == nil {
		t.Fatal("expected invalid price to be rejected")
	}
}

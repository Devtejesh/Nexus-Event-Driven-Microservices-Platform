package service

import "testing"

func TestCalculateLineTotal(t *testing.T) {
	lineTotal, err := CalculateLineTotal(1500, 180)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if lineTotal != 270 {
		t.Fatalf("expected 270.00, got %.2f", lineTotal)
	}
}

func TestCalculateLineTotalRejectsInvalidInput(t *testing.T) {
	if _, err := CalculateLineTotal(0, 180); err == nil {
		t.Fatal("expected zero weight to be rejected")
	}
	if _, err := CalculateLineTotal(1500, 0); err == nil {
		t.Fatal("expected zero price to be rejected")
	}
}

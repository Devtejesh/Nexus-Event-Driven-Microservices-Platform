package service

import "testing"

func TestValidateAvailableStock(t *testing.T) {
	if err := ValidateAvailableStock(2000, 1500); err != nil {
		t.Fatalf("expected stock to be sufficient, got %v", err)
	}
}

func TestValidateAvailableStockRejectsShortage(t *testing.T) {
	if err := ValidateAvailableStock(1000, 1500); err == nil {
		t.Fatal("expected insufficient stock to be rejected")
	}
}

func TestReserveStock(t *testing.T) {
	remaining, err := ReserveStock(2000, 1500)
	if err != nil {
		t.Fatalf("expected reservation to succeed, got %v", err)
	}
	if remaining != 500 {
		t.Fatalf("expected remaining stock to be 500, got %d", remaining)
	}
}

func TestReleaseStock(t *testing.T) {
	available, err := ReleaseStock(500, 200)
	if err != nil {
		t.Fatalf("expected release to succeed, got %v", err)
	}
	if available != 700 {
		t.Fatalf("expected available stock to be 700, got %d", available)
	}
}

func TestReservationDeltaForOrderStatus(t *testing.T) {
	if delta, err := ReservationDeltaForOrderStatus("cancelled", 1200); err != nil || delta != 1200 {
		t.Fatalf("expected cancelled order to release stock, got delta=%d err=%v", delta, err)
	}

	if delta, err := ReservationDeltaForOrderStatus("released", 450); err != nil || delta != 450 {
		t.Fatalf("expected released order to restore stock, got delta=%d err=%v", delta, err)
	}

	if delta, err := ReservationDeltaForOrderStatus("confirmed", 900); err != nil || delta != 0 {
		t.Fatalf("expected confirmed order to keep reserve state unchanged, got delta=%d err=%v", delta, err)
	}

	if _, err := ReservationDeltaForOrderStatus("unknown", 100); err == nil {
		t.Fatal("expected invalid order status to be rejected")
	}
}

package service

import "testing"

func TestIsValidOrderTransition(t *testing.T) {
	if !IsValidOrderTransition("pending", "confirmed") {
		t.Fatal("expected pending -> confirmed to be valid")
	}
	if !IsValidOrderTransition("confirmed", "preparing") {
		t.Fatal("expected confirmed -> preparing to be valid")
	}
	if !IsValidOrderTransition("ready", "cancelled") {
		t.Fatal("expected ready -> cancelled to be valid")
	}
	if IsValidOrderTransition("delivered", "confirmed") {
		t.Fatal("expected delivered -> confirmed to be rejected")
	}
	if IsValidOrderTransition("unknown", "confirmed") {
		t.Fatal("expected unknown source status to be rejected")
	}
}

func TestUpdateOrderStatusValidation(t *testing.T) {
	if !IsValidOrderStatus("cancelled") {
		t.Fatal("expected cancelled to be valid")
	}
	if IsValidOrderStatus("archived") {
		t.Fatal("expected archived to be rejected")
	}
}

func TestCanAdvanceOrderStatusForPayment(t *testing.T) {
	if !CanAdvanceOrderStatus("pending", "paid", "confirmed") {
		t.Fatal("expected pending order with paid payment to advance to confirmed")
	}
	if CanAdvanceOrderStatus("pending", "pending", "confirmed") {
		t.Fatal("expected unpaid order to be blocked from confirmation")
	}
	if !CanAdvanceOrderStatus("pending", "paid", "cancelled") {
		t.Fatal("expected paid order to be allowed to cancel")
	}
	if !CanAdvanceOrderStatus("cancelled", "refunded", "cancelled") {
		t.Fatal("expected cancellation state to remain stable when refunded")
	}
}

func TestIsValidPaymentStatus(t *testing.T) {
	if !IsValidPaymentStatus("paid") {
		t.Fatal("expected paid to be a valid payment status")
	}
	if IsValidPaymentStatus("unknown") {
		t.Fatal("expected unknown to be rejected")
	}
}

package service

import (
	"fmt"
	"strings"
)

func ValidateAvailableStock(availableGrams int, requestedGrams int) error {
	if availableGrams < 0 || requestedGrams <= 0 {
		return fmt.Errorf("invalid stock request")
	}
	if requestedGrams > availableGrams {
		return fmt.Errorf("insufficient stock: requested %d grams, available %d grams", requestedGrams, availableGrams)
	}
	return nil
}

func ValidateReservationStatus(status string) error {
	switch status {
	case "reserved", "released", "fulfilled", "cancelled":
		return nil
	default:
		return fmt.Errorf("invalid reservation status: %s", status)
	}
}

func ReservationDeltaForOrderStatus(status string, reservedGrams int) (int, error) {
	if reservedGrams < 0 {
		return 0, fmt.Errorf("reserved grams must be non-negative")
	}

	switch strings.ToLower(status) {
	case "cancelled", "released":
		return reservedGrams, nil
	case "pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "reserved", "fulfilled":
		return 0, nil
	default:
		return 0, fmt.Errorf("invalid order status: %s", status)
	}
}

func ReserveStock(availableGrams int, requestedGrams int) (int, error) {
	if err := ValidateAvailableStock(availableGrams, requestedGrams); err != nil {
		return 0, err
	}
	return availableGrams - requestedGrams, nil
}

func ReleaseStock(availableGrams int, releasedGrams int) (int, error) {
	if availableGrams < 0 || releasedGrams < 0 {
		return 0, fmt.Errorf("invalid stock release request")
	}
	return availableGrams + releasedGrams, nil
}

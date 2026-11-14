package service

import (
	"fmt"
)

func CalculateOrderTotal(weightGrams int, unitPricePerKg float64, deliveryFee float64) (float64, error) {
	if weightGrams <= 0 {
		return 0, fmt.Errorf("weight in grams must be greater than 0")
	}
	if unitPricePerKg <= 0 {
		return 0, fmt.Errorf("unit price per kg must be greater than 0")
	}
	if deliveryFee < 0 {
		return 0, fmt.Errorf("delivery fee cannot be negative")
	}

	productTotal, err := CalculateLineTotal(weightGrams, unitPricePerKg)
	if err != nil {
		return 0, err
	}
	return roundToCents(productTotal + deliveryFee), nil
}

func CalculateLineTotal(weightGrams int, unitPricePerKg float64) (float64, error) {
	if weightGrams <= 0 {
		return 0, fmt.Errorf("weight in grams must be greater than 0")
	}
	if unitPricePerKg <= 0 {
		return 0, fmt.Errorf("unit price per kg must be greater than 0")
	}
	return roundToCents((float64(weightGrams) / 1000.0) * unitPricePerKg), nil
}

func roundToCents(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}

package service

import (
	"fmt"
	"math"
)

func ValidatePricePerKg(pricePerKg float64) error {
	if pricePerKg <= 0 {
		return fmt.Errorf("price per kg must be greater than 0")
	}
	return nil
}

func CalculateLineTotal(weightGrams int, pricePerKg float64) (float64, error) {
	if weightGrams <= 0 {
		return 0, fmt.Errorf("weight in grams must be greater than 0")
	}
	if err := ValidatePricePerKg(pricePerKg); err != nil {
		return 0, err
	}

	lineTotal := (float64(weightGrams) / 1000.0) * pricePerKg
	return roundToCents(lineTotal), nil
}

func roundToCents(value float64) float64 {
	return math.Round(value*100) / 100
}

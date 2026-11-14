package service

import "fmt"

func ValidateCheckoutInput(weightGrams int, pricePerKg float64, availableStock int) (float64, error) {
	if weightGrams <= 0 {
		return 0, fmt.Errorf("weight in grams must be greater than 0")
	}
	if availableStock < 0 || weightGrams > availableStock {
		return 0, fmt.Errorf("insufficient stock: requested %d grams, available %d grams", weightGrams, availableStock)
	}
	if pricePerKg <= 0 {
		return 0, fmt.Errorf("price per kg must be greater than 0")
	}

	total, err := CalculateLineTotal(weightGrams, pricePerKg)
	if err != nil {
		return 0, err
	}
	return total, nil
}

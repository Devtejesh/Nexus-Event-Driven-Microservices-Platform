package service

import "testing"

func TestValidateRegistrationInput_DefaultsAndNormalizes(t *testing.T) {
	name, email, password, mobile, role, err := validateRegistrationInput(
		"  Alice  ",
		"  Alice@Example.com  ",
		"Password123",
		"  +1 555 000 1234  ",
		"",
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if name != "Alice" {
		t.Fatalf("expected normalized name to be Alice, got %q", name)
	}
	if email != "alice@example.com" {
		t.Fatalf("expected normalized email to be alice@example.com, got %q", email)
	}
	if password != "Password123" {
		t.Fatalf("expected password to be unchanged, got %q", password)
	}
	if mobile != "+15550001234" {
		t.Fatalf("expected normalized mobile to be +15550001234, got %q", mobile)
	}
	if role != "customer" {
		t.Fatalf("expected default role to be customer, got %q", role)
	}
}

func TestValidateRegistrationInput_RejectsInvalidRole(t *testing.T) {
	_, _, _, _, _, err := validateRegistrationInput(
		"Alice",
		"alice@example.com",
		"Password123",
		"+15550001234",
		"superadmin",
	)
	if err == nil {
		t.Fatal("expected invalid role to be rejected")
	}
}

package service

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"unicode"

	"example.com/go-commerce-platform/user-service/models"
	"example.com/go-commerce-platform/user-service/repository"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	Repo *repository.UserReppository
}

func NewAuthService(repo *repository.UserReppository) *AuthService {
	return &AuthService{
		Repo: repo,
	}
}

func validateRegistrationInput(name, email, password, mobile, role string) (string, string, string, string, string, error) {

	// Name validation
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return "", "", "", "", "", fmt.Errorf("name is required")
	}

	// Email validation
	cleanEmail := strings.TrimSpace(email)

	if cleanEmail == "" {
		return "", "", "", "", "", fmt.Errorf("email is required")
	}

	if cleanEmail != strings.ToLower(cleanEmail) {
		return "", "", "", "", "", fmt.Errorf("email must contain only lowercase letters")
	}

	parsedEmail, err := mail.ParseAddress(cleanEmail)
	if err != nil || parsedEmail.Address != cleanEmail {
		return "", "", "", "", "", fmt.Errorf("invalid email address")
	}

	if !strings.HasSuffix(cleanEmail, "@gmail.com") {
		return "", "", "", "", "", fmt.Errorf("only Gmail addresses are allowed")
	}

	// Password validation
	cleanPassword := strings.TrimSpace(password)

	if cleanPassword == "" {
		return "", "", "", "", "", fmt.Errorf("password is required")
	}

	if len(cleanPassword) < 8 {
		return "", "", "", "", "", fmt.Errorf("password must be at least 8 characters long")
	}

	var hasUpper, hasLower, hasNumber, hasSpecial bool

	for _, char := range cleanPassword {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return "", "", "", "", "", fmt.Errorf("password must contain at least one uppercase letter")
	}

	if !hasLower {
		return "", "", "", "", "", fmt.Errorf("password must contain at least one lowercase letter")
	}

	if !hasNumber {
		return "", "", "", "", "", fmt.Errorf("password must contain at least one number")
	}

	if !hasSpecial {
		return "", "", "", "", "", fmt.Errorf("password must contain at least one special character")
	}

	// Mobile validation
	cleanMobile := normalizeMobile(mobile)

	if cleanMobile == "" {
		return "", "", "", "", "", fmt.Errorf("mobile number must contain exactly 10 digits")
	}

	// Role validation
	cleanRole := strings.TrimSpace(strings.ToLower(role))

	if cleanRole == "" {
		cleanRole = "customer"
	}

	if cleanRole != "customer" && cleanRole != "admin" {
		return "", "", "", "", "", fmt.Errorf("role must be customer or admin")
	}

	return cleanName, cleanEmail, cleanPassword, cleanMobile, cleanRole, nil
}

func normalizeMobile(mobile string) string {

	clean := strings.TrimSpace(mobile)

	if len(clean) != 10 {
		return ""
	}

	for _, char := range clean {
		if char < '0' || char > '9' {
			return ""
		}
	}

	return clean
}

func (s *AuthService) RegisterUser(
	ctx context.Context,
	name string,
	email string,
	password string,
	mobile string,
	role string,
) error {

	cleanName, cleanEmail, cleanPassword, cleanMobile, cleanRole, err :=
		validateRegistrationInput(name, email, password, mobile, role)

	if err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(cleanPassword),
		bcrypt.DefaultCost,
	)

	if err != nil {
		return err
	}

	user := &models.User{
		Name:         cleanName,
		Email:        cleanEmail,
		Mobile:       cleanMobile,
		PasswordHash: string(hashedPassword),
		Role:         cleanRole,
		Status:       "active",
	}

	return s.Repo.CreateUser(ctx, user)
}

func (s *AuthService) LoginUser(
	ctx context.Context,
	email string,
	password string,
) (string, error) {

	cleanEmail := strings.TrimSpace(email)

	if cleanEmail == "" {
		return "", fmt.Errorf("email is required")
	}

	if cleanEmail != strings.ToLower(cleanEmail) {
		return "", fmt.Errorf("email must contain only lowercase letters")
	}

	cleanPassword := strings.TrimSpace(password)

	if cleanPassword == "" {
		return "", fmt.Errorf("password is required")
	}

	user, err := s.Repo.GetUserByEmail(ctx, cleanEmail)

	if err != nil {
		return "", fmt.Errorf("invalid email or password")
	}

	if user.Status != "" && user.Status != "active" {
		return "", fmt.Errorf("account is disabled")
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(cleanPassword),
	)

	if err != nil {
		return "", fmt.Errorf("invalid email or password")
	}

	token, err := GenerateToken(user.ID, user.Role)

	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}

	return token, nil
}

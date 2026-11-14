package service

import (
	"context"
	"fmt"
	"strings"

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
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return "", "", "", "", "", fmt.Errorf("name is required")
	}

	cleanEmail := strings.TrimSpace(strings.ToLower(email))
	if cleanEmail == "" {
		return "", "", "", "", "", fmt.Errorf("email is required")
	}

	cleanPassword := strings.TrimSpace(password)
	if cleanPassword == "" {
		return "", "", "", "", "", fmt.Errorf("password is required")
	}
	if len(cleanPassword) < 8 {
		return "", "", "", "", "", fmt.Errorf("password must be at least 8 characters long")
	}

	cleanMobile := normalizeMobile(mobile)
	if cleanMobile == "" {
		return "", "", "", "", "", fmt.Errorf("mobile is required")
	}

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
	clean = strings.Map(func(r rune) rune {
		switch {
		case r >= '0' && r <= '9':
			return r
		case r == '+':
			return r
		case r == ' ' || r == '-' || r == '(' || r == ')' || r == '.':
			return -1
		default:
			return -1
		}
	}, clean)
	if clean == "" {
		return ""
	}
	if strings.HasPrefix(clean, "+") {
		return "+" + strings.TrimPrefix(clean, "+")
	}
	return clean
}

func (s *AuthService) RegisterUser(ctx context.Context, name string, email string, password string, mobile string, role string) error {
	cleanName, cleanEmail, cleanPassword, cleanMobile, cleanRole, err := validateRegistrationInput(name, email, password, mobile, role)
	if err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(cleanPassword), bcrypt.DefaultCost)
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

func (s *AuthService) LoginUser(ctx context.Context, email string, password string) (string, error) {
	cleanEmail := strings.TrimSpace(strings.ToLower(email))
	if cleanEmail == "" {
		return "", fmt.Errorf("email is required")
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
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(cleanPassword))
	if err != nil {
		return "", fmt.Errorf("invalid email or password")
	}
	token, err := GenerateToken(user.ID, user.Role)
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return token, nil
}

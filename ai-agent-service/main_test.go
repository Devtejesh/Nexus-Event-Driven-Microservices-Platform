package main

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestValidateRequestRequiresSupportedLanguageAndFinalUserTurn(t *testing.T) {
	valid := chatRequest{
		Language: "te",
		Messages: []chatMessage{{Role: "user", Text: "నమస్కారం"}},
		Context: appContext{
			CurrentScreen: "home",
			CatalogSample: true,
			Catalog:       []productContext{{ID: 1, Name: "Chicken", PricePerKg: 240}},
		},
	}
	if err := validateRequest(valid); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}

	invalidLanguage := valid
	invalidLanguage.Language = "xx"
	if err := validateRequest(invalidLanguage); err == nil {
		t.Fatal("unsupported language accepted")
	}

	invalidTurn := valid
	invalidTurn.Messages = []chatMessage{{Role: "assistant", Text: "Hello"}}
	if err := validateRequest(invalidTurn); err == nil {
		t.Fatal("request ending with assistant turn accepted")
	}
}

func TestValidateActionRestrictsNavigationAndCartChanges(t *testing.T) {
	catalog := []productContext{{ID: 1, Name: "Chicken", PricePerKg: 240}}
	for _, action := range []assistantAction{
		{Type: "navigate", Screen: "cart"},
		{Type: "search_products", Query: "chicken"},
		{Type: "add_to_cart", ProductID: 1, WeightGrams: 500, Quantity: 2},
		{Type: "none"},
	} {
		if err := validateAction(action, catalog); err != nil {
			t.Errorf("valid action rejected (%+v): %v", action, err)
		}
	}
	for _, action := range []assistantAction{
		{Type: "navigate", Screen: "admin"},
		{Type: "add_to_cart", ProductID: 9, WeightGrams: 500, Quantity: 1},
		{Type: "add_to_cart", ProductID: 1, WeightGrams: 50, Quantity: 1},
		{Type: "cancel_order"},
	} {
		if err := validateAction(action, catalog); err == nil {
			t.Errorf("unsafe action accepted: %+v", action)
		}
	}
}

func TestRateLimiterAllowsTwentyRequestsPerMinute(t *testing.T) {
	limiter := newRateLimiter()
	now := time.Now()
	for i := 0; i < 20; i++ {
		if !limiter.allow("127.0.0.1", now) {
			t.Fatalf("request %d was unexpectedly rejected", i+1)
		}
	}
	if limiter.allow("127.0.0.1", now) {
		t.Fatal("request above rate limit was accepted")
	}
	if !limiter.allow("127.0.0.1", now.Add(time.Minute)) {
		t.Fatal("request after the rate window was rejected")
	}
}

func TestValidateTranscriptionRequestChecksLanguageFormatAndAudio(t *testing.T) {
	valid := transcriptionRequest{
		Language:    "te",
		MIMEType:    "audio/webm",
		AudioBase64: base64.StdEncoding.EncodeToString([]byte("sample audio")),
	}
	if _, err := validateTranscriptionRequest(valid); err != nil {
		t.Fatalf("valid audio request rejected: %v", err)
	}

	invalidLanguage := valid
	invalidLanguage.Language = "xx"
	if _, err := validateTranscriptionRequest(invalidLanguage); err == nil {
		t.Fatal("unsupported transcription language accepted")
	}

	invalidFormat := valid
	invalidFormat.MIMEType = "text/plain"
	if _, err := validateTranscriptionRequest(invalidFormat); err == nil {
		t.Fatal("unsupported audio format accepted")
	}

	invalidAudio := valid
	invalidAudio.AudioBase64 = "not-base64"
	if _, err := validateTranscriptionRequest(invalidAudio); err == nil {
		t.Fatal("invalid audio payload accepted")
	}
}

func TestLoadEnvironmentReadsOptionalFile(t *testing.T) {
	const key = "AI_AGENT_DOTENV_TEST"
	previous, wasSet := os.LookupEnv(key)
	if err := os.Unsetenv(key); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if wasSet {
			_ = os.Setenv(key, previous)
		} else {
			_ = os.Unsetenv(key)
		}
	})

	path := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(path, []byte(key+"=loaded-from-file\n"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := loadEnvironment(path); err != nil {
		t.Fatalf("loadEnvironment returned an error: %v", err)
	}
	if got := os.Getenv(key); got != "loaded-from-file" {
		t.Fatalf("loaded value = %q, want %q", got, "loaded-from-file")
	}

	if err := loadEnvironment(filepath.Join(t.TempDir(), "missing.env")); err != nil {
		t.Fatalf("missing optional env file returned an error: %v", err)
	}
}

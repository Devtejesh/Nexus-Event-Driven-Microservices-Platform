package config

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
)

func MigrateDB(db *sql.DB) error {
	files := []string{
		"001_users_schema.sql",
	}

	for _, file := range files {
		path := filepath.Join("migrations", file)
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", path, err)
		}

		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("execute migration %s: %w", path, err)
		}
	}

	return nil
}

package service

import (
	"database/sql"

	"lab/apit4/internal/repo"
)

// repoKosong: Repo tanpa database, untuk tes yang tidak menyentuhnya.
func repoKosong() repo.Repo { return repo.Baru((*sql.DB)(nil)) }

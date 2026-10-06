// Command server runs the MVP API stub: go run ./cmd/server (listens on :8080).
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/k-kobetskoy/mutabil/api/internal/server"
)

func main() {
	h, err := server.Handler(server.New())
	if err != nil {
		log.Fatal(err)
	}
	addr := ":8080"
	if v := os.Getenv("ADDR"); v != "" {
		addr = v
	}
	log.Printf("mutabil api stub on %s", addr)
	log.Fatal(http.ListenAndServe(addr, h))
}

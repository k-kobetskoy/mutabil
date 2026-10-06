package server

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/k-kobetskoy/mutabil/api/internal/gen"
)

func newHandler(t *testing.T) http.Handler {
	t.Helper()
	h, err := Handler(New())
	if err != nil {
		t.Fatal(err)
	}
	return h
}

func do(t *testing.T, h http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

// Every golden vector input is a valid request and every expected estimate decodes into the
// generated Go types without unknown fields: the TS and Go contracts agree.
func TestGoldenVectorsMatchGeneratedTypes(t *testing.T) {
	files, _ := filepath.Glob("../../../contract/fixtures/pricing/*.json")
	if len(files) == 0 {
		t.Fatal("no pricing fixtures; run pnpm vectors:gen")
	}
	h := newHandler(t)
	for _, f := range files {
		raw, _ := os.ReadFile(f)
		var fx struct {
			Input    json.RawMessage `json:"input"`
			Expected json.RawMessage `json:"expected"`
		}
		if err := json.Unmarshal(raw, &fx); err != nil {
			t.Fatal(err)
		}
		dec := json.NewDecoder(bytes.NewReader(fx.Expected))
		dec.DisallowUnknownFields()
		var est gen.Estimate
		if err := dec.Decode(&est); err != nil {
			t.Fatalf("%s: estimate does not match Go types: %v", f, err)
		}
		var in any
		_ = json.Unmarshal(fx.Input, &in)
		if rec := do(t, h, http.MethodPost, "/api/v1/estimates", in); rec.Code != http.StatusNotImplemented {
			t.Fatalf("%s: valid input expected 501 from the stub, got %d %s", f, rec.Code, rec.Body)
		}
	}
}

func TestRequestValidation(t *testing.T) {
	h := newHandler(t)
	bad := map[string]any{"v": 1, "mode": "quick", "from": map[string]any{"floor": -1}}
	if rec := do(t, h, http.MethodPost, "/api/v1/estimates", bad); rec.Code != http.StatusBadRequest {
		t.Fatalf("negative floor must be rejected by the spec, got %d", rec.Code)
	}
	unknown := map[string]any{"v": 1, "mode": "quick", "price": 1}
	if rec := do(t, h, http.MethodPost, "/api/v1/estimates", unknown); rec.Code != http.StatusBadRequest {
		t.Fatalf("a client-sent price must be rejected (additionalProperties), got %d", rec.Code)
	}
}

func TestAddressDirectory(t *testing.T) {
	h := newHandler(t)
	key := "str-observatorului|12|a|2"
	if rec := do(t, h, http.MethodGet, "/api/v1/address-directory/"+key, nil); rec.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", rec.Code)
	}
	put := map[string]any{"key": key, "elevator": "small", "confirmedBy": "crew", "confirmedAt": "2026-10-06T10:00:00Z"}
	if rec := do(t, h, http.MethodPut, "/api/v1/address-directory/"+key, put); rec.Code != http.StatusNoContent {
		t.Fatalf("want 204, got %d %s", rec.Code, rec.Body)
	}
	rec := do(t, h, http.MethodGet, "/api/v1/address-directory/"+key, nil)
	if rec.Code != http.StatusOK || !bytes.Contains(rec.Body.Bytes(), []byte(`"elevator":"small"`)) {
		t.Fatalf("want stored record, got %d %s", rec.Code, rec.Body)
	}
}

func TestSlots(t *testing.T) {
	rec := do(t, newHandler(t), http.MethodGet, "/api/v1/slots?from=2026-11-02&to=2026-11-03&windowH=6", nil)
	var slots []gen.Slot
	_ = json.Unmarshal(rec.Body.Bytes(), &slots)
	if rec.Code != http.StatusOK || len(slots) != 6 {
		t.Fatalf("want 6 slots, got %d %s", rec.Code, rec.Body)
	}
}

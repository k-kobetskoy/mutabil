package rules

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

const repo = "../../.."

func load(t *testing.T, path string, v any) {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, v); err != nil {
		t.Fatal(err)
	}
}

// normalize round-trips through JSON so numbers/maps compare the same way on both sides.
func normalize(t *testing.T, v any) any {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var out any
	_ = json.Unmarshal(b, &out)
	return out
}

func TestRulesParityWithTypeScript(t *testing.T) {
	var cfg Config
	load(t, filepath.Join(repo, "config/rules.json"), &cfg)
	files, _ := filepath.Glob(filepath.Join(repo, "contract/fixtures/rules/*.json"))
	if len(files) == 0 {
		t.Fatal("no rules fixtures; run pnpm vectors:gen")
	}
	for _, f := range files {
		var fx struct {
			Name     string         `json:"name"`
			Input    map[string]any `json:"input"`
			Expected Result         `json:"expected"`
		}
		load(t, f, &fx)
		t.Run(fx.Name, func(t *testing.T) {
			got, err := Apply(fx.Input, cfg)
			if err != nil {
				t.Fatal(err)
			}
			if g, w := normalize(t, got), normalize(t, fx.Expected); !reflect.DeepEqual(g, w) {
				gb, _ := json.MarshalIndent(g, "", " ")
				wb, _ := json.MarshalIndent(w, "", " ")
				t.Fatalf("Go result differs from TS\n--- go\n%s\n--- ts\n%s", gb, wb)
			}
		})
	}
}

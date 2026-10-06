// Package rules executes config/rules.json — the same JSON the TypeScript domain runs
// (src/domain/rules/engine.ts). JSONLogic subset + closed effects vocabulary (decisions D18).
// Parity with TS is checked by replaying contract/fixtures/rules in rules_test.go.
package rules

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/diegoholiveira/jsonlogic/v3"
)

type Effect struct {
	Type    string            `json:"type"`
	Path    string            `json:"path,omitempty"`
	Value   any               `json:"value,omitempty"`
	Options []any             `json:"options,omitempty"`
	Sigma   string            `json:"sigma,omitempty"`
	Explain string            `json:"explain,omitempty"`
	Code    string            `json:"code,omitempty"`
	Params  map[string]string `json:"params,omitempty"`
	Allow   []any             `json:"allow,omitempty"`
	Key     string            `json:"key,omitempty"`
	Step    string            `json:"step,omitempty"`
}

type Rule struct {
	ID   string          `json:"id"`
	Each []string        `json:"each,omitempty"`
	When json.RawMessage `json:"when"`
	Then []Effect        `json:"then"`
}

type Config struct {
	Version string `json:"version"`
	Rules   []Rule `json:"rules"`
}

type Task struct {
	Code   string            `json:"code"`
	Params map[string]string `json:"params,omitempty"`
}

type Assumption struct {
	Path  string `json:"path"`
	Value any    `json:"value"`
}

type Result struct {
	Order       map[string]any `json:"order"`
	Fired       []string       `json:"fired"`
	Tasks       []Task         `json:"tasks"`
	Hints       []string       `json:"hints"`
	Assumptions []Assumption   `json:"assumptions"`
}

func substitute[T any](x T, end string) (T, error) {
	var out T
	if end == "" {
		return x, nil
	}
	b, err := json.Marshal(x)
	if err != nil {
		return out, err
	}
	b = bytes.ReplaceAll(b, []byte("$end"), []byte(end))
	err = json.Unmarshal(b, &out)
	return out, err
}

func truthy(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case float64:
		return t != 0
	case string:
		return t != ""
	case []any:
		return len(t) > 0
	default:
		return true
	}
}

func getPath(m map[string]any, path string) any {
	var cur any = m
	for _, k := range strings.Split(path, ".") {
		obj, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = obj[k]
	}
	return cur
}

func setPath(m map[string]any, path string, v any) {
	keys := strings.Split(path, ".")
	cur := m
	for _, k := range keys[:len(keys)-1] {
		next, ok := cur[k].(map[string]any)
		if !ok {
			next = map[string]any{}
			cur[k] = next
		}
		cur = next
	}
	cur[keys[len(keys)-1]] = v
}

func contains(list []any, v any) bool {
	for _, x := range list {
		if fmt.Sprint(x) == fmt.Sprint(v) {
			return true
		}
	}
	return false
}

// Apply runs every rule in order; later rules see earlier assumptions.
func Apply(order map[string]any, cfg Config) (Result, error) {
	res := Result{Order: order, Fired: []string{}, Tasks: []Task{}, Hints: []string{}, Assumptions: []Assumption{}}
	for _, r := range cfg.Rules {
		ends := r.Each
		if len(ends) == 0 {
			ends = []string{""}
		}
		for _, end := range ends {
			when, err := substitute(r.When, end)
			if err != nil {
				return res, err
			}
			data, _ := json.Marshal(res.Order)
			var out bytes.Buffer
			if err := jsonlogic.Apply(bytes.NewReader(when), bytes.NewReader(data), &out); err != nil {
				return res, fmt.Errorf("rule %s: %w", r.ID, err)
			}
			var v any
			if err := json.Unmarshal(out.Bytes(), &v); err != nil {
				return res, err
			}
			if !truthy(v) {
				continue
			}
			id := r.ID
			if end != "" {
				id = r.ID + ":" + end
			}
			res.Fired = append(res.Fired, id)
			for _, raw := range r.Then {
				e, err := substitute(raw, end)
				if err != nil {
					return res, err
				}
				switch e.Type {
				case "assume":
					setPath(res.Order, e.Path, e.Value)
					res.Assumptions = append(res.Assumptions, Assumption{Path: e.Path, Value: e.Value})
				case "addTask":
					res.Tasks = append(res.Tasks, Task{Code: e.Code, Params: e.Params})
				case "restrictOptions":
					if cur := getPath(res.Order, e.Path); cur != nil && !contains(e.Allow, cur) {
						setPath(res.Order, e.Path, e.Allow[0])
					}
				case "setDefault":
					if getPath(res.Order, e.Path) == nil {
						setPath(res.Order, e.Path, e.Value)
					}
				case "hint":
					res.Hints = append(res.Hints, e.Key)
				case "explain", "hideStep":
				default:
					return res, fmt.Errorf("rule %s: unknown effect %q", r.ID, e.Type)
				}
			}
		}
	}
	return res, nil
}

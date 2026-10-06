// Package server is the MVP stub of the Go API (decisions D22–D23).
//
// The contract (types, routing, request validation) is generated from contract/openapi.yaml.
// Business logic is NOT implemented yet: estimates and orders answer 501, slots and the address
// directory are in-memory stubs. When the pricing formula is ported to Go it must reproduce the
// golden vectors in contract/fixtures/pricing exactly.
package server

import (
	"context"
	"sync"
	"time"

	"github.com/k-kobetskoy/mutabil/api/internal/gen"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type Server struct {
	mu        sync.RWMutex
	addresses map[string]gen.AddressRecord
}

var _ gen.StrictServerInterface = (*Server)(nil)

func New() *Server { return &Server{addresses: map[string]gen.AddressRecord{}} }

func notImplemented(detail string) gen.Problem {
	return gen.Problem{Type: "about:blank", Title: "Not implemented", Status: 501, Detail: &detail}
}

func (s *Server) CreateEstimate(_ context.Context, _ gen.CreateEstimateRequestObject) (gen.CreateEstimateResponseObject, error) {
	return gen.CreateEstimate501ApplicationProblemPlusJSONResponse(notImplemented("pricing service is not ported to Go yet")), nil
}

func (s *Server) SubmitOrder(_ context.Context, _ gen.SubmitOrderRequestObject) (gen.SubmitOrderResponseObject, error) {
	return gen.SubmitOrder501ApplicationProblemPlusJSONResponse(notImplemented("orders are handled by the front-end mock in the MVP")), nil
}

// ListSlots returns every slot of every day as available (no crew calendar in the MVP).
func (s *Server) ListSlots(_ context.Context, req gen.ListSlotsRequestObject) (gen.ListSlotsResponseObject, error) {
	out := gen.ListSlots200JSONResponse{}
	starts := []struct {
		id    gen.SlotSlot
		start string
	}{{"morning", "08:00"}, {"midday", "11:00"}, {"afternoon", "14:00"}}
	for d := req.Params.From.Time; !d.After(req.Params.To.Time); d = d.AddDate(0, 0, 1) {
		for _, st := range starts {
			out = append(out, gen.Slot{Date: openapi_types.Date{Time: d}, Slot: st.id, Start: st.start, Available: true})
		}
	}
	return out, nil
}

func (s *Server) GetAddressRecord(_ context.Context, req gen.GetAddressRecordRequestObject) (gen.GetAddressRecordResponseObject, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.addresses[req.Key]
	if !ok {
		return gen.GetAddressRecord404ApplicationProblemPlusJSONResponse(gen.Problem{Type: "about:blank", Title: "Unknown address", Status: 404}), nil
	}
	return gen.GetAddressRecord200JSONResponse(rec), nil
}

func (s *Server) PutAddressRecord(_ context.Context, req gen.PutAddressRecordRequestObject) (gen.PutAddressRecordResponseObject, error) {
	rec := *req.Body
	rec.Key = req.Key
	if rec.ConfirmedAt.IsZero() {
		rec.ConfirmedAt = time.Now().UTC()
	}
	s.mu.Lock()
	s.addresses[req.Key] = rec
	s.mu.Unlock()
	return gen.PutAddressRecord204Response{}, nil
}

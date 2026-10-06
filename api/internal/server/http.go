package server

import (
	"net/http"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/k-kobetskoy/mutabil/api/internal/gen"
	middleware "github.com/oapi-codegen/nethttp-middleware"
)

// Handler wires the generated router with request validation against the embedded spec.
// Structure is checked by the spec; cross-field business rules (config/rules.json) are the
// server's job once the domain is ported (decisions D23).
func Handler(s *Server) (http.Handler, error) {
	spec, err := gen.GetSwagger()
	if err != nil {
		return nil, err
	}
	spec.Servers = nil
	mux := http.NewServeMux()
	h := gen.HandlerWithOptions(gen.NewStrictHandler(s, nil), gen.StdHTTPServerOptions{BaseURL: "/api", BaseRouter: mux})
	validate := middleware.OapiRequestValidatorWithOptions(spec, &middleware.Options{
		Options: openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc},
		Prefix:  "/api",
	})
	return validate(h), nil
}

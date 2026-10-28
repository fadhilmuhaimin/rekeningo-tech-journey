// Command klien: client MCP kecil untuk lab t4-audit (go-sdk, sisi client). Tanpa model: hanya meminta daftar fitur atau
// memanggil satu alat dengan argumen JSON dan mencetak hasilnya apa adanya. Token dibaca dari T4A_TOKEN_KLIEN.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/jsonrpc"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type tambahToken struct{ token string }

func (t tambahToken) RoundTrip(r *http.Request) (*http.Response, error) {
	r = r.Clone(r.Context())
	if t.token != "" {
		r.Header.Set("Authorization", "Bearer "+t.token)
	}
	return http.DefaultTransport.RoundTrip(r)
}

func galat(err error) string {
	var je *jsonrpc.Error
	if errors.As(err, &je) {
		return fmt.Sprintf("galat JSON-RPC kode %d: %s", je.Code, je.Message)
	}
	return "galat: " + err.Error()
}

func ya(b bool) string {
	if b {
		return "ya"
	}
	return "tidak"
}

func main() {
	url := flag.String("url", "", "endpoint server MCP")
	daftar := flag.Bool("daftar", false, "cetak versi protokol, kapabilitas, dan daftar alat")
	alat := flag.String("alat", "", "nama alat yang dipanggil")
	args := flag.String("args", "{}", "argumen alat (JSON)")
	flag.Parse()
	ctx, batal := context.WithTimeout(context.Background(), 20*time.Second)
	defer batal()
	c := mcp.NewClient(&mcp.Implementation{Name: "klien-lab", Version: "lab"}, nil)
	cs, err := c.Connect(ctx, &mcp.StreamableClientTransport{Endpoint: *url, MaxRetries: -1, DisableStandaloneSSE: true,
		HTTPClient: &http.Client{Transport: tambahToken{os.Getenv("T4A_TOKEN_KLIEN")}}}, nil)
	if err != nil {
		fmt.Println("tidak tersambung:", strings.ReplaceAll(err.Error(), "\n", " "))
		os.Exit(3)
	}
	defer cs.Close()
	if *daftar {
		ir := cs.InitializeResult()
		fmt.Printf("protokol yang dipakai: %s\n", ir.ProtocolVersion)
		fmt.Printf("server: %s %s\n", ir.ServerInfo.Name, ir.ServerInfo.Version)
		k := ir.Capabilities
		fmt.Printf("kapabilitas: tools=%s resources=%s prompts=%s logging=%s completions=%s\n",
			ya(k.Tools != nil), ya(k.Resources != nil), ya(k.Prompts != nil), ya(k.Logging != nil), ya(k.Completions != nil))
		lt, err := cs.ListTools(ctx, nil)
		if err != nil {
			fmt.Println("tools/list:", galat(err))
			os.Exit(1)
		}
		sort.Slice(lt.Tools, func(i, j int) bool { return lt.Tools[i].Name < lt.Tools[j].Name })
		fmt.Printf("tools/list: %d alat\n", len(lt.Tools))
		for _, t := range lt.Tools {
			a := t.Annotations
			var masukan []string
			if m, ok := t.InputSchema.(map[string]any); ok {
				if p, ok := m["properties"].(map[string]any); ok {
					for k := range p {
						masukan = append(masukan, k)
					}
				}
			}
			sort.Strings(masukan)
			dest, open := "?", "?"
			if a != nil && a.DestructiveHint != nil {
				dest = ya(*a.DestructiveHint)
			}
			if a != nil && a.OpenWorldHint != nil {
				open = ya(*a.OpenWorldHint)
			}
			fmt.Printf("  %s: readOnlyHint=%s destructiveHint=%s openWorldHint=%s masukan=[%s]\n", t.Name, ya(a != nil && a.ReadOnlyHint), dest, open, strings.Join(masukan, ", "))
		}
		if lr, err := cs.ListResources(ctx, nil); err != nil {
			fmt.Println("resources/list:", galat(err))
		} else {
			fmt.Printf("resources/list: %d resource\n", len(lr.Resources))
		}
		if lp, err := cs.ListPrompts(ctx, nil); err != nil {
			fmt.Println("prompts/list:", galat(err))
		} else {
			fmt.Printf("prompts/list: %d prompt\n", len(lp.Prompts))
		}
		return
	}
	var a map[string]any
	if err := json.Unmarshal([]byte(*args), &a); err != nil {
		fmt.Println("argumen bukan JSON:", err)
		os.Exit(1)
	}
	res, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: *alat, Arguments: a})
	if err != nil {
		fmt.Println(galat(err))
		return
	}
	sc, _ := json.Marshal(res.StructuredContent)
	fmt.Printf("isError=%s structuredContent=%s\n", ya(res.IsError), sc)
}

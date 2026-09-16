#!/usr/bin/env bash
#
# One-time Cloudflare setup for charliescalltoaction.org, via the API.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...      # never commit this
#   export CLOUDFLARE_ACCOUNT_ID=...
#   ./scripts/cf-setup.sh status         # read-only (default)
#   ./scripts/cf-setup.sh zone           # add the domain to Cloudflare
#   ./scripts/cf-setup.sh pages          # create the Pages project
#   ./scripts/cf-setup.sh ssl            # Full (strict) + Always Use HTTPS
#   ./scripts/cf-setup.sh domains        # attach custom domains to Pages
#   ./scripts/cf-setup.sh all            # everything above, in order
#
# Every mutating action checks current state first, so re-running is safe.
# The token is never echoed. See docs/CLOUDFLARE-API.md for required scopes.

set -euo pipefail

DOMAIN="charliescalltoaction.org"
PROJECT="charliescalltoaction"
API="https://api.cloudflare.com/client/v4"

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (see docs/CLOUDFLARE-API.md)}"

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
ok()    { printf '  \033[32mok\033[0m   %s\n' "$*"; }
warn()  { printf '  \033[33mwarn\033[0m %s\n' "$*"; }
die()   { printf '  \033[31mfail\033[0m %s\n' "$*" >&2; exit 1; }

# cf <METHOD> <PATH> [JSON_BODY]
cf() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$API$path"
              -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
              -H "Content-Type: application/json")
  [ -n "$body" ] && args+=(--data "$body")
  curl "${args[@]}"
}

# Reads .success, printing .errors[].message when the call failed.
cf_check() {
  python3 -c '
import json,sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("NON_JSON"); sys.exit(0)
if d.get("success"):
    print("OK")
else:
    msgs = "; ".join(e.get("message","?") for e in d.get("errors",[]))
    print("ERR " + (msgs or "unknown error"))
'
}

jqp() { python3 -c "import json,sys;d=json.load(sys.stdin);print($1)" 2>/dev/null || true; }

verify_token() {
  local res; res=$(cf GET /user/tokens/verify)
  [ "$(printf '%s' "$res" | cf_check)" = "OK" ] \
    || die "token rejected by Cloudflare. Check it is active and correctly scoped."
  ok "API token valid"
}

zone_id() {
  cf GET "/zones?name=$DOMAIN" | jqp 'd["result"][0]["id"] if d.get("result") else ""'
}

cmd_status() {
  bold "Status for $DOMAIN"
  verify_token
  local res; res=$(cf GET "/zones?name=$DOMAIN")
  local zid;    zid=$(printf '%s' "$res"    | jqp 'd["result"][0]["id"] if d.get("result") else ""')
  if [ -z "$zid" ]; then
    warn "domain is not in this Cloudflare account yet — run: $0 zone"
  else
    local st ns
    st=$(printf '%s' "$res" | jqp 'd["result"][0]["status"]')
    ns=$(printf '%s' "$res" | jqp '", ".join(d["result"][0].get("name_servers") or [])')
    ok "zone $zid — status: $st"
    if [ "$st" != "active" ]; then
      warn "set these nameservers at your registrar, then wait for 'active':"
      printf '         %s\n' "$ns"
    else
      ok "nameservers propagated"
    fi
  fi

  if [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    local proj; proj=$(cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT" | cf_check)
    [ "$proj" = "OK" ] && ok "Pages project '$PROJECT' exists" \
                       || warn "Pages project '$PROJECT' not found — run: $0 pages"
  else
    warn "CLOUDFLARE_ACCOUNT_ID unset — skipping Pages checks"
  fi
}

cmd_zone() {
  bold "Adding $DOMAIN to Cloudflare"
  : "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
  if [ -n "$(zone_id)" ]; then ok "zone already exists — nothing to do"; return; fi
  local res; res=$(cf POST /zones \
    "{\"name\":\"$DOMAIN\",\"account\":{\"id\":\"$CLOUDFLARE_ACCOUNT_ID\"},\"type\":\"full\"}")
  local st; st=$(printf '%s' "$res" | cf_check)
  [ "$st" = "OK" ] || die "could not create zone: ${st#ERR }"
  ok "zone created"
  bold "Set these nameservers at your registrar:"
  printf '%s' "$res" | jqp '"\n".join("    " + n for n in d["result"]["name_servers"])'
}

cmd_pages() {
  bold "Creating Pages project '$PROJECT'"
  : "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
  if [ "$(cf GET "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT" | cf_check)" = "OK" ]; then
    ok "project already exists — nothing to do"; return
  fi
  local st
  st=$(cf POST "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" \
       "{\"name\":\"$PROJECT\",\"production_branch\":\"main\"}" | cf_check)
  [ "$st" = "OK" ] || die "could not create project: ${st#ERR }"
  ok "project created (direct-upload mode; GitHub Actions deploys to it)"
}

cmd_ssl() {
  bold "Hardening TLS for $DOMAIN"
  local zid; zid=$(zone_id)
  [ -n "$zid" ] || die "zone not found — run: $0 zone"
  local setting st
  for setting in ssl:strict always_use_https:on automatic_https_rewrites:on; do
    st=$(cf PATCH "/zones/$zid/settings/${setting%%:*}" \
         "{\"value\":\"${setting##*:}\"}" | cf_check)
    [ "$st" = "OK" ] && ok "${setting%%:*} = ${setting##*:}" \
                     || warn "${setting%%:*}: ${st#ERR }"
  done
}

cmd_domains() {
  bold "Attaching custom domains to Pages"
  : "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
  local d st
  for d in "$DOMAIN" "www.$DOMAIN"; do
    st=$(cf POST "/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT/domains" \
         "{\"name\":\"$d\"}" | cf_check)
    case "$st" in
      OK)          ok "$d attached" ;;
      *already*)   ok "$d already attached" ;;
      *)           warn "$d: ${st#ERR }" ;;
    esac
  done
  warn "certificates can take a few minutes to issue"
}

case "${1:-status}" in
  status)  cmd_status ;;
  zone)    verify_token; cmd_zone ;;
  pages)   verify_token; cmd_pages ;;
  ssl)     verify_token; cmd_ssl ;;
  domains) verify_token; cmd_domains ;;
  all)     verify_token; cmd_zone; cmd_pages; cmd_ssl; cmd_domains; echo; cmd_status ;;
  *)       die "unknown command '$1' (use: status|zone|pages|ssl|domains|all)" ;;
esac

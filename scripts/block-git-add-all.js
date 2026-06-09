#!/usr/bin/env node
// PreToolUse(Bash) guard — blocks `git add -A`, `git add .`, `git add --all`.
//
// Why: the BidIntell.ai/ business folder lives in this same OneDrive directory
// and contains >100MB PDFs (legal docs, sample drawings) that exceed GitHub's
// 100MB limit. `git add -A` would stage them and wedge the repo. Always stage
// specific file paths. See CLAUDE.md "ABSOLUTE PROHIBITIONS".
//
// Exit 2 = block the tool call and feed stderr back to Claude.

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
    let cmd = '';
    try {
        cmd = (JSON.parse(input).tool_input || {}).command || '';
    } catch {
        process.exit(0); // can't parse → don't block
    }
    // match `git add` followed by -A / --all / a bare "." token
    const bad = /\bgit\s+add\b[^\n&|;]*?(\s-A\b|\s--all\b|\s\.(\s|$))/;
    if (bad.test(cmd)) {
        console.error(
            'BLOCKED: `git add -A` / `git add .` / `--all` is prohibited in this repo.\n' +
            'The shared OneDrive folder holds >100MB PDFs that break GitHub. Stage specific paths instead, e.g.:\n' +
            '  git add app.html SCHEMA.md supabase/migrations/<file>.sql'
        );
        process.exit(2);
    }
    process.exit(0);
});

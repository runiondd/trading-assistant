# Trading Helper — Agent Directives

## Mandatory Context Handoff

All agents working in this project **must** follow these rules:

### On Startup
1. Check if `.claude/handoff.md` exists in the project root
2. If it exists, **read it completely** before doing any other work
3. Acknowledge the current state to the user and resume from the handoff's Resume Instructions
4. Do not re-plan or re-analyze work that the previous session already completed

### On Session End
1. **Always** produce a handoff before the session ends
2. This applies whether the session is ending because of context limits, user request, or task completion
3. Commit all work before writing the handoff
4. Save the handoff to `.claude/handoff.md`
5. Archive any previous handoff to `.claude/handoff-[timestamp].md`

### Handoff Format

The handoff file must include:
- **Status Summary** — 2-3 sentence overview of where things stand
- **Completed This Session** — checklist of what was done (with file paths, commit hashes)
- **In Progress** — partially done work with exact state, files touched, and next action
- **Queued** — tasks not yet started
- **Key Decisions Made** — what was decided, why, and what alternatives were rejected
- **Problems Encountered** — issues and their resolutions (or "UNRESOLVED")
- **Important Context** — user preferences, constraints, gotchas discovered
- **Files Modified This Session** — list of changed files
- **Resume Instructions** — explicit steps for the next session to pick up seamlessly

### No Exceptions
- This is not optional. Every session must end with a handoff, even if the task seems "done"
- Short sessions that only answered a question still get a minimal handoff (status summary + what was discussed)

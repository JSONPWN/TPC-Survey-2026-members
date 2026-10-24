Changes

Typed-in "Other" answers (members edition)
data/answer-options.json: the form's listed options for each question with an "Other" box (edit to correct)
Anything not listed counts as typed in
Charts + filters: typed-in answers grouped into one "Other (write-in)" value
Free Responses: dropdown adds the 14 questions with typed-in answers, one card per answer
Multi-select fix: options containing commas stay whole ("Social Media (Videos, YouTube, etc.)",
"Discussion on forums/philosophy groups (e.g., TPC)" were split into separate bars before)
Chart counting now uses the same answerValues() as the filters
Removed duplicate #dashboard div on free-responses.html

Files touched
js/write-ins.js, data/answer-options.json (new)
js/app.js, js/free-responses.js, all html pages (script tag), free-responses.html (intro), CHANGES.md


Members edition (new)
Password gate on every page; page hidden until unlocked
Responses ship encrypted: data/responses.enc.json (AES-256-GCM, PBKDF2-SHA256 600k)
No plaintext responses.json in this build
Build data with: node tools/encrypt-responses.mjs (outside this folder)
Derived key cached per tab; "Remember on this device" keeps it; lock button forgets it
Respondents switch: All (139) / Members only (94) on Philosophy, Demographics, Free Responses
Members scope drops the membership filter; filter bar counts follow the scope
Free Responses shows written-response count per question
robots.txt disallow-all; meta noindex/nofollow; "Members" badge + footer note

Files touched
js/members-gate.js (new)
js/app.js, js/free-responses.js, css/components.css (edited)
all 6 html pages, robots.txt, CHANGES.md


Demographic filtering (new)
Filter bar above charts (Philosophy + Demographics pages)
1 dropdown per demographic, checkbox multi-select w/ counts
OR within a demographic, AND across
Live "Showing N of M" + per-dropdown count badge + Reset
Composes w/ PhilPapers compare (TPC side reflects filter)
Empty result shows warning message

Dropdown z-index fix
Open menus were hidden behind cards below
Cause: card hover transform trap + z-index auto
Fix: filter-bar z-index 1030, kill hover transform, filter-menu z-index 1031

Anti-AI scraping
robots.txt - disallow ~25 AI/LLM crawlers, allow rest
robots meta tag (noai, noimageai) all pages
Footer opt-out notice all pages

Comments / cleanup
Slimmed added comments to 1-liners
Commented tricky original code (dual-mode input, label wrap, Other bucket, compare branch)
Removed no-op Object.assign(philpapersQuestionMap)

Files touched
js/app.js, css/components.css (edited)
robots.txt, CHANGES.md (new)
all 6 html pages (meta + footer)

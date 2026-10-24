async function loadFreeResponses() {
    try {
        // Responses come from the members gate (decrypted after the password prompt).
        const [data, questionResult] = await Promise.all([
            MembersGate.unlock(),
            fetch("./data/questions.json"),
            WriteIns.load()
        ]);

        const questionGroups = await questionResult.json();
        const freeQuestions = questionGroups[pageGroup] || [];
        let scope = MembersGate.getScope();

        // Questions with an "Other" box that someone actually typed into, in survey order.
        const typedQuestions = [...(questionGroups.demographics || []), ...(questionGroups.philosophy || [])]
            .filter(question => WriteIns.hasOtherBox(question) &&
                data.some(person => typedAnswer(person, question) !== null));
        const questions = [...freeQuestions, ...typedQuestions];

        document.getElementById("questionCount").textContent = questions.length;

        const select = document.getElementById("questionSelect");
        [["Free responses", freeQuestions], ["Typed-in \"Other\" answers", typedQuestions]].forEach(([label, list]) => {
            if (list.length === 0) return;
            const optgroup = document.createElement("optgroup");
            optgroup.label = label;
            list.forEach(question => {
                const option = document.createElement("option");
                option.value = questions.indexOf(question);
                option.textContent = question.split("\n")[0]; // first line only, in case of long multi-line questions
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        });

        function typedAnswer(person, question) {
            const answer = person[question];
            if (answer == null || String(answer).trim() === "") return null;
            return WriteIns.parse(String(answer), question).typed;
        }

        function renderQuestion(index) {
            const question = questions[index];
            const isFree = freeQuestions.includes(question);
            const dashboard = document.getElementById("dashboard");
            dashboard.innerHTML = "";

            const scoped = MembersGate.applyScope(data, scope);
            document.getElementById("respondentCount").textContent = scoped.length;

            const answers = isFree
                ? scoped
                    .map(person => person[question])
                    .filter(answer => answer !== null && answer !== undefined && String(answer).trim() !== "")
                : scoped.map(person => typedAnswer(person, question)).filter(answer => answer !== null);

            if (answers.length === 0) {
                dashboard.innerHTML = `<p class="text-muted">No responses yet.</p>`;
                return;
            }

            const tally = document.createElement("p");
            tally.className = "text-muted mb-3";
            const noun = isFree ? "written response" : "typed-in answer";
            tally.textContent = `${answers.length} ${noun}${answers.length === 1 ? "" : "s"}` +
                (scope === "members" ? " from members" : "") +
                (isFree ? "" : ` (shown as "${WriteIns.LABEL}" on the charts)`);
            dashboard.appendChild(tally);

            const list = document.createElement("div");
            list.className = "list-group";

            answers.forEach(answer => {
                const item = document.createElement("div");
                item.className = "response-item mb-2";
                item.style.whiteSpace = "pre-wrap";
                item.textContent = answer;
                list.appendChild(item);
            });

            dashboard.appendChild(list);
        }

        MembersGate.buildScopeSwitch(select.closest(".mb-4") || select, data, scope, next => {
            scope = next;
            renderQuestion(select.value);
        });

        select.addEventListener("change", () => renderQuestion(select.value));

        if (questions.length > 0) {
            renderQuestion(0);
        }

    } catch (err) {
        document.getElementById("dashboard").innerHTML =
            `<div class="alert alert-danger">${err.message}</div>`;
    }
}

loadFreeResponses();

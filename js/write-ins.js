// Typed-in ("Other") answers. data/answer-options.json lists the options the form offered
// for each question that had an "Other" box; anything else in those questions was typed in.
// Charts count typed-in answers as one "Other (write-in)" bar; Free Responses lists them.

// Questions whose answers are comma-separated multi-selects (split, don't count whole).
const multiSelectQuestions = [
"Which fields of non-philosophical study or formal knowledge would you say that you have at least undergraduate level knowledge in?",
"In what ways do you engage in philosophy in your daily life?",
"Which fields of Philosophy do you consider to be your strengths?\n\nThis list is non-exhaustive. Enter your specific subfield into Others.",
"Which areas of philosophy have you actively engaged with/are you most interested in?"
];

const WriteIns = (() => {

const LABEL = "Other (write-in)";
let listed = {};

async function load() {
    const response = await fetch("./data/answer-options.json");
    if (!response.ok) throw new Error("Couldn't load answer-options.json");
    listed = await response.json();
}

function hasOtherBox(question) {
    return Object.prototype.hasOwnProperty.call(listed, question);
}

// Answer -> { picked: [listed options], typed: "typed-in text" | null }.
// Multi-selects are split on commas, but listed options that contain commas
// ("Social Media (Videos, YouTube, etc.)") stay whole, and the leftover pieces
// are joined back into the one typed-in answer they came from.
function parse(answer, question) {
    const options = listed[question] || [];
    const isMulti = multiSelectQuestions.includes(question);

    if (!isMulti) {
        if (hasOtherBox(question) && !options.includes(answer)) {
            return { picked: [], typed: answer.trim() };
        }
        return { picked: [answer], typed: null };
    }

    const pieces = answer.split(",").map(p => p.trim());
    const withCommas = options.filter(option => option.includes(","));
    const picked = [];
    const typed = [];

    for (let i = 0; i < pieces.length;) {
        const whole = withCommas.find(option => {
            const n = option.split(",").length;
            return pieces.slice(i, i + n).join(", ") === option;
        });
        if (whole) {
            picked.push(whole);
            i += whole.split(",").length;
            continue;
        }
        const piece = pieces[i++];
        if (piece === "") continue;
        if (!hasOtherBox(question) || options.includes(piece)) {
            picked.push(piece);
        } else {
            typed.push(piece);
        }
    }

    return { picked, typed: typed.length > 0 ? typed.join(", ") : null };
}

return { LABEL, load, hasOtherBox, parse };

})();

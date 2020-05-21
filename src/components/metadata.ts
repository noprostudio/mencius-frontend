import type { Entry } from "../api";

export function metadata(entry: Entry) {
    return [
        "div",
        { class: "flex flex-col justify-center p-8" },
        [
            "div",
            { class: " px-12 md:pl-12" },
            [
                "div",
                [
                    "h3",
                    {
                        class:
                            "sm:font-light text-2xl sm:text-3xl md:text-4xl text-gray-900 mt-2",
                    },
                    `${entry.name} ・ ${entry.consensus_translation}`,
                ],
                // [
                //     "div",
                //     { class: "mv-2 text-base text-gray-700" },
                //     `${entry.date}`,
                // ],
            ],
            [
                "div",
                [
                    "span",
                    {
                        class:
                            " py-2, bg-purple-200 text-sm sm:text-base text-gray-700 subpixel-antialiased px-1 rounded mr-2",
                    },
                    `# ${entry.category}`,
                ],
            ],
            entry.wikipedia.pageid ? wikipedia(entry) : [],
        ],
    ];
}

function wikipedia(entry: Entry) {
    return [
        "div",
        {
            class: " sm:text-xl text-gray-600 mt-3 leading-relaxed",
        },
        ["p", { class: "font-light text-base" }, entry.wikipedia.extract],
        [
            "div",
            {
                class:
                    "pt-2 mt-auto text-lg font-medium inline-flex items-center text-purple-600 hover:text-purple-800",
            },
            [
                "a",
                {
                    href: `https://${entry.language}.wikipedia.org/?curid=${entry.wikipedia.pageid}`,
                    target: "_blank",
                },
                "Surf the Wikipedia 🌊",
            ],
        ],
    ];
}
import type { Route } from "@thi.ng/router";
import type { AppContext } from "../api";
import { ABOUT, CONTACT, FAQ } from "../routes";
import { withSize, M_CHAR, GITHUB } from "./icons";
import { defaultRouteLink, routeLink } from "./route-link";
import { externalLink } from "./external-link";

/**
 * Main footer component.
 *
 * @param ctx injected context object
 */
export function footer(ctx: AppContext) {
    const ui = ctx.ui.footer;
    const linkConfig: [Route, string][] = [
        [ABOUT, "About"],
        [CONTACT, "Contact"],
        [FAQ, "FAQ"],
    ];
    return [
        "footer",
        {
            class: "flex flex-col sm:flex-row justify-between sm:items-center px-4 md:px-6 py-3",
        },
        [
            "div",
            { class: "flex items-center justify-start sm:px-4 sm:py-3 sm:p-0" },
            [
                defaultRouteLink,
                { class: "cursor-pointer" },
                ["div", { ...ui.icon }, withSize(M_CHAR, "16px", "16px")],
            ],
            [
                externalLink,
                { title: "See our work on GitHub" },
                "https://github.com/noprostudio",
                ["div", { ...ui.icon }, withSize(GITHUB, "16px", "16px")],
            ],
            ["div", ui.copyright, `© ${new Date().getFullYear()} Mencius`],
        ],
        [
            "div",
            { class: "flex flex-row" },
            linkConfig.map(x => [
                routeLink,
                x[0].id,
                null,
                ui.link,
                [
                    "div",
                    {
                        class: "flex flex-row items-center space-x-2 cursor-pointer",
                    },
                    ["div", x[1]],
                ],
            ]),
        ],
    ];
}

import type { AppContext, Entry, NotificationMessenger } from "../api";
import { eventBtn } from "./event-btn";
import {
    ROUTE_TO_EDIT_ENTRY,
    CREATE_NOTIFICATION,
    DELETE_NOTIFICATION,
} from "../events";
import {
    withSize,
    EDIT,
    VISIBILITY_ON,
    VISIBILITY_OFF,
} from "@thi.ng/hiccup-carbon-icons";

export function entryHeader(ctx: AppContext, entry: Entry) {
    const id = decodeURI(ctx.views.route.deref()!.params.id);
    const user = ctx.views.user.deref()!;
    const notification = ctx.views.notifications.deref()![id];
    return [
        "div",
        { class: "ml-4 md:ml-6 px-12" },
        [
            "div",
            {
                class: "flex flex-col md:flex-row md:justify-between space-y-2",
            },
            [
                "div",
                {
                    class:
                        "item-center content-center md:self-center align-center space-x-1 font-semibold text-lg",
                },
                ["span", "entry"],
                ["span", "/"],
                ["span", entry.id],
            ],
            [
                "div",
                { class: "flex flex-row space-x-2" },
                notification && notification[0] && notification[0].entry_id
                    ? [
                          "div",
                          { class: "flex flex-row" },
                          [
                              eventBtn,
                              [
                                  DELETE_NOTIFICATION,
                                  <NotificationMessenger>{
                                      id,
                                      data: notification[0],
                                  },
                              ],
                              {
                                  class:
                                      "p-2 mb-2 hover:text-gray-700 border border-purple-300 hover:border-purple-900 font-semibold rounded focus:outline-none",
                              },
                              [
                                  "div",
                                  { class: "flex flex-row" },
                                  [
                                      "div",
                                      {
                                          class:
                                              "inline-block w-full fill-current pr-2 self-center",
                                      },
                                      withSize(VISIBILITY_OFF, "20"),
                                  ],
                                  ["div", "unwatch"],
                              ],
                          ],
                      ]
                    : [
                          "div",
                          { class: "flex flex-row" },
                          [
                              eventBtn,
                              [
                                  CREATE_NOTIFICATION,
                                  <NotificationMessenger>{
                                      id,
                                      data: { github_handler: user.login },
                                  },
                              ],
                              {
                                  class:
                                      "p-2 mb-2 hover:text-gray-700 border border-purple-300 hover:border-purple-900 font-semibold rounded focus:outline-none",
                              },
                              [
                                  "div",
                                  { class: "flex flex-row" },
                                  [
                                      "div",
                                      {
                                          class:
                                              "inline-block w-full fill-current pr-2 self-center",
                                      },
                                      withSize(VISIBILITY_ON, "20"),
                                  ],
                                  ["div", "watch"],
                              ],
                          ],
                      ],
                [
                    eventBtn,
                    [ROUTE_TO_EDIT_ENTRY, id],
                    {
                        class:
                            "p-2 mb-2 hover:text-gray-700 border border-purple-300 hover:border-purple-900 font-semibold rounded focus:outline-none ",
                    },
                    [
                        "div",
                        { class: "flex flex-row" },
                        [
                            "div",
                            {
                                class: "inline-block w-full fill-current pr-2",
                            },
                            withSize(EDIT, "20"),
                        ],
                        ["div", "edit"],
                    ],
                ],
            ],
        ],
    ];
}
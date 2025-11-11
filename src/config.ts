import {
    EV_SET_VALUE,
    EV_UPDATE_VALUE,
    FX_DELAY,
    FX_DISPATCH_ASYNC,
    FX_DISPATCH_NOW,
    valueUpdater,
} from "@thi.ng/interceptors";
import type { AppConfig, Opinion, Vote, Notification } from "./api";
import { StatusType, ReportType } from "./api";
import { about } from "./components/about";
import { contact } from "./components/contact";
import { search } from "./components/search";
import { entryDetail } from "./components/entry-detail";
import { newEntry } from "./components/new-entry";
import { editEntry } from "./components/edit-entry";
import { signIn } from "./components/sign-in";
import { githubOauth } from "./components/github-oauth";
import { faq } from "./components/faq";
import * as fx from "./effects";
import * as ev from "./events";
import * as routes from "./routes";

const { VITE_PUBLIC_API_HOST } = import.meta.env;
const API_HOST = VITE_PUBLIC_API_HOST;
export const DEFAULT_ROUTE = routes.ABOUT;

// main App configuration
export const CONFIG: AppConfig = {
    // router configuration
    // docs here:
    // https://github.com/thi-ng/umbrella/blob/master/packages/router/src/api.ts#L100
    router: {
        // use URI hash for routes (KISS)
        useFragment: true,
        // route ID if no other matches (MUST be non-parametric!)
        defaultRouteID: DEFAULT_ROUTE.id,
        // IMPORTANT: rules with common prefixes MUST be specified in
        // order of highest precision / longest path
        routes: [
            routes.ABOUT,
            routes.CONTACT,
            routes.SEARCH,
            routes.ENTRY_DETAIL,
            routes.NEW_ENTRY,
            routes.EDIT_ENTRY,
            routes.SIGN_IN,
            routes.GITHUB_OAUTH_CB,
            routes.FAQ,
        ],
    },

    // event handlers events are queued and batch processed in app's RAF
    // render loop event handlers can be single functions, interceptor
    // objects with `pre`/`post` keys or arrays of either.

    // the event handlers' only task is to transform the event into a
    // number of side effects. event handlers should be pure functions
    // and only side effect functions execute any "real" work.

    // see EventBus docs here:
    // https://github.com/thi-ng/umbrella/blob/master/packages/atom/src/event-bus.ts#L14

    events: {
        // sets status to "done"
        [ev.DONE]: () => ({
            [FX_DISPATCH_NOW]: [ev.SET_STATUS, [StatusType.DONE, "done"]],
        }),

        // sets status to thrown error's message
        [ev.ERROR]: (_, [__, err]) => ({
            [FX_DISPATCH_NOW]:
                err.message === "Unauthorized" || err.message === "Bad Request"
                    ? [
                          [ev.SET_STATUS, [StatusType.ERROR, err.message]],
                          [ev.ROUTE_TO, [routes.SIGN_IN.id, {}]],
                      ]
                    : [ev.SET_STATUS, [StatusType.ERROR, err.message]],
        }),

        // stores status (a tuple of `[type, message, done?]`) in app state
        // if status type != DONE & `done` == true, also triggers delayed EV_DONE
        // Note: we inject the `trace` interceptor to log the event to the console
        [ev.SET_STATUS]: (_, [__, status]) => ({
            [FX_DISPATCH_NOW]: [EV_SET_VALUE, ["status", status]],
            [FX_DISPATCH_ASYNC]:
                status[0] !== StatusType.DONE && status[2]
                    ? [FX_DELAY, [1000], ev.DONE, ev.ERROR]
                    : undefined,
        }),

        // toggles isNavOpen state flag on/off to control the nav dropdown for small screen
        [ev.TOGGLE_NAV]: valueUpdater<boolean>("isNavOpen", x => !x),

        // toggles accountOpen state flag on/off to control the account dropdown
        [ev.TOGGLE_ACCOUNT]: valueUpdater<boolean>("accountOpen", x => !x),

        // sets accountOpen to false
        [ev.CLOSE_ACCOUNT]: valueUpdater<boolean>("accountOpen", _ => false),

        // toggles notificationOpen state flag on/off to control the notification dropdown
        // prettier-ignore
        [ev.TOGGLE_NOTIFICATION]: valueUpdater<boolean>("notificationOpen", (x) => !x),

        // sets notificationOpen to false
        // prettier-ignore
        [ev.CLOSE_NOTIFICATION]: valueUpdater<boolean>("notificationOpen", _ => false),

        // toggles deleteOpinionOpen state flag on/off to display delete opinion modal
        // prettier-ignore
        [ev.TOGGLE_DELETE_OPINION]: valueUpdater<boolean>("deleteOpinionOpen", (x) => !x),

        // sets deleteOpinionOpen to false
        // prettier-ignore
        [ev.CLOSE_DELETE_OPINION]: valueUpdater<boolean>("deleteOpinionOpen", _ => false),

        // toggles reportOpen state flag on/off to display report modal
        [ev.TOGGLE_REPORT]: valueUpdater<boolean>("reportOpen", x => !x),

        // sets reportOpen to false
        [ev.CLOSE_REPORT]: valueUpdater<boolean>("reportOpen", _ => false),

        // toggles voteLock state flag on/off to prevent double voting
        [ev.TOGGLE_VOTE_LOCK]: valueUpdater<boolean>("voteLock", x => !x),

        // sets report in app state
        [ev.SET_REPORT]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                EV_SET_VALUE,
                [["report", json.key], json.value],
            ],
        }),

        // triggered after click report btn on opinion
        // sets report with opinion metadata
        [ev.SET_OPINION_REPORT]: (_, [__, opinion, url]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.TOGGLE_REPORT],
                [ev.SET_REPORT, { key: "type", value: ReportType.OPINION }],
                [ev.SET_REPORT, { key: "context", value: opinion }],
                [ev.SET_REPORT, { key: "url", value: url }],
            ],
        }),

        // triggers creating report on backend, sets status
        [ev.CREATE_REPORT]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "reporting..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.CREATE_REPORT,
                json,
                ev.CREATE_REPORT_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful creating report
        [ev.CREATE_REPORT_SUCCESS]: () => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "reported successfully", true],
                ],
                [ev.CLOSE_REPORT],
            ],
        }),

        // toggles debug state flag on/off
        [ev.TOGGLE_DEBUG]: valueUpdater<boolean>("debug", x => !x),

        // sets input value in app state
        [ev.SET_INPUT]: (_, [__, input]) => ({
            [FX_DISPATCH_NOW]: [EV_SET_VALUE, ["input", input.toLowerCase()]],
        }),

        // triggers getting entry data on backend, sets status
        [ev.GET_ENTRY]: (_, [__, id]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "getting entry data..."]],
            ],
            [FX_DISPATCH_ASYNC]: [fx.GET_ENTRY, id, ev.RECEIVE_ENTRY, ev.ERROR],
        }),

        // triggered after successful getting entry data
        [ev.RECEIVE_ENTRY]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, [["entries", decodeURI(json.id)], json.data]],
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "entry data successfully loaded",
                        true,
                    ],
                ],
            ],
        }),

        // routes to entries by id
        [ev.ROUTE_TO_ENTRY]: (_, [__, id]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.ROUTE_TO, [routes.ENTRY_DETAIL.id, { id }]],
            ],
        }),

        // routes to new entry creating page
        [ev.ROUTE_TO_NEW_ENTRY]: (_, [__, id]) => ({
            [FX_DISPATCH_NOW]: [[ev.ROUTE_TO, [routes.NEW_ENTRY.id, { id }]]],
        }),

        // routes to exist entry editing page
        [ev.ROUTE_TO_EDIT_ENTRY]: (_, [__, id]) => ({
            [FX_DISPATCH_NOW]: [[ev.ROUTE_TO, [routes.EDIT_ENTRY.id, { id }]]],
        }),

        // routes to entries searching page
        [ev.ROUTE_TO_SEARCH_ENTRY]: (_, [__, id, page]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.ROUTE_TO, [routes.SEARCH.id, { id, page }]],
            ],
        }),

        // triggers getting user data on backend, sets status
        [ev.GET_USER]: () => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "getting user data..."]],
            ],
            [FX_DISPATCH_ASYNC]: [fx.GET_USER, null, ev.RECEIVE_USER, ev.ERROR],
        }),

        // triggered after successful getting user data
        [ev.RECEIVE_USER]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, ["user", json.data]],
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "user data successfully loaded", true],
                ],
                [ev.GET_NEW_NOTIFICATIONS],
            ],
        }),

        // triggers getting JWT token on backend, sets status
        [ev.GET_TOKEN]: (_, [__, code]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "getting token..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.GET_TOKEN,
                code,
                ev.RECEIVE_TOKEN,
                ev.ERROR,
            ],
        }),

        // triggered after successful getting JWT token
        [ev.RECEIVE_TOKEN]: (_, [__, _json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "token successfully loaded", true],
                ],
                // TODO: redirect to sign-in landing page
                [ev.ROUTE_TO, [DEFAULT_ROUTE.id, {}]],
                [ev.GET_USER],
            ],
        }),

        // triggers sign_out event on backend to remove JWT token cookie, sets status
        [ev.SIGN_OUT]: () => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "signing out..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.SIGN_OUT,
                null,
                ev.SIGN_OUT_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful removing JWT token, redirect to home page
        [ev.SIGN_OUT_SUCCESS]: () => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "signed out successfully", true],
                ],
                // redirect to home page
                [ev.ROUTE_TO, [DEFAULT_ROUTE.id, {}]],
                [EV_SET_VALUE, ["user", {}]],
            ],
        }),

        // sets whole opinions template in app state
        [ev.SET_OPINION_TEMPLATE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                EV_SET_VALUE,
                [["opinions", json.id], json.data],
            ],
        }),

        // sets part of opinions in app state
        [ev.SET_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                EV_SET_VALUE,
                [["opinions", json.id, json.key], json.value],
            ],
        }),

        // triggers creating opinion on backend
        // append new opinion in app state
        // sets status
        [ev.CREATE_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "submitting opinion..."]],
                [ev.APPEND_OPINION, json],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.CREATE_OPINION,
                json,
                ev.CREATE_OPINION_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful creating opinion
        // triggers creating notification on backend
        [ev.CREATE_OPINION_SUCCESS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "opinion submitted successfully",
                        true,
                    ],
                ],
                [ev.CREATE_NOTIFICATION, json],
            ],
        }),

        // appends new opinion or updates exist opinion
        [ev.APPEND_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_UPDATE_VALUE,
                    [
                        ["entries", json.id, "opinions"],
                        (x: Opinion[]) => [...x, json.data],
                    ],
                ],
            ],
        }),

        // remove opinion in entries
        [ev.REMOVE_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_UPDATE_VALUE,
                    [
                        ["entries", json.id, "opinions"],
                        (x: Opinion[]) =>
                            x.filter(
                                (y: Opinion) =>
                                    y.github_handle !== json.data.github_handle
                            ),
                    ],
                ],
            ],
        }),

        // triggers deleting opinion on backend
        // remove the opinion
        // sets status
        [ev.DELETE_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "deleting opinion..."]],
                [ev.REMOVE_OPINION, json],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.DELETE_OPINION,
                json,
                ev.DELETE_OPINION_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful deleting opinion
        // close delete opinion modal
        [ev.DELETE_OPINION_SUCCESS]: () => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "opinion deleted successfully", true],
                ],
                [ev.CLOSE_DELETE_OPINION],
            ],
        }),

        // sets tempOpinion in app state
        [ev.SET_TEMP_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [[EV_SET_VALUE, ["tempOpinion", json.data]]],
        }),

        // sets tempOpinion, sets opinions, remove the opinion
        [ev.EDIT_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_TEMP_OPINION, json],
                [ev.SET_OPINION_TEMPLATE, json],
                [ev.REMOVE_OPINION, json],
            ],
        }),

        // append the opinion back, resets opinions, resets tempOpinion
        [ev.CANCEL_EDIT_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.APPEND_OPINION, json],
                [ev.SET_OPINION_TEMPLATE, { ...json, data: {} }],
                [ev.SET_TEMP_OPINION, { data: {} }],
            ],
        }),

        // triggers updating opinion on backend
        // updates the opinion
        // sets status
        [ev.UPDATE_OPINION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "updating opinion..."]],
                [ev.APPEND_OPINION, json],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.UPDATE_OPINION,
                json,
                ev.UPDATE_OPINION_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful updating opinion
        [ev.UPDATE_OPINION_SUCCESS]: () => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "opinion updated successfully", true],
                ],
            ],
        }),

        // sets part of newEntry in app state
        [ev.SET_NEW_ENTRY]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                EV_SET_VALUE,
                [["newEntry", json.key], json.value],
            ],
        }),

        // sets whole newEntry in app state
        [ev.SET_NEW_ENTRY_TEMPLATE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [EV_SET_VALUE, ["newEntry", json.data]],
        }),

        // triggers getting wiki on backend, sets status
        // TODO: find way to unify get-wiki
        [ev.GET_WIKI_NEW]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "getting wikipedia data..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.GET_WIKI,
                json,
                ev.RECEIVE_WIKI_NEW,
                ev.ERROR,
            ],
        }),

        // triggered after successful getting wiki
        // sets newEntry.wikipedia
        [ev.RECEIVE_WIKI_NEW]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, ["newEntry.wikipedia", json.data]],
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "wikipedia data successfully loaded",
                        true,
                    ],
                ],
            ],
        }),

        // triggers getting wiki on backend, sets status
        [ev.GET_WIKI_TEMP]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "getting wikipedia data..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.GET_WIKI,
                json,
                ev.RECEIVE_WIKI_TEMP,
                ev.ERROR,
            ],
        }),

        // triggered after successful getting wiki
        // sets tempEntry.wikipedia
        [ev.RECEIVE_WIKI_TEMP]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, ["tempEntry.wikipedia", json.data]],
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "wikipedia data successfully loaded",
                        true,
                    ],
                ],
            ],
        }),

        // triggers creating entry on backend, sets status
        [ev.CREATE_ENTRY]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "submitting entry..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.CREATE_ENTRY,
                json,
                ev.CREATE_ENTRY_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful creating entry
        // routes to the entry page
        [ev.CREATE_ENTRY_SUCCESS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.ROUTE_TO_ENTRY, json.id],
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "entry submitted successfully", true],
                ],
            ],
        }),

        // triggers updating entry on backend, sets status
        [ev.UPDATE_ENTRY]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "updating entry..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.UPDATE_ENTRY,
                json,
                ev.UPDATE_ENTRY_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful creating entry
        // resets the entry value in app state to remove local cache
        // routes to the entry page
        [ev.UPDATE_ENTRY_SUCCESS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, [["entries", json.id], ""]],
                [ev.ROUTE_TO_ENTRY, json.id],
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "entry updated successfully", true],
                ],
            ],
        }),

        // sets part of tempEntry in app state
        [ev.SET_TEMP_ENTRY]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                EV_SET_VALUE,
                [["tempEntry", json.key], json.value],
            ],
        }),

        // sets whole tempEntry in app state
        [ev.SET_TEMP_ENTRY_TEMPLATE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [EV_SET_VALUE, ["tempEntry", json.data]],
        }),

        // triggers searching entry on backend, sets status
        [ev.SEARCH_ENTRY]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "searching entries..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.SEARCH_ENTRY,
                json,
                ev.SEARCH_ENTRY_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful searching entry
        [ev.SEARCH_ENTRY_SUCCESS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, ["search", json.data]],
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "searched successfully", true],
                ],
            ],
        }),

        // routes to search entry page
        // search entry
        [ev.ROUTE_TO_SEARCH_ENTRY_PAGE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SEARCH_ENTRY, json],
                [ev.ROUTE_TO_SEARCH_ENTRY, json.id, json.page],
            ],
        }),

        // triggers getting votes on backend
        // triggered by GET_ENTRY_W_ACTIVITY
        [ev.GET_VOTE]: (_, [__, id]) => ({
            [FX_DISPATCH_ASYNC]: [fx.GET_VOTE, id, ev.RECEIVE_VOTE, ev.ERROR],
        }),

        // triggered after successful getting votes
        // sets votes
        [ev.RECEIVE_VOTE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_SET_VALUE,
                    [["votes", decodeURI(json.id)], json.data ? json.data : []],
                ],
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "vote data successfully loaded", true],
                ],
            ],
        }),

        // triggers creating votes on backend, sets status
        // toggles vote lock
        [ev.CREATE_VOTE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "voting..."]],
                [ev.TOGGLE_VOTE_LOCK],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.CREATE_VOTE,
                json,
                ev.CREATE_VOTE_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful creating votes
        // appends new vote
        // toggles vote lock
        [ev.CREATE_VOTE_SUCCESS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "voted successfully", true],
                ],
                [ev.APPEND_VOTE, json],
                [ev.TOGGLE_VOTE_LOCK],
            ],
        }),

        // triggers deleting votes on backend, sets status
        // removes vote
        // toggles vote lock
        [ev.DELETE_VOTE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "deleting vote..."]],
                [ev.REMOVE_VOTE, json],
                [ev.TOGGLE_VOTE_LOCK],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.DELETE_VOTE,
                json,
                ev.DELETE_VOTE_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful deleting votes
        // toggles vote lock
        [ev.DELETE_VOTE_SUCCESS]: () => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "vote deleted successfully", true],
                ],
                [ev.TOGGLE_VOTE_LOCK],
            ],
        }),

        // appends new votes
        [ev.APPEND_VOTE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_UPDATE_VALUE,
                    [["votes", json.id], (x: Vote[]) => [...x, ...json.data]],
                ],
            ],
        }),

        // removes votes
        [ev.REMOVE_VOTE]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_UPDATE_VALUE,
                    [
                        ["votes", json.id],
                        (x: Vote[]) => x.filter((y: Vote) => y !== json.data),
                    ],
                ],
            ],
        }),

        // event wrapper for getting entry with all activity data
        [ev.GET_ENTRY_W_ACTIVITY]: (_, [__, id]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.GET_NOTIFICATION, id],
                [ev.GET_VOTE, id],
                [ev.GET_ENTRY, id],
            ],
        }),

        // triggers getting all notifications for a specific entry on backend
        // triggered by GET_ENTRY_W_ACTIVITY
        [ev.GET_NOTIFICATION]: (_, [__, id]) => ({
            [FX_DISPATCH_ASYNC]: [
                // fx.GET_NOTIFICATION,
                fx.GET_ALL_NOTIFICATIONS,
                id,
                ev.RECEIVE_NOTIFICATION,
                ev.ERROR,
            ],
        }),

        // triggered after successful getting votes
        // sets notifications
        [ev.RECEIVE_NOTIFICATION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_SET_VALUE,
                    [
                        ["notifications", decodeURI(json.id)],
                        json.data[0].entry_id ? json.data : [],
                    ],
                ],
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "notification successfully loaded",
                        true,
                    ],
                ],
            ],
        }),

        // triggers creating notification on backend, set status
        [ev.CREATE_NOTIFICATION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "watching the entry..."]],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.CREATE_NOTIFICATION,
                json,
                ev.CREATE_NOTIFICATION_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful creating notification
        [ev.CREATE_NOTIFICATION_SUCCESS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.SUCCESS, "watched successfully", true],
                ],
                [ev.APPEND_NOTIFICATION, json],
            ],
        }),

        // triggers updating notification on backend, set status
        [ev.UPDATE_NOTIFICATION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [StatusType.INFO, "updating the notification..."],
                ],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.UPDATE_NOTIFICATION,
                json,
                ev.UPDATE_NOTIFICATION_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful updating notification
        [ev.UPDATE_NOTIFICATION_SUCCESS]: (_, [__, _json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "notification updated successfully",
                        true,
                    ],
                ],
                // [ev.APPEND_NOTIFICATION, json],
            ],
        }),

        // triggers deleting notification on backend, set status
        // removes notification in app state
        [ev.DELETE_NOTIFICATION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.SET_STATUS, [StatusType.INFO, "deleting notification..."]],
                [ev.REMOVE_NOTIFICATION, json],
            ],
            [FX_DISPATCH_ASYNC]: [
                fx.DELETE_NOTIFICATION,
                json,
                ev.DELETE_NOTIFICATION_SUCCESS,
                ev.ERROR,
            ],
        }),

        // triggered after successful deleting notification
        [ev.DELETE_NOTIFICATION_SUCCESS]: () => ({
            [FX_DISPATCH_NOW]: [
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "notification deleted successfully",
                        true,
                    ],
                ],
            ],
        }),

        // appends notifications in app state
        [ev.APPEND_NOTIFICATION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_UPDATE_VALUE,
                    [
                        ["notifications", json.id],
                        (x: Vote[]) => [...x, ...json.data],
                    ],
                ],
            ],
        }),

        // remove notifications in app state
        [ev.REMOVE_NOTIFICATION]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [
                    EV_UPDATE_VALUE,
                    [
                        ["notifications", json.id],
                        (x: Vote[]) => x.filter((y: Vote) => y !== json.data),
                    ],
                ],
            ],
        }),

        // triggers getting new notifications on backend
        [ev.GET_NEW_NOTIFICATIONS]: () => ({
            [FX_DISPATCH_ASYNC]: [
                fx.GET_NEW_NOTIFICATIONS,
                null,
                ev.RECEIVE_NEW_NOTIFICATIONS,
                ev.ERROR,
            ],
        }),

        // triggered after successful getting new notifications
        [ev.RECEIVE_NEW_NOTIFICATIONS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [EV_SET_VALUE, ["newNotifications", json.data]],
                [
                    ev.SET_STATUS,
                    [
                        StatusType.SUCCESS,
                        "new notifications successfully loaded",
                        true,
                    ],
                ],
            ],
        }),

        // removes new notifications in app state
        [ev.MARK_NEW_NOTIFICATIONS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                EV_UPDATE_VALUE,
                [
                    ["newNotifications"],
                    (x: Notification[]) => [
                        ...x.filter(y => y.entry_id != json.id),
                        json.data,
                    ],
                ],
            ],
        }),

        // event wrapper for viewing new notifications
        [ev.VIEW_NEW_NOTIFICATIONS]: (_, [__, json]) => ({
            [FX_DISPATCH_NOW]: [
                [ev.UPDATE_NOTIFICATION, json],
                [ev.ROUTE_TO_ENTRY, json.id],
                [ev.GET_ENTRY_W_ACTIVITY, json.id],
                [ev.MARK_NEW_NOTIFICATIONS, json],
            ],
        }),
    },

    // side effects
    effects: {
        [fx.GET_USER]: () =>
            fetch(API_HOST + "/api/v1/user", {
                method: "GET",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_TOKEN]: (code: string) =>
            fetch(API_HOST + "/token?code=" + code, {
                method: "GET",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.SIGN_OUT]: () =>
            // sign-out endpoint on backend
            fetch(API_HOST + "/token", {
                method: "DELETE",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                // document.cookie ="session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                return resp.json();
            }),
        [fx.CREATE_OPINION]: json =>
            fetch(API_HOST + "/api/v1/entries/" + json.id, {
                method: "POST",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.DELETE_OPINION]: json =>
            fetch(API_HOST + `/api/v1/entries/${json.id}/${json.userName}`, {
                method: "DELETE",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.UPDATE_OPINION]: json =>
            fetch(API_HOST + `/api/v1/entries/${json.id}/${json.userName}`, {
                method: "PUT",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_WIKI]: json =>
            fetch(
                API_HOST +
                    `/api/v1/wiki?language=${json.language}&titles=${json.titles}`,
                {
                    method: "GET",
                    headers: [
                        ["Content-Type", "application/json"],
                        ["Content-Type", "text/plain"],
                    ],
                    credentials: "include",
                }
            ).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_ENTRY]: (id: string) =>
            fetch(API_HOST + "/api/v1/entries/" + id, {
                method: "GET",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.CREATE_ENTRY]: json =>
            fetch(API_HOST + "/api/v1/entries", {
                method: "POST",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.UPDATE_ENTRY]: json =>
            fetch(API_HOST + `/api/v1/entries/${json.id}`, {
                method: "PUT",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.SEARCH_ENTRY]: json =>
            fetch(
                API_HOST +
                    `/api/v1/search/entry?id=${json.id}&page=${json.page}`,
                {
                    method: "GET",
                    headers: [
                        ["Content-Type", "application/json"],
                        ["Content-Type", "text/plain"],
                    ],
                    credentials: "include",
                }
            ).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.CREATE_REPORT]: json =>
            fetch(API_HOST + "/api/v1/report", {
                method: "POST",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_VOTE]: (id: string) =>
            fetch(
                API_HOST + `/api/v1/entries/${id}/placeholder/vote/placeholder`,
                {
                    method: "GET",
                    headers: [
                        ["Content-Type", "application/json"],
                        ["Content-Type", "text/plain"],
                    ],
                    credentials: "include",
                }
            ).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.CREATE_VOTE]: json =>
            fetch(
                API_HOST +
                    `/api/v1/entries/${json.id}/${json.data.opinion_github_handle}/vote`,
                {
                    method: "POST",
                    headers: [
                        ["Content-Type", "application/json"],
                        ["Content-Type", "text/plain"],
                    ],
                    credentials: "include",
                    body: JSON.stringify(json.data),
                }
            ).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.DELETE_VOTE]: json =>
            fetch(
                API_HOST +
                    `/api/v1/entries/${json.id}/${json.data.opinion_github_handle}/vote/${json.voteID}`,
                {
                    method: "DELETE",
                    headers: [
                        ["Content-Type", "application/json"],
                        ["Content-Type", "text/plain"],
                    ],
                    credentials: "include",
                    body: JSON.stringify(json.data),
                }
            ).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_NOTIFICATION]: (id: string) =>
            fetch(API_HOST + `/api/v1/notification/${id}`, {
                method: "GET",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.CREATE_NOTIFICATION]: json =>
            fetch(API_HOST + `/api/v1/notification/${json.id}`, {
                method: "POST",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.UPDATE_NOTIFICATION]: json =>
            fetch(API_HOST + `/api/v1/notification/${json.id}`, {
                method: "PUT",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.DELETE_NOTIFICATION]: json =>
            fetch(API_HOST + `/api/v1/notification/${json.id}`, {
                method: "DELETE",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
                body: JSON.stringify(json.data),
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_NEW_NOTIFICATIONS]: () =>
            fetch(API_HOST + `/api/v1/notifications/new`, {
                method: "GET",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
        [fx.GET_ALL_NOTIFICATIONS]: (id: string) =>
            fetch(API_HOST + `/api/v1/notifications/all/${id}`, {
                method: "GET",
                headers: [
                    ["Content-Type", "application/json"],
                    ["Content-Type", "text/plain"],
                ],
                credentials: "include",
            }).then(resp => {
                if (!resp.ok) {
                    throw new Error(resp.statusText);
                }
                return resp.json();
            }),
    },

    // mapping route IDs to their respective UI component functions
    // those functions are called automatically by the app's root component
    // base on the currently active route
    components: {
        [routes.ABOUT.id]: about,
        [routes.CONTACT.id]: contact,
        [routes.SEARCH.id]: search,
        [routes.ENTRY_DETAIL.id]: entryDetail,
        [routes.NEW_ENTRY.id]: newEntry,
        [routes.EDIT_ENTRY.id]: editEntry,
        [routes.SIGN_IN.id]: signIn,
        [routes.GITHUB_OAUTH_CB.id]: githubOauth,
        [routes.FAQ.id]: faq,
    },

    // DOM root element (or ID)
    domRoot: "app",

    // initial app state
    initialState: {
        status: [StatusType.INFO, "running"],
        user: {},
        newNotifications: [],
        route: {},
        debug: false,
        isNavOpen: false,
        accountOpen: false,
        notificationOpen: false,
        deleteOpinionOpen: false,
        reportOpen: false,
        report: {},
        input: "",
        entries: {},
        votes: {},
        voteLock: false,
        notifications: {},
        opinions: {},
        tempOpinion: {},
        newEntry: {
            album: "",
            alias: "",
            author: "",
            category: "",
            consensus_translation: "",
            date: "",
            group: "",
            id: "",
            name: "",
            language: "en",
            romanization: "",
            wikipedia: null,
            opinions: [],
        },
        tempEntry: {},
        search: {},
    },

    // derived view declarations
    // each key specifies the name of the view and its value
    // the state path or `[path, transformer]`
    // docs here:
    // https://github.com/thi-ng/umbrella/tree/master/packages/atom#derived-views
    views: {
        json: ["", state => JSON.stringify(state, null, 2)],
        user: ["user", user => user || {}],
        newNotifications: "newNotifications",
        status: "status",
        debug: "debug",
        isNavOpen: "isNavOpen",
        accountOpen: "accountOpen",
        notificationOpen: "notificationOpen",
        deleteOpinionOpen: "deleteOpinionOpen",
        reportOpen: "reportOpen",
        report: "report",
        input: "input",
        entries: "entries",
        votes: "votes",
        voteLock: "voteLock",
        notifications: "notifications",
        opinions: "opinions",
        tempOpinion: "tempOpinion",
        newEntry: "newEntry",
        tempEntry: "tempEntry",
        search: "search",
    },

    // component CSS class config using tailwind-css
    // these attribs are being passed to all/most components
    ui: {
        status: {
            [StatusType.DONE]: {
                class: "text-center p-2 bg-yellow-200 text-yellow-700 fadeout",
            },
            [StatusType.INFO]: {
                class: "text-center p-2 bg-yellow-200 text-yellow-700",
            },
            [StatusType.SUCCESS]: {
                class: "text-center p-2 bg-green-200 text-green-700",
            },
            [StatusType.ERROR]: {
                class: "text-center p-2 bg-red-200 text-red-700",
            },
        },
        newsletterForm: {
            title: {
                class: "sm:font-light text-2xl sm:text-3xl md:text-4xl text-gray-900 mt-6",
            },
            form: { class: "w-full" },
            container: {
                class: "flex items-center border-b border-b-2 border-purple-500 py-2",
            },
            input: {
                class: "appearance-none bg-transparent border-none w-full text-gray-700 mr-3 py-1 px-2 leading-tight focus:outline-none md:text-xl",
            },
            button: {
                class: "flex-shrink-0 bg-purple-500 hover:bg-purple-700 border-purple-500 hover:border-purple-700 text-sm border-4 text-white py-1 px-2 rounded",
            },
        },
        characterCard: {
            container: {
                class: "flex flex-col px-4 md:px-12 py-10 w-full sm:w-1/2 border-gray-200",
            },
            icon: { class: "h-8 w-8 md:h-10 md:w-10 md:-my-1" },
            body: {
                class: "flex flex-col leading-relaxed ml-4 md:ml-6",
            },
            content: {
                keyword: { class: "font-medium text-gray-800 text-lg" },
                description: {
                    class: "text-gray-600 mt-1 text-sm md:text-base",
                },
            },
        },
        root: { class: "about_bg" },
        debug: {
            container: {
                class: "max-w-xs mt-1 flex max-h-screen overflow-y-auto overflow-x-auto",
            },
            debugToggle: {
                class: "font-bold rotate-270 flex mt-5 focus:outline-none h-10",
            },
            open: {
                class: "text-xs p-2 text-gray-800 rounded-lg",
            },
            close: {
                class: "hidden",
            },
        },
        logo: {
            container: {
                class: "sm:px-4 sm:pt-2 sm:pb-6 flex items-center",
            },
            m: { class: "h-10 text-purple-900" },
            mxs: { class: "h-10 ml-4 text-gray-900 hidden md:block" },
        },
        nav: {
            outer: {},
            search: {},
            inner: {
                open: {
                    class: "items-center justify-between pl-4 pb-2 block sm:block sm:flex",
                },
                close: {
                    class: "items-center justify-between pl-4 pb-2 hidden sm:block sm:flex",
                },
            },
            title: { class: "black f1 lh-title tc db mb2 mb2-ns" },
            link: {
                class: "mt-1 block px-2 py-1 font-bold rounded hover:bg-gray-100 text-lg sm:mt-0 sm:ml-2",
            },
        },
        contact: {
            link: {
                class: "flex flex-col sm:text-xl text-gray-600 mt-2 leading-relaxed font-bold hover:bg-gray-200 hover:text-gray-900",
            },
        },
        footer: {
            icon: {
                class: "mt-1 ml-2 font-normal text-gray-600 hover:text-gray-800 text-xs md:text-sm sm:mt-0",
            },
            copyright: {
                class: "mt-1 px-2 py-1 font-normal text-gray-600 text-xs md:text-sm sm:mt-0 sm:ml-2",
            },
            link: {
                class: "mt-1 block px-2 py-1 font-normal text-gray-600 hover:text-gray-800 text-xs md:text-sm sm:mt-0 sm:ml-2",
            },
        },
    },
};

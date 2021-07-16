import { context } from "fetch-h2";
import FacebookAccountState from "./Facebook/AccountState";

export default class HTTPContext {
    #userAgent: string;
    #state: FacebookAccountState;

    get state() {
        return this.#state;
    }

    set state(v: FacebookAccountState) {
        if (v instanceof FacebookAccountState) {
            this.#state = v;
            this.context.disconnectAll();
            this.context = context({
                userAgent: this.#userAgent,
                cookieJar: this.#state.getCookieJar(),
                accept: "*/*",
                overwriteUserAgent: true
            });
        }
    }

    get userAgent() {
        return this.#userAgent;
    }

    set userAgent(ua: string) {
        this.#userAgent = ua;
        this.context.disconnectAll();
        this.context = context({
            userAgent: this.#userAgent,
            cookieJar: this.#state.getCookieJar(),
            accept: "*/*",
            overwriteUserAgent: true
        });
    }

    context: ReturnType<typeof context>;

    constructor(userAgent: string, state: FacebookAccountState) {
        this.#state = state;
        this.#userAgent = userAgent;

        this.context = context({
            userAgent: this.#userAgent,
            cookieJar: this.#state.getCookieJar(),
            accept: "*/*",
            overwriteUserAgent: true
        });
    }
}

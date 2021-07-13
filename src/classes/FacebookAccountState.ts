import { gzipSync, gunzipSync } from "zlib";
import msgpack from "msgpack5";
import toughCookie from "tough-cookie";

let mpack = msgpack();

export default class FacebookAccountState {
    #jar = new toughCookie.CookieJar;

    /** Construct a new AccountState object. */
    constructor(state?: Buffer) {
        this.setState(state);
    }

    setState(state: Buffer) {
        if (state instanceof Buffer) {
            let m = gunzipSync(state);

            let o: {
                key: string,
                value: string,
                domain: "facebook.com",
                path: string,
                hostOnly: boolean,
                creation: string,
                lastAccessed: string
            }[] = mpack.decode(m);

            for (let oc of o) {
                this.#jar.setCookieSync(`${oc.key}=${oc.value}`, "https://m.facebook.com/");
            }
        }
    }

    /** Clear. */
    clear() {
        this.#jar.removeAllCookiesSync();
    }

    /** Import from cookie string returned from Facebook. */
    addCookieString(setCookieHeaders: string[]) {
        for (let h of setCookieHeaders) {
            let kv = h.split("; ")[0];
            this.#jar.setCookieSync(kv, "https://m.facebook.com/");
        }
    }

    /** Export as cookie string (that will added in every request to Facebook). */
    getCookieString() {
        return this.#jar.getCookieStringSync("https://m.facebook.com/");
    }

    /** Export as buffer to store. */
    getState() {
        let o = this.#jar.getCookiesSync("https://m.facebook.com/").map(v => ({
            key: v.key,
            value: v.value,
            path: v.path,
            domain: "facebook.com",
            hostOnly: v.hostOnly,
            creation: v.creation.toISOString(),
            lastAccessed: v.lastAccessed.toISOString()
        }));

        let b = mpack.encode(o);

        return gzipSync(b);
    }
}
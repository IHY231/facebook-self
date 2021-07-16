import { gzipSync, gunzipSync } from "zlib";
import msgpack from "msgpack5";
import { CookieJar } from "fetch-h2";

let mpack = msgpack();

export default class FacebookAccountState {
    #jar = new CookieJar();

    /** Construct a new AccountState object. */
    constructor(state?: Buffer) {
        if (state instanceof Buffer) {
            this.setState(state);
        }
    }

    async setState(state: Buffer) {
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
                await this.#jar.setCookie(`${oc.key}=${oc.value}`, "https://m.facebook.com/");
            }
        }
    }

    /** Clear. */
    clear() {
        this.#jar.reset();
    }

    /** Export as cookie string. */
    async getCookieString() {
        return (await this.#jar.getCookies("https://m.facebook.com/")).map(v => `${v.key}=${v.value}`).join("; ");
    }

    /** Return CookieJar that could be used to insert to fetch-h2. */
    getCookieJar() {
        return this.#jar;
    }

    /** Export as buffer to store. */
    async getState() {
        let o = (await this.#jar.getCookies("https://m.facebook.com/")).map(v => ({
            key: v.key,
            value: v.value,
            path: v.path,
            domain: "facebook.com",
            hostOnly: v.hostOnly,
            creation: v.creation?.toISOString(),
            lastAccessed: v.lastAccessed?.toISOString()
        }));

        let b = mpack.encode(o);

        return gzipSync(Buffer.from(b.toString("hex"), "hex"));
    }
}
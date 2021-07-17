import FacebookAccount from "../Facebook/Account";
import FacebookAccountState from "../Facebook/AccountState";
import MessengerMessage from "./Message";
import MessengerMessageParser from "./MessageParser";
import MessengerMQTTConnection from "./MQTTConnection";
import MessengerThread from "./Thread";
import MessengerUser from "./User";

export default class MessengerClient {
    #account: FacebookAccount | null = null;
    #mqtt: MessengerMQTTConnection | null = null;
    #parser: MessengerMessageParser | null = null;
    #cache = {
        message: new Map<string, MessengerMessage>(),
        thread: new Map<string, MessengerThread>(),
        user: new Map<string, MessengerUser>()
    }

    get users() {
        let that = this;
        return {
            get(userID: string) {
                let cache = this.cache.get(userID);
                if (cache) {
                    return cache;
                } else {
                    cache = new MessengerUser(that);
                    cache.id = userID;
                    cache.thread = that.threads.get(userID);
                    this.cache.set(userID, cache);
                    return cache;
                }
            },
            get cache() {
                return that.cache.user;
            }
        }
    }
    get threads() {
        let that = this;
        return {
            get(threadID: string) {
                let cache = this.cache.get(threadID);
                if (cache) {
                    return cache;
                } else {
                    cache = new MessengerThread(that);
                    cache.id = threadID;
                    this.cache.set(threadID, cache);
                    return cache;
                }
            },
            get cache() {
                return that.cache.thread;
            }
        }
    }
    get messages() {
        let that = this;
        return {
            get(messageID: string) {
                let cache = this.cache.get(messageID);
                if (cache) {
                    return cache;
                } else {
                    return null
                }
            },
            get cache() {
                return that.cache.message;
            }
        }
    }

    get cache() {
        return this.#cache;
    }

    get loggedIn() {
        if (this.#account) {
            return this.#account.loggedIn;
        } else return false;
    }

    get account() {
        return this.#account;
    }
    set account(v: FacebookAccount | null) {
        this.#account = v;
        if (this.#mqtt) {
            this.#mqtt.disconnect();
            this.#mqtt = null;
        }
    }

    get mqtt() {
        return this.#mqtt;
    }

    get parser() {
        return this.#parser;
    }

    /** Construct a new Facebook Messenger client. */
    constructor(account?: FacebookAccount) {
        if (account instanceof FacebookAccount) {
            this.#account = account;
            if (this.loggedIn) {
                this.#mqtt = new MessengerMQTTConnection(this.#account);
                this.#parser = new MessengerMessageParser(this, this.#mqtt);
                this.#mqtt.connect();
            }
        }
    }

    /** Login. */
    async login(): Promise<void>;
    /** Login with state. */
    async login(state: Buffer | FacebookAccountState): Promise<void>;
    /** Login with email and password. */
    async login(email: string, password: string): Promise<void>;
    /** Login with username, password and state (to bypass 2FA check or use existing state to login). */
    async login(email: string, password: string, state: Buffer | FacebookAccountState): Promise<void>;
    /** Login with username, password and 2FA (base32 secret or token generator function). */
    async login(email: string, password: string, twoFactorAuth: (() => Promise<string>) | string): Promise<void>;
    /** Login with username, password, 2FA (base32 secret or token generator function) and state (will use if it's still valid). */
    async login(email: string, password: string, state: Buffer | FacebookAccountState, twoFactorAuth: (() => Promise<string>) | string): Promise<void>;
    async login(...args: any[]) {
        let state, email, password, twoFactor;
        if (args[0] instanceof Buffer) {
            state = new FacebookAccountState(args[0]);
        } else if (args[0] instanceof FacebookAccountState) {
            state = args[0];
        } else {
            if (typeof args[0] === "string" && typeof args[1] === "string") {
                email = args[0];
                password = args[1];
                if (args[2] instanceof Buffer) {
                    state = new FacebookAccountState(args[2]);
                    if (typeof args[3] === "function" || typeof args[3] === "string") {
                        twoFactor = args[3];
                    }
                } else if (args[2] instanceof FacebookAccountState) {
                    state = args[2];
                    if (typeof args[3] === "function" || typeof args[3] === "string") {
                        twoFactor = args[3];
                    }
                } else if (typeof args[2] === "function" || typeof args[2] === "string") {
                    twoFactor = args[2];
                }
            }
        }

        if (!this.#account) {
            this.#account = new FacebookAccount(new FacebookAccountState());
        }

        if (email || password || state || twoFactor) {
            this.#account.email = email ?? null;
            this.#account.password = password ?? null;
            if (state) this.#account.setStateBuf(await state.getState());
            this.#account.twoFactorAuth = twoFactor ?? null;
        }

        if (!this.loggedIn) {
            await this.#account.login();

            this.#mqtt = new MessengerMQTTConnection(this.#account);
            this.#parser = new MessengerMessageParser(this, this.#mqtt);
            await this.#mqtt.connect();
        }
    }

    destroy() {
        this.#mqtt?.disconnect();
    }
}

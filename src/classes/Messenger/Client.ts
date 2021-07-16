import FacebookAccount from "../Facebook/Account";
import FacebookAccountState from "../Facebook/AccountState";
import MessengerMQTTConnection from "./MQTTConnection";

export default class MessengerClient {
    #account: FacebookAccount | null = null;
    #mqtt: MessengerMQTTConnection | null = null;

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

    /** Construct a new Facebook Messenger client. */
    constructor(account?: FacebookAccount) {
        if (account instanceof FacebookAccount) {
            this.#account = account;
            if (this.loggedIn) {
                this.#mqtt = new MessengerMQTTConnection(this.#account);
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
            await this.#mqtt.connect();
        }
    }

    
}

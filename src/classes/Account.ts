import FacebookALoginHandler from "../types/ALoginHandler";
import account_logout from "../functions/account_logout";
import FacebookAccountState from "./AccountState";
import FacebookBasicALoginHandler from "./BasicALoginHandler";
import HTTPContext from "./HTTPContext";

const defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0";

export default class FacebookAccount {
    #pEmail: string | null = null;
    #pPassword: string | null = null;
    #pState: FacebookAccountState = new FacebookAccountState();
    #pContext: HTTPContext;
    #p2FA: (() => Promise<string>) | null = null;
    #pLoggedIn = false;
    #pAccountID: string | null = null;

    public get accountID() {
        return this.#pAccountID;
    }

    public get userAgent() {
        return this.#pContext.userAgent;
    }
    public set userAgent(ua: string) {
        this.#pContext.userAgent = ua;
    }

    public get email(): string | null {
        return this.#pEmail;
    }
    public set email(value: string | null) {
        this.#pEmail = value;
    }

    public async getStateBuf() {
        return this.#pState.getState();
    }
    public async setStateBuf(value: Buffer) {
        this.#pState.setState(value);
    }
    public get stateObj() {
        return this.#pState;
    }

    public get loggedIn() {
        return this.#pLoggedIn;
    }

    public set password(value: string | null) {
        this.#pPassword = value;
    }

    public set twoFactorAuth(value: () => Promise<string>) {
        this.#p2FA = value;
    }

    /** Create login credentials object with state. */
    constructor(state: Buffer | FacebookAccountState);
    /** Create login credentials object with username and password, optionally state and/or two-factor authentication callback. */
    constructor(email: string, password: string, state?: Buffer | FacebookAccountState, twoFactorAuth?: () => Promise<string>);
    constructor(...args: any[]) {
        if (args[0] instanceof Buffer) {
            this.#pState = new FacebookAccountState(args[0]);
        } else if (args[0] instanceof FacebookAccountState) {
            this.#pState = args[0];
        } else {
            if (typeof args[0] === "string" && typeof args[1] === "string") {
                this.#pEmail = args[0];
                this.#pPassword = args[1];
                if (args[2] instanceof Buffer) {
                    this.#pState = new FacebookAccountState(args[2]);
                    if (typeof args[3] === "function") {
                        this.#p2FA = args[3];
                    }
                } else if (args[2] instanceof FacebookAccountState) {
                    this.#pState = args[2];
                } else if (typeof args[2] === "function") {
                    this.#p2FA = args[2];
                }
            } else {
                throw new Error("You must add email + password combination and/or account state.");
            }
        }

        this.#pContext = new HTTPContext(defaultUserAgent, this.#pState);
    }

    /** Attempt to login using current credentials. */
    async login(handler?: FacebookALoginHandler): Promise<void>;
    async login(force?: boolean, handler?: FacebookALoginHandler): Promise<void>;
    async login(...args: any[]) {
        let force = false;
        let handler: FacebookALoginHandler = new FacebookBasicALoginHandler();

        if (typeof args[0] === "boolean") {
            force = args[0];
            if (args[1] instanceof FacebookALoginHandler) {
                handler = args[1];
            }
        } else if (args[0] instanceof FacebookALoginHandler) {
            handler = args[0];
        }

        if (!this.#pLoggedIn || force) {
            if (
                typeof this.#pEmail === "string" &&
                typeof this.#pPassword === "string"
            ) {
                this.#pAccountID = await handler.login(this.#pContext, this.#pEmail, this.#pPassword, this.#p2FA);
            } else {
                this.#pAccountID = await handler.verify(this.#pContext);
            }
            await handler.close();

            this.#pLoggedIn = true;
        }
    }

    /** Logout. Simple. */
    async logout() {
        if (this.#pLoggedIn) {
            await account_logout(this.#pContext);
            this.#pLoggedIn = false;
            this.#pAccountID = null;
        }
    }

    /** Verify that we are still logged in (and account is not checkpointed). */
    async verify(handler?: FacebookALoginHandler) {
        if (!(handler instanceof FacebookALoginHandler)) 
            handler = new FacebookBasicALoginHandler();

        this.#pAccountID = await handler.verify(this.#pContext);
        return this.#pLoggedIn = (!!this.#pAccountID && this.#pAccountID != "0");
    }
}

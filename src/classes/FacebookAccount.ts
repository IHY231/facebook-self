import FacebookALoginHandler from "../types/FacebookALoginHandler";
import account_logout from "../functions/account_logout";
import FacebookAccountState from "./FacebookAccountState";

export default class FacebookAccount {
    #pEmail: string | null;
    #pPassword: string | null;
    #pState: FacebookAccountState | null;
    #p2FA: () => Promise<string> | null;
    #pLoggedIn = false;

    public userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

    public get email() {
        return this.#pEmail;
    }

    public get state() {
        this.#pState = this.#pState ?? new FacebookAccountState();
        return this.#pState.getState();
    }

    public get loggedIn() {
        return this.#pLoggedIn;
    }

    public set email(value: string) {
        this.#pEmail = value;
    }

    public set password(value: string) {
        this.#pPassword = value;
    }

    public set state(value: Buffer) {
        if (this.#pState instanceof FacebookAccountState) {
            this.#pState.setState(value);
        } else {
            this.#pState = new FacebookAccountState(value);
        }
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
            if (this.#pEmail && this.#pPassword) {
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
    }

    /** Attempt to login using current credentials. */
    async login(force?: boolean, handler?: FacebookALoginHandler);
    async login(...args: any[]) {
        let force = false;
        let handler: FacebookALoginHandler;

        if (typeof args[0] === "boolean") {
            force = args[0];
            if (args[1] instanceof FacebookALoginHandler) {
                handler = args[1];
            }
        } else if (args[0] instanceof FacebookALoginHandler) {
            handler = args[0];
        }

        if (!this.#pLoggedIn || force) {
            this.#pState = this.#pState ?? new FacebookAccountState();
            await handler.login(this.#pEmail, this.#pPassword, this.#pState, this.#p2FA);
            await handler.close();

            this.#pLoggedIn = true;
        }
    }

    /** Logout. Simple. */
    async logout() {
        if (this.#pLoggedIn) {
            await account_logout(this.#pState, this.userAgent);
            this.#pLoggedIn = false;
        }
    }
}

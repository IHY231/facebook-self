import FacebookAccountState from "../classes/AccountState";
import HTTPContext from "../classes/HTTPContext";

export default abstract class FacebookALoginHandler {
    /** Construct a single-use only account login handler */
    constructor(...args: any[]) { };

    /** Login with username and password (optionally 2FA callback) and return account ID. */
    abstract login(ctx: HTTPContext, email: string, password: string, ask2FA?: (() => Promise<string>) | null): Promise<string>;

    /** Verify that the state is still valid and usable and return account ID. */
    abstract verify(ctx: HTTPContext): Promise<string | null>;

    /** Close browser or anything that are used for logging in. */
    abstract close(): Promise<void>;
}

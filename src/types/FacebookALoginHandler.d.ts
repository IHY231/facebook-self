import FacebookAccountState from "../classes/FacebookAccountState";

export default abstract class FacebookALoginHandler {
    /** Construct a single-use only account login handler */
    constructor(...args: any[]);

    /** Login with username and password (optionally 2FA callback). Return the state of current account logged in. */
    login(username: string, password: string, state: FacebookAccountState, ask2FA?: () => Promise<string>): Promise<Buffer>;

    /** Verify that the state is still valid and usable. */
    verify(state: Buffer): Promise<boolean>;

    /** Close browser or anything that are used for logging in. */
    close(): Promise<void>;
}

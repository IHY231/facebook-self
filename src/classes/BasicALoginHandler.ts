import FacebookALoginHandler from "../types/ALoginHandler";
import cheerio from "cheerio";
import qs from "querystring";
import { URL } from "url";
import HTTPContext from "./HTTPContext";

export default class FacebookBasicALoginHandler extends FacebookALoginHandler {
    async login(ctx: HTTPContext, email: string, password: string, ask2FA?: (() => Promise<string>) | null): Promise<string> {
        // Making initial request to get login form.
        let initHTML = await ctx.context.fetch("https://mbasic.facebook.com/");
    
        if (!initHTML.ok) throw new Error("Facebook returned HTTP error code " + initHTML.status);

        let iHTMLT = await initHTML.text();
        let $0 = cheerio.load(iHTMLT);

        let nextURL = (new URL($0("form[method=POST]").attr("action") ?? "", "https://mbasic.facebook.com/")).toString();
        let postObj: { [key: string]: string } = {};

        $0("form[method=POST] input").each((_i, el) => {
            let $e = $0(el)
            let name = $e.attr("name");
            if (name) postObj[name] = $e.attr("value") || "";
        });

        postObj.email = email;
        postObj.pass = password;

        let loginRequest = await ctx.context.fetch(nextURL, {
            method: "POST",
            headers: {
                "Origin": "mbasic.facebook.com",
                "Referer": "mbasic.facebook.com",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: qs.stringify(postObj, "&", "=")
        });

        if (!loginRequest.ok) throw new Error("Facebook returned HTTP error code " + loginRequest.status);

        if (loginRequest.url.startsWith("https://mbasic.facebook.com/checkpoint")) {
            // Checkpoint, either account has 2FA enabled or account is disabled.

            let $1 = cheerio.load(await loginRequest.text());
            try {
                nextURL = new URL($1("form[method=post]").attr("action") ?? "", nextURL).toString();
                if (nextURL.startsWith("https://mbasic.facebook.com/login/checkpoint")) {
                    postObj = {};

                    // TODO: 2FA
                    throw new Error("2FA isn't implemented yet.");
                } else {
                    throw null;
                }
            } catch (e) {
                throw e ?? new Error("Cannot login with this account. Please double-check the credentials and ensure that account is not disabled/checkpointed.");
            }
        } else if (loginRequest.url.startsWith("https://mbasic.facebook.com/login")) {
            let qu = new URL(loginRequest.url).searchParams;
            switch (qu.get("e")) {
                case "1348020":
                    throw new Error("Wrong password.");
                case "1348028":
                case "1348029":
                    throw new Error("Account not found.");
            }

            throw new Error("Invalid email and/or password.");
        }

        let userID = await this.verify(ctx);
        if (typeof userID === "string") {
            return userID;
        } else {
            throw new Error("Login failed: Account ID not found.");
        }
    }

    async verify(ctx: HTTPContext): Promise<string | null> {
        let mainHTML = await ctx.context.fetch("https://m.facebook.com/");

        if (!mainHTML.ok) return null;
        let html = await mainHTML.text();
        let CurrentUserInitialDataRegex = /\["CurrentUserInitialData",\[\],(.+?),270]/;
        let o = JSON.parse(html.match(CurrentUserInitialDataRegex)?.[1] ?? "{}");

        if (typeof o.ACCOUNT_ID === "string") {
            if (+o.ACCOUNT_ID === 0 || isNaN(+o.ACCOUNT_ID)) return null; 
            return o.ACCOUNT_ID;
        } else {
            return null;
        }
    }

    async close() {}
}

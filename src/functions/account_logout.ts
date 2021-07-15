import cheerio from "cheerio";
import qs from "querystring";
import HTTPContext from "../classes/HTTPContext";
import { URL } from "url";

export default async function logout(ctx: HTTPContext) {
    let nextURL = "https://mbasic.facebook.com/menu/bookmarks/";
    let r = await ctx.context.fetch(nextURL);

    if (!r.ok) throw new Error("Facebook returned HTTP error code " + r.status);

    let $ = cheerio.load(await r.text());

    let oldURL = nextURL;
    nextURL = new URL($("#mbasic_logout_button").attr("href") ?? "", nextURL).toString();

    let l = await ctx.context.fetch(nextURL, {
        headers: {
            "Origin": "https://mbasic.facebook.com",
            "Referer": oldURL
        },
        allowForbiddenHeaders: true,
        redirect: "follow"
    });
    
    if (l.url.startsWith("https://mbasic.facebook.com/login/save-password-interstitial/")) {
        $ = cheerio.load(await l.text());

        oldURL = nextURL;
        nextURL = new URL($("form[action^='/logout.php']").attr("action") ?? "", oldURL).toString();

        let f: { [key: string]: string } = {};
        $("form[action^='/logout.php'] input").each((_i, el) => {
            let name = $(el).attr("name");
            if (typeof name === "string") {
                f[name] = $(el).attr("value") ?? "";
            }
        });

        let l2 = await ctx.context.fetch(nextURL, {
            method: "POST",
            headers: {
                "Origin": "https://mbasic.facebook.com",
                "Referer": oldURL,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: qs.stringify(f, "&", "="),
            allowForbiddenHeaders: true
        });

        if (!l2.ok) throw new Error("Facebook returned HTTP error code " + l2.status);
    }
}
import cheerio from "cheerio";
import qs from "querystring";
import HTTPContext from "../classes/HTTPContext";

export default async function logout(ctx: HTTPContext) {
    let r = await ctx.context.fetch("https://mbasic.facebook.com/menu/bookmarks/");

    if (!r.ok) throw new Error("Facebook returned HTTP error code " + r.status);

    let $ = cheerio.load(await r.text());
    let logoutURL = $("#mbasic_logout_button").attr("href") ?? "";

    let l = await ctx.context.fetch(logoutURL, {
        method: "GET",
        headers: {
            "Origin": "mbasic.facebook.com",
            "Referer": "https://mbasic.facebook.com/menu/bookmarks/"
        }
    });

    if (logoutURL.startsWith("https://mbasic.facebook.com/login/save-password-interstitial/")) {
        $ = cheerio.load(await l.text());
        let newLogoutURL = $("form[action^='/logout.php']").attr("action");

        let f: { [key: string]: string } = {};
        $("form[action^='/logout.php'] input").each((_i, el) => {
            let name = $(el).attr("name");
            if (typeof name === "string") {
                f[name] = $(el).attr("value") ?? "";
            }
        });

        let l2 = await ctx.context.fetch(newLogoutURL ?? "", {
            method: "POST",
            headers: {
                "Origin": "https://mbasic.facebook.com",
                "Referer": logoutURL,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: qs.stringify(f, "&", "=")
        });

        if (!l2.ok) throw new Error("Facebook returned HTTP error code " + l2.status);
    }
}
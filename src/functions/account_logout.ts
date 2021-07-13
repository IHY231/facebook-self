import fetch from "node-fetch";
import cheerio from "cheerio";
import qs from "querystring";
import FacebookAccountState from "../classes/FacebookAccountState";

export default async function logout(state: FacebookAccountState, userAgent: string) {
    let r = await fetch("https://mbasic.facebook.com/menu/bookmarks/", {
        method: "GET",
        headers: {
            "Accept": "*/*",
            "Cookie": state.getCookieString(),
            "User-Agent": userAgent
        }
    });

    let $ = cheerio.load(await r.text());
    let logoutURL = $("#mbasic_logout_button").attr("href");

    let l = await fetch(logoutURL, {
        method: "GET",
        headers: {
            "Origin": "mbasic.facebook.com",
            "Referer": "https://mbasic.facebook.com/menu/bookmarks/",
            "Accept": "*/*",
            "Cookie": state.getCookieString(),
            "User-Agent": userAgent
        }
    });

    if (logoutURL.startsWith("https://mbasic.facebook.com/login/save-password-interstitial/")) {
        $ = cheerio.load(await l.text());
        let newLogoutURL = $("form[action^='/logout.php']").attr("action");

        let f: {[x: string]: string} = {};
        $("form[action^='/logout.php'] input").each((_i, el) => {
            if ($(el).attr("name")) {
                f[$(el).attr("name")] = $(el).attr("value");
            }
        });

        await fetch(newLogoutURL, {
            method: "POST",
            headers: {
                "Origin": "mbasic.facebook.com",
                "Referer": logoutURL,
                "Accept": "*/*",
                "Cookie": state.getCookieString(),
                "User-Agent": userAgent,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: qs.encode(f, "&", "=")
        });
    }
}